"use strict";

const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const {
    StreamableHTTPClientTransport,
} = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const db = require("../services/db");
const { requestApproval, waitForApproval } = require("./approval");

const MCP_PORT_BASE = 9100;

/**
 * Load MCP tools for a user. For each enabled MCP server config in the DB:
 * 1. Start mcp-proxy on the sandbox VM (if not already running)
 * 2. Connect via Streamable HTTP from the main server
 * 3. Discover tools and convert to AgentTool format
 *
 * Returns { tools: AgentTool[], cleanup: Function[] }
 */
async function loadMCPTools({ user_id, sandbox, sshSession, chatId }) {
    const tasksDB = await db.getTasksDB();
    const { rows: mcpConfigs } = await tasksDB.query(
        "SELECT * FROM btw.user_mcps WHERE user_id = $1 AND enabled = true ORDER BY id",
        [user_id]
    );

    if (!mcpConfigs.length) return { tools: [], cleanup: [] };

    const allTools = [];
    const cleanup = [];
    const connectedServers = [];

    for (const mcp of mcpConfigs) {
        try {
            console.log(`[MCP] Loading server: ${mcp.name} on port ${mcp.port}`);

            // 1. Check if mcp-proxy is already running on this port
            const { exitCode: checkCode } = await sshSession.exec(
                `ss -tlnp 2>/dev/null | grep ":${mcp.port} "`,
                { timeout: 3000 }
            );

            if (checkCode !== 0) {
                // Not running — start mcp-proxy
                const envStr = Object.entries(mcp.env || {})
                    .map(([k, v]) => `export ${k}='${String(v).replace(/'/g, "'\\''")}'`)
                    .join(" && ");
                const envPrefix = envStr ? envStr + " && " : "";
                const args = Array.isArray(mcp.args) ? mcp.args.join(" ") : "";

                await sshSession.exec(
                    `${envPrefix}nohup npx -y mcp-proxy --port ${mcp.port} -- ${mcp.command} ${args} > /tmp/mcp-${mcp.name}.log 2>&1 &`,
                    { timeout: 15000 }
                );

                // Wait for server to start
                let started = false;
                for (let attempt = 0; attempt < 6; attempt++) {
                    await new Promise((r) => setTimeout(r, 2000));
                    const { exitCode } = await sshSession.exec(
                        `ss -tlnp 2>/dev/null | grep ":${mcp.port} "`,
                        { timeout: 3000 }
                    );
                    if (exitCode === 0) {
                        started = true;
                        break;
                    }
                }

                if (!started) {
                    // Check logs for errors
                    const { stdout: logs } = await sshSession.exec(
                        `tail -20 /tmp/mcp-${mcp.name}.log 2>/dev/null`,
                        { timeout: 3000 }
                    );
                    console.log(
                        `[MCP] Failed to start ${mcp.name} on port ${mcp.port}. Logs:\n${logs}`
                    );
                    continue;
                }
            }

            // 2. Connect from main server via Streamable HTTP
            const client = new Client(
                { name: "btw-agent", version: "1.0.0" },
                { capabilities: {} }
            );
            const transport = new StreamableHTTPClientTransport(
                new URL(`http://${sandbox.ipv4}:${mcp.port}/mcp`)
            );
            await client.connect(transport);
            cleanup.push(() => client.close());

            // 3. Discover tools
            const { tools } = await client.listTools();
            console.log(
                `[MCP] ${mcp.name}: discovered ${tools.length} tools: ${tools.map((t) => t.name).join(", ")}`
            );

            // 4. Convert to AgentTool format
            for (const mcpTool of tools) {
                allTools.push({
                    name: `mcp_${mcp.name}_${mcpTool.name}`,
                    label: `mcp_${mcp.name}_${mcpTool.name}`,
                    description: `[MCP:${mcp.name}] ${mcpTool.description || mcpTool.name}`,
                    parameters: mcpTool.inputSchema || {
                        type: "object",
                        properties: {},
                    },
                    execute: async (toolCallId, args, signal, onUpdate) => {
                        // MCP tools require approval
                        if (chatId) {
                            const approvalId = await requestApproval({
                                chatId,
                                toolName: `mcp_${mcp.name}_${mcpTool.name}`,
                                toolArgs: args,
                            });
                            const decision =
                                await waitForApproval(approvalId);
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

                        const result = await client.callTool({
                            name: mcpTool.name,
                            arguments: args || {},
                        });

                        const text = result.content
                            .filter((c) => c.type === "text")
                            .map((c) => c.text)
                            .join("\n");

                        if (result.isError) {
                            throw new Error(text || "MCP tool returned error");
                        }

                        return {
                            content: [{ type: "text", text }],
                            details: {},
                        };
                    },
                });
            }

            connectedServers.push(mcp.name);
        } catch (err) {
            console.log(`[MCP] Failed to load ${mcp.name}: ${err.message}`);
            // Skip this MCP, continue with others
        }
    }

    console.log(
        `[MCP] Loaded ${allTools.length} tools from ${connectedServers.length} servers`
    );

    return { tools: allTools, cleanup };
}

/**
 * Get the next available port for a new MCP server.
 */
async function getNextMCPPort(user_id) {
    const tasksDB = await db.getTasksDB();
    const { rows } = await tasksDB.query(
        "SELECT COALESCE(MAX(port), $1 - 1) + 1 AS next_port FROM btw.user_mcps WHERE user_id = $2",
        [MCP_PORT_BASE, user_id]
    );
    return rows[0].next_port;
}

/**
 * Format MCP section for system prompt.
 */
function formatMCPForPrompt(connectedMCPs) {
    if (!connectedMCPs.length) return "";

    return `
## MCP Servers
You have MCP (Model Context Protocol) servers connected, providing additional tools.
Connected servers: ${connectedMCPs.join(", ")}

MCP tool names follow the pattern: mcp_<server>_<tool>.
All MCP tools require approval before execution.

To manage MCP servers:
- Use **add_mcp_server** to register a new server (provide name, npm package command, and optional env vars).
- Use **list_mcp_servers** to see all configured servers.
- Use **remove_mcp_server** to remove a server.
New MCP tools become available on the next conversation after adding a server.`;
}

module.exports = { loadMCPTools, getNextMCPPort, formatMCPForPrompt };
