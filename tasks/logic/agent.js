const { getModel, complete, validateToolCall } = require("@mariozechner/pi-ai");
const { createTools } = require("./tools");
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

Rules:
- When adding reminders, extract a SHORT, CRISP text (no filler words like "remind me to"). Example: "Buy milk", "Call mom", "Meeting with John".
- Always add at least one alert when creating a reminder.
- For non-recurring reminders, only add the number of alerts the user asked for (minimum 1, default 10 minutes before due time if unspecified).
- For recurring reminders, add alerts for the next 7 days using the crontab schedule.
- Don't spam — max 10 alerts per day.
- Only reference reminder/alert IDs from the conversation history. NEVER make up IDs.
- All dates/times in tool calls should be in the user's local timezone.
- After performing actions, give a brief confirmation message. Don't repeat all the technical details.
- If you can't do something or something seems wrong, just say so naturally.`;
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

    // Step 2: Build system prompt and conversation history
    const systemPrompt = buildSystemPrompt({
        user_id,
        timezoneOffsetInSeconds,
        familyUsers,
    });

    const conversationHistory = buildConversationMessages({
        messages,
        timezoneOffsetInSeconds,
    });

    // Step 3: Create tools
    const tools = createTools({ user_id, timezoneOffsetInSeconds });

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
        tools,
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
                    const toolDef = tools.find((t) => t.name === call.name);

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
                            tools,
                            call
                        );
                        console.log(
                            `[Agent] Calling tool: ${call.name}`,
                            JSON.stringify(validatedArgs)
                        );

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
}

module.exports = { runAgentLoop };
