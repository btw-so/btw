"use strict";

const { requestApproval, waitForApproval } = require("./approval");

const TOOLS_DIR = "~/a1/tools";

/**
 * Load custom tool definitions from the sandbox VM and create AgentTool objects.
 * Tool definitions are JSON files at ~/a1/tools/<name>.json.
 *
 * Format:
 * {
 *   "name": "tool_name",
 *   "description": "What this tool does",
 *   "parameters": { "type": "object", "properties": {...}, "required": [...] },
 *   "type": "command" | "script",
 *   "command": "shell command to run",     // for type: "command"
 *   "script": "path/to/script.sh"          // for type: "script"
 * }
 *
 * Arguments are passed as TOOL_<ARG_NAME> environment variables (safe, no injection).
 * All custom tools require approval.
 */
async function loadUserTools({ sshSession, workingDirectory, chatId }) {
    try {
        // List JSON files first
        const { stdout: fileList, exitCode } = await sshSession.exec(
            `ls ${TOOLS_DIR}/*.json 2>/dev/null`,
            { timeout: 5000 }
        );

        if (exitCode !== 0 || !fileList.trim()) return [];

        const files = fileList.trim().split("\n").filter(Boolean);
        const tools = [];

        // Read each file individually
        for (const filePath of files) {
            try {
                const { stdout: content } = await sshSession.exec(
                    `cat "${filePath}"`,
                    { timeout: 5000 }
                );
                const def = JSON.parse(content.trim());
                if (!def.name || !def.description || !def.parameters) {
                    console.log(
                        `[CustomTools] Skipping malformed tool in ${filePath}: ${JSON.stringify(def).slice(0, 100)}`
                    );
                    continue;
                }

                tools.push(
                    createCustomTool({ def, sshSession, workingDirectory, chatId })
                );
                console.log(`[CustomTools] Loaded custom tool: custom_${def.name}`);
            } catch (e) {
                console.log(
                    `[CustomTools] Failed to parse ${filePath}: ${e.message}`
                );
            }
        }

        return tools;
    } catch (err) {
        console.log(`[CustomTools] Failed to load custom tools: ${err.message}`);
        return [];
    }
}

function createCustomTool({ def, sshSession, workingDirectory, chatId }) {
    return {
        name: `custom_${def.name}`,
        label: `custom_${def.name}`,
        description: def.description,
        parameters: def.parameters, // raw JSON Schema — AJV handles it
        execute: async (toolCallId, args, signal, onUpdate) => {
            // All custom tools require approval
            if (chatId) {
                const approvalId = await requestApproval({
                    chatId,
                    toolName: `custom_${def.name}`,
                    toolArgs: args,
                });
                const decision = await waitForApproval(approvalId);
                if (decision !== "approved") {
                    return {
                        content: [
                            {
                                type: "text",
                                text: "Tool execution was denied by the user.",
                            },
                        ],
                        details: { denied: true },
                    };
                }
            }

            // Build env vars from args (safe — no command injection)
            const envParts = [];
            for (const [key, val] of Object.entries(args || {})) {
                const safeVal = String(val).replace(/'/g, "'\\''");
                envParts.push(
                    `export TOOL_${key.toUpperCase()}='${safeVal}'`
                );
            }
            const envSetup = envParts.length
                ? envParts.join(" && ") + " && "
                : "";

            let cmd;
            if (def.type === "script") {
                // Validate script path is within allowed directories
                const scriptPath = def.script || "";
                const resolvedScript = scriptPath.startsWith("/")
                    ? scriptPath
                    : `/root/a1/tools/${scriptPath}`;
                if (
                    !resolvedScript.startsWith("/root/a1/") &&
                    !resolvedScript.startsWith("/root/tasks/")
                ) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    error: "Script path must be within /root/a1/ or /root/tasks/",
                                }),
                            },
                        ],
                        details: { denied: true },
                    };
                }
                cmd = `${envSetup}bash "${resolvedScript}"`;
            } else {
                // type: "command" (default) — runs in user's sandbox, inherent execution risk accepted
                cmd = `${envSetup}cd "${workingDirectory.current}" && ${def.command}`;
            }

            try {
                const { stdout, stderr, exitCode } = await sshSession.exec(
                    cmd,
                    { timeout: 60000 }
                );

                const maxOut = 20000;
                let output = stdout;
                if (output.length > maxOut) {
                    output =
                        output.slice(0, maxOut / 2) +
                        "\n\n...[truncated]...\n\n" +
                        output.slice(-maxOut / 2);
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                exitCode,
                                stdout: output,
                                stderr: stderr.slice(0, 3000),
                                cwd: workingDirectory.current,
                            }),
                        },
                    ],
                    details: { exitCode },
                };
            } catch (err) {
                throw new Error(
                    `Custom tool execution failed: ${err.message}`
                );
            }
        },
    };
}

/**
 * Format custom tools section for system prompt.
 */
function formatCustomToolsForPrompt(customToolNames) {
    if (!customToolNames.length) return "";

    return `
## Custom Tools
The user has defined custom tools that execute on the sandbox:
${customToolNames.map((n) => `- **${n}**`).join("\n")}

All custom tools require approval before execution. Args are passed as TOOL_<ARG_NAME> env vars.
To create a new custom tool, write a JSON file to ${TOOLS_DIR}/<name>.json with this format:
\`\`\`json
{
    "name": "tool_name",
    "description": "What this tool does",
    "parameters": {
        "type": "object",
        "properties": {
            "arg_name": { "type": "string", "description": "Arg description" }
        },
        "required": ["arg_name"]
    },
    "type": "command",
    "command": "the shell command to run"
}
\`\`\`
For scripts, use \`"type": "script"\` and \`"script": "/path/to/script.sh"\` instead of command.
New tools will be available on the next conversation.`;
}

module.exports = { loadUserTools, formatCustomToolsForPrompt, TOOLS_DIR };
