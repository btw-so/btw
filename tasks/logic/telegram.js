const db = require("../services/db");
const fetch = require("node-fetch");
const {
    convertDateInUTCToLocal,
    getReadableFromUTCToLocal,
} = require("../utils/utils");
const { getUserFromId } = require("./user");
const { sendDiscordAlert } = require("../services/alerts");

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

async function sendMessageToUserOnTelegram({
    chatId,
    message,
    reply_markup,
    metadata = {},
}) {
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

    await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(m),
    });
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

async function editMessageOnTelegram({
    chatId,
    message,
    messageId,
    reply_markup,
}) {
    await fetch(`${TELEGRAM_API}/editMessageText`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: message,
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
    fetchUserChats,
};
