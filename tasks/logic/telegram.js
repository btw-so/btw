const db = require("../services/db");
const fetch = require("node-fetch");
const {
    convertDateInUTCToLocal,
    getReadableFromUTCToLocal,
} = require("../utils/utils");
const { getUserFromId } = require("./user");
const { sendDiscordAlert } = require("../services/alerts");

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

// ─── Markdown → Telegram HTML converter ─────────────────────────────────────

function escapeHTML(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function markdownToTelegramHTML(md) {
    const placeholders = [];

    function ph(html) {
        const idx = placeholders.length;
        placeholders.push(html);
        return `\x00PH${idx}\x00`;
    }

    let text = md;

    // 1. Fenced code blocks: ```lang\ncode\n```
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        const escaped = escapeHTML(code.trimEnd());
        return ph(
            lang
                ? `<pre><code class="language-${lang}">${escaped}</code></pre>`
                : `<pre>${escaped}</pre>`
        );
    });

    // 2. Inline code: `code`
    text = text.replace(/`([^`]+)`/g, (_, code) => ph(`<code>${escapeHTML(code)}</code>`));

    // 3. Links: [label](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) =>
        ph(`<a href="${url}">${escapeHTML(label)}</a>`)
    );

    // 4. Escape HTML in remaining text
    text = escapeHTML(text);

    // 5. Bold: **text** (before italic)
    text = text.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

    // 6. Italic: *text*
    text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<i>$1</i>");

    // 7. Strikethrough: ~~text~~
    text = text.replace(/~~(.+?)~~/g, "<s>$1</s>");

    // 8. Blockquotes: > text (after HTML escape, > becomes &gt;)
    text = text.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");

    // 9. Restore placeholders
    text = text.replace(/\x00PH(\d+)\x00/g, (_, idx) => placeholders[parseInt(idx)]);

    return text;
}

function splitMessage(text, maxLen = 4096) {
    if (text.length <= maxLen) return [text];
    const chunks = [];
    let remaining = text;
    while (remaining.length > 0) {
        if (remaining.length <= maxLen) {
            chunks.push(remaining);
            break;
        }
        // Try to split at last newline within limit
        let splitAt = remaining.lastIndexOf("\n", maxLen);
        if (splitAt <= 0) splitAt = maxLen;
        chunks.push(remaining.slice(0, splitAt));
        remaining = remaining.slice(splitAt).replace(/^\n/, "");
    }
    return chunks;
}

async function sendMessageToUserOnTelegram({
    chatId,
    message,
    reply_markup,
    metadata = {},
}) {
    const html = markdownToTelegramHTML(message);
    const chunks = splitMessage(html);

    // Store the full message in chat history (once, raw text)
    const m = {
        chat_id: chatId,
        text: message,
        ...(reply_markup && { reply_markup }),
        disable_web_page_preview: true,
    };
    await addToTelegramChats({
        chatId,
        message: m,
        type: "bot",
        metadata,
    });

    // Send each chunk; attach reply_markup only to the last chunk
    for (let i = 0; i < chunks.length; i++) {
        const isLast = i === chunks.length - 1;
        const payload = {
            chat_id: chatId,
            text: chunks[i],
            parse_mode: "HTML",
            disable_web_page_preview: true,
            ...(isLast && reply_markup && { reply_markup }),
        };
        const resp = await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const respBody = await resp.json();
        if (!respBody.ok) {
            console.log(`[Telegram API] sendMessage failed:`, JSON.stringify(respBody));
            // Fallback: retry without parse_mode if HTML parsing fails
            if (respBody.description && respBody.description.includes("can't parse")) {
                const fallbackPayload = { ...payload };
                delete fallbackPayload.parse_mode;
                fallbackPayload.text = chunks[i].replace(/<[^>]+>/g, ""); // strip tags
                await fetch(`${TELEGRAM_API}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(fallbackPayload),
                });
            }
        }
    }
}

async function sendTypingActionToTelegram({ chatId }) {
    await fetch(`${TELEGRAM_API}/sendChatAction`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            chat_id: chatId,
            action: "typing",
        }),
    });
}

const descrForReminder = (x, offset, update, deleted) => `${
    update
        ? `*Reminder updated*

`
        : deleted
        ? `*Reminder deleted*

`
        : ``
}${x.text}${
    !x.completed && !x.recurring
        ? ` due ${getReadableFromUTCToLocal(x.duedate, offset, {
              readableDateIgnoreTime: true,
          })}`
        : ""
} ${!!x.completed ? " ✅" : !!x.recurring ? " ♻️" : ""}
${(x.alerts || [])
    .map(
        (y) =>
            `🔔 ${getReadableFromUTCToLocal(y.duedate, offset, {
                readableTimeAndDate: true,
            })}`
    )
    .join("\n")}`;

