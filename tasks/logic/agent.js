"use strict";

const { Agent } = require("@mariozechner/pi-agent-core");
const { getModel } = require("@mariozechner/pi-ai");
const { createTools } = require("./tools");
const { createSandboxTools } = require("./sandboxTools");
const { createMemoryTools, getMemoriesForPrompt } = require("./memoryTools");
const { createMCPManagementTools } = require("./mcpManagementTools");
const { adaptTools } = require("./toolAdapter");
const { loadUserSkills } = require("./skills");
const { loadUserTools, formatCustomToolsForPrompt } = require("./customTools");
const { loadMCPTools, formatMCPForPrompt } = require("./mcpClient");
const { createAgenticTaskTools, createStopThisTaskTool } = require("./agenticTaskTools");
const { SSHSession } = require("../services/ssh");
const { fetchDBUnitsMain } = require("./ai");
const {
    getDDMMYYYYFromUTCToLocal,
    getHHMMSSFromUTCToLocal,
    getReadableWeekDayFromUTCToLocal,
    getReadableFromUTCToLocal,
} = require("../utils/utils");

const MAX_STEPS = 30;
const MAX_MESSAGES_BEFORE_PRUNE = 40;

// Model fallback order: cheapest first
const MODEL_CONFIGS = [
    { provider: "google", model: "gemini-3-flash-preview" },
    { provider: "google", model: "gemini-2.5-flash" },
];

