const { Type } = require("@mariozechner/pi-ai");
const db = require("../services/db");
const { setUserTimezone, getUserFromId } = require("./user");
const { callAndSpeak } = require("../services/twilio");

// --- DB helpers ---

async function getMemory({ user_id, type, day }) {
    const tasksDB = await db.getTasksDB();
    let result;
    if (type === "daily") {
        result = await tasksDB.query(
            `SELECT id, content, day, updated_at FROM btw.user_memories WHERE user_id = $1 AND type = 'daily' AND day = $2`,
            [user_id, day]
        );
    } else {
        result = await tasksDB.query(
            `SELECT id, content, updated_at FROM btw.user_memories WHERE user_id = $1 AND type = $2`,
            [user_id, type]
        );
    }
    return result.rows[0] || null;
}

async function upsertMemory({ user_id, type, day, content }) {
    const tasksDB = await db.getTasksDB();
    if (type === "daily") {
        await tasksDB.query(
            `INSERT INTO btw.user_memories (user_id, type, day, content, updated_at)
             VALUES ($1, 'daily', $2, $3, NOW())
             ON CONFLICT (user_id, day) WHERE type = 'daily'
             DO UPDATE SET content = $3, updated_at = NOW()`,
            [user_id, day, content]
        );
    } else {
        await tasksDB.query(
            `INSERT INTO btw.user_memories (user_id, type, content, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (user_id) WHERE type = $2
             DO UPDATE SET content = $3, updated_at = NOW()`,
            [user_id, type, content]
        );
    }
}

async function searchMemories({ user_id, query, limit }) {
    const tasksDB = await db.getTasksDB();
    const result = await tasksDB.query(
        `SELECT type, day, content,
                ts_rank(to_tsvector('english', content), plainto_tsquery('english', $2)) AS rank
         FROM btw.user_memories
         WHERE user_id = $1
           AND to_tsvector('english', content) @@ plainto_tsquery('english', $2)
         ORDER BY rank DESC, day DESC NULLS LAST
         LIMIT $3`,
        [user_id, query, limit || 5]
    );
    return result.rows;
}

/**
 * Fetch memories to inject into system prompt:
 * - global memory (always)
 * - soul (always)
 * - today's daily memory
 * - yesterday's daily memory
 */
async function getMemoriesForPrompt({ user_id, todayDate, yesterdayDate }) {
    const tasksDB = await db.getTasksDB();
    const result = await tasksDB.query(
        `SELECT type, day, content FROM btw.user_memories
         WHERE user_id = $1
           AND (
             type IN ('global', 'soul')
             OR (type = 'daily' AND day IN ($2, $3))
           )`,
        [user_id, todayDate, yesterdayDate]
    );

    const memories = { global: null, soul: null, today: null, yesterday: null };
    for (const row of result.rows) {
        if (row.type === "global") memories.global = row.content;
        else if (row.type === "soul") memories.soul = row.content;
        else if (row.type === "daily") {
            if (row.day.toISOString().slice(0, 10) === todayDate) {
                memories.today = row.content;
            } else {
                memories.yesterday = row.content;
            }
        }
    }
    return memories;
}

// --- Tool definitions ---