async function sendReminderUnitToTelegram({
    user_id,
    chatId,
    reminder,
    timezoneOffsetInSeconds,
    update,
    deleted,
}) {
    // Show a button to mark the reminder as complete (if it's not recurring and if it's not already complete)
    // show a button to delete the reminder if it's not complete
    await sendMessageToUserOnTelegram({
        chatId,
        message: descrForReminder(
            reminder,
            timezoneOffsetInSeconds,
            update,
            deleted
        ),
        reply_markup: {
            inline_keyboard:
                user_id === reminder.user_id
                    ? [
                          [
                              ...(!!deleted ||
                              !!reminder.recurring ||
                              !!reminder.completed
                                  ? []
                                  : [
                                        {
                                            text: "Mark ✅",
                                            callback_data: `reminder:complete:${reminder.id}`,
                                        },
                                    ]),
                              ...(!!deleted
                                  ? []
                                  : [
                                        {
                                            text: "Delete 🗑️",
                                            callback_data: `reminder:delete:${reminder.id}`,
                                        },
                                    ]),
                          ],
                      ]
                    : [],
        },
        metadata: {
            dbUnits: [
                {
                    table: "reminder",
                    units: [
                        {
                            reminder_id: reminder.id,
                            alertUnits: [
                                ...(reminder.alerts || []).map(
                                    (alert) => alert.id
                                ),
                            ],
                            user_id: reminder.user_id,
                        },
                    ],
                },
            ],
        },
    });
}

async function sendAlertUnitToTelegram({ chatId, alert, reminder }) {
    if (!reminder) {
        const { reminder_id } = alert;

        if (reminder_id) {
            const tasksDB = await db.getTasksDB();
            const { rows: reminders } = await tasksDB.query(
                `SELECT * FROM btw.reminders WHERE id = $1`,
                [reminder_id]
            );

            if (reminders.length > 0 && !reminder.completed) {
                reminder = reminders[0];
            }
        }

        if (!reminder) {
            return;
        }
    }

    const { user_id } = reminder;

    const user = await getUserFromId({ user_id });

    if (!user) {
        return;
    }

    const text = `Reminder: ${reminder.text}${
        !!reminder.completed ? " ✅" : !!reminder.recurring ? " ♻️" : ""
    }
${!!reminder.reucrring ? "🔔 on" : "Due"} ${
        !!reminder.recurring
            ? getReadableFromUTCToLocal(
                  alert.duedate,
                  user.settings.timezoneOffsetInSeconds || 0,
                  {
                      readableTimeAndDate: true,
                  }
              )
            : getReadableFromUTCToLocal(
                  reminder.duedate,
                  user.settings.timezoneOffsetInSeconds || 0,
                  {
                      readableTimeAndDate: true,
                  }
              )
    }`;

    // Show a button to mark the reminder as complete
    await sendMessageToUserOnTelegram({
        chatId,
        message: text,
        reply_markup: {
            inline_keyboard: [
                [
                    ...(!!reminder.recurring
                        ? []
                        : [
                              {
                                  text: "Mark ✅",
                                  callback_data: `reminder:complete:${reminder.id}:${alert.id}`,
                              },
                          ]),
                    {
                        text: "😴 for 10 mins",
                        callback_data: `reminder:snooze:${reminder.id}:${alert.id}`,
                    },
                ],
            ],
        },
        metadata: {
            dbUnits: [
                {
                    table: "reminder",
                    units: [
                        {
                            reminder_id: reminder.id,
                            alertUnits: [alert.id],
                            user_id: reminder.user_id,
                        },
                    ],
                },
            ],
        },
    });
}

async function sendAudioToTelegram({ chatId, audioBuffer, filename, caption }) {
    const FormData = require("form-data");
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("audio", audioBuffer, { filename: filename || "speech.mp3", contentType: "audio/mpeg" });
    if (caption) {
        form.append("caption", caption);
    }

    const resp = await fetch(`${TELEGRAM_API}/sendAudio`, {
        method: "POST",
        body: form,
        headers: form.getHeaders(),
    });
    const respBody = await resp.json();
    if (!respBody.ok) {
        console.log(`[Telegram API] sendAudio failed:`, JSON.stringify(respBody));
    }
    return respBody;
}

async function sendPhotoToTelegram({ chatId, photoBuffer, filename, caption }) {
    const FormData = require("form-data");
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("photo", photoBuffer, { filename: filename || "image.png", contentType: "image/png" });
    if (caption) {
        form.append("caption", caption);
    }

    const resp = await fetch(`${TELEGRAM_API}/sendPhoto`, {
        method: "POST",
        body: form,
        headers: form.getHeaders(),
    });
    const respBody = await resp.json();
    if (!respBody.ok) {
        console.log(`[Telegram API] sendPhoto failed:`, JSON.stringify(respBody));
    }
    return respBody;
}

async function editMessageOnTelegram({
    chatId,
    message,
    messageId,
    reply_markup,
}) {
    const html = markdownToTelegramHTML(message);
    await fetch(`${TELEGRAM_API}/editMessageText`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: html,
            parse_mode: "HTML",
            ...(reply_markup && { reply_markup }),
            disable_web_page_preview: true,
        }),
    });
}

async function getChatIdForUser(userId) {
    const tasksDB = await db.getTasksDB();
    const { rows } = await tasksDB.query(
        `SELECT * FROM btw.telegram_user_map WHERE user_id = $1`,
        [userId]
    );

    return rows && rows.length > 0 && rows[0].telegram_id;
}

