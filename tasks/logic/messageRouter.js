"use strict";

const db = require("../services/db");
const { findTaskByMessage } = require("./entryPoints");
const { getModel, completeSimple } = require("@mariozechner/pi-ai");

// Route an incoming message to an existing task or create a new one
async function routeMessage({
    userId,
    chatId,
    entryPoint,
    messageText,
    replyToMessageId, // Platform message ID of the message being replied to
}) {
    const tasksDB = await db.getTasksDB();

    // 1. Check if this is a reply to a known message
    if (replyToMessageId) {
        const taskId = await findTaskByMessage({
            entryPoint,
            chatId,
            platformMessageId: replyToMessageId,
        });
        if (taskId) {
            // Verify the task still exists and belongs to this user
            const { rows } = await tasksDB.query(
                `SELECT id, status FROM btw.agentic_tasks WHERE id = $1 AND user_id = $2`,
                [taskId, userId]
            );
            if (rows.length > 0 && rows[0].status !== "completed") {
                console.log(`[MessageRouter] Reply to message ${replyToMessageId} → task ${taskId}`);
                return { action: "continue", taskId };
            }
        }
    }

    // 2. Check if there's exactly 1 active manual task in recent messages
    const { rows: recentTasks } = await tasksDB.query(
        `SELECT id, name, updated_at FROM btw.agentic_tasks
         WHERE user_id = $1 AND status = 'active' AND mode = 'manual'
         AND entry_point = $2 AND chat_id = $3
         ORDER BY updated_at DESC LIMIT 5`,
        [userId, entryPoint, chatId]
    );

    // If there's exactly 1 active manual task updated in the last 10 minutes, continue it
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const veryRecentTasks = recentTasks.filter(
        (t) => new Date(t.updated_at) > tenMinutesAgo
    );

    if (veryRecentTasks.length === 1) {
        console.log(`[MessageRouter] Single recent active task → ${veryRecentTasks[0].id}`);
        return { action: "continue", taskId: veryRecentTasks[0].id };
    }

    // 3. If there are multiple active tasks, use LLM to classify
    if (veryRecentTasks.length > 1) {
        try {
            const classification = await classifyWithLLM({
                messageText,
                activeTasks: veryRecentTasks,
            });
            if (classification.action === "continue") {
                console.log(`[MessageRouter] LLM classified → continue task ${classification.taskId}`);
                return classification;
            }
        } catch (err) {
            console.log(`[MessageRouter] LLM classification failed: ${err.message}`);
        }
    }

    // 4. No matching task found — create a new one
    console.log(`[MessageRouter] Creating new task for user ${userId}`);
    return { action: "new" };
}

// Use a fast LLM to classify whether a message continues an existing task
async function classifyWithLLM({ messageText, activeTasks }) {
    const taskList = activeTasks
        .map((t) => `- Task #${t.id}: "${t.name || "Unnamed"}"`)
        .join("\n");

    const prompt = `You are a message router. Given the user's message and their recent active tasks,
decide: is this message continuing an existing task, or starting something new?

Active tasks:
${taskList}

User message: "${messageText}"

Respond with ONLY valid JSON, no other text: { "action": "continue", "task_id": N } or { "action": "new" }`;

    const model = getModel("google", "gemini-2.5-flash");
    const result = await completeSimple(model, {
        systemPrompt: "You are a message classification assistant. Respond only with JSON.",
        messages: [{ role: "user", content: prompt, timestamp: Date.now() }],
    });

    // Extract text from AssistantMessage content blocks
    const text = (result.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[^}]+\}/);
    if (!jsonMatch) {
        return { action: "new" };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.action === "continue" && parsed.task_id) {
        // Verify the task_id is in our list
        const valid = activeTasks.some((t) => t.id === parsed.task_id);
        if (valid) {
            return { action: "continue", taskId: parsed.task_id };
        }
    }

    return { action: "new" };
}

// Create a new agentic task
async function createTask({
    userId,
    chatId,
    entryPoint,
    name,
    mode = "manual",
    instruction = null,
    cronExpression = null,
    nextRunAt = null,
}) {
    const tasksDB = await db.getTasksDB();

    const { rows } = await tasksDB.query(
        `INSERT INTO btw.agentic_tasks (user_id, name, instruction, cron_expression, next_run_at, mode, entry_point, chat_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [userId, name, instruction, cronExpression, nextRunAt, mode, entryPoint, chatId]
    );

    console.log(`[MessageRouter] Created task ${rows[0].id} (mode=${mode}) for user ${userId}`);
    return rows[0].id;
}

// Load a task with its messages
async function loadTask(taskId) {
    const tasksDB = await db.getTasksDB();
    const { rows } = await tasksDB.query(
        `SELECT * FROM btw.agentic_tasks WHERE id = $1`,
        [taskId]
    );
    return rows.length > 0 ? rows[0] : null;
}

// Save task messages and working directory after agent run
async function saveTaskState({ taskId, messages, workingDirectory, name }) {
    const tasksDB = await db.getTasksDB();
    const updates = [`messages = $1`, `updated_at = NOW()`];
    const values = [JSON.stringify(messages)];
    let idx = 2;

    if (workingDirectory) {
        updates.push(`working_directory = $${idx++}`);
        values.push(workingDirectory);
    }
    if (name) {
        updates.push(`name = $${idx++}`);
        values.push(name);
    }

    values.push(taskId);
    await tasksDB.query(
        `UPDATE btw.agentic_tasks SET ${updates.join(", ")} WHERE id = $${idx}`,
        values
    );
}

// Mark a manual task as completed (archived after inactivity)
async function completeTask(taskId) {
    const tasksDB = await db.getTasksDB();
    await tasksDB.query(
        `UPDATE btw.agentic_tasks SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [taskId]
    );
}

// Generate a short task name from the first user message using LLM
async function generateTaskName(messageText) {
    try {
        const model = getModel("google", "gemini-2.5-flash");
        const result = await completeSimple(model, {
            systemPrompt: "Generate a very short (2-5 words) task name from the user's message. No quotes, no punctuation. Just the name.",
            messages: [{
                role: "user",
                content: `User message: "${messageText.slice(0, 200)}"`,
                timestamp: Date.now(),
            }],
        });
        // Extract text from AssistantMessage content blocks
        const name = (result.content || [])
            .filter((b) => b.type === "text")
            .map((b) => b.text)
            .join("")
            .trim()
            .slice(0, 100);
        return name || "Chat";
    } catch (err) {
        console.log(`[MessageRouter] Failed to generate task name: ${err.message}`);
        return "Chat";
    }
}

module.exports = {
    routeMessage,
    createTask,
    loadTask,
    saveTaskState,
    completeTask,
    generateTaskName,
};
