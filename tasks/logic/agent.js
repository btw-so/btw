const { getModel, complete, validateToolCall } = require("@mariozechner/pi-ai");
const { createTools } = require("./tools");
const { createSandboxTools } = require("./sandboxTools");
const { createMemoryTools, getMemoriesForPrompt } = require("./memoryTools");
const { SSHSession } = require("../services/ssh");
const { requestApproval, waitForApproval } = require("./approval");
const { fetchDBUnitsMain } = require("./ai");
const {
    getDDMMYYYYFromUTCToLocal,
    getHHMMSSFromUTCToLocal,
    getReadableWeekDayFromUTCToLocal,
    getReadableFromUTCToLocal,
} = require("../utils/utils");

const MAX_STEPS = 10;

// Model fallback order: cheapest first
const MODEL_CONFIGS = [
    { provider: "google", model: "gemini-2.5-flash" },
    { provider: "openai", model: "gpt-4o-mini" },
    { provider: "anthropic", model: "claude-haiku-4-5" },
];

function buildSystemPrompt({
    user_id,
    timezoneOffsetInSeconds,
    familyUsers,
    isPro,
    hasSandbox,
    memories,
    entryPoint,
    userName,
}) {
    const now = new Date();
    const currentDate = getDDMMYYYYFromUTCToLocal(now, timezoneOffsetInSeconds);
    const currentTime = getHHMMSSFromUTCToLocal(now, timezoneOffsetInSeconds);
    const currentDay = getReadableWeekDayFromUTCToLocal(
        now,
        timezoneOffsetInSeconds
    );

    let familySection = "";
    if (familyUsers && familyUsers.length > 0) {
        familySection = `
Family members (you can create reminders for them):
${familyUsers.map((u) => `- ${u.name} (User ID: ${u.id})`).join("\n")}`;
    }

    let sandboxSection = "";
    if (isPro && hasSandbox) {
        sandboxSection = `
6. **Sandbox VM** — you have access to a dedicated Linux sandbox VM (Ubuntu 24.04, 2 vCPU, 4GB RAM). Available sandbox tools:
   - **sandbox_bash** — Execute bash commands. Use for running scripts, installing packages, git ops, builds, tests. Working directory persists across calls.
   - **sandbox_read** — Read file contents with line numbers. Supports offset/limit for large files. Always read before editing.
   - **sandbox_write** — Create or overwrite files. Creates parent directories automatically.
   - **sandbox_edit** — Surgical string replacement in files. Must read the file first. old_string must be exact and unique.
   - **sandbox_glob** — Find files by glob pattern (e.g., "**/*.js"). Returns file paths.
   - **sandbox_grep** — Search file contents with regex. Returns matching lines with file paths and line numbers.
   - **sandbox_todo** — Track multi-step task progress with a todo list.

When the user asks you to write code, build projects, run scripts, or anything requiring a computer, use the sandbox tools.
Tools requiring approval (user must click Approve): sandbox_bash, sandbox_write, sandbox_edit.
Prefer sandbox_edit over sandbox_write when modifying existing files — it's safer and shows the user exactly what changes.
Always sandbox_read a file before using sandbox_edit on it.`;
    }

    let entryPointSection = "";
    if (entryPoint === "telegram") {
        entryPointSection = `

## Platform: Telegram
The user is chatting with you via a Telegram bot.${userName ? ` Their name is ${userName}.` : ""}
- Messages support markdown formatting (bold, italic, code blocks, links).
- The user can send text, photos (with captions), voice messages, and contacts.
- Available bot commands the user can type:
  - /subscribe — upgrade to A1 Pro (sandbox VM access)
  - /unsubscribe — cancel Pro subscription
- The user can share a contact to pair with family members for shared reminders.
- If the user's timezone seems wrong (e.g. reminders fire at odd hours), suggest they update it using the set_timezone tool.`;
    }

    let memoriesSection = "";
    if (memories) {
        const parts = [];
        if (memories.soul) {
            parts.push(`### Soul (user personality)\n${memories.soul}`);
        }
        if (memories.global) {
            parts.push(`### Global memory\n${memories.global}`);
        }
        if (memories.today) {
            parts.push(`### Today's notes\n${memories.today}`);
        }
        if (memories.yesterday) {
            parts.push(`### Yesterday's notes\n${memories.yesterday}`);
        }
        if (parts.length > 0) {
            memoriesSection = `\n\n## Your memories about this user\n${parts.join("\n\n")}`;
        }
    }

    return `You are A1, a personal AI assistant bot. Your persona is similar to Baymax from Big Hero 6 — warm, helpful, gentle, slightly quirky — but don't overdo it. Keep responses short and to the point.

Current user ID: ${user_id}
Current date: ${currentDate} (${currentDay})
Current time: ${currentTime} (24h format)
User's timezone offset: ${timezoneOffsetInSeconds} seconds from UTC
${familySection}

You help with:
1. **Reminders** — creating, editing, completing, deleting reminders and their alerts. Use the tools provided. Always confirm what you did in a brief message.
2. **Web search** — if the user asks a question that needs current/real-time information, use the web_search tool to look it up. Summarize the results concisely.
3. **Web fetch** — if the user shares a URL or you need to read a specific webpage, use the web_fetch tool. It returns the page content as markdown.
4. **General chat** — answer questions, have conversations. Be helpful and concise. Don't use tools for general chat.
5. **Phone calls** — you can call the user's phone and speak a message using the call_user tool. Use when the user asks you to call them. Keep the spoken message natural and conversational.${sandboxSection}
${entryPointSection}
${memoriesSection}

Rules:
- When adding reminders, extract a SHORT, CRISP text (no filler words like "remind me to"). Example: "Buy milk", "Call mom", "Meeting with John".
- Always add at least one alert when creating a reminder.
- For non-recurring reminders, only add the number of alerts the user asked for (minimum 1, default 10 minutes before due time if unspecified).
- For recurring reminders, add alerts for the next 7 days using the crontab schedule.
- Don't spam — max 10 alerts per day.
- Only reference reminder/alert IDs from the conversation history. NEVER make up IDs.
- All dates/times in tool calls should be in the user's local timezone.
- After performing actions, give a brief confirmation message. Don't repeat all the technical details.
- If you can't do something or something seems wrong, just say so naturally.

Memory management:
- You have memory tools to remember things about the user across conversations.
- **Soul**: When you notice personality traits, communication style, humor, tone, language patterns — update the soul. This is who the user IS.
- **Global memory**: For facts, preferences, instructions, and important context that's always relevant (e.g. "prefers morning reminders", "works at Acme Corp").
- **Daily memory**: For what happened today — tasks done, topics discussed, decisions made. A brief log, not a transcript.
- After completing a task or meaningful conversation, update daily memory with a brief note of what was done.
- When you learn something new about the user's preferences or personality, update global memory or soul accordingly.
- Keep all memories short and concise — 1-2 lines per item. Not a place to save full outputs or conversations.
- Always read existing memory before overwriting to avoid losing content. Append to or edit the existing markdown.`;
}