function createMemoryTools({ user_id, timezoneOffsetInSeconds }) {
    // Helper to get today's date in user's timezone as YYYY-MM-DD
    function getUserLocalDate(offsetOverride) {
        const now = new Date();
        const local = new Date(now.getTime() + (offsetOverride ?? timezoneOffsetInSeconds) * 1000);
        return local.toISOString().slice(0, 10);
    }

    return [
        {
            name: "read_memories",
            description:
                "Read all your memories about this user: global memory, soul (personality notes), and today's daily memory. Use this to refresh your context about the user.",
            parameters: Type.Object({}),
            execute: async (_toolCallId, _args) => {
                const todayDate = getUserLocalDate();
                const yesterdayDate = (() => {
                    const now = new Date();
                    const local = new Date(now.getTime() + timezoneOffsetInSeconds * 1000);
                    local.setDate(local.getDate() - 1);
                    return local.toISOString().slice(0, 10);
                })();

                const memories = await getMemoriesForPrompt({
                    user_id,
                    todayDate,
                    yesterdayDate,
                });

                return {
                    output: JSON.stringify({
                        success: true,
                        action: "read_memories",
                        global: memories.global || "(empty)",
                        soul: memories.soul || "(empty)",
                        today: memories.today || "(empty)",
                        yesterday: memories.yesterday || "(empty)",
                    }),
                };
            },
        },
        {
            name: "write_global_memory",
            description:
                "Overwrite the global memory for this user. Global memory stores ongoing context: preferences, facts, instructions, important information that is always relevant. Keep it concise markdown. Read current memory first before overwriting to avoid losing existing content.",
            parameters: Type.Object({
                content: Type.String({
                    description:
                        "The full markdown content for global memory. This replaces the existing content entirely.",
                }),
            }),
            execute: async (_toolCallId, args) => {
                await upsertMemory({
                    user_id,
                    type: "global",
                    content: args.content,
                });
                return {
                    output: JSON.stringify({
                        success: true,
                        action: "write_global_memory",
                    }),
                };
            },
        },
        {
            name: "write_soul",
            description:
                "Overwrite the soul for this user. Soul captures the user's personality, communication style, tone preferences, humor, language patterns — who they are as a person. This helps you personalize responses over time. Keep it concise markdown. Read current memory first before overwriting.",
            parameters: Type.Object({
                content: Type.String({
                    description:
                        "The full markdown content for the soul. This replaces the existing content entirely.",
                }),
            }),
            execute: async (_toolCallId, args) => {
                await upsertMemory({
                    user_id,
                    type: "soul",
                    content: args.content,
                });
                return {
                    output: JSON.stringify({
                        success: true,
                        action: "write_soul",
                    }),
                };
            },
        },
        {
            name: "get_daily_memory",
            description:
                "Get the daily memory for a specific date. Defaults to today if no date is provided. Daily memories track what happened on a particular day — tasks done, decisions made, conversations had.",
            parameters: Type.Object({
                day: Type.Optional(
                    Type.String({
                        description:
                            "Date in DD/MM/YYYY format (user's local timezone). Defaults to today.",
                    })
                ),
            }),
            execute: async (_toolCallId, args) => {
                let day;
                if (args.day) {
                    const [dd, mm, yyyy] = args.day.split("/");
                    day = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
                } else {
                    day = getUserLocalDate();
                }

                const memory = await getMemory({ user_id, type: "daily", day });
                return {
                    output: JSON.stringify({
                        success: true,
                        action: "get_daily_memory",
                        day,
                        content: memory?.content || "(empty)",
                    }),
                };
            },
        },
        {
            name: "write_daily_memory",
            description:
                "Overwrite the daily memory for a specific date. Daily memories track what happened on a particular day — tasks worked on, decisions made, key conversations. Keep it concise markdown. Read current daily memory first before overwriting to avoid losing existing entries.",
            parameters: Type.Object({
                content: Type.String({
                    description:
                        "The full markdown content for this day's memory. This replaces the existing content entirely.",
                }),
                day: Type.Optional(
                    Type.String({
                        description:
                            "Date in DD/MM/YYYY format (user's local timezone). Defaults to today.",
                    })
                ),
            }),
            execute: async (_toolCallId, args) => {
                let day;
                if (args.day) {
                    const [dd, mm, yyyy] = args.day.split("/");
                    day = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
                } else {
                    day = getUserLocalDate();
                }

                await upsertMemory({
                    user_id,
                    type: "daily",
                    day,
                    content: args.content,
                });
                return {
                    output: JSON.stringify({
                        success: true,
                        action: "write_daily_memory",
                        day,
                    }),
                };
            },
        },
        {
            name: "search_memories",
            description:
                "Search across all memories (global, soul, and all daily) using full-text search. Use when you need to find something from past days or check if you've noted something before.",
            parameters: Type.Object({
                query: Type.String({
                    description: "Search query — keywords or phrases to look for.",
                }),
            }),
            execute: async (_toolCallId, args) => {
                const results = await searchMemories({
                    user_id,
                    query: args.query,
                    limit: 5,
                });

                return {
                    output: JSON.stringify({
                        success: true,
                        action: "search_memories",
                        count: results.length,
                        results: results.map((r) => ({
                            type: r.type,
                            day: r.day || null,
                            content: r.content,
                        })),
                    }),
                };
            },
        },
        {
            name: "set_timezone",
            description:
                "Update the user's timezone. Use when the user tells you their timezone, location, or if reminders are firing at wrong times. Accepts an IANA timezone name (e.g. 'Asia/Kolkata', 'America/New_York', 'Europe/London').",
            parameters: Type.Object({
                timezone: Type.String({
                    description:
                        "IANA timezone name, e.g. 'Asia/Kolkata', 'America/New_York', 'Europe/London', 'US/Pacific'.",
                }),
            }),
            execute: async (_toolCallId, args) => {
                // Calculate offset from IANA timezone name
                const now = new Date();
                const formatter = new Intl.DateTimeFormat("en-US", {
                    timeZone: args.timezone,
                    timeZoneName: "shortOffset",
                });
                const parts = formatter.formatToParts(now);
                const offsetPart = parts.find((p) => p.type === "timeZoneName");

                if (!offsetPart) {
                    return {
                        output: JSON.stringify({
                            success: false,
                            error: "Invalid timezone name",
                        }),
                    };
                }

                // Parse offset like "GMT+5:30" or "GMT-8" into seconds
                const offsetStr = offsetPart.value; // e.g. "GMT+5:30"
                let offsetInSeconds = 0;
                const match = offsetStr.match(/GMT([+-]?)(\d+)(?::(\d+))?/);
                if (match) {
                    const sign = match[1] === "-" ? -1 : 1;
                    const hours = parseInt(match[2], 10);
                    const minutes = parseInt(match[3] || "0", 10);
                    offsetInSeconds = sign * (hours * 3600 + minutes * 60);
                }

                await setUserTimezone({
                    user_id,
                    timezone: args.timezone,
                    timezoneOffsetInSeconds: offsetInSeconds,
                });

                return {
                    output: JSON.stringify({
                        success: true,
                        action: "set_timezone",
                        timezone: args.timezone,
                        offsetInSeconds,
                    }),
                };
            },
        },
        {
            name: "call_user",
            description:
                "Call the user's phone number and speak a message using text-to-speech. Use when the user asks you to call them, or when a spoken message is more appropriate than text. The message should be natural and conversational — it will be read aloud.",
            parameters: Type.Object({
                message: Type.String({
                    description:
                        "The message to speak to the user on the phone. Keep it natural and conversational.",
                }),
            }),
            execute: async (_toolCallId, args) => {
                try {
                    const user = await getUserFromId({ user_id });
                    const phone = user?.settings?.phone;

                    if (!phone) {
                        return {
                            output: JSON.stringify({
                                success: false,
                                error: "No phone number on file for this user.",
                            }),
                        };
                    }

                    const result = await callAndSpeak({
                        to: phone,
                        message: args.message,
                    });

                    return {
                        output: JSON.stringify({
                            success: true,
                            action: "call_user",
                            callSid: result.callSid,
                            status: result.status,
                        }),
                    };
                } catch (err) {
                    console.log(`[CallUser] Error:`, err.message);
                    return {
                        output: JSON.stringify({
                            success: false,
                            error: err.message,
                        }),
                    };
                }
            },
        },
    ];
}

module.exports = { createMemoryTools, getMemoriesForPrompt };