async function getUserForChatId(chatId) {
    const tasksDB = await db.getTasksDB();
    const { rows } = await tasksDB.query(
        `SELECT * FROM btw.telegram_user_map WHERE telegram_id = $1`,
        [chatId]
    );

    return rows && rows.length > 0 && rows[0].user_id;
}

async function addUserToChatId({ chatId, userId }) {
    // upsert user_id, telegram_id
    const tasksDB = await db.getTasksDB();

    const exis = await getUserForChatId(chatId);

    if (!exis) {
        await tasksDB.query(
            `INSERT INTO btw.telegram_user_map (telegram_id, user_id) VALUES ($1, $2)`,
            [chatId, userId]
        );
    } else {
        await tasksDB.query(
            `UPDATE btw.telegram_user_map SET user_id = $1 WHERE telegram_id = $2`,
            [userId, chatId]
        );
    }
}

async function fetchUserChats({ userId, chatId, before, after, limit = 20 }) {
    if (!chatId) {
        chatId = await getChatIdForUser(userId);
    }

    if (!chatId || !userId) {
        return {
            success: false,
            userId,
            chatId,
        };
    }

    limit = Math.min(limit, 50);

    const tasksDB = await db.getTasksDB();

    if (after === 0 || !!after) {
        const { rows: chats } = await tasksDB.query(
            `SELECT * FROM btw.telegram_chat_context WHERE chat_id = $1 AND added_at >= $2 ORDER BY added_at DESC LIMIT $3`,
            [chatId, new Date(after), limit]
        );

        return {
            success: true,
            chats,
            userId,
            chatId,
        };
    } else {
        before = before || new Date();

        const { rows: chats } = await tasksDB.query(
            `SELECT * FROM btw.telegram_chat_context WHERE chat_id = $1 AND added_at <= $2 ORDER BY added_at DESC LIMIT $3`,
            [chatId, new Date(before), limit]
        );

        return {
            success: true,
            chats: chats.reverse(),
            userId,
            chatId,
        };
    }
}

async function addToTelegramChats({
    chatId,
    message,
    type = "user",
    metadata = {},
}) {
    const tasksDB = await db.getTasksDB();
    await tasksDB.query(
        `INSERT INTO btw.telegram_chat_context (chat_id, added_at, message, type, metadata) VALUES ($1, $2, $3, $4, $5)`,
        [chatId, new Date(), message, type, metadata]
    );

    // sendDiscordAlert({
    //     chatId,
    //     message,
    //     type,
    //     metadata,
    // });
}

async function fetchFromTelegramChats({
    chatId,
    limit = 10,
    replaceDbUnits = false,
}) {
    const tasksDB = await db.getTasksDB();
    const { rows: chats } = await tasksDB.query(
        `SELECT * FROM btw.telegram_chat_context WHERE chat_id = $1 ORDER BY added_at DESC LIMIT $2`,
        [chatId, limit]
    );

    return chats;
}

async function sendContactToTelegram({ chatId, contact }) {
    await fetch(`${TELEGRAM_API}/sendContact`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            chat_id: chatId,
            phone_number: contact.phone_number,
            first_name: contact.first_name,
            last_name: contact.last_name || "",
        }),
    });
}

async function sendFamilyInviteToTelegram({
    requesterName,
    requesterNumber,
    requesterUserId,
    chatId,
}) {
    await sendContactToTelegram({
        chatId,
        contact: {
            phone_number: requesterNumber,
            first_name: requesterName,
        },
    });

    const message = `Hey! ${requesterName} (${requesterNumber}) wants to join pair with you on A1. If you approve this request, you can add reminders on their A1 (and viceversa).`;

    // Give user two options, approve and ignore.
    await sendMessageToUserOnTelegram({
        chatId,
        message,
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "Approve",
                        callback_data: `family:approve:${requesterUserId}`,
                    },
                    {
                        text: "Ignore",
                        callback_data: `family:ignore:${requesterUserId}`,
                    },
                ],
            ],
        },
    });
}

async function getMessageByIdFromContext({ chatId, messageId }) {
    // Check from DB if the message exists for chatId and message.message_id = messageId
    const tasksDB = await db.getTasksDB();
    const { rows } = await tasksDB.query(
        `SELECT * FROM btw.telegram_chat_context WHERE chat_id = $1 AND message->>'message_id' = $2`,
        [chatId, messageId]
    );

    return rows && rows.length > 0 && rows[0].message;
}

module.exports = {
    sendMessageToUserOnTelegram,
    getUserForChatId,
    addToTelegramChats,
    fetchFromTelegramChats,
    addUserToChatId,
    editMessageOnTelegram,
    sendAlertUnitToTelegram,
    sendFamilyInviteToTelegram,
    getMessageByIdFromContext,
    sendTypingActionToTelegram,
    sendReminderUnitToTelegram,
    sendAudioToTelegram,
    sendPhotoToTelegram,
    fetchUserChats,
    splitMessage,
    markdownToTelegramHTML,
};