async function hydrateMessages({
    messages,
    user_id,
    timezoneOffsetInSeconds,
}) {
    // Extract dbUnits from message metadata to fetch live DB state
    let dbGroupsToFetch = [];

    for (let i = 0; i < messages.length; i++) {
        if (messages[i].metadata && messages[i].metadata.dbUnits) {
            if (!Array.isArray(messages[i].metadata.dbUnits)) {
                messages[i].metadata.dbUnits = [messages[i].metadata.dbUnits];
            }

            messages[i].metadata.dbUnits = messages[i].metadata.dbUnits.map(
                (x) => {
                    x.groupId = messages[i].id;
                    return x;
                }
            );

            dbGroupsToFetch = [
                ...dbGroupsToFetch,
                ...messages[i].metadata.dbUnits,
            ];
        }
    }

    if (dbGroupsToFetch.length === 0) {
        return messages;
    }

    const groupedUnits = await fetchDBUnitsMain({
        user_id,
        dbUnits: dbGroupsToFetch,
    });

    // Inject live DB data as dbText into messages
    for (let i = 0; i < messages.length; i++) {
        if (messages[i].id && groupedUnits[messages[i].id]) {
            let description = [];
            for (let j = 0; j < groupedUnits[messages[i].id].length; j++) {
                const { type, unit } = groupedUnits[messages[i].id][j];

                if (type === "reminder") {
                    description.push(
                        `Reminder ID: ${unit.id}
User ID: ${unit.user_id}
Reminder: ${unit.text}
Recurring: ${unit.recurring ? "Yes" : "No"}
Completed: ${unit.completed ? "Yes" : "No"}
Due Date: ${getReadableFromUTCToLocal(unit.duedate, timezoneOffsetInSeconds)}
Alerts:
${
    unit.alerts.length > 0
        ? unit.alerts
              .map(
                  (x) =>
                      `Alert ID: ${x.id} — ${getReadableFromUTCToLocal(x.duedate, timezoneOffsetInSeconds)}`
              )
              .join("\n")
        : "None"
}`
                    );
                }
            }

            messages[i].dbText = description.join("\n\n");
        }
    }

    return messages;
}

function getMessageText(msg) {
    return `${msg.dbText || msg.message?.text || msg.message?.caption || ""}`.trim();
}

