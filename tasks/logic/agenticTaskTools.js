"use strict";

const { Type, StringEnum } = require("@mariozechner/pi-ai");
const db = require("../services/db");
const parser = require("cron-parser");
const { agenticQueue } = require("../services/queue");

function calculateNextRun(cronExpression, timezoneOffsetInSeconds = 0) {
    try {
        // Cron is in user's local time. To find the next occurrence:
        // 1. Convert "now" to user's local time
        // 2. Parse cron with local "now" — next() gives local next occurrence
        // 3. Convert back to UTC by subtracting offset
        const nowUTC = new Date();
        const nowLocal = new Date(nowUTC.getTime() + timezoneOffsetInSeconds * 1000);

        const interval = parser.parseExpression(cronExpression, {
            currentDate: nowLocal,
        });
        const nextLocal = interval.next().toDate();

        // Convert local next occurrence back to UTC
        return new Date(nextLocal.getTime() - timezoneOffsetInSeconds * 1000);
    } catch (err) {
        console.log(`[AgenticTasks] Failed to parse cron "${cronExpression}":`, err.message);
        return null;
    }
}

// Schedule a precise delayed Bull job for an agentic task run
// Uses a stable jobId per task (no timestamp) so only one job can exist per task at a time.
// This prevents double-firing from both the chain scheduler and failsafe poll.
function scheduleAgenticRun(taskId, runAt) {
    const delay = Math.max(0, runAt.getTime() - Date.now());
    const jobId = `agentic-run-${taskId}`;
    agenticQueue.add(
        "run-agentic-task",
        { taskId },
        {
            delay,
            jobId,
            removeOnComplete: true,
            removeOnFail: true,
            attempts: 1,
        }
    );
    console.log(`[AgenticTasks] Scheduled task ${taskId} to run in ${Math.round(delay / 1000)}s (jobId: ${jobId})`);
}

