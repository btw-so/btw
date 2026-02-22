"use strict";

const { Type } = require("@mariozechner/pi-ai");
const db = require("../services/db");
const { calculateNextRun, scheduleAgenticRun } = require("./agenticTaskTools");

const HEARTBEAT_DEFAULTS = {
    hourly: { enabled: true, cron: "0 * * * *" },      // every hour on the hour
    daily: { enabled: true, cron: "0 3 * * *" },        // 3 AM local time
};

const HEARTBEAT_INSTRUCTIONS = {
    heartbeat_hourly: "Run hourly heartbeat check: review user context and recent activity, only notify if something is genuinely worth sharing.",
    heartbeat_daily: "Run daily reflection: review all activity from the last 24 hours and silently update user memories.",
};

/**
 * Get heartbeat settings for a user, merging with defaults.
 */
function getHeartbeatSettings(userSettings) {
    const hb = userSettings?.heartbeat || {};
    return {
        hourly: { ...HEARTBEAT_DEFAULTS.hourly, ...hb.hourly },
        daily: { ...HEARTBEAT_DEFAULTS.daily, ...hb.daily },
    };
}

/**
 * Ensure heartbeat tasks exist for a single user.
 * Creates missing ones, updates cron if changed, pauses/resumes based on enabled flag.
 */
async function ensureHeartbeatsForUser(userId, userSettings) {
    const tasksDB = await db.getTasksDB();
    const hbSettings = getHeartbeatSettings(userSettings);
    const timezoneOffset = userSettings?.timezoneOffsetInSeconds || 0;

    // Get user's primary entry point
    const { rows: epRows } = await tasksDB.query(
        `SELECT telegram_id FROM btw.telegram_user_map WHERE user_id = $1 LIMIT 1`,
        [userId]
    );
    if (epRows.length === 0) return; // no entry point, skip

    const chatId = Number(epRows[0].telegram_id);
    const entryPoint = "telegram";

    // Get existing heartbeat tasks
    const { rows: existing } = await tasksDB.query(
        `SELECT id, system_type, cron_expression, status
         FROM btw.agentic_tasks
         WHERE user_id = $1 AND system_type IN ('heartbeat_hourly', 'heartbeat_daily')
         AND status IN ('active', 'paused')`,
        [userId]
    );

    const existingMap = {};
    for (const row of existing) {
        existingMap[row.system_type] = row;
    }

    for (const [type, config] of [
        ["heartbeat_hourly", hbSettings.hourly],
        ["heartbeat_daily", hbSettings.daily],
    ]) {
        const existingTask = existingMap[type];

        if (!existingTask) {
            // Create new heartbeat task
            if (config.enabled) {
                await createHeartbeatTask({
                    userId,
                    systemType: type,
                    instruction: HEARTBEAT_INSTRUCTIONS[type],
                    cron: config.cron,
                    timezoneOffset,
                    entryPoint,
                    chatId,
                });
            }
        } else {
            // Update existing task if needed
            const updates = [];
            const params = [];
            let paramIdx = 1;

            // Update cron if changed
            if (existingTask.cron_expression !== config.cron) {
                updates.push(`cron_expression = $${paramIdx++}`);
                params.push(config.cron);

                const nextRun = calculateNextRun(config.cron, timezoneOffset);
                if (nextRun) {
                    updates.push(`next_run_at = $${paramIdx++}`);
                    params.push(nextRun);
                }
            }

            // Update status based on enabled flag
            const desiredStatus = config.enabled ? "active" : "paused";
            if (existingTask.status !== desiredStatus) {
                updates.push(`status = $${paramIdx++}`);
                params.push(desiredStatus);
            }

            if (updates.length > 0) {
                updates.push(`updated_at = NOW()`);
                params.push(existingTask.id);
                await tasksDB.query(
                    `UPDATE btw.agentic_tasks SET ${updates.join(", ")} WHERE id = $${paramIdx}`,
                    params
                );
                console.log(`[Heartbeat] Updated ${type} task ${existingTask.id} for user ${userId}`);

                // Reschedule if reactivated or cron changed
                if (desiredStatus === "active" && existingTask.cron_expression !== config.cron) {
                    const nextRun = calculateNextRun(config.cron, timezoneOffset);
                    if (nextRun) {
                        await scheduleAgenticRun(existingTask.id, nextRun);
                    }
                }
            }
        }
    }
}

/**
 * Create a heartbeat agentic task.
 */
