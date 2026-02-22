"use strict";

const {
    sendTypingActionToTelegram,
    sendAudioToTelegram,
    sendPhotoToTelegram,
    splitMessage,
    markdownToTelegramHTML,
} = require("./telegram");
const db = require("../services/db");

// Entry point implementations
const entryPointImpls = {
    telegram: {
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
    },
    // Future: whatsapp, discord, slack, web
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
