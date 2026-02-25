const { Type } = require("@mariozechner/pi-ai");
const path = require("path");

const SANDBOX_ALLOWED_ROOTS = ["/root", "/tmp", "/home", "/var", "/opt", "/usr/local"];

function createSandboxTools({ sshSession, workingDirectory }) {
    // Helper: resolve path relative to working directory, with traversal protection
    function resolvePath(p) {
        if (!p) return workingDirectory.current;
        // Expand ~ to home directory (/root on sandbox)
        if (p === "~") return "/root";
        if (p.startsWith("~/")) p = "/root" + p.slice(1);
        const resolved = p.startsWith("/") ? p : `${workingDirectory.current}/${p}`;
        // Normalize to prevent directory traversal (resolves ../ sequences)
        const normalized = path.posix.normalize(resolved);
        // Block access to sensitive system paths
        const blocked = ["/etc/shadow", "/etc/sudoers", "/proc", "/sys"];
        if (blocked.some((b) => normalized === b || normalized.startsWith(b + "/"))) {
            throw new Error(`Access denied: ${normalized}`);
        }
        return normalized;
    }

    // Helper: run a command with error handling
    async function run(command, timeout = 15000) {
        try {
            const result = await sshSession.exec(command, { timeout });
            return result;
        } catch (err) {
            return { stdout: "", stderr: err.message, exitCode: -1 };
        }
    }

    return [
        // ─── Bash ───
        {
            name: "sandbox_bash",
            description:
                "Execute a bash command on the sandbox VM. Use for running scripts, installing packages, compiling code, git operations, and any terminal task. The command runs in the current working directory. Working directory persists across calls.",
            parameters: Type.Object({
                command: Type.String({
                    description: "The bash command to execute.",
                }),
                timeout: Type.Optional(
                    Type.Number({
                        description:
                            "Timeout in milliseconds. Default 30000 (30s). Max 300000 (5min).",
                    })
                ),
            }),
            requiresApproval: true,
            execute: async (_toolCallId, args) => {
                const timeout = Math.min(args.timeout || 30000, 300000);
                const cmd = `cd "${workingDirectory.current}" && ${args.command}`;

                const { stdout, stderr, exitCode } = await run(cmd, timeout);

                // Track cd commands to update working directory
                if (args.command.trim().match(/^cd\s/)) {
                    try {
                        const pwdResult = await run(
                            `cd "${workingDirectory.current}" && ${args.command} && pwd`,
                            5000
                        );
                        if (pwdResult.exitCode === 0) {
                            workingDirectory.current = pwdResult.stdout.trim();
                        }
                    } catch (_) {}
                }

                const maxOut = 20000;
                let output = stdout;
                if (output.length > maxOut) {
                    output =
                        output.slice(0, maxOut / 2) +
                        "\n\n...[truncated]...\n\n" +
                        output.slice(-maxOut / 2);
                }

                return {
                    output: JSON.stringify({
                        exitCode,
                        stdout: output,
                        stderr: stderr.slice(0, 3000),
                        cwd: workingDirectory.current,
                    }),
                };
            },
        },

        // ─── Read ───
        {
            name: "sandbox_read",
            description:
                "Read a file from the sandbox VM. Returns file content with line numbers. Use this to view file contents before editing. For large files, use offset and limit to read specific sections.",
            parameters: Type.Object({
                file_path: Type.String({
                    description: "Absolute path to the file to read.",
                }),
                offset: Type.Optional(
                    Type.Number({
                        description:
                            "Line number to start reading from (1-based). Only provide for large files.",
                    })
                ),
                limit: Type.Optional(
                    Type.Number({
                        description:
                            "Number of lines to read. Only provide for large files.",
                    })
                ),
            }),
            requiresApproval: false,
            execute: async (_toolCallId, args) => {
                const filePath = resolvePath(args.file_path);

                let command;
                if (args.offset && args.limit) {
                    const end = args.offset + args.limit - 1;
                    command = `sed -n '${args.offset},${end}p' "${filePath}" | cat -n`;
                } else if (args.offset) {
                    command = `tail -n +${args.offset} "${filePath}" | cat -n`;
                } else if (args.limit) {
                    command = `head -n ${args.limit} "${filePath}" | cat -n`;
                } else {
                    command = `cat -n "${filePath}"`;
                }

                const { stdout, stderr, exitCode } = await run(command);

                if (exitCode !== 0) {
                    return {
                        output: JSON.stringify({ error: stderr || "File not found" }),
                    };
                }

                let content = stdout;
                if (content.length > 30000) {
                    content =
                        content.slice(0, 15000) +
                        "\n\n...[truncated — use offset/limit for large files]...\n\n" +
                        content.slice(-5000);
                }

                return { output: content };
            },
        },

        // ─── Write ───
        {
            name: "sandbox_write",
            description:
                "Write content to a file on the sandbox VM. Creates the file and parent directories if they don't exist. Overwrites the entire file. Use sandbox_edit for partial modifications to existing files.",
            parameters: Type.Object({
                file_path: Type.String({
                    description: "Absolute path to the file to write.",
                }),
                content: Type.String({
                    description: "The full content to write to the file.",
                }),
            }),
            requiresApproval: true,
            execute: async (_toolCallId, args) => {
                const filePath = resolvePath(args.file_path);

                try {
                    await sshSession.writeFile(filePath, args.content);
                    return {
                        output: JSON.stringify({
                            success: true,
                            path: filePath,
                            bytes: Buffer.byteLength(args.content, "utf-8"),
                        }),
                    };
                } catch (err) {
                    return {
                        output: JSON.stringify({
                            success: false,
                            error: err.message,
                        }),
                    };
                }
            },
        },

        // ─── Edit ───
        {
            name: "sandbox_edit",
            description:
                "Perform exact string replacements in a file on the sandbox VM. Use this for surgical edits to existing files — replacing, inserting, or deleting specific sections. You must read the file first to know the exact content to replace. The old_string must match exactly (including whitespace/indentation).",
            parameters: Type.Object({
                file_path: Type.String({
                    description: "Absolute path to the file to edit.",
                }),
                old_string: Type.String({
                    description:
                        "The exact string to find and replace. Must be unique in the file.",
                }),
                new_string: Type.String({
                    description:
                        "The replacement string. Use empty string to delete the old_string.",
                }),
            }),
            requiresApproval: true,
            execute: async (_toolCallId, args) => {
                const filePath = resolvePath(args.file_path);

                // Read the file first
                const { stdout: fileContent, exitCode: readCode } = await run(
                    `cat "${filePath}"`,
                    10000
                );
                if (readCode !== 0) {
                    return {
                        output: JSON.stringify({
                            error: `Could not read file: ${filePath}`,
                        }),
                    };
                }

                // Check that old_string exists and is unique
                const occurrences = fileContent.split(args.old_string).length - 1;
                if (occurrences === 0) {
                    return {
                        output: JSON.stringify({
                            error: "old_string not found in the file. Read the file first to get the exact content.",
                        }),
                    };
                }
                if (occurrences > 1) {
                    return {
                        output: JSON.stringify({
                            error: `old_string found ${occurrences} times. Provide more surrounding context to make it unique.`,
                        }),
                    };
                }

                // Perform the replacement
                const newContent = fileContent.replace(
                    args.old_string,
                    args.new_string
                );

                try {
                    await sshSession.writeFile(filePath, newContent);
                    return {
                        output: JSON.stringify({
                            success: true,
                            path: filePath,
                        }),
                    };
                } catch (err) {
                    return {
                        output: JSON.stringify({
                            success: false,
                            error: err.message,
                        }),
                    };
                }
            },
        },

        // ─── Glob ───
        {
            name: "sandbox_glob",
            description:
                "Find files by name pattern on the sandbox VM. Use glob patterns like '**/*.js' or 'src/**/*.ts'. Returns matching file paths. Use this when you need to find files by name.",
            parameters: Type.Object({
                pattern: Type.String({
                    description:
                        'Glob pattern to match files (e.g., "**/*.js", "*.py", "src/**/*.ts").',
                }),
                path: Type.Optional(
                    Type.String({
                        description:
                            "Directory to search in. Defaults to working directory.",
                    })
                ),
            }),
            requiresApproval: false,
            execute: async (_toolCallId, args) => {
                const searchPath = resolvePath(args.path);

                // Use find with -name or -path depending on pattern
                // Sanitize pattern: only allow glob chars *, ?, [], and path separators
                const pattern = args.pattern.replace(/[^a-zA-Z0-9_\-.*?/[\]{}]/g, "");
                let command;

                if (pattern.includes("**/")) {
                    const subPattern = pattern.replace("**/", "");
                    command = `find "${searchPath}" -type f -path "*/${subPattern}" 2>/dev/null | head -200`;
                } else if (pattern.includes("/")) {
                    command = `find "${searchPath}" -type f -path "*${pattern}" 2>/dev/null | head -200`;
                } else {
                    command = `find "${searchPath}" -type f -name "${pattern}" 2>/dev/null | head -200`;
                }

                const { stdout } = await run(command);

                const files = stdout
                    .trim()
                    .split("\n")
                    .filter(Boolean);

                return {
                    output: JSON.stringify({
                        files,
                        count: files.length,
                        truncated: files.length >= 200,
                    }),
                };
            },
        },

        // ─── Grep ───
        {
            name: "sandbox_grep",
            description:
                "Search file contents using regex patterns on the sandbox VM. Returns matching lines with file paths and line numbers. Use this to search for code, text, or patterns across files.",
            parameters: Type.Object({
                pattern: Type.String({
                    description: "Regex pattern to search for.",
                }),
                path: Type.Optional(
                    Type.String({
                        description:
                            "File or directory to search in. Defaults to working directory.",
                    })
                ),
                include: Type.Optional(
                    Type.String({
                        description:
                            'File glob pattern to filter (e.g., "*.js", "*.py").',
                    })
                ),
                context: Type.Optional(
                    Type.Number({
                        description:
                            "Number of context lines before and after each match.",
                    })
                ),
            }),
            requiresApproval: false,
            execute: async (_toolCallId, args) => {
                const searchPath = resolvePath(args.path);

                let command = `grep -rn`;
                if (args.context) command += ` -C ${Math.max(0, Math.min(parseInt(args.context) || 0, 20))}`;
                if (args.include) command += ` --include=${JSON.stringify(args.include)}`;
                // Use -- to end options, and -e for the pattern to prevent injection
                // Escape shell metacharacters: $, `, \, !, ", newlines
                const safePattern = args.pattern
                    .replace(/\\/g, '\\\\')
                    .replace(/"/g, '\\"')
                    .replace(/\$/g, '\\$')
                    .replace(/`/g, '\\`')
                    .replace(/!/g, '\\!')
                    .replace(/\n/g, '');
                command += ` -e "${safePattern}" -- "${searchPath}" 2>/dev/null`;

                const { stdout, exitCode } = await run(command);

                // grep returns 1 for no matches — not an error
                let content = stdout;
                if (content.length > 15000) {
                    content =
                        content.slice(0, 12000) +
                        "\n...[truncated]...";
                }

                const matchCount = stdout ? stdout.trim().split("\n").filter(Boolean).length : 0;

                return {
                    output: JSON.stringify({
                        matches: content,
                        matchCount,
                        noResults: exitCode === 1,
                    }),
                };
            },
        },

        // ─── TodoWrite ───
        {
            name: "sandbox_todo",
            description:
                "Manage a task list for the current coding session on the sandbox. Use this to track progress on multi-step tasks. Create todos before starting work, update status as you go, and mark complete when done. The todo list is stored as a JSON file on the sandbox at ~/.a1_todos.json.",
            parameters: Type.Object({
                todos: Type.Array(
                    Type.Object({
                        content: Type.String({
                            description:
                                'What needs to be done (e.g., "Fix authentication bug").',
                        }),
                        status: Type.String({
                            description:
                                'One of: "pending", "in_progress", "completed".',
                        }),
                    }),
                    {
                        description:
                            "The full updated todo list. Always send the complete list.",
                    }
                ),
            }),
            requiresApproval: false,
            execute: async (_toolCallId, args) => {
                const todoPath = "/root/.a1_todos.json";
                const content = JSON.stringify(args.todos, null, 2);

                try {
                    await sshSession.writeFile(todoPath, content);

                    const summary = args.todos.map(
                        (t) =>
                            `[${t.status === "completed" ? "x" : t.status === "in_progress" ? ">" : " "}] ${t.content}`
                    );

                    return {
                        output: JSON.stringify({
                            success: true,
                            todos: summary,
                        }),
                    };
                } catch (err) {
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

module.exports = { createSandboxTools };