async function createHeartbeatTask({ userId, systemType, instruction, cron, timezoneOffset, entryPoint, chatId }) {
    const tasksDB = await db.getTasksDB();

    const nextRun = calculateNextRun(cron, timezoneOffset);
    if (!nextRun) {
        console.log(`[Heartbeat] Failed to calculate next run for ${systemType}, user ${userId}`);
        return null;
    }

    const name = systemType === "heartbeat_hourly" ? "Hourly Heartbeat" : "Daily Reflection";

    try {
        const { rows } = await tasksDB.query(
            `INSERT INTO btw.agentic_tasks
             (user_id, name, instruction, cron_expression, next_run_at, status, mode, entry_point, chat_id, system_type)
             VALUES ($1, $2, $3, $4, $5, 'active', 'auto', $6, $7, $8)
             RETURNING id`,
            [userId, name, instruction, cron, nextRun, entryPoint, chatId, systemType]
        );

        const taskId = rows[0].id;
        await scheduleAgenticRun(taskId, nextRun);
        console.log(`[Heartbeat] Created ${systemType} task ${taskId} for user ${userId}, next run: ${nextRun.toISOString()}`);
        return taskId;
    } catch (err) {
        // Unique constraint violation = already exists (race condition)
        if (err.code === "23505") {
            console.log(`[Heartbeat] ${systemType} already exists for user ${userId}, skipping`);
            return null;
        }
        throw err;
    }
}

/**
 * Ensure heartbeats exist for ALL users who have entry points.
 * Called by a repeating Bull job.
 */
async function ensureAllHeartbeats() {
    const tasksDB = await db.getTasksDB();

    // Get all users who have at least one telegram connection
    // Note: settings is json type (not jsonb), so we cast to text for DISTINCT
    const { rows: users } = await tasksDB.query(
        `SELECT u.id, u.settings
         FROM btw.users u
         WHERE EXISTS (SELECT 1 FROM btw.telegram_user_map t WHERE t.user_id = u.id)`
    );

    for (const user of users) {
        try {
            await ensureHeartbeatsForUser(user.id, user.settings);
        } catch (err) {
            console.log(`[Heartbeat] Error ensuring heartbeats for user ${user.id}:`, err.message);
        }
    }
}

// --- Heartbeat-specific tools ---

/**
 * Tools available during heartbeat runs.
 */
function createHeartbeatTools({ user_id, timezoneOffsetInSeconds, heartbeatType }) {
    return [
        {
            name: "read_recent_activity",
            description:
                "Read the user's recent activity: conversations, task runs, and tool usage. Returns summaries of recent interactions to help you understand what the user has been doing.",
            parameters: Type.Object({
                hours: Type.Optional(
                    Type.Number({
                        description:
                            "How many hours back to look. Default: 1 for hourly heartbeat, 24 for daily.",
                    })
                ),
            }),
            execute: async (_toolCallId, args) => {
                try {
                    const tasksDB = await db.getTasksDB();
                    const defaultHours = heartbeatType === "heartbeat_daily" ? 24 : 1;
                    const hours = args.hours || defaultHours;
                    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

                    // 1. Recent manual conversations
                    const { rows: conversations } = await tasksDB.query(
                        `SELECT id, name, messages, updated_at
                         FROM btw.agentic_tasks
                         WHERE user_id = $1
                           AND mode = 'manual'
                           AND updated_at >= $2
                         ORDER BY updated_at DESC
                         LIMIT 20`,
                        [user_id, since]
                    );

                    // Summarize conversations: extract user messages and assistant responses
                    const conversationSummaries = conversations.map((conv) => {
                        const msgs = conv.messages || [];
                        const exchanges = [];
                        for (const msg of msgs) {
                            if (msg.role === "user" || msg.role === "assistant") {
                                let text = "";
                                if (typeof msg.content === "string") {
                                    text = msg.content;
                                } else if (Array.isArray(msg.content)) {
                                    text = msg.content
                                        .filter((b) => b.type === "text")
                                        .map((b) => b.text)
                                        .join("\n");
                                }
                                // Truncate long messages
                                if (text.length > 500) text = text.slice(0, 500) + "...";
                                if (text) exchanges.push({ role: msg.role, text });
                            }
                        }
                        // Keep last 10 exchanges per conversation
                        return {
                            task_id: conv.id,
                            name: conv.name,
                            updated_at: conv.updated_at,
                            exchanges: exchanges.slice(-10),
                        };
                    });

                    // 2. Recent task runs (scheduled tasks)
                    const { rows: taskRuns } = await tasksDB.query(
                        `SELECT tr.id, tr.task_id, tr.started_at, tr.completed_at, tr.status, tr.error,
                                at.name as task_name, at.system_type
                         FROM btw.task_runs tr
                         JOIN btw.agentic_tasks at ON at.id = tr.task_id
                         WHERE tr.user_id = $1
                           AND tr.started_at >= $2
                           AND (at.system_type IS NULL OR at.system_type NOT LIKE 'heartbeat_%')
                         ORDER BY tr.started_at DESC
                         LIMIT 20`,
                        [user_id, since]
                    );

                    // 3. Recent auto tasks activity (user-created scheduled tasks)
                    const { rows: autoTasks } = await tasksDB.query(
                        `SELECT id, name, instruction, cron_expression, status, updated_at
                         FROM btw.agentic_tasks
                         WHERE user_id = $1
                           AND mode = 'auto'
                           AND system_type IS NULL
                           AND updated_at >= $2
                         ORDER BY updated_at DESC
                         LIMIT 10`,
                        [user_id, since]
                    );

                    return {
                        output: JSON.stringify({
                            success: true,
                            action: "read_recent_activity",
                            period_hours: hours,
                            conversations: conversationSummaries,
                            task_runs: taskRuns,
                            scheduled_tasks: autoTasks,
                        }),
                    };
                } catch (err) {
                    console.log("[Heartbeat] read_recent_activity error:", err.message);
                    return {
                        output: JSON.stringify({ success: false, error: err.message }),
                    };
                }
            },
        },
    ];
}