function createAgenticTaskTools({ user_id, timezoneOffsetInSeconds, chatId }) {
    return [
        {
            name: "create_agentic_task",
            description:
                "Create a scheduled autonomous task. The task will trigger a full AI agent loop at the scheduled time(s) with the given instruction. Use for recurring automated actions like daily summaries, periodic research, scheduled reports, etc. The agent running the task will have access to web search, web fetch, and other tools.",
            parameters: Type.Object({
                name: Type.String({
                    description:
                        "Short human-readable name for the task (e.g., 'Morning Jokes', 'Daily News Summary'). Max 100 chars.",
                }),
                instruction: Type.String({
                    description:
                        "Detailed instruction for the AI agent to execute on each run. Be specific about what to do, what tools to use, and what format the output should be in.",
                }),
                cron_expression: Type.Optional(
                    Type.String({
                        description:
                            "Cron schedule in user's local timezone (minute hour day-of-month month day-of-week). E.g., '0 10 * * *' for daily at 10am, '0 9 * * MON' for every Monday at 9am. Omit for one-shot tasks.",
                    })
                ),
                run_at: Type.Optional(
                    Type.String({
                        description:
                            "For one-shot tasks: when to run in 'DD/MM/YYYY HH:MM:SS' format (user's local timezone). Omit if using cron_expression.",
                    })
                ),
                end_at: Type.Optional(
                    Type.String({
                        description:
                            "Deadline: stop running after this time. Format: 'DD/MM/YYYY HH:MM:SS' (user's local timezone). After this time, the task auto-completes and no more runs are scheduled. Useful for tasks like 'every 5 mins until 7pm'.",
                    })
                ),
            }),
            execute: async (_toolCallId, args) => {
                try {
                    const tasksDB = await db.getTasksDB();

                    let nextRunAt = null;

                    if (args.cron_expression) {
                        nextRunAt = calculateNextRun(
                            args.cron_expression,
                            timezoneOffsetInSeconds
                        );
                        if (!nextRunAt) {
                            return {
                                output: JSON.stringify({
                                    success: false,
                                    error: "Invalid cron expression. Use format: minute hour day-of-month month day-of-week",
                                }),
                            };
                        }
                    } else if (args.run_at) {
                        // Parse DD/MM/YYYY HH:MM:SS in user's local timezone
                        const parts = args.run_at.split(" ");
                        const dateParts = parts[0].split("/");
                        const timeParts = (parts[1] || "00:00:00").split(":");
                        const localDate = new Date(
                            parseInt(dateParts[2]),
                            parseInt(dateParts[1]) - 1,
                            parseInt(dateParts[0]),
                            parseInt(timeParts[0]),
                            parseInt(timeParts[1]),
                            parseInt(timeParts[2] || 0)
                        );
                        nextRunAt = new Date(
                            localDate.getTime() - timezoneOffsetInSeconds * 1000
                        );
                    } else {
                        return {
                            output: JSON.stringify({
                                success: false,
                                error: "Must provide either cron_expression or run_at",
                            }),
                        };
                    }

                    // Parse end_at deadline if provided
                    let endAt = null;
                    if (args.end_at) {
                        const parts = args.end_at.split(" ");
                        const dateParts = parts[0].split("/");
                        const timeParts = (parts[1] || "00:00:00").split(":");
                        const localDate = new Date(
                            parseInt(dateParts[2]),
                            parseInt(dateParts[1]) - 1,
                            parseInt(dateParts[0]),
                            parseInt(timeParts[0]),
                            parseInt(timeParts[1]),
                            parseInt(timeParts[2] || 0)
                        );
                        endAt = new Date(
                            localDate.getTime() - timezoneOffsetInSeconds * 1000
                        );
                    }

                    const { rows } = await tasksDB.query(
                        `INSERT INTO btw.agentic_tasks (user_id, name, instruction, cron_expression, next_run_at, end_at, mode, entry_point, chat_id)
                         VALUES ($1, $2, $3, $4, $5, $6, 'auto', 'telegram', $7)
                         RETURNING id, name, next_run_at, end_at, status`,
                        [
                            user_id,
                            args.name.slice(0, 100),
                            args.instruction,
                            args.cron_expression || null,
                            nextRunAt,
                            endAt,
                            chatId,
                        ]
                    );

                    const task = rows[0];
                    console.log(
                        `[AgenticTasks] Created auto task ${task.id} "${args.name}" for user ${user_id}, next run: ${task.next_run_at}`
                    );

                    // Schedule precise delayed Bull job for the first run
                    scheduleAgenticRun(task.id, nextRunAt);

                    return {
                        output: JSON.stringify({
                            success: true,
                            action: "create_agentic_task",
                            task: {
                                id: task.id,
                                name: task.name,
                                next_run_at: task.next_run_at,
                                end_at: task.end_at,
                                status: task.status,
                                is_recurring: !!args.cron_expression,
                            },
                        }),
                    };
                } catch (err) {
                    console.log("[AgenticTasks] Create error:", err.message);
                    return {
                        output: JSON.stringify({
                            success: false,
                            error: err.message,
                        }),
                    };
                }
            },
        },
        {
            name: "list_agentic_tasks",
            description:
                "List the user's scheduled autonomous tasks. Shows active and paused tasks with their next run times.",
            parameters: Type.Object({
                status: Type.Optional(
                    StringEnum(["all", "active", "paused", "completed"], {
                        description: "Filter by status. Default: 'all'.",
                    })
                ),
            }),
            execute: async (_toolCallId, args) => {
                try {
                    const tasksDB = await db.getTasksDB();
                    const statusFilter = args.status || "all";

                    let query = `SELECT id, name, instruction, cron_expression, next_run_at, status, created_at
                                 FROM btw.agentic_tasks WHERE user_id = $1 AND mode = 'auto'`;
                    const params = [user_id];

                    if (statusFilter !== "all") {
                        query += ` AND status = $2`;
                        params.push(statusFilter);
                    }

                    query += ` ORDER BY created_at DESC`;

                    const { rows } = await tasksDB.query(query, params);

                    // Get run counts
                    for (const task of rows) {
                        const { rows: countRows } = await tasksDB.query(
                            `SELECT COUNT(*) as count FROM btw.task_runs WHERE task_id = $1`,
                            [task.id]
                        );
                        task.total_runs = parseInt(countRows[0].count);

                        // Get last run info
                        const { rows: lastRun } = await tasksDB.query(
                            `SELECT completed_at, status FROM btw.task_runs WHERE task_id = $1 ORDER BY started_at DESC LIMIT 1`,
                            [task.id]
                        );
                        task.last_run = lastRun[0] || null;
                    }

                    return {
                        output: JSON.stringify({
                            success: true,
                            action: "list_agentic_tasks",
                            count: rows.length,
                            tasks: rows,
                        }),
                    };
                } catch (err) {
                    console.log("[AgenticTasks] List error:", err.message);
                    return {
                        output: JSON.stringify({
                            success: false,
                            error: err.message,
                        }),
                    };
                }
            },
        },
        {
            name: "update_agentic_task",
            description:
                "Update an agentic task. Can change name, instruction, schedule, or pause/resume it.",
            parameters: Type.Object({
                task_id: Type.Number({ description: "ID of the task to update." }),
                name: Type.Optional(
                    Type.String({ description: "New name for the task." })
                ),
                instruction: Type.Optional(
                    Type.String({ description: "New instruction for the task." })
                ),
                cron_expression: Type.Optional(
                    Type.String({
                        description: "New cron schedule. Set to empty string to make it one-shot.",
                    })
                ),
                status: Type.Optional(
                    StringEnum(["active", "paused"], {
                        description: "Set status to 'active' to resume or 'paused' to pause.",
                    })
                ),
            }),
            execute: async (_toolCallId, args) => {
                try {
                    const tasksDB = await db.getTasksDB();

                    // Verify ownership and auto mode
                    const { rows: existing } = await tasksDB.query(
                        `SELECT * FROM btw.agentic_tasks WHERE id = $1 AND user_id = $2 AND mode = 'auto'`,
                        [args.task_id, user_id]
                    );

                    if (existing.length === 0) {
                        return {
                            output: JSON.stringify({
                                success: false,
                                error: "Task not found or you don't own it.",
                            }),
                        };
                    }

                    const updates = [];
                    const values = [];
                    let paramIndex = 1;

                    if (args.name) {
                        updates.push(`name = $${paramIndex++}`);
                        values.push(args.name.slice(0, 100));
                    }
                    if (args.instruction) {
                        updates.push(`instruction = $${paramIndex++}`);
                        values.push(args.instruction);
                    }
                    if (args.status) {
                        updates.push(`status = $${paramIndex++}`);
                        values.push(args.status);
                    }
                    if (args.cron_expression !== undefined) {
                        const cronVal = args.cron_expression || null;
                        updates.push(`cron_expression = $${paramIndex++}`);
                        values.push(cronVal);

                        // Recalculate next_run_at
                        if (cronVal) {
                            const nextRun = calculateNextRun(
                                cronVal,
                                timezoneOffsetInSeconds
                            );
                            if (nextRun) {
                                updates.push(`next_run_at = $${paramIndex++}`);
                                values.push(nextRun);
                            }
                        }
                    }

                    if (updates.length === 0) {
                        return {
                            output: JSON.stringify({
                                success: false,
                                error: "No fields to update.",
                            }),
                        };
                    }

                    updates.push(`updated_at = NOW()`);
                    values.push(args.task_id);
                    values.push(user_id);

                    const { rows } = await tasksDB.query(
                        `UPDATE btw.agentic_tasks SET ${updates.join(", ")}
                         WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
                         RETURNING id, name, status, cron_expression, next_run_at`,
                        values
                    );

                    console.log(
                        `[AgenticTasks] Updated task ${args.task_id} for user ${user_id}`
                    );

                    return {
                        output: JSON.stringify({
                            success: true,
                            action: "update_agentic_task",
                            task: rows[0],
                        }),
                    };
                } catch (err) {
                    console.log("[AgenticTasks] Update error:", err.message);
                    return {
                        output: JSON.stringify({
                            success: false,
                            error: err.message,
                        }),
                    };
                }
            },
        },
        {
            name: "delete_agentic_task",
            description:
                "Delete a scheduled autonomous task and all its run history.",
            parameters: Type.Object({
                task_id: Type.Number({ description: "ID of the task to delete." }),
            }),
            execute: async (_toolCallId, args) => {
                try {
                    const tasksDB = await db.getTasksDB();

                    const { rowCount } = await tasksDB.query(
                        `DELETE FROM btw.agentic_tasks WHERE id = $1 AND user_id = $2 AND mode = 'auto'`,
                        [args.task_id, user_id]
                    );

                    if (rowCount === 0) {
                        return {
                            output: JSON.stringify({
                                success: false,
                                error: "Task not found or you don't own it.",
                            }),
                        };
                    }

                    console.log(
                        `[AgenticTasks] Deleted task ${args.task_id} for user ${user_id}`
                    );

                    return {
                        output: JSON.stringify({
                            success: true,
                            action: "delete_agentic_task",
                            task_id: args.task_id,
                        }),
                    };
                } catch (err) {
                    console.log("[AgenticTasks] Delete error:", err.message);
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

// Tool available during scheduled runs so the agent can self-terminate
function createStopThisTaskTool({ agenticTaskId, user_id }) {
    return {
        name: "stop_this_task",
        description:
            "Stop and complete this scheduled task permanently. Use when the task's deadline has passed, the task is no longer needed, or the instruction says to stop after a certain condition. This prevents any future runs.",
        parameters: Type.Object({
            reason: Type.Optional(
                Type.String({ description: "Brief reason for stopping the task." })
            ),
        }),
        execute: async (_toolCallId, args) => {
            try {
                const tasksDB = await db.getTasksDB();
                await tasksDB.query(
                    `UPDATE btw.agentic_tasks SET status = 'completed', updated_at = NOW() WHERE id = $1 AND user_id = $2`,
                    [agenticTaskId, user_id]
                );
                console.log(
                    `[AgenticTasks] Task ${agenticTaskId} self-stopped: ${args.reason || "no reason given"}`
                );
                return {
                    output: JSON.stringify({
                        success: true,
                        action: "stop_this_task",
                        task_id: agenticTaskId,
                        message: "Task stopped. No more runs will be scheduled.",
                    }),
                };
            } catch (err) {
                return {
                    output: JSON.stringify({ success: false, error: err.message }),
                };
            }
        },
    };
}

module.exports = { createAgenticTaskTools, createStopThisTaskTool, calculateNextRun, scheduleAgenticRun };
