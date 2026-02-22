"use strict";

const { Type } = require("@mariozechner/pi-ai");
const db = require("../services/db");
const { getNextMCPPort } = require("./mcpClient");

/**
 * Create tools for managing MCP server configurations in the DB.
 * These are agent tools that let the bot add/remove/list MCP servers on behalf of the user.
 */
function createMCPManagementTools({ user_id, sshSession }) {
    return [
        // ─── Add MCP Server ───
        {
            name: "add_mcp_server",
            description:
                "Register a new MCP server. The server will run on the sandbox VM via mcp-proxy. It will be available on the next conversation. Example: add a GitHub MCP server with command 'npx' and args ['-y', '@modelcontextprotocol/server-github'].",
            parameters: Type.Object({
                name: Type.String({
                    description:
                        'Unique name for this MCP server (e.g., "github", "postgres", "filesystem"). Lowercase, no spaces.',
                }),
                command: Type.String({
                    description:
                        'The command to start the MCP server (e.g., "npx", "node", "python3").',
                }),
                args: Type.Optional(
                    Type.Array(
                        Type.String({
                            description: "Command arguments.",
                        }),
                        {
                            description:
                                'Arguments to pass to the command (e.g., ["-y", "@modelcontextprotocol/server-github"]).',
                        }
                    )
                ),
                env: Type.Optional(
                    Type.Object({}, {
                        description:
                            'Environment variables for the MCP server (e.g., {"GITHUB_TOKEN": "ghp_xxx"}). Keys are var names, values are strings.',
                        additionalProperties: Type.String(),
                    })
                ),
                install_command: Type.Optional(
                    Type.String({
                        description:
                            'Optional: shell command to install the MCP server on the sandbox first (e.g., "npm install -g @modelcontextprotocol/server-github").',
                    })
                ),
            }),
            requiresApproval: true,
            execute: async (_toolCallId, args) => {
                try {
                    const tasksDB = await db.getTasksDB();

                    // Check for duplicate name
                    const { rows: existing } = await tasksDB.query(
                        "SELECT id FROM btw.user_mcps WHERE user_id = $1 AND name = $2",
                        [user_id, args.name]
                    );
                    if (existing.length > 0) {
                        return {
                            output: JSON.stringify({
                                error: `MCP server "${args.name}" already exists. Remove it first or choose a different name.`,
                            }),
                        };
                    }

                    // Install if needed
                    if (args.install_command && sshSession) {
                        console.log(
                            `[MCP Mgmt] Installing: ${args.install_command}`
                        );
                        const { stdout, stderr, exitCode } =
                            await sshSession.exec(args.install_command, {
                                timeout: 120000,
                            });
                        if (exitCode !== 0) {
                            return {
                                output: JSON.stringify({
                                    error: `Installation failed (exit ${exitCode}): ${stderr.slice(0, 500)}`,
                                }),
                            };
                        }
                    }

                    // Assign port
                    const port = await getNextMCPPort(user_id);

                    // Save to DB
                    await tasksDB.query(
                        `INSERT INTO btw.user_mcps (user_id, name, command, args, env, port)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [
                            user_id,
                            args.name,
                            args.command,
                            JSON.stringify(args.args || []),
                            JSON.stringify(args.env || {}),
                            port,
                        ]
                    );

                    return {
                        output: JSON.stringify({
                            success: true,
                            name: args.name,
                            port,
                            message: `MCP server "${args.name}" registered on port ${port}. Its tools will be available on the next conversation.`,
                        }),
                    };
                } catch (err) {
                    return {
                        output: JSON.stringify({
                            error: `Failed to add MCP server: ${err.message}`,
                        }),
                    };
                }
            },
        },

        // ─── Remove MCP Server ───
        {
            name: "remove_mcp_server",
            description:
                "Remove a registered MCP server. Stops the server process on the sandbox and removes the configuration.",
            parameters: Type.Object({
                name: Type.String({
                    description: "Name of the MCP server to remove.",
                }),
            }),
            requiresApproval: false,
            execute: async (_toolCallId, args) => {
                try {
                    const tasksDB = await db.getTasksDB();

                    // Get the config (for port number)
                    const { rows } = await tasksDB.query(
                        "SELECT * FROM btw.user_mcps WHERE user_id = $1 AND name = $2",
                        [user_id, args.name]
                    );

                    if (rows.length === 0) {
                        return {
                            output: JSON.stringify({
                                error: `MCP server "${args.name}" not found.`,
                            }),
                        };
                    }

                    const mcp = rows[0];

                    // Kill the mcp-proxy process on sandbox
                    if (sshSession) {
                        try {
                            await sshSession.exec(
                                `kill $(lsof -t -i:${mcp.port}) 2>/dev/null`,
                                { timeout: 5000 }
                            );
                        } catch (_) {
                            // Process may not be running
                        }
                    }

                    // Remove from DB
                    await tasksDB.query(
                        "DELETE FROM btw.user_mcps WHERE user_id = $1 AND name = $2",
                        [user_id, args.name]
                    );

                    return {
                        output: JSON.stringify({
                            success: true,
                            message: `MCP server "${args.name}" removed.`,
                        }),
                    };
                } catch (err) {
                    return {
                        output: JSON.stringify({
                            error: `Failed to remove MCP server: ${err.message}`,
                        }),
                    };
                }
            },
        },

        // ─── List MCP Servers ───
        {
            name: "list_mcp_servers",
            description:
                "List all configured MCP servers for the user.",
            parameters: Type.Object({}),
            requiresApproval: false,
            execute: async (_toolCallId, args) => {
                try {
                    const tasksDB = await db.getTasksDB();
                    const { rows } = await tasksDB.query(
                        "SELECT name, command, args, port, enabled, created_at FROM btw.user_mcps WHERE user_id = $1 ORDER BY name",
                        [user_id]
                    );

                    if (rows.length === 0) {
                        return {
                            output: JSON.stringify({
                                servers: [],
                                message: "No MCP servers configured.",
                            }),
                        };
                    }

                    return {
                        output: JSON.stringify({
                            servers: rows.map((r) => ({
                                name: r.name,
                                command: r.command,
                                args: r.args,
                                port: r.port,
                                enabled: r.enabled,
                                created: r.created_at,
                            })),
                        }),
                    };
                } catch (err) {
                    return {
                        output: JSON.stringify({
                            error: `Failed to list MCP servers: ${err.message}`,
                        }),
                    };
                }
            },
        },
    ];
}

module.exports = { createMCPManagementTools };
