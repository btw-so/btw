const db = require("../services/db");
const { crawlQueue } = require("../services/queue");
const { convert } = require("html-to-text");
const fetch = require("node-fetch");
const {
    convertDateInUTCToLocal,
    getReadableFromUTCToLocal,
} = require("../utils/utils");
const { getUserFromId } = require("./user");
const { sendDiscordAlert } = require("../services/alerts");
const { template } = require("lodash");

const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const WHATSAPP_NUMBER_ID = process.env.WHATSAPP_NUMBER_ID;

async function getUserForChatId(chatId) {
    const tasksDB = await db.getTasksDB();
    const { rows } = await tasksDB.query(
        `SELECT * FROM btw.whatsapp_user_map WHERE whatsapp_id = $1`,
        [chatId]
    );

    return rows && rows.length > 0 && rows[0].user_id;
}

async function attachWhatsappIdToMessage({ whatsAppId, internalId }) {
    console.log("Attaching whatsapp id to message", whatsAppId, internalId);
    const tasksDB = await db.getTasksDB();

    const { rows } = await tasksDB.query(
        `SELECT message FROM btw.whatsapp_chat_context WHERE id = $1`,
        [internalId]
    );

    if (rows.length === 0) {
        return;
    }

    let message = rows[0].message;
    message.message_id = whatsAppId;

    await tasksDB.query(
        `UPDATE btw.whatsapp_chat_context SET message = $1 WHERE id = $2`,
        [message, internalId]
    );
}

async function callWhatsappApi({ method = "POST", body, internalId }) {
    const data = await fetch(
        `https://graph.facebook.com/v20.0/${WHATSAPP_NUMBER_ID}/messages`,
        {
            method,
            body,
            headers: {
                Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
                "Content-Type": "application/json",
            },
        }
    );

    let jsonData = await data.json();

    if (
        internalId &&
        jsonData &&
        jsonData.messages &&
        jsonData.messages.length > 0
    ) {
        const whatsAppId = jsonData.messages[0].id;
        await attachWhatsappIdToMessage({
            whatsAppId,
            internalId,
        });
    }

    return data;
}

async function getLastActiveTimeForChatId(chatId) {
    // get the last message time from whatsapp_chat_context from this chat_id
    const tasksDB = await db.getTasksDB();
    const { rows } = await tasksDB.query(
        `SELECT added_at FROM btw.whatsapp_chat_context WHERE chat_id = $1 AND type = 'user' ORDER BY added_at DESC LIMIT 1`,
        [chatId]
    );

    return rows[0].added_at;
}

async function isTheUserInWindow(chatId) {
    const lastActiveTime = await getLastActiveTimeForChatId(chatId);

    if (!lastActiveTime) {
        return true;
    }

    // it must be within 20 hours
    return (
        lastActiveTime &&
        new Date(lastActiveTime).getTime() > Date.now() - 20 * 60 * 60 * 1000
    );
}

