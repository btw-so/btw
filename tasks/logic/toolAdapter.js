"use strict";

const { requestApproval, waitForApproval } = require("./approval");

/**
 * Adapt a legacy tool ({ execute(_id, args) => { output } }) to
 * pi-agent-core's AgentTool format ({ execute(id, args, signal?, onUpdate?) => { content, details } }).
 * Also wraps the approval flow inside execute so the agent loop doesn't need to handle it.
 */
function adaptTool(tool, chatId) {
    return {
        name: tool.name,
        label: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        execute: async (toolCallId, params, signal, onUpdate) => {
            // Approval gate
            if (tool.requiresApproval && chatId) {
                console.log(
                    `[ToolAdapter] Requesting approval for ${tool.name}`
                );
                const approvalId = await requestApproval({
                    chatId,
                    toolName: tool.name,
                    toolArgs: params,
                });

                const decision = await waitForApproval(approvalId);
                console.log(
                    `[ToolAdapter] Approval decision for ${tool.name}: ${decision}`
                );

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

            // Execute legacy tool and convert return format
            const result = await tool.execute(toolCallId, params);
            return {
                content: [{ type: "text", text: result.output }],
                details: {},
            };
        },
    };
}

/**
 * Adapt an array of legacy tools to AgentTool format.
 */
function adaptTools(tools, chatId) {
    return tools.map((t) => adaptTool(t, chatId));
}

module.exports = { adaptTool, adaptTools };