// ─── System Prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt({
    user_id,
    timezoneOffsetInSeconds,
    familyUsers,
    isPro,
    hasSandbox,
    memories,
    entryPoint,
    userName,
    skillsSection = "",
    customToolsSection = "",
    mcpSection = "",
    isScheduledRun = false,
    agenticInstruction = "",
    taskWorkspace = null,
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
7. **Sandbox VM** — you have access to a dedicated Linux sandbox VM (Ubuntu 24.04, 2 vCPU, 4GB RAM). Available sandbox tools:
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

    // Combine extension sections (skills, custom tools, MCPs)
    const extensionSections = [skillsSection, customToolsSection, mcpSection]
        .filter(Boolean)
        .join("\n");

    let agenticTaskSection = "";
    if (isScheduledRun) {
        let workspaceSection = "";
        if (taskWorkspace) {
            workspaceSection = `

**Workspace:** \`${taskWorkspace}\`
Your working directory is set to this workspace. It persists across runs.
- Before starting, check if \`PROGRESS.md\` exists in the workspace using sandbox_read. If it does, it contains notes from your previous runs — read it to understand what you've already done.
- After completing your work, update \`PROGRESS.md\` with a brief log entry for this run (date, what you did, key results). Keep it concise — append to the existing content, don't overwrite.
- You can also store any files or artifacts in this workspace that might be useful for future runs.`;
        }

        agenticTaskSection = `

## AUTONOMOUS TASK EXECUTION
You are running as a scheduled autonomous task. This task runs on a recurring schedule.

**Your instruction:**
${agenticInstruction}
${workspaceSection}

Execute this instruction now. Use your available tools (web search, web fetch, etc.) as needed. Provide a complete response — the user will receive it as a notification.

Important:
- You are running autonomously — the user is not actively chatting. Do the work and provide the result.
- If the instruction requires research, use web_search and web_fetch tools.
- Be concise but thorough in your response.
- Do NOT create new agentic tasks from within a task run.
- If the task has a deadline or time limit and it has passed, call the **stop_this_task** tool to permanently stop this task. This prevents future runs.
- **IMPORTANT: The conversation history above contains results from your PREVIOUS runs of this same task.** Review them carefully and DO NOT repeat the same content. For example, if you told a joke before, tell a different one. If you fetched news before, find new stories. Always provide fresh, varied content.`;
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
5. **Phone calls** — you can call the user's phone and speak a message using the call_user tool. Use when the user asks you to call them. Keep the spoken message natural and conversational.
6. **Text to speech** — you can convert text to speech and send it as an audio message using the text_to_speech tool. Use when the user asks you to speak, say something out loud, read something aloud, or send a voice message. Multiple voices available.
7. **Image generation** — you can generate images from text descriptions using the generate_image tool. Use when the user asks you to create, draw, generate, or make an image, picture, illustration, or artwork. Provide a detailed prompt for best results.${sandboxSection}
${entryPointSection}
${extensionSections}
${memoriesSection}
${agenticTaskSection}

Reminders vs Agentic Tasks:
- **Reminders** are simple notifications — they just show a text message at the scheduled time. Use for: "remind me to buy milk", "remind me about the meeting", "remind me to call mom at 5pm".
- **Agentic tasks** are scheduled AI actions — they run a full agent loop at the scheduled time to DO something. Use for: "in 5 mins tell me top HN stories", "every morning find me a joke", "at 3pm research flights to Tokyo and send me a summary".
- Rule of thumb: if the user wants you to **do work** at a future time (search, fetch, summarize, research), use create_agentic_task. If they just want a **notification/nudge**, use add_reminder.

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

Research behavior:
- When the user asks you to research, compare, or look something up — ALWAYS use web_search and web_fetch tools. Do multiple searches with different queries to get comprehensive information. Do NOT just acknowledge the request without using tools.
- NEVER say "I'm looking into it" or "I'm still working on it" without actually using tools in the same response. You cannot do background work — each message is a separate request. Either do the work NOW with tools, or tell the user you need more specific instructions.
- For comparison requests (e.g. "compare X vs Y pricing"), do at least 2-3 web searches and try to fetch the actual pricing pages with web_fetch.
- When the user says "do deep research" or similar, make multiple web_search calls with different angles, fetch relevant pages, and provide a thorough answer with specifics (numbers, pricing tiers, feature comparisons).

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

// ─── Context Pruning ─────────────────────────────────────────────────────────

function transformContext(messages) {
    if (messages.length <= MAX_MESSAGES_BEFORE_PRUNE) {
        return messages;
    }

    // Keep the system prompt (first message if role === 'system') and last 40 messages
    const keepCount = MAX_MESSAGES_BEFORE_PRUNE;
    const hasSystem = messages.length > 0 && messages[0].role === "system";
    const systemMsg = hasSystem ? messages[0] : null;
    const nonSystem = hasSystem ? messages.slice(1) : messages;

    if (nonSystem.length <= keepCount) {
        return messages;
    }

    const olderMessages = nonSystem.slice(0, nonSystem.length - keepCount);
    const recentMessages = nonSystem.slice(nonSystem.length - keepCount);

    // Summarize older messages: extract text content, truncate tool results
    const summaryParts = [];
    for (const msg of olderMessages) {
        if (msg.role === "user") {
            const text = typeof msg.content === "string"
                ? msg.content
                : Array.isArray(msg.content)
                    ? msg.content.filter(b => b.type === "text").map(b => b.text).join(" ")
                    : "";
            if (text) summaryParts.push(`User: ${text.slice(0, 150)}`);
        } else if (msg.role === "assistant") {
            const text = Array.isArray(msg.content)
                ? msg.content.filter(b => b.type === "text").map(b => b.text).join(" ")
                : typeof msg.content === "string" ? msg.content : "";
            if (text) summaryParts.push(`Assistant: ${text.slice(0, 150)}`);
        }
    }

    const summaryMessage = {
        role: "user",
        content: `[Earlier conversation summary - ${olderMessages.length} messages truncated]\n${summaryParts.join("\n")}`,
        timestamp: Date.now(),
    };

    const result = [];
    if (systemMsg) result.push(systemMsg);
    result.push(summaryMessage);
    result.push(...recentMessages);

    console.log(`[Agent] Pruned context: ${messages.length} → ${result.length} messages`);
    return result;
}

// ─── Message Hydration & Conversion ──────────────────────────────────────────

async function hydrateMessages({
    messages,
    user_id,
    timezoneOffsetInSeconds,
}) {
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

    // Convert to pi-ai message format (pass all history — models handle large contexts natively)
    return merged.map((m) => ({
        role: m.role,
        content:
            m.role === "assistant"
                ? [{ type: "text", text: m.text }]
                : m.text,
        timestamp: Date.now(),
    }));
}

// ─── Agent Loop ──────────────────────────────────────────────────────────────

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
    // Agentic task params
    agenticTaskId = null,
    agenticTaskMessages = null, // Restored pi-agent messages from DB (JSONB)
    isScheduledRun = false,     // true if triggered by cron (auto mode)
    workingDirectory = null,    // Persisted working dir object { current: "/root" }
    agenticInstruction = "",    // For scheduled runs: the instruction to execute
    taskWorkspace = null,       // Dedicated sandbox workspace path (pro only)
}) {
    if (!input && !imageBase64) {
        return { text: "", toolResults: [], agentMessages: [] };
    }

    // Step 1: Fetch memories
    const nowForTz = new Date();
    const localNow = new Date(
        nowForTz.getTime() + timezoneOffsetInSeconds * 1000
    );
    const todayDate = localNow.toISOString().slice(0, 10);
    const localYesterday = new Date(localNow.getTime() - 86400000);
    const yesterdayDate = localYesterday.toISOString().slice(0, 10);

    let memories = null;
    try {
        memories = await getMemoriesForPrompt({
            user_id,
            todayDate,
            yesterdayDate,
        });
    } catch (err) {
        console.log(`[Agent] Failed to fetch memories: ${err.message}`);
    }

    // Step 2: Create tools — base + memory always, sandbox + extensions if pro
    const baseTools = adaptTools(
        createTools({ user_id, timezoneOffsetInSeconds, chatId }),
        chatId
    );
    const memoryTools = adaptTools(
        createMemoryTools({ user_id, timezoneOffsetInSeconds }),
        chatId
    );

    // Agentic task tools: CRUD tools in manual mode, stop_this_task in scheduled runs
    const agenticTools = isScheduledRun
        ? (agenticTaskId
            ? adaptTools([createStopThisTaskTool({ agenticTaskId, user_id })], chatId)
            : [])
        : adaptTools(
              createAgenticTaskTools({ user_id, timezoneOffsetInSeconds, chatId }),
              chatId
          );

    let sshSession = null;
    let mcpCleanup = [];
    let allTools = [...baseTools, ...memoryTools, ...agenticTools];
    const wdObj = workingDirectory || { current: "/root" };

    // Extension sections for system prompt
    let skillsSection = "";
    let customToolsSection = "";
    let mcpSection = "";

    if (isPro && sandbox) {
        try {
            sshSession = new SSHSession({
                host: sandbox.ipv4,
                privateKey: sandbox.ssh_private_key,
            });
            await sshSession.connect();

            // Sandbox tools (adapted to AgentTool format)
            // For scheduled runs, pass chatId=null to skip approval
            const sandboxTools = adaptTools(
                createSandboxTools({ sshSession, workingDirectory: wdObj }),
                isScheduledRun ? null : chatId
            );

            // Load user skills → system prompt injection
            try {
                skillsSection = await loadUserSkills(sshSession);
                if (skillsSection) {
                    console.log(`[Agent] Skills loaded`);
                }
            } catch (err) {
                console.log(`[Agent] Failed to load skills: ${err.message}`);
            }

            // Load custom tools from sandbox
            let customTools = [];
            try {
                customTools = await loadUserTools({
                    sshSession,
                    workingDirectory: wdObj,
                    chatId,
                });
                if (customTools.length > 0) {
                    customToolsSection = formatCustomToolsForPrompt(
                        customTools.map((t) => t.name)
                    );
                    console.log(
                        `[Agent] ${customTools.length} custom tool(s) loaded`
                    );
                }
            } catch (err) {
                console.log(
                    `[Agent] Failed to load custom tools: ${err.message}`
                );
            }

            // Load MCP tools
            let mcpTools = [];
            try {
                const mcpResult = await loadMCPTools({
                    user_id,
                    sandbox,
                    sshSession,
                    chatId,
                });
                mcpTools = mcpResult.tools;
                mcpCleanup = mcpResult.cleanup;
                if (mcpTools.length > 0) {
                    // Get connected server names for prompt
                    const serverNames = [
                        ...new Set(
                            mcpTools.map((t) =>
                                t.name.replace(/^mcp_/, "").replace(/_.*$/, "")
                            )
                        ),
                    ];
                    mcpSection = formatMCPForPrompt(serverNames);
                    console.log(
                        `[Agent] ${mcpTools.length} MCP tool(s) loaded`
                    );
                }
            } catch (err) {
                console.log(
                    `[Agent] Failed to load MCP tools: ${err.message}`
                );
            }

            // MCP management tools (adapted from legacy format)
            const mcpMgmtTools = adaptTools(
                createMCPManagementTools({ user_id, sshSession }),
                chatId
            );

            allTools = [
                ...baseTools,
                ...memoryTools,
                ...agenticTools,
                ...sandboxTools,
                ...customTools,
                ...mcpTools,
                ...mcpMgmtTools,
            ];

            console.log(
                `[Agent] SSH connected to sandbox at ${sandbox.ipv4}, ${allTools.length} total tools`
            );
        } catch (err) {
            console.log(
                `[Agent] Failed to connect to sandbox: ${err.message}`
            );
            // Continue without sandbox tools
        }
    }

    // Step 3: Build system prompt with extension sections
    const systemPrompt = buildSystemPrompt({
        user_id,
        timezoneOffsetInSeconds,
        familyUsers,
        isPro,
        hasSandbox: !!sandbox,
        memories,
        entryPoint,
        userName,
        skillsSection,
        customToolsSection,
        mcpSection,
        isScheduledRun,
        agenticInstruction,
        taskWorkspace,
    });

    // Step 4: Build messages
    let finalMessages;

    if (agenticTaskMessages && agenticTaskMessages.length > 0) {
        // Resume from saved task messages — filter out error/malformed messages
        const cleanMessages = agenticTaskMessages.filter((m) => {
            // Drop messages with error stopReason
            if (m.stopReason === "error") return false;
            // Drop assistant messages with empty content
            if (m.role === "assistant" && Array.isArray(m.content) && m.content.length === 0) return false;
            return true;
        });
        finalMessages = [...cleanMessages];

        // Add new user message
        let userContent;
        if (imageBase64 && imageMimeType) {
            const parts = [];
            if (input) parts.push({ type: "text", text: input });
            parts.push({ type: "image", data: imageBase64, mimeType: imageMimeType });
            userContent = parts;
        } else {
            userContent = input;
        }

        // Merge with last message if both user role (Gemini requires alternating)
        if (
            finalMessages.length > 0 &&
            finalMessages[finalMessages.length - 1].role === "user" &&
            typeof userContent === "string" &&
            typeof finalMessages[finalMessages.length - 1].content === "string"
        ) {
            finalMessages[finalMessages.length - 1] = {
                ...finalMessages[finalMessages.length - 1],
                content: finalMessages[finalMessages.length - 1].content + "\n" + userContent,
            };
        } else {
            finalMessages.push({
                role: "user",
                content: userContent,
                timestamp: Date.now(),
            });
        }
    } else {
        // Legacy path: build from telegram chat history
        const hydratedMessages = await hydrateMessages({
            messages,
            user_id,
            timezoneOffsetInSeconds,
        });

        const conversationHistory = buildConversationMessages({
            messages: hydratedMessages,
            timezoneOffsetInSeconds,
        });

        let userContent;
        if (imageBase64 && imageMimeType) {
            const parts = [];
            if (input) parts.push({ type: "text", text: input });
            parts.push({ type: "image", data: imageBase64, mimeType: imageMimeType });
            userContent = parts;
        } else {
            userContent = input;
        }

        finalMessages = [...conversationHistory];
        if (
            finalMessages.length > 0 &&
            finalMessages[finalMessages.length - 1].role === "user"
        ) {
            const prev = finalMessages[finalMessages.length - 1].content;
            if (typeof prev === "string" && typeof userContent === "string") {
                finalMessages[finalMessages.length - 1] = {
                    role: "user",
                    content: prev + "\n" + userContent,
                    timestamp: Date.now(),
                };
            } else {
                finalMessages.push({
                    role: "user",
                    content: userContent,
                    timestamp: Date.now(),
                });
            }
        } else {
            finalMessages.push({
                role: "user",
                content: userContent,
                timestamp: Date.now(),
            });
        }
    }

    try {
        // Step 5: Run agent with provider fallback
        let allToolResults = [];
        let lastError = null;

        for (const config of MODEL_CONFIGS) {
            try {
                const model = getModel(config.provider, config.model);
                console.log(
                    `[Agent] Trying ${config.provider}:${config.model}`
                );

                const agent = new Agent({
                    initialState: {
                        systemPrompt,
                        model,
                        thinkingLevel: "off",
                        tools: allTools,
                        messages: finalMessages,
                        transformContext,
                    },
                });

                let finalText = "";
                let turns = 0;
                let fullMessages = [];

                const unsubscribe = agent.subscribe((event) => {
                    switch (event.type) {
                        case "turn_start":
                            turns++;
                            if (turns > MAX_STEPS) {
                                console.log(
                                    `[Agent] Max steps (${MAX_STEPS}) reached, aborting`
                                );
                                agent.abort();
                            }
                            break;
                        case "tool_execution_start":
                            console.log(
                                `[Agent] Tool: ${event.toolName}`,
                                JSON.stringify(event.args).slice(0, 200)
                            );
                            break;
                        case "tool_execution_end":
                            allToolResults.push({
                                toolName: event.toolName,
                                result: event.result,
                                isError: event.isError,
                            });
                            break;
                        case "agent_end":
                            // Capture full message state for persistence
                            fullMessages = event.messages || [];
                            // Extract text from the last assistant message
                            const lastAssistant = fullMessages
                                .filter((m) => m.role === "assistant")
                                .pop();
                            if (lastAssistant) {
                                console.log(`[Agent] Last assistant stopReason: ${lastAssistant.stopReason}, content types: ${(lastAssistant.content || []).map(b => b.type).join(",")}`);
                            }
                            console.log(`[Agent] agent_end: ${fullMessages.length} messages, roles: ${fullMessages.map(m => m.role).join(",")}`);
                            if (lastAssistant && lastAssistant.content) {
                                finalText = lastAssistant.content
                                    .filter((b) => b.type === "text")
                                    .map((b) => b.text)
                                    .join("\n")
                                    .trim();
                            }
                            break;
                    }
                });

                // Use continue() since messages already include the user prompt
                await agent.continue();
                await agent.waitForIdle();
                unsubscribe();

                console.log(
                    `[Agent] Done after ${turns} turn(s). Text length: ${finalText.length}. Text: "${finalText.slice(0, 200)}"`
                );

                // Combine initial messages with agent-generated messages for full history
                // event.messages only contains NEW messages from the agent, not the initial ones
                const allMessages = [...finalMessages, ...fullMessages];

                return {
                    text: finalText || "Sorry, I couldn't process that. Please try again.",
                    toolResults: allToolResults,
                    agentMessages: allMessages,
                    workingDirectory: wdObj.current,
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
            agentMessages: [],
            workingDirectory: wdObj.current,
        };
    } finally {
        // Always clean up MCP clients and SSH session
        for (const closeFn of mcpCleanup) {
            try {
                await closeFn();
            } catch (_) {}
        }
        if (sshSession) {
            try {
                await sshSession.close();
            } catch (_) {}
        }
    }
}

module.exports = { runAgentLoop };