async function sendMessageToUserOnWhatsapp({
    chatId,
    message,
    metadata = {},
    templateId,
    dataForTemplate = {},
}) {
    const m = {
        chat_id: chatId,
        text: message,
    };

    const internalId = await addToWhatsappChats({
        chatId,
        message: m,
        type: "bot",
        metadata: Object.assign({}, metadata || {}, {
            templateId,
            dataForTemplate,
        }),
    });

    if (templateId === "direct_message") {
        await callWhatsappApi({
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: chatId,
                type: "text",
                text: {
                    body: message,
                },
            }),
            internalId,
        });
    } else if (templateId === "invite_ask") {
        await callWhatsappApi({
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: chatId,
                type: "interactive",
                interactive: {
                    type: "button",
                    body: {
                        text: message,
                    },
                    action: {
                        buttons: [
                            {
                                type: "reply",
                                reply: {
                                    id: `family:invitestart:${dataForTemplate.phone}:${dataForTemplate.first_name}:${dataForTemplate.shared_chat_id}`,
                                    title: "Yes",
                                },
                            },
                            {
                                type: "reply",
                                reply: {
                                    id: `family:inviteignore:${dataForTemplate.phone}`,
                                    title: "No",
                                },
                            },
                        ],
                    },
                },
            }),
            internalId,
        });
    } else if (templateId === "invite_accepted") {
        // send as direct message
        await callWhatsappApi({
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: chatId,
                type: "text",
                text: {
                    body: message,
                },
            }),
            internalId,
        });
        // await callWhatsappApi({
        //     body: JSON.stringify({
        //         messaging_product: "whatsapp",
        //         to: chatId,
        //         type: "template",
        //         template: {
        //             name: "invite_accepted",
        //             language: {
        //                 code: "en",
        //             },
        //             components: [
        //                 {
        //                     type: "body",
        //                     parameters: [
        //                         {
        //                             type: "text",
        //                             text: dataForTemplate.requestedName,
        //                         },
        //                     ],
        //                 },
        //             ],
        //         },
        //     }),
        // });
    } else if (templateId === "invite_accepted_requested") {
        await callWhatsappApi({
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: chatId,
                type: "text",
                text: {
                    body: message,
                },
            }),
            internalId,
        });
        // await callWhatsappApi({
        //     body: JSON.stringify({
        //         messaging_product: "whatsapp",
        //         to: chatId,
        //         type: "template",
        //         template: {
        //             name: "invite_accepted_requested",
        //             language: {
        //                 code: "en",
        //             },
        //             components: [
        //                 {
        //                     type: "body",
        //                     parameters: [
        //                         {
        //                             type: "text",
        //                             text: dataForTemplate.requesterName,
        //                         },
        //                     ],
        //                 },
        //             ],
        //         },
        //     }),
        // });
    } else if (templateId === "reminder_alert") {
        console.log(
            "Sending reminder alert",
            message,
            chatId,
            dataForTemplate,
            await isTheUserInWindow(chatId)
        );
        if (await isTheUserInWindow(chatId)) {
            // send interactive
            await callWhatsappApi({
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: chatId,
                    type: "interactive",
                    interactive: {
                        type: "button",
                        body: {
                            text: message,
                        },
                        action: {
                            buttons: [
                                ...(!dataForTemplate.recurring
                                    ? [
                                          {
                                              type: "reply",
                                              reply: {
                                                  id: `reminder:complete:${dataForTemplate.reminderId}:${dataForTemplate.alertId}`,
                                                  title: "Mark ✅",
                                              },
                                          },
                                      ]
                                    : []),
                                {
                                    type: "reply",
                                    reply: {
                                        id: `reminder:snooze:${dataForTemplate.reminderId}:${dataForTemplate.alertId}`,
                                        title: "😴 for 10 mins",
                                    },
                                },
                            ],
                        },
                    },
                }),
                internalId,
            });
        } else {
            await callWhatsappApi({
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: chatId,
                    type: "template",
                    template: {
                        name: "reminder_alert",
                        language: {
                            code: "en",
                        },
                        components: [
                            {
                                type: "body",
                                parameters: [
                                    {
                                        type: "text",
                                        text: dataForTemplate.reminderText,
                                    },
                                    {
                                        type: "text",
                                        text: dataForTemplate.due,
                                    },
                                ],
                            },
                        ],
                    },
                }),
                internalId,
            });
        }
    } else if (templateId === "added_reminder_self") {
        await callWhatsappApi({
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: chatId,
                type: "text",
                text: {
                    body: message,
                },
            }),
            internalId,
        });
        // await callWhatsappApi({
        //     body: JSON.stringify({
        //         messaging_product: "whatsapp",
        //         to: chatId,
        //         type: "template",
        //         template: {
        //             name: "added_reminder_self",
        //             language: {
        //                 code: "en",
        //             },
        //             components: [
        //                 {
        //                     type: "body",
        //                     parameters: [
        //                         {
        //                             type: "text",
        //                             text: `${
        //                                 dataForTemplate.numReminders
        //                             } new reminder${
        //                                 dataForTemplate.numReminders > 1
        //                                     ? "s"
        //                                     : ""
        //                             }`,
        //                         },
        //                     ],
        //                 },
        //             ],
        //         },
        //     }),
        // });
    } else if (templateId === "added_reminder_family") {
        await callWhatsappApi({
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: chatId,
                type: "text",
                text: {
                    body: message,
                },
            }),
            internalId,
        });
        // await callWhatsappApi({
        //     body: JSON.stringify({
        //         messaging_product: "whatsapp",
        //         to: chatId,
        //         type: "template",
        //         template: {
        //             name: "added_reminder_family",
        //             language: {
        //                 code: "en",
        //             },
        //             components: [
        //                 {
        //                     type: "body",
        //                     parameters: [
        //                         {
        //                             type: "text",
        //                             text: dataForTemplate.personName,
        //                         },
        //                         {
        //                             type: "text",
        //                             text: `${dataForTemplate.numReminders}`,
        //                         },
        //                     ],
        //                 },
        //             ],
        //         },
        //     }),
        // });
    } else if (templateId === "added_reminder_family_adder") {
        await callWhatsappApi({
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: chatId,
                type: "text",
                text: {
                    body: message,
                },
            }),
            internalId,
        });
        // await callWhatsappApi({
        //     body: JSON.stringify({
        //         messaging_product: "whatsapp",
        //         to: chatId,
        //         type: "template",
        //         template: {
        //             name: "added_reminder_family_adder",
        //             language: {
        //                 code: "en",
        //             },
        //             components: [
        //                 {
        //                     type: "body",
        //                     parameters: [
        //                         {
        //                             type: "text",
        //                             text: `${dataForTemplate.numReminders}`,
        //                         },
        //                         {
        //                             type: "text",
        //                             text: dataForTemplate.personName,
        //                         },
        //                     ],
        //                 },
        //             ],
        //         },
        //     }),
        // });
    } else if (templateId === "new_reminder") {
        console.log("Sending new reminder", message, chatId, dataForTemplate);

        const showCompleteButton = !!dataForTemplate.showCompleteButton;
        const showDeleteButton = !!dataForTemplate.showDeleteButton;

        if (showCompleteButton || showDeleteButton) {
            await callWhatsappApi({
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: chatId,
                    type: "interactive",
                    interactive: {
                        type: "button",
                        body: {
                            text: message,
                        },
                        action: {
                            buttons: [
                                ...(!!dataForTemplate.showCompleteButton
                                    ? [
                                          {
                                              type: "reply",
                                              reply: {
                                                  id: `reminder:complete:${dataForTemplate.reminderId}`,
                                                  title: "Mark ✅",
                                              },
                                          },
                                      ]
                                    : []),
                                ...(!!dataForTemplate.showDeleteButton
                                    ? [
                                          {
                                              type: "reply",
                                              reply: {
                                                  id: `reminder:delete:${dataForTemplate.reminderId}`,
                                                  title: "Delete 🗑️",
                                              },
                                          },
                                      ]
                                    : []),
                            ],
                        },
                    },
                }),
                internalId,
            });
        } else {
            await callWhatsappApi({
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: chatId,
                    type: "text",
                    text: {
                        body: message,
                    },
                }),
                internalId,
            });
        }
    } else if (templateId === "new_family_invite") {
        // TODO: TEMPLATE HERE
        await callWhatsappApi({
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: chatId,
                type: "interactive",
                interactive: {
                    type: "button",
                    body: {
                        text: message,
                    },
                    action: {
                        buttons: [
                            {
                                type: "reply",
                                reply: {
                                    id: `family:approve:${dataForTemplate.requesterUserId}`,
                                    title: "Approve",
                                },
                            },
                            {
                                type: "reply",
                                reply: {
                                    id: `family:ignore:${dataForTemplate.requesterUserId}`,
                                    title: "Ignore",
                                },
                            },
                        ],
                    },
                },
            }),
            internalId,
        });
    } else if (templateId === "reminders_summary") {
        console.log("Sending reminders summary", message, chatId);

        try {
            await callWhatsappApi({
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: `+${chatId}`,
                    type: "text",
                    text: {
                        body: message,
                    },
                    // type: "template",
                    // template: {
                    //     name: "reminders_summary",
                    //     language: {
                    //         code: "en",
                    //     },
                    //     components: [
                    //         {
                    //             type: "body",
                    //             parameters: [
                    //                 {
                    //                     type: "text",
                    //                     text: dataForTemplate.numReminders,
                    //                 },
                    //                 {
                    //                     type: "text",
                    //                     text: dataForTemplate.from,
                    //                 },
                    //                 {
                    //                     type: "text",
                    //                     text: dataForTemplate.to,
                    //                 },
                    //             ],
                    //         },
                    //     ],
                    // },
                }),
                internalId,
            });
        } catch (e) {
            console.log(e);
        }
    }
}