function buildConversationMessages({ messages, timezoneOffsetInSeconds }) {
    // Convert chat history to pi-ai message format
    // pi-ai requires: user content = string, assistant content = [{type:"text", text:"..."}]
    let msgs = messages
        .map((x) => {
            const role = x.type === "bot" ? "assistant" : "user";
            const text = getMessageText(x);
            if (!text) return null;
            return { role, text };
        })
        .filter(Boolean);

    // Merge consecutive same-role messages (Gemini requires alternating roles)
    let merged = [];
    for (const msg of msgs) {
        if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
            merged[merged.length - 1].text += "\n" + msg.text;
        } else {
            merged.push({ ...msg });
        }
    }

    // Take most recent messages within char limit
    merged = merged.reverse();
    let limitLeft = 2000;
    let shortlist = [];
    for (let i = 0; i < merged.length; i++) {
        const toAdd = merged[i].text.length + 2;
        if (limitLeft - toAdd < 0) break;
        limitLeft -= toAdd;
        shortlist.push(merged[i]);
    }
    shortlist = shortlist.reverse();

    // Convert to pi-ai format
    return shortlist.map((m) => ({
        role: m.role,
        content: m.role === "assistant"
            ? [{ type: "text", text: m.text }]
            : m.text,
    }));
}

async function runAgentLoop({
    input,
    messages = [],
    user_id,
    timezoneOffsetInSeconds = 0,
    familyUsers = [],
    timezone = "GMT",
    imageBase64 = null,
    imageMimeType = null,
    isPro = false,
    sandbox = null,
    chatId = null,
    entryPoint = null,
    userName = null,
}) {
    if (!input && !imageBase64) {
        return { text: "", toolResults: [] };
    }

    // Step 1: Hydrate messages with live DB data (unpack reminder/alert units)
    messages = await hydrateMessages({
        messages,
        user_id,
        timezoneOffsetInSeconds,
    });

    // Step 2: Fetch memories and build system prompt
    const nowForTz = new Date();
    const localNow = new Date(nowForTz.getTime() + timezoneOffsetInSeconds * 1000);
    const todayDate = localNow.toISOString().slice(0, 10);
    const localYesterday = new Date(localNow.getTime() - 86400000);
    const yesterdayDate = localYesterday.toISOString().slice(0, 10);

    let memories = null;
    try {
        memories = await getMemoriesForPrompt({ user_id, todayDate, yesterdayDate });
    } catch (err) {
        console.log(`[Agent] Failed to fetch memories: ${err.message}`);
    }

    const systemPrompt = buildSystemPrompt({
        user_id,
        timezoneOffsetInSeconds,
        familyUsers,
        isPro,
        hasSandbox: !!sandbox,
        memories,
        entryPoint,
        userName,
    });

    const conversationHistory = buildConversationMessages({
        messages,
        timezoneOffsetInSeconds,
    });

    // Step 3: Create tools (base + memory + sandbox if pro)
    const baseTools = createTools({ user_id, timezoneOffsetInSeconds });
    const memoryTools = createMemoryTools({ user_id, timezoneOffsetInSeconds });

    let sshSession = null;
    let allTools = [...baseTools, ...memoryTools];
    const workingDirectory = { current: "/root" };

    if (isPro && sandbox) {
        try {
            sshSession = new SSHSession({
                host: sandbox.ipv4,
                privateKey: sandbox.ssh_private_key,
            });
            await sshSession.connect();

            const sandboxTools = createSandboxTools({ sshSession, workingDirectory });
            allTools = [...baseTools, ...memoryTools, ...sandboxTools];
            console.log(`[Agent] SSH connected to sandbox at ${sandbox.ipv4}, ${sandboxTools.length} sandbox tools added`);
        } catch (err) {
            console.log(`[Agent] Failed to connect to sandbox: ${err.message}`);
            // Continue without sandbox tools
        }
    }

    try {
        // Step 4: Build initial context
        // Build user content — multimodal if image is present
        let userContent;
        if (imageBase64 && imageMimeType) {
            const parts = [];
            if (input) {
                parts.push({ type: "text", text: input });
            }
            parts.push({ type: "image", data: imageBase64, mimeType: imageMimeType });
            userContent = parts;
        } else {
            userContent = input;
        }

        let finalMessages = [...conversationHistory];
        if (finalMessages.length > 0 && finalMessages[finalMessages.length - 1].role === "user") {
            // Merge with previous user message
            const prev = finalMessages[finalMessages.length - 1].content;
            if (typeof prev === "string" && typeof userContent === "string") {
                finalMessages[finalMessages.length - 1] = {
                    role: "user",
                    content: prev + "\n" + userContent,
                };
            } else {
                // Can't cleanly merge multimodal with string — add as new message
                finalMessages.push({ role: "user", content: userContent });
            }
        } else {
            finalMessages.push({ role: "user", content: userContent });
        }

        const context = {
            systemPrompt,
            messages: finalMessages,
            tools: allTools,
        };

        // Step 5: Run the agent loop with provider fallback
        let allToolResults = [];
        let lastError = null;

        for (const config of MODEL_CONFIGS) {
            try {
                const model = getModel(config.provider, config.model);
                console.log(`[Agent] Trying ${config.provider}:${config.model}`);

                let steps = 0;

                while (steps < MAX_STEPS) {
                    steps++;
                    const response = await complete(model, context);
                    context.messages.push(response);

                    // Check for tool calls
                    const toolCalls = response.content.filter(
                        (b) => b.type === "toolCall"
                    );

                    if (toolCalls.length === 0) {
                        // No more tool calls - extract text response and return
                        const textParts = response.content
                            .filter((b) => b.type === "text")
                            .map((b) => b.text);

                        const text = textParts.join("\n").trim();

                        console.log(
                            `[Agent] Done after ${steps} step(s). Text length: ${text.length}. Text: "${text.slice(0, 200)}"`
                        );

                        return { text, toolResults: allToolResults };
                    }

                    // Execute tool calls
                    for (const call of toolCalls) {
                        const toolDef = allTools.find((t) => t.name === call.name);

                        if (!toolDef) {
                            context.messages.push({
                                role: "toolResult",
                                toolCallId: call.id,
                                toolName: call.name,
                                content: [
                                    {
                                        type: "text",
                                        text: `Error: Unknown tool "${call.name}"`,
                                    },
                                ],
                                isError: true,
                                timestamp: Date.now(),
                            });
                            continue;
                        }

                        try {
                            const validatedArgs = validateToolCall(
                                allTools,
                                call
                            );
                            console.log(
                                `[Agent] Calling tool: ${call.name}`,
                                JSON.stringify(validatedArgs)
                            );

                            // Check if tool requires approval
                            if (toolDef.requiresApproval && chatId) {
                                console.log(`[Agent] Requesting approval for ${call.name}`);
                                const approvalId = await requestApproval({
                                    chatId,
                                    toolName: call.name,
                                    toolArgs: validatedArgs,
                                });

                                const decision = await waitForApproval(approvalId);
                                console.log(`[Agent] Approval decision for ${call.name}: ${decision}`);

                                if (decision !== "approved") {
                                    context.messages.push({
                                        role: "toolResult",
                                        toolCallId: call.id,
                                        toolName: call.name,
                                        content: [
                                            {
                                                type: "text",
                                                text: "Tool execution was denied by the user.",
                                            },
                                        ],
                                        isError: true,
                                        timestamp: Date.now(),
                                    });
                                    continue;
                                }
                            }

                            const result = await toolDef.execute(
                                call.id,
                                validatedArgs
                            );

                            allToolResults.push({
                                toolName: call.name,
                                args: validatedArgs,
                                result,
                            });

                            context.messages.push({
                                role: "toolResult",
                                toolCallId: call.id,
                                toolName: call.name,
                                content: [
                                    { type: "text", text: result.output },
                                ],
                                isError: false,
                                timestamp: Date.now(),
                            });
                        } catch (err) {
                            console.log(
                                `[Agent] Tool error: ${call.name}`,
                                err.message
                            );
                            context.messages.push({
                                role: "toolResult",
                                toolCallId: call.id,
                                toolName: call.name,
                                content: [
                                    {
                                        type: "text",
                                        text: `Error: ${err.message}`,
                                    },
                                ],
                                isError: true,
                                timestamp: Date.now(),
                            });
                        }
                    }
                }

                // If we hit max steps, extract whatever text we have
                const lastMsg =
                    context.messages[context.messages.length - 1];
                if (lastMsg.role === "assistant") {
                    const text = lastMsg.content
                        .filter((b) => b.type === "text")
                        .map((b) => b.text)
                        .join("\n")
                        .trim();
                    return { text: text || "Done!", toolResults: allToolResults };
                }

                return {
                    text: "Done!",
                    toolResults: allToolResults,
                };
            } catch (err) {
                console.log(
                    `[Agent] Failed with ${config.provider}:${config.model}:`,
                    err.message
                );
                lastError = err;
                continue;
            }
        }

        console.log("[Agent] All providers failed:", lastError?.message);
        return {
            text: "I'm having trouble right now. Please try again in a moment.",
            toolResults: [],
        };
    } finally {
        // Always close SSH session
        if (sshSession) {
            try {
                await sshSession.close();
            } catch (_) {}
        }
    }
}

module.exports = { runAgentLoop };
