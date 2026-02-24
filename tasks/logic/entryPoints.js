"use strict";

const {
    sendTypingActionToTelegram,
    sendAudioToTelegram,
    sendPhotoToTelegram,
    splitMessage,
    markdownToTelegramHTML,
} = require("./telegram");
const db = require("../services/db");

// Detect file type from URL extension
function detectFileType(url) {
    try {
        const pathname = new URL(url).pathname.toLowerCase();
        if (/\.(jpg|jpeg|png|webp|bmp)$/i.test(pathname)) return "photo";
        if (/\.(gif)$/i.test(pathname)) return "animation";
        if (/\.(mp4|mov|avi|mkv|webm)$/i.test(pathname)) return "video";
        return "document";
    } catch {
        return "document";
    }
}

// Entry point implementations
const entryPointImpls = {
    telegram: {
        supportedFileTypes: ["photo", "document", "video", "animation"],
        async sendMessage({ chatId, message, replyToMessageId }) {
            const fetch = require("node-fetch");
            const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

            // Convert markdown to Telegram HTML
            const html = markdownToTelegramHTML(message);
            const chunks = splitMessage(html);
            let lastMessageId = null;

            for (let i = 0; i < chunks.length; i++) {
                const payload = {
                    chat_id: chatId,
                    text: chunks[i],
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                    ...(replyToMessageId && { reply_to_message_id: replyToMessageId }),
                };
                const resp = await fetch(`${TELEGRAM_API}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const respBody = await resp.json();
                if (respBody.ok && respBody.result) {
                    lastMessageId = String(respBody.result.message_id);
                } else {
                    console.log(`[EntryPoint:telegram] sendMessage failed:`, JSON.stringify(respBody));
                    // Fallback: retry without parse_mode if HTML parsing fails
                    if (respBody.description && respBody.description.includes("can't parse")) {
                        const fallback = { ...payload };
                        delete fallback.parse_mode;
                        fallback.text = chunks[i].replace(/<[^>]+>/g, "");
                        const r2 = await fetch(`${TELEGRAM_API}/sendMessage`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(fallback),
                        });
                        const r2Body = await r2.json();
                        if (r2Body.ok && r2Body.result) {
                            lastMessageId = String(r2Body.result.message_id);
                        }
                    }
                }
            }

            return { messageId: lastMessageId };
        },

        async sendTyping({ chatId }) {
            await sendTypingActionToTelegram({ chatId });
        },

        async sendAudio({ chatId, audioBuffer, filename }) {
            return sendAudioToTelegram({ chatId, audioBuffer, filename });
        },

        async sendPhoto({ chatId, photoBuffer, filename, caption }) {
            return sendPhotoToTelegram({ chatId, photoBuffer, filename, caption });
        },

        async sendFile({ chatId, url, type, caption, replyToMessageId }) {
            const fetch = require("node-fetch");
            const FormData = require("form-data");
            const path = require("path");
            const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

            const fileType = type || detectFileType(url);
            const methodMap = {
                photo: "sendPhoto",
                document: "sendDocument",
                video: "sendVideo",
                animation: "sendAnimation",
            };
            const fieldMap = {
                photo: "photo",
                document: "document",
                video: "video",
                animation: "animation",
            };
            const method = methodMap[fileType] || "sendDocument";
            const field = fieldMap[fileType] || "document";

            // Try URL-based sending first (no download needed)
            const payload = {
                chat_id: chatId,
                [field]: url,
                ...(caption && { caption, parse_mode: "HTML" }),
                ...(replyToMessageId && { reply_to_message_id: replyToMessageId }),
            };

            const resp = await fetch(`${TELEGRAM_API}/${method}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const respBody = await resp.json();
            if (respBody.ok && respBody.result) {
                return { messageId: String(respBody.result.message_id) };
            }

            // Fallback: download file ourselves and upload as multipart
            console.log(`[EntryPoint:telegram] sendFile URL failed, downloading and re-uploading...`);
            try {
                const dlResp = await fetch(url, { timeout: 30000 });
                if (!dlResp.ok) {
                    console.log(`[EntryPoint:telegram] Download failed: ${dlResp.status}`);
                    return { messageId: null };
                }
                const buffer = await dlResp.buffer();
                const filename = path.basename(new URL(url).pathname) || "file";

                const form = new FormData();
                form.append("chat_id", chatId);
                form.append(field, buffer, { filename });
                if (caption) form.append("caption", caption);
                if (replyToMessageId) form.append("reply_to_message_id", replyToMessageId);

                const uploadResp = await fetch(`${TELEGRAM_API}/${method}`, {
                    method: "POST",
                    body: form,
                    headers: form.getHeaders(),
                });
                const uploadBody = await uploadResp.json();
                if (uploadBody.ok && uploadBody.result) {
                    return { messageId: String(uploadBody.result.message_id) };
                }
                console.log(`[EntryPoint:telegram] sendFile upload failed:`, JSON.stringify(uploadBody));
            } catch (dlErr) {
                console.log(`[EntryPoint:telegram] sendFile download error:`, dlErr.message);
            }
            return { messageId: null };
        },
    },
    web: {
        supportedFileTypes: [],
        async sendMessage({ chatId, message }) {
            // Store in Redis inbox for frontend polling
            const redisClient = require("../services/redis");
            const { v4: uuidv4 } = require("uuid");
            const msgId = uuidv4();
            const msgObj = JSON.stringify({
                id: msgId,
                text: message,
                timestamp: Date.now(),
            });
            const key = `web:inbox:${chatId}`;
            const client = redisClient.getClient();
            await client.rpush(key, msgObj);
            await client.expire(key, 86400);
            return { messageId: msgId };
        },
        async sendTyping() {
            // No-op for web
        },
        async sendAudio() {
            return { messageId: null };
        },
        async sendPhoto() {
            return { messageId: null };
        },
        async sendFile() {
            return { messageId: null };
        },
    },
};

function getEntryPoint(name) {
    return entryPointImpls[name] || null;
}

// Get all connected entry points for a user (for broadcasting)
async function getUserEntryPoints(userId) {
    const tasksDB = await db.getTasksDB();

    const results = [];

    // Telegram
    const { rows: telegramRows } = await tasksDB.query(
        `SELECT telegram_id as chat_id FROM btw.telegram_user_map WHERE user_id = $1`,
        [userId]
    );
    for (const row of telegramRows) {
        results.push({
            entryPoint: "telegram",
            chatId: Number(row.chat_id),
            impl: entryPointImpls.telegram,
        });
    }

    // Web — include if user has any active web tasks
    const { rows: webRows } = await tasksDB.query(
        `SELECT 1 FROM btw.agentic_tasks
         WHERE user_id = $1 AND entry_point = 'web' AND status = 'active'
         LIMIT 1`,
        [userId]
    );
    if (webRows.length > 0) {
        results.push({
            entryPoint: "web",
            chatId: userId,
            impl: entryPointImpls.web,
        });
    }

    // Future: query whatsapp_user_map, discord_user_map, etc.

    return results;
}

// Track a platform message → task mapping
async function trackMessage({ taskId, userId, entryPoint, platformMessageId, chatId, role }) {
    if (!platformMessageId) return;
    const tasksDB = await db.getTasksDB();
    await tasksDB.query(
        `INSERT INTO btw.entry_point_messages (task_id, user_id, entry_point, platform_message_id, chat_id, role)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [taskId, userId, entryPoint, String(platformMessageId), chatId, role]
    );
}

// Find task ID from a platform message (reply-to routing)
async function findTaskByMessage({ entryPoint, chatId, platformMessageId }) {
    if (!platformMessageId) return null;
    const tasksDB = await db.getTasksDB();
    const { rows } = await tasksDB.query(
        `SELECT task_id FROM btw.entry_point_messages
         WHERE entry_point = $1 AND chat_id = $2 AND platform_message_id = $3
         LIMIT 1`,
        [entryPoint, chatId, String(platformMessageId)]
    );
    return rows.length > 0 ? rows[0].task_id : null;
}

module.exports = {
    getEntryPoint,
    getUserEntryPoints,
    trackMessage,
    findTaskByMessage,
    entryPointImpls,
};
