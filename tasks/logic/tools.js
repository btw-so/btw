const { Type, StringEnum } = require("@mariozechner/pi-ai");
const fetch = require("node-fetch");
const TurndownService = require("turndown");
const {
    addRemindersToDB,
    addAlertToDb,
    editReminderTextsInDB,
    completeRemindersInDB,
    deleteRemindersFromDB,
    deleteAlertsFromDB,
    readReminders,
} = require("./ai");
const { convertLocalTimeToUTC, getNow } = require("../utils/utils");
const { uxQueue } = require("../services/queue");

function createTools({ user_id, timezoneOffsetInSeconds }) {
    return [
        {
            name: "add_reminder",
            description:
                "Create a new reminder with alerts. Use when the user wants to be reminded about something. Extract a short, crisp reminder text without filler words like 'remind me'. Pick the best date/time. Add at least one alert. For recurring reminders, provide a crontab string and generate alerts for the next 7 days.",
            parameters: Type.Object({
                text: Type.String({
                    description:
                        "Short, crisp reminder text. E.g. 'Buy milk', 'Call mom', 'Meeting with John'.",
                }),
                when_date: Type.String({
                    description:
                        "Due date in DD/MM/YYYY format in user's local timezone.",
                }),
                when_time: Type.String({
                    description:
                        "Due time in HH:MM:SS 24-hour format. Default 23:59:00 if no time specified.",
                }),
                recurring: Type.Boolean({
                    description: "True if this is a recurring/repeating reminder.",
                }),
                crontab: Type.Optional(
                    Type.String({
                        description:
                            "Crontab string for recurring reminders (minute hour day-of-month month day-of-week). Null if not recurring.",
                    })
                ),
                alerts: Type.Array(Type.String(), {
                    description:
                        "Array of alert timestamps in 'DD/MM/YYYY HH:MM:SS' format (user's local timezone). At least one required.",
                }),
                family_user_id: Type.Optional(
                    Type.Number({
                        description:
                            "User ID of the family member this reminder is for. Omit if user's own.",
                    })
                ),
            }),
            execute: async (_toolCallId, args) => {
                const duedate = convertLocalTimeToUTC(
                    args.when_date,
                    args.when_time || "23:59:00",
                    timezoneOffsetInSeconds
                );

                const alertDates = (args.alerts || []).map((alert) =>
                    convertLocalTimeToUTC(
                        alert.split(" ")[0],
                        alert.split(" ")[1],
                        timezoneOffsetInSeconds
                    )
                );

                const reminderId = "" + getNow() + "0";
                const targetUserId = args.family_user_id || user_id;

                const remindersAdded = await addRemindersToDB({
                    reminders: [
                        {
                            id: reminderId,
                            user_id: targetUserId,
                            text: args.text,
                            duedate,
                            recurring: !!args.recurring,
                            completed: false,
                            created_at: new Date(getNow()),
                            updated_at: new Date(getNow()),
                            alerts: alertDates,
                            crontab: args.crontab || "",
                        },
                    ],
                    user_id: targetUserId,
                    timezoneOffsetInSeconds,
                });

                if (remindersAdded.length > 0) {
                    uxQueue.add("new-reminders", {
                        reminders: remindersAdded,
                        user_id,
                    });
                }

                return {
                    output: JSON.stringify({
                        success: true,
                        action: "add_reminder",
                        count: remindersAdded.length,
                        reminders: remindersAdded.map((r) => ({
                            id: r.id,
                            text: r.text,
                            user_id: r.user_id,
                        })),
                    }),
                };
            },
        },
        {
            name: "add_alert",
            description:
                "Add a new alert to an existing reminder. Use when the user wants an additional notification for a reminder already in the conversation history. Do NOT make up reminder IDs.",
            parameters: Type.Object({
                reminder_id: Type.String({
                    description: "ID of the existing reminder from conversation history.",
                }),
                when_datetime: Type.String({
                    description:
                        "Alert timestamp in 'DD/MM/YYYY HH:MM:SS' format (user's local timezone).",
                }),
                target_user_id: Type.Optional(
                    Type.Number({
                        description: "User ID of the reminder owner. Omit for current user.",
                    })
                ),
            }),
            execute: async (_toolCallId, args) => {
                const duedate = convertLocalTimeToUTC(
                    args.when_datetime.split(" ")[0],
                    args.when_datetime.split(" ")[1],
                    timezoneOffsetInSeconds
                );

                const alert = await addAlertToDb({
                    user_id: args.target_user_id || user_id,
                    reminder_id: args.reminder_id,
                    duedateInUTC: duedate,
                });

                if (alert) {
                    uxQueue.add("updated-reminders", {
                        reminders: [
                            { id: args.reminder_id, user_id: args.target_user_id || user_id },
                        ],
                        user_id,
                    });
                }

                return {
                    output: JSON.stringify({ success: !!alert, action: "add_alert" }),
                };
            },
        },
        {
            name: "edit_reminder",
            description:
                "Edit the text of an existing reminder. Only use for reminders visible in conversation history.",
            parameters: Type.Object({
                reminder_id: Type.String({ description: "ID of the reminder to edit." }),
                new_text: Type.String({ description: "New text for the reminder." }),
                target_user_id: Type.Optional(
                    Type.Number({ description: "User ID of the reminder owner." })
                ),
            }),
            execute: async (_toolCallId, args) => {
                const edited = await editReminderTextsInDB({
                    reminders: [
                        {
                            id: args.reminder_id,
                            text: args.new_text,
                            user_id: args.target_user_id || user_id,
                        },
                    ],
                    user_id: args.target_user_id || user_id,
                });

                if (edited.length > 0) {
                    uxQueue.add("updated-reminders", {
                        reminders: [
                            { id: args.reminder_id, user_id: args.target_user_id || user_id },
                        ],
                        user_id,
                    });
                }

                return {
                    output: JSON.stringify({
                        success: edited.length > 0,
                        action: "edit_reminder",
                    }),
                };
            },
        },
        {
            name: "complete_reminder",
            description:
                "Mark a reminder as completed. Only use for reminders visible in conversation history.",
            parameters: Type.Object({
                reminder_id: Type.String({
                    description: "ID of the reminder to mark as complete.",
                }),
                target_user_id: Type.Optional(
                    Type.Number({ description: "User ID of the reminder owner." })
                ),
            }),
            execute: async (_toolCallId, args) => {
                const completed = await completeRemindersInDB({
                    reminders: [
                        {
                            id: args.reminder_id,
                            user_id: args.target_user_id || user_id,
                            completed: true,
                        },
                    ],
                    user_id: args.target_user_id || user_id,
                });

                if (completed.length > 0) {
                    uxQueue.add("updated-reminders", {
                        reminders: [
                            { id: args.reminder_id, user_id: args.target_user_id || user_id },
                        ],
                        user_id,
                    });
                }

                return {
                    output: JSON.stringify({
                        success: completed.length > 0,
                        action: "complete_reminder",
                    }),
                };
            },
        },
        {
            name: "delete_reminder",
            description:
                "Delete a reminder and all its alerts. Only use for reminders visible in conversation history. Also use when the user wants to change the cron schedule of a recurring reminder (delete old + add new).",
            parameters: Type.Object({
                reminder_id: Type.String({
                    description: "ID of the reminder to delete.",
                }),
                target_user_id: Type.Optional(
                    Type.Number({ description: "User ID of the reminder owner." })
                ),
            }),
            execute: async (_toolCallId, args) => {
                const deleted = await deleteRemindersFromDB({
                    reminders: [
                        {
                            id: args.reminder_id,
                            user_id: args.target_user_id || user_id,
                        },
                    ],
                    user_id: args.target_user_id || user_id,
                });

                if (deleted.length > 0) {
                    uxQueue.add("deleted-reminders", {
                        reminders: deleted,
                        user_id,
                    });
                }

                return {
                    output: JSON.stringify({
                        success: deleted.length > 0,
                        action: "delete_reminder",
                    }),
                };
            },
        },
        {
            name: "delete_alert",
            description:
                "Delete a specific alert from a reminder. Only use for alerts visible in conversation history. To change alert time: delete old + add new.",
            parameters: Type.Object({
                alert_id: Type.Number({ description: "ID of the alert to delete." }),
                reminder_id: Type.String({
                    description: "ID of the reminder this alert belongs to.",
                }),
                target_user_id: Type.Optional(
                    Type.Number({ description: "User ID of the reminder owner." })
                ),
            }),
            execute: async (_toolCallId, args) => {
                const deleted = await deleteAlertsFromDB({
                    alerts: [
                        {
                            id: args.alert_id,
                            user_id: args.target_user_id || user_id,
                            reminder_id: args.reminder_id,
                        },
                    ],
                    user_id: args.target_user_id || user_id,
                });

                if (deleted.length > 0) {
                    uxQueue.add("updated-reminders", {
                        reminders: [
                            { id: args.reminder_id, user_id: args.target_user_id || user_id },
                        ],
                        user_id,
                    });
                }

                return {
                    output: JSON.stringify({
                        success: deleted.length > 0,
                        action: "delete_alert",
                    }),
                };
            },
        },
        {
            name: "read_reminders",
            description:
                "Query and read the user's reminders. Use when the user asks about their existing reminders, todos, or schedule.",
            parameters: Type.Object({
                from_date: Type.String({
                    description: "Start date in DD-MM-YYYY format (user's local timezone). Default today.",
                }),
                to_date: Type.String({
                    description:
                        "End date in DD-MM-YYYY format (user's local timezone). Default 7 days from now.",
                }),
                from_time: Type.String({
                    description: "Start time HH:MM:SS 24h. Default 00:00:00.",
                }),
                to_time: Type.String({
                    description: "End time HH:MM:SS 24h. Default 23:59:59.",
                }),
                status: StringEnum(["all", "completed", "incomplete"], {
                    description: "Filter by status. Default 'incomplete'.",
                }),
            }),
            execute: async (_toolCallId, args) => {
                const { reminders } = await readReminders({
                    fromDate: args.from_date,
                    fromTime: args.from_time || "00:00:00",
                    toDate: args.to_date,
                    toTime: args.to_time || "23:59:59",
                    timezoneOffsetInSeconds,
                    status: args.status || "incomplete",
                    user_id,
                });

                return {
                    output: JSON.stringify({
                        success: true,
                        action: "read_reminders",
                        count: reminders.length,
                        reminders: reminders.map((r) => ({
                            id: r.id,
                            text: r.text,
                            duedate: r.duedate,
                            completed: r.completed,
                            recurring: r.recurring,
                            alerts: (r.alerts || []).map((a) => ({
                                id: a.id,
                                duedate: a.duedate,
                            })),
                        })),
                    }),
                };
            },
        },
        ...(process.env.EXA_API_KEY
            ? [
                  {
                      name: "web_search",
                      description:
                          "Search the web for current information. Use when the user asks a question that requires up-to-date knowledge, facts, news, or anything beyond your training data.",
                      parameters: Type.Object({
                          query: Type.String({
                              description:
                                  "The search query. Be specific and descriptive for better results.",
                          }),
                      }),
                      execute: async (_toolCallId, args) => {
                          try {
                              const resp = await fetch("https://api.exa.ai/search", {
                                  method: "POST",
                                  headers: {
                                      "x-api-key": process.env.EXA_API_KEY,
                                      "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                      query: args.query,
                                      type: "auto",
                                      numResults: 5,
                                      contents: {
                                          text: { maxCharacters: 1000 },
                                      },
                                  }),
                              });

                              const data = await resp.json();

                              if (!resp.ok) {
                                  console.log("[WebSearch] Exa error:", JSON.stringify(data));
                                  return {
                                      output: JSON.stringify({
                                          success: false,
                                          error: data.error || "Search failed",
                                      }),
                                  };
                              }

                              const results = (data.results || []).map((r) => ({
                                  title: r.title,
                                  url: r.url,
                                  text: r.text || "",
                              }));

                              console.log(`[WebSearch] Found ${results.length} results for: "${args.query}"`);

                              return {
                                  output: JSON.stringify({
                                      success: true,
                                      action: "web_search",
                                      results,
                                  }),
                              };
                          } catch (err) {
                              console.log("[WebSearch] Error:", err.message);
                              return {
                                  output: JSON.stringify({
                                      success: false,
                                      error: err.message,
                                  }),
                              };
                          }
                      },
                  },
              ]
            : []),
        {
            name: "web_fetch",
            description:
                "Fetch a webpage by URL and return its content as markdown. Use when the user shares a URL and wants to know what's on the page, or when you need to read a specific webpage (e.g. from a search result).",
            parameters: Type.Object({
                url: Type.String({
                    description: "The full URL to fetch (must start with http:// or https://).",
                }),
            }),
            execute: async (_toolCallId, args) => {
                try {
                    console.log(`[WebFetch] Fetching: ${args.url}`);

                    const resp = await fetch(args.url, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (compatible; A1Bot/1.0)",
                            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                        },
                        timeout: 10000,
                        redirect: "follow",
                    });

                    if (!resp.ok) {
                        return {
                            output: JSON.stringify({
                                success: false,
                                error: `HTTP ${resp.status} ${resp.statusText}`,
                            }),
                        };
                    }

                    const contentType = resp.headers.get("content-type") || "";
                    const html = await resp.text();

                    let content;
                    if (contentType.includes("text/html") || contentType.includes("application/xhtml")) {
                        const turndownService = new TurndownService();
                        turndownService.remove(["script", "style", "nav", "footer", "iframe"]);
                        content = turndownService.turndown(html);
                    } else {
                        content = html;
                    }

                    // Truncate final content to avoid blowing up LLM context
                    const maxChars = 12000;
                    if (content.length > maxChars) {
                        content = content.slice(0, maxChars) + "\n\n[...truncated]";
                    }

                    console.log(`[WebFetch] Got ${content.length} chars from ${args.url}`);

                    return {
                        output: JSON.stringify({
                            success: true,
                            action: "web_fetch",
                            url: args.url,
                            content,
                        }),
                    };
                } catch (err) {
                    console.log("[WebFetch] Error:", err.message);
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

module.exports = { createTools };