function createCommaAnd(texts) {
    if (texts.length === 0) {
        return "";
    } else if (texts.length === 1) {
        return texts[0];
    } else {
        return (
            texts.slice(0, -1).join(", ") + " and " + texts[texts.length - 1]
        );
    }
}

async function getMessageByIdFromContext({ chatId, messageId }) {
    // Check from DB if the message exists for chatId and message.message_id = messageId
    const tasksDB = await db.getTasksDB();
    const { rows } = await tasksDB.query(
        `SELECT * FROM btw.whatsapp_chat_context WHERE chat_id = $1 AND message->>'message_id' = $2`,
        [chatId, messageId]
    );

    return rows && rows.length > 0 && rows[0].message;
}

async function sendAlertUnitToWhatsapp({ chatId, alert, reminder }) {
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

    await sendMessageToUserOnWhatsapp({
        chatId,
        message: text,
        templateId: "reminder_alert",
        dataForTemplate: {
            reminderText: `${reminder.text}${
                !!reminder.completed ? " ✅" : !!reminder.recurring ? " ♻️" : ""
            }`,
            due: createCommaAnd([
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
                      ),
            ]),
            reminderId: reminder.id,
            alertId: alert.id,
            recurring: !!reminder.recurring,
        },
    });
}

async function addToWhatsappChats({
    chatId,
    message,
    type = "user",
    metadata = {},
}) {
    const tasksDB = await db.getTasksDB();
    const { rows } = await tasksDB.query(
        `INSERT INTO btw.whatsapp_chat_context (chat_id, added_at, message, type, metadata) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [chatId, new Date(), message, type, metadata]
    );

    return rows[0].id;

    // sendDiscordAlert({
    //     chatId,
    //     message,
    //     type,
    //     metadata,
    // });
}

async function sendTypingActionToWhatsapp({ chatId }) {
    // TODO: Implement this
}

async function addUserToChatId({ chatId, userId }) {
    // upsert user_id, whatsapp_id
    const tasksDB = await db.getTasksDB();

    const exis = await getUserForChatId(chatId);

    if (!exis) {
        await tasksDB.query(
            `INSERT INTO btw.whatsapp_user_map (whatsapp_id, user_id) VALUES ($1, $2)`,
            [chatId, userId]
        );
    } else {
        await tasksDB.query(
            `UPDATE btw.whatsapp_user_map SET user_id = $1 WHERE whatsapp_id = $2`,
            [userId, chatId]
        );
    }
}

async function getChatIdForUser(userId) {
    const tasksDB = await db.getTasksDB();
    const { rows } = await tasksDB.query(
        `SELECT * FROM btw.whatsapp_user_map WHERE user_id = $1`,
        [userId]
    );

    return rows && rows.length > 0 && rows[0].whatsapp_id;
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
            `SELECT * FROM btw.whatsapp_chat_context WHERE chat_id = $1 AND added_at >= $2 ORDER BY added_at DESC LIMIT $3`,
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
            `SELECT * FROM btw.whatsapp_chat_context WHERE chat_id = $1 AND added_at <= $2 ORDER BY added_at DESC LIMIT $3`,
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

async function sendReminderUnitToWhatsapp({
    user_id,
    chatId,
    reminder,
    timezoneOffsetInSeconds,
    update,
    deleted,
}) {
    // Show a button to mark the reminder as complete (if it's not recurring and if it's not already complete)
    // show a button to delete the reminder if it's not complete
    await sendMessageToUserOnWhatsapp({
        chatId,
        message: descrForReminder(
            reminder,
            timezoneOffsetInSeconds,
            update,
            deleted
        ),
        templateId: "new_reminder",
        dataForTemplate: {
            reminderText: reminder.text,
            alertsText: createCommaAnd(
                (reminder.alerts || []).map((alert) =>
                    getReadableFromUTCToLocal(
                        alert.duedate,
                        timezoneOffsetInSeconds,
                        {
                            readableTimeAndDate: true,
                        }
                    )
                )
            ),
            reminderId: reminder.id,
            showCompleteButton:
                user_id === reminder.user_id &&
                !(!!deleted || !!reminder.recurring || !!reminder.completed),
            showDeleteButton: user_id === reminder.user_id && !deleted,
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

async function sendFamilyInviteToWhatsapp({
    requesterName,
    requesterNumber,
    requesterUserId,
    chatId,
}) {
    // await sendContactToTelegram({
    //     chatId,
    //     contact: {
    //         phone_number: requesterNumber,
    //         first_name: requesterName,
    //     },
    // });

    const message = `Hey! ${requesterName} (${requesterNumber}) wants to join pair with you on A1. If you approve this request, you can add reminders on their A1 (and viceversa).`;
    await sendMessageToUserOnWhatsapp({
        chatId,
        message,
        templateId: "new_family_invite",
        dataForTemplate: {
            requesterName,
            requesterNumber,
            requesterUserId,
        },
    });
}

module.exports = {
    getUserForChatId,
    addToWhatsappChats,
    sendTypingActionToWhatsapp,
    addUserToChatId,
    getChatIdForUser,
    fetchUserChats,
    sendMessageToUserOnWhatsapp,
    sendFamilyInviteToWhatsapp,
    sendAlertUnitToWhatsapp,
    sendReminderUnitToWhatsapp,
    getMessageByIdFromContext,
};