/**
 * Tool for the main agent loop — lets users update heartbeat settings via chat.
 */
function createHeartbeatSettingsTool({ user_id }) {
    return {
        name: "update_heartbeat_settings",
        description:
            "Update the user's heartbeat settings. Heartbeat is an automatic background system: the hourly heartbeat reviews user context and only messages if something important comes up; the daily heartbeat silently reviews all activity and updates memories. Use this when the user wants to enable/disable heartbeats or change their frequency.",
        parameters: Type.Object({
            hourly_enabled: Type.Optional(
                Type.Boolean({ description: "Enable or disable hourly heartbeat." })
            ),
            daily_enabled: Type.Optional(
                Type.Boolean({ description: "Enable or disable daily heartbeat." })
            ),
            hourly_cron: Type.Optional(
                Type.String({
                    description:
                        "Cron expression for hourly heartbeat frequency (in user's local timezone). Default: '0 * * * *' (every hour). Example: '*/30 * * * *' (every 30 min).",
                })
            ),
            daily_cron: Type.Optional(
                Type.String({
                    description:
                        "Cron expression for daily heartbeat (in user's local timezone). Default: '0 3 * * *' (3 AM). Example: '0 22 * * *' (10 PM).",
                })
            ),
        }),
        execute: async (_toolCallId, args) => {
            try {
                const tasksDB = await db.getTasksDB();

                // Read current settings
                const { rows } = await tasksDB.query(
                    `SELECT settings FROM btw.users WHERE id = $1`,
                    [user_id]
                );
                let settings = rows[0]?.settings || {};
                const hb = settings.heartbeat || {};
                const hourly = hb.hourly || { ...HEARTBEAT_DEFAULTS.hourly };
                const daily = hb.daily || { ...HEARTBEAT_DEFAULTS.daily };

                // Apply updates
                if (args.hourly_enabled !== undefined) hourly.enabled = args.hourly_enabled;
                if (args.daily_enabled !== undefined) daily.enabled = args.daily_enabled;
                if (args.hourly_cron) hourly.cron = args.hourly_cron;
                if (args.daily_cron) daily.cron = args.daily_cron;

                settings.heartbeat = { hourly, daily };

                // Save settings
                await tasksDB.query(
                    `UPDATE btw.users SET settings = $1 WHERE id = $2`,
                    [settings, user_id]
                );

                // Apply changes immediately
                await ensureHeartbeatsForUser(user_id, settings);

                return {
                    output: JSON.stringify({
                        success: true,
                        action: "update_heartbeat_settings",
                        heartbeat: settings.heartbeat,
                        message: "Heartbeat settings updated.",
                    }),
                };
            } catch (err) {
                console.log("[Heartbeat] update settings error:", err.message);
                return {
                    output: JSON.stringify({ success: false, error: err.message }),
                };
            }
        },
    };
}

module.exports = {
    ensureHeartbeatsForUser,
    ensureAllHeartbeats,
    createHeartbeatTools,
    createHeartbeatSettingsTool,
    getHeartbeatSettings,
    HEARTBEAT_DEFAULTS,
};
