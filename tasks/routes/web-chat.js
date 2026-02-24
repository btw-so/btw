var express = require("express");
var router = express.Router();
var cors = require("cors");
var { webAuth } = require("../logic/webAuth");
var {
    routeMessage,
    createTask,
    loadTask,
    saveTaskState,
    generateTaskName,
} = require("../logic/messageRouter");
var { trackMessage } = require("../logic/entryPoints");
var { runAgentLoop } = require("../logic/agent");
var { getSandbox } = require("../logic/sandbox");
var { getFamilyUsers } = require("../logic/user");
var db = require("../services/db");
var redisClient = require("../services/redis");

const corsOptions = {
    credentials: true,
    origin: process.env.CORS_DOMAINS.split(","),
};

// Apply CORS to all routes in this router
router.use(cors(corsOptions));

// POST /web-chat/send — Send a message and get agent response (synchronous)
router.post("/send", webAuth, async (req, res) => {
    const { message, taskId: requestedTaskId } = req.body;
    const user = req.user;

    if (!message || !message.trim()) {
        return res.json({ success: false, error: "Message is required" });
    }

    try {
        const familyUsers = await getFamilyUsers({ id: user.id });

        let sandbox = null;
        if (user.pro) {
            try {
                sandbox = await getSandbox({ user_id: user.id });
            } catch (_) {}
        }

        // Route message to existing or new task
        let taskId = requestedTaskId;
        let task = null;

        if (taskId) {
            task = await loadTask(taskId);
            if (!task || task.user_id !== user.id) {
                return res.json({ success: false, error: "Task not found" });
            }
        } else {
            const route = await routeMessage({
                userId: user.id,
                chatId: user.id,
                entryPoint: "web",
                messageText: message,
            });

            if (route.action === "continue") {
                taskId = route.taskId;
                task = await loadTask(taskId);
            }
        }

        if (!task) {
            const taskName = await generateTaskName(message);
            taskId = await createTask({
                userId: user.id,
                chatId: user.id,
                entryPoint: "web",
                name: taskName,
                mode: "manual",
            });
            task = await loadTask(taskId);
        }

        // Track the incoming user message
        const userMsgId = `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await trackMessage({
            taskId,
            userId: user.id,
            entryPoint: "web",
            platformMessageId: userMsgId,
            chatId: user.id,
            role: "user",
        });

        // Load task context
        const agenticTaskMessages = task.messages || [];
        const taskWorkingDir = task.working_directory || "/root";

        // Run agent loop synchronously (blocks until complete)
        const {
            text,
            agentMessages,
            workingDirectory: newWd,
        } = await runAgentLoop({
            input: message,
            user_id: user.id,
            timezoneOffsetInSeconds:
                user.settings?.timezoneOffsetInSeconds || 0,
            familyUsers,
            timezone: user.settings?.timezone || "GMT",
            isPro: !!user.pro,
            sandbox,
            chatId: null, // null to skip approval flow for web v1
            entryPoint: "web",
            userName: user.name,
            agenticTaskId: taskId,
            agenticTaskMessages,
            workingDirectory: { current: taskWorkingDir },
        });

        // Save agent state back to task
        if (text && agentMessages && agentMessages.length > 0) {
            await saveTaskState({
                taskId,
                messages: agentMessages,
                workingDirectory: newWd,
            });
        }

        // Track bot response
        const botMsgId = `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await trackMessage({
            taskId,
            userId: user.id,
            entryPoint: "web",
            platformMessageId: botMsgId,
            chatId: user.id,
            role: "bot",
        });

        console.log(
            `[WebChat] Agent response for task ${taskId}: "${text?.slice(0, 200)}" (length: ${text?.length})`
        );

        res.json({
            success: true,
            data: {
                taskId,
                taskName: task.name,
                response: text || "Sorry, I couldn't process that.",
            },
        });
    } catch (err) {
        console.log(`[WebChat] Error:`, err);
        res.status(500).json({ success: false, error: "Internal error" });
    }
});

// GET /web-chat/tasks — List user's tasks
router.get("/tasks", webAuth, async (req, res) => {
    try {
        const tasksDB = await db.getTasksDB();
        const { rows } = await tasksDB.query(
            `SELECT id, name, status, entry_point, mode, created_at, updated_at
             FROM btw.agentic_tasks
             WHERE user_id = $1 AND system_type IS NULL
             ORDER BY updated_at DESC LIMIT 50`,
            [req.user.id]
        );
        res.json({ success: true, data: { tasks: rows } });
    } catch (err) {
        console.log(`[WebChat] List tasks error:`, err);
        res.status(500).json({ success: false, error: "Internal error" });
    }
});

// GET /web-chat/tasks/:taskId — Get task details with messages
router.get("/tasks/:taskId", webAuth, async (req, res) => {
    try {
        const task = await loadTask(parseInt(req.params.taskId));
        if (!task || task.user_id !== req.user.id) {
            return res.json({ success: false, error: "Task not found" });
        }

        // Extract user-friendly messages from pi-agent format
        const messages = (task.messages || [])
            .map((m) => {
                let text = "";
                if (typeof m.content === "string") {
                    text = m.content;
                } else if (Array.isArray(m.content)) {
                    text = m.content
                        .filter((b) => b.type === "text")
                        .map((b) => b.text)
                        .join("\n");
                }
                return { role: m.role, text, timestamp: m.timestamp };
            })
            .filter(
                (m) => m.text && (m.role === "user" || m.role === "assistant")
            );

        res.json({
            success: true,
            data: {
                task: {
                    id: task.id,
                    name: task.name,
                    status: task.status,
                    created_at: task.created_at,
                    updated_at: task.updated_at,
                },
                messages,
            },
        });
    } catch (err) {
        console.log(`[WebChat] Get task error:`, err);
        res.status(500).json({ success: false, error: "Internal error" });
    }
});

// GET /web-chat/inbox — Poll for broadcast messages (from scheduled tasks, heartbeats)
router.get("/inbox", webAuth, async (req, res) => {
    try {
        const key = `web:inbox:${req.user.id}`;
        const client = redisClient.getClient();
        const raw = await client.lrange(key, 0, -1);
        if (raw.length > 0) {
            await client.del(key);
        }
        const messages = raw.map((r) => JSON.parse(r));
        res.json({ success: true, data: { messages } });
    } catch (err) {
        console.log(`[WebChat] Inbox error:`, err);
        res.status(500).json({ success: false, error: "Internal error" });
    }
});

module.exports = router;
