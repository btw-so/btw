var express = require("express");
const fetch = require("node-fetch");
var router = express.Router();
var cors = require("cors");
const moment = require("moment-timezone");
var { generateOTP, validateOTP, deleteOTP } = require("../logic/otp");
var { cleanPhoneNumber } = require("../logic/phone");
var {
    createUser,
    createLoginToken,
    setUserDetails,
    setUserTimezone,
    setUserName,
    getUserFromId,
    setUserPhone,
    areFamily,
    getUserByPhone,
    generateFamilyInviteEntry,
    addFamily,
    getFamilyUsers,
} = require("../logic/user");
var { emailOTP } = require("../logic/email");
var {
    sendMessageToUserOnTelegram,
    getUserForChatId,
    addToTelegramChats,
    addUserToChatId,
    fetchFromTelegramChats,
    editMessageOnTelegram,
    getMessageByIdFromContext,
    sendTypingActionToTelegram,
    fetchUserChats,
} = require("../logic/telegram");
var {
    addAlertToDb,
    markReminderAsComplete,
    deleteReminderCompletely,
    getReminderFromId, getAlertFromId
} = require("../logic/ai");
var { runAgentLoop } = require("../logic/agent");
var { transcribeAudio, isTranscriptionSupported } = require("../logic/transcribe");
var { getReadableFromUTCToLocal } = require("../utils/utils");
const { uxQueue } = require("../services/queue");
const { createCheckoutSession, cancelSubscription } = require("../logic/subscription");
const { getSandbox } = require("../logic/sandbox");
const { resolveApproval } = require("../logic/approval");
const { routeMessage, createTask, loadTask, saveTaskState, generateTaskName } = require("../logic/messageRouter");
const { getEntryPoint, trackMessage } = require("../logic/entryPoints");

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

function getStandardTimezones() {
    const standardTimezones = [
        {
            gmtName: "GMT-12:00",
            timezone: "Pacific/Kwajalein",
            offsetInSeconds: -43200,
        },
        {
            gmtName: "GMT-11:30",
            timezone: "Pacific/Apia",
            offsetInSeconds: -41400,
        },
        {
            gmtName: "GMT-11:00",
            timezone: "Pacific/Midway",
            offsetInSeconds: -39600,
        },
        {
            gmtName: "GMT-10:00",
            timezone: "Pacific/Honolulu",
            offsetInSeconds: -36000,
        },
        {
            gmtName: "GMT-09:30",
            timezone: "Pacific/Marquesas",
            offsetInSeconds: -34200,
        },
        {
            gmtName: "GMT-09:00",
            timezone: "America/Anchorage",
            offsetInSeconds: -32400,
        },
        {
            gmtName: "GMT-08:30",
            timezone: "America/Los_Angeles",
            offsetInSeconds: -30600,
        },
        {
            gmtName: "GMT-08:00",
            timezone: "America/Denver",
            offsetInSeconds: -28800,
        },
        {
            gmtName: "GMT-07:30",
            timezone: "America/Phoenix",
            offsetInSeconds: -27000,
        },
        {
            gmtName: "GMT-07:00",
            timezone: "America/Chicago",
            offsetInSeconds: -25200,
        },
        {
            gmtName: "GMT-06:30",
            timezone: "America/Mexico_City",
            offsetInSeconds: -23400,
        },
        {
            gmtName: "GMT-06:00",
            timezone: "America/New_York",
            offsetInSeconds: -21600,
        },
        {
            gmtName: "GMT-05:30",
            timezone: "America/Caracas",
            offsetInSeconds: -19800,
        },
        {
            gmtName: "GMT-05:00",
            timezone: "America/Halifax",
            offsetInSeconds: -18000,
        },
        {
            gmtName: "GMT-04:30",
            timezone: "America/St_Johns",
            offsetInSeconds: -16200,
        },
        {
            gmtName: "GMT-04:00",
            timezone: "America/Santiago",
            offsetInSeconds: -14400,
        },
        {
            gmtName: "GMT-03:30",
            timezone: "America/St_Johns",
            offsetInSeconds: -12600,
        },
        {
            gmtName: "GMT-03:00",
            timezone: "America/Sao_Paulo",
            offsetInSeconds: -10800,
        },
        {
            gmtName: "GMT-02:30",
            timezone: "Atlantic/South_Georgia",
            offsetInSeconds: -9000,
        },
        {
            gmtName: "GMT-02:00",
            timezone: "Atlantic/Azores",
            offsetInSeconds: -7200,
        },
        {
            gmtName: "GMT-01:30",
            timezone: "Atlantic/Cape_Verde",
            offsetInSeconds: -5400,
        },
        {
            gmtName: "GMT-01:00",
            timezone: "Atlantic/Cape_Verde",
            offsetInSeconds: -3600,
        },
        {
            gmtName: "GMT-00:30",
            timezone: "Atlantic/Reykjavik",
            offsetInSeconds: -1800,
        },
        {
            gmtName: "GMT+00:00",
            timezone: "Europe/London",
            offsetInSeconds: 0,
        },
        {
            gmtName: "GMT+00:30",
            timezone: "Africa/Algiers",
            offsetInSeconds: 1800,
        },
        {
            gmtName: "GMT+01:00",
            timezone: "Europe/Paris",
            offsetInSeconds: 3600,
        },
        {
            gmtName: "GMT+01:30",
            timezone: "Europe/Paris",
            offsetInSeconds: 5400,
        },
        {
            gmtName: "GMT+02:00",
            timezone: "Europe/Istanbul",
            offsetInSeconds: 7200,
        },
        {
            gmtName: "GMT+02:30",
            timezone: "Asia/Tehran",
            offsetInSeconds: 9000,
        },
        {
            gmtName: "GMT+03:00",
            timezone: "Europe/Moscow",
            offsetInSeconds: 10800,
        },
        {
            gmtName: "GMT+03:30",
            timezone: "Asia/Tehran",
            offsetInSeconds: 12600,
        },
        {
            gmtName: "GMT+04:00",
            timezone: "Asia/Dubai",
            offsetInSeconds: 14400,
        },
        {
            gmtName: "GMT+04:30",
            timezone: "Asia/Kabul",
            offsetInSeconds: 16200,
        },
        {
            gmtName: "GMT+05:00",
            timezone: "Asia/Karachi",
            offsetInSeconds: 18000,
        },
        {
            gmtName: "GMT+05:30",
            timezone: "Asia/Kolkata",
            offsetInSeconds: 19800,
        },
        {
            gmtName: "GMT+05:45",
            timezone: "Asia/Kathmandu",
            offsetInSeconds: 20700,
        },
        {
            gmtName: "GMT+06:00",
            timezone: "Asia/Dhaka",
            offsetInSeconds: 21600,
        },
        {
            gmtName: "GMT+06:30",
            timezone: "Asia/Yangon",
            offsetInSeconds: 23400,
        },
        {
            gmtName: "GMT+07:00",
            timezone: "Asia/Bangkok",
            offsetInSeconds: 25200,
        },
        {
            gmtName: "GMT+08:00",
            timezone: "Asia/Shanghai",
            offsetInSeconds: 28800,
        },
        {
            gmtName: "GMT+08:30",
            timezone: "Australia/Eucla",
            offsetInSeconds: 30600,
        },
        {
            gmtName: "GMT+09:00",
            timezone: "Asia/Tokyo",
            offsetInSeconds: 32400,
        },
        {
            gmtName: "GMT+09:30",
            timezone: "Australia/Adelaide",
            offsetInSeconds: 34200,
        },
        {
            gmtName: "GMT+10:00",
            timezone: "Australia/Brisbane",
            offsetInSeconds: 36000,
        },
        {
            gmtName: "GMT+10:30",
            timezone: "Australia/Lord_Howe",
            offsetInSeconds: 37800,
        },
        {
            gmtName: "GMT+11:00",
            timezone: "Pacific/Guadalcanal",
            offsetInSeconds: 39600,
        },
        {
            gmtName: "GMT+11:30",
            timezone: "Pacific/Norfolk",
            offsetInSeconds: 41400,
        },
    ];

    return standardTimezones;
}

function getTimezoneButtons() {
    const timezones = getStandardTimezones();
    const buttons = timezones.map((tz) => {
        return [
            {
                text: `${tz.timezone} ${tz.gmtName}`,
                callback_data: `timezone:${tz.timezone}:${
                    "" + tz.offsetInSeconds
                }`,
            },
        ];
    });
    return buttons;
}


const loginFlowFunction = async ({ chatId }) => {
    const user_id = await getUserForChatId(chatId);

    if (user_id) {
        return user_id;
    }

    return null;
};

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validSixDigits(text) {
    const sixDigitRegex = /^\d{6}$/;
    return sixDigitRegex.test(text);
}

// create an api to generate otp
router.options(
    "/webhook",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/webhook",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        // Verify Telegram webhook secret token (skip if not configured yet)
        if (process.env.TELEGRAM_WEBHOOK_SECRET) {
            const secretToken = req.headers["x-telegram-bot-api-secret-token"];
            if (!secretToken || secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET) {
                console.log("[Telegram] Webhook rejected: invalid secret token");
                res.status(403).json({ error: "Forbidden" });
                return;
            }
        }

        console.log(JSON.stringify(req.body));

        console.log("1");

        const sendGreeting = async (chatId) => {
            await sendMessageToUserOnTelegram({
                chatId,
                message: `Sweet! I will be your personal assistant. I can help remind you about calls, meetings, birthdays etc.

You can say "Meeting with Drake at 6PM on Mar 29 at Raffles Hotel. Remind me the day before at 9PM" or "Remind me to wish Katlyn on Dec 23 every year" or "Remind me to drink water every hour from 9AM to 8PM".

Want superpowers? Use /subscribe to get Pro — your own sandbox Linux VM to write code, run scripts, and more!`,
                reply_markup: {
                    remove_keyboard: true,
                },
            });

            // this is a good time to start invite cron
            uxQueue.add("new-user-family-invites", {
                user_id: await getUserForChatId(chatId),
            });
        };

        if (req.body.message?.chat) {
            const chatId = req.body.message.chat.id;
            const sentMessage = req.body.message.text;

            console.log("2");

            const user_id = await loginFlowFunction({ chatId });

            const add = async () => {
                await addToTelegramChats({
                    chatId,
                    message: req.body.message,
                });
            };

            // Maintain a log of all messages that came to the bot
            await add();

            console.log("3");

            // Show a typing indicator
            await sendTypingActionToTelegram({ chatId });

            const success = () => {
                res.send({
                    success: true,
                });
            };

            const askForLocation = async () => {
                await sendMessageToUserOnTelegram({
                    chatId,
                    message: `Awesome. One step left before you can start using my superpowers. Please share your location.`,
                    reply_markup: {
                        inline_keyboard: getTimezoneButtons(),
                    },
                });
            };

            const askForContact = async () => {
                await sendMessageToUserOnTelegram({
                    chatId,
                    message: `Please share your contact to log you in`,
                    reply_markup: {
                        keyboard: [
                            [
                                {
                                    text: "Share Contact",
                                    request_contact: true,
                                },
                            ],
                        ],
                        resize_keyboard: true,
                        one_time_keyboard: true,
                    },
                });
            };

            console.log("4");

            if (!user_id) {
                if (
                    req.body.message.contact &&
                    req.body.message.contact.phone_number &&
                    req.body.message.contact.user_id === chatId
                ) {
                    console.log("5");

                    // user's phone number. log them in.
                    var phone = req.body.message.contact.phone_number || "";

                    const {
                        success: psuccess,
                        error: perror,
                        phone: nPhone,
                        email: pemail,
                    } = cleanPhoneNumber(phone);

                    console.log("6");

                    if (psuccess && nPhone) {
                        phone = nPhone;
                    } else {
                        await sendMessageToUserOnTelegram({
                            chatId,
                            message:
                                perror ||
                                `Invalid phone number. Please try again.`,
                        });
                        success();
                        return;
                    }

                    const email = pemail;

                    const { userId: id, newUser } = await createUser({
                        email,
                    });

                    console.log("7");

                    if (newUser) {
                        await setUserPhone({
                            user_id: id,
                            phone,
                        });
                    }

                    await addUserToChatId({
                        chatId,
                        userId: id,
                    });

                    if (
                        req.body.message.chat.first_name ||
                        req.body.message.chat.last_name
                    ) {
                        const name = `${
                            req.body.message.chat.first_name || ""
                        }${
                            req.body.message.chat.first_name &&
                            req.body.message.chat.last_name
                                ? " "
                                : ""
                        }${req.body.message.chat.last_name || ""}`;

                        await setUserName({
                            user_id: id,
                            name,
                        });
                    }

                    if (newUser) {
                        await askForLocation();
                    } else {
                        await sendGreeting(chatId);
                    }

                    success();
                    return;
                } else {
                    await askForContact();
                    success();
                    return;
                }
            }

            if (user_id) {
                const user = await getUserFromId({
                    user_id,
                });

                const familyUsers = await getFamilyUsers({
                    id: user_id,
                });

                // Handle /subscribe command
                if (sentMessage === "/subscribe" || sentMessage === "/start subscribe") {
                    if (user.pro) {
                        await sendMessageToUserOnTelegram({
                            chatId,
                            message: "You already have a Pro subscription! Your sandbox VM is ready to use.",
                        });
                    } else {
                        try {
                            const { url } = await createCheckoutSession({ user_id, chatId });
                            await sendMessageToUserOnTelegram({
                                chatId,
                                message: `Upgrade to A1 Pro and get your own sandbox Linux VM (2 vCPU, 4GB RAM)!\n\nYou'll be able to ask me to write code, run scripts, install packages, and more — all on your dedicated server.\n\nSubscribe here: ${url}`,
                            });
                        } catch (err) {
                            console.log(`[Telegram] Subscribe error:`, err.message);
                            await sendMessageToUserOnTelegram({
                                chatId,
                                message: "Sorry, subscriptions are not available right now. Please try again later.",
                            });
                        }
                    }
                    success();
                    return;
                }

                // Handle /unsubscribe command
                if (sentMessage === "/unsubscribe") {
                    if (!user.pro) {
                        await sendMessageToUserOnTelegram({
                            chatId,
                            message: "You don't have an active subscription.",
                        });
                    } else {
                        try {
                            await cancelSubscription({ user_id });
                            await sendMessageToUserOnTelegram({
                                chatId,
                                message: "Your subscription has been canceled. Your sandbox VM will be destroyed shortly.",
                            });
                        } catch (err) {
                            console.log(`[Telegram] Unsubscribe error:`, err.message);
                            await sendMessageToUserOnTelegram({
                                chatId,
                                message: "Sorry, couldn't cancel your subscription right now. Please try again later.",
                            });
                        }
                    }
                    success();
                    return;
                }

                if (sentMessage || req.body.message.photo) {
                    // Handle text messages and photo messages (with optional caption)
                    let imageBase64 = null;
                    let imageMimeType = null;
                    const inputText = sentMessage || req.body.message.caption || "";
                    const incomingMessageId = String(req.body.message.message_id);
                    const replyToMessageId = req.body.message.reply_to_message
                        ? String(req.body.message.reply_to_message.message_id)
                        : null;

                    if (req.body.message.photo) {
                        const photos = req.body.message.photo;
                        const bestPhoto = photos[photos.length - 1];
                        const fileId = bestPhoto.file_id;

                        try {
                            const fileResp = await fetch(`${TELEGRAM_API}/getFile`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ file_id: fileId }),
                            });
                            const fileData = await fileResp.json();

                            if (fileData.ok && fileData.result?.file_path) {
                                const downloadUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${fileData.result.file_path}`;
                                const imageResp = await fetch(downloadUrl);
                                const imageBuffer = await imageResp.buffer();
                                imageBase64 = imageBuffer.toString("base64");

                                const ext = fileData.result.file_path.split(".").pop().toLowerCase();
                                const mimeMap = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" };
                                imageMimeType = mimeMap[ext] || "image/jpeg";
                            }
                        } catch (err) {
                            console.log(`[Telegram] Failed to download photo:`, err.message);
                        }
                    }

                    // Look up sandbox for pro users
                    let sandbox = null;
                    if (user.pro) {
                        try {
                            sandbox = await getSandbox({ user_id });
                        } catch (err) {
                            console.log(`[Telegram] Sandbox lookup error:`, err.message);
                        }
                    }

                    // Respond immediately to Telegram, run agent loop async
                    success();

                    (async () => {
                        try {
                            // Route message to existing or new task
                            const route = await routeMessage({
                                userId: user_id,
                                chatId,
                                entryPoint: "telegram",
                                messageText: inputText,
                                replyToMessageId,
                            });

                            let taskId;
                            let task;

                            if (route.action === "continue") {
                                taskId = route.taskId;
                                task = await loadTask(taskId);
                            }

                            if (!task) {
                                // Create new task
                                const taskName = await generateTaskName(inputText);
                                taskId = await createTask({
                                    userId: user_id,
                                    chatId,
                                    entryPoint: "telegram",
                                    name: taskName,
                                    mode: "manual",
                                });
                                task = await loadTask(taskId);
                            }

                            // Track the incoming user message
                            await trackMessage({
                                taskId,
                                userId: user_id,
                                entryPoint: "telegram",
                                platformMessageId: incomingMessageId,
                                chatId,
                                role: "user",
                            });

                            // Load task messages for context
                            const agenticTaskMessages = task.messages || [];
                            const taskWorkingDir = task.working_directory || "/root";

                            const { text, agentMessages, workingDirectory: newWd } = await runAgentLoop({
                                input: inputText,
                                user_id,
                                timezoneOffsetInSeconds:
                                    user.settings?.timezoneOffsetInSeconds,
                                familyUsers,
                                timezone: user.settings?.timezone,
                                imageBase64,
                                imageMimeType,
                                isPro: !!user.pro,
                                sandbox,
                                chatId,
                                entryPoint: "telegram",
                                userName: user.name,
                                agenticTaskId: taskId,
                                agenticTaskMessages,
                                workingDirectory: { current: taskWorkingDir },
                            });

                            // Save agent state back to task (only on success)
                            if (text && agentMessages && agentMessages.length > 0) {
                                await saveTaskState({
                                    taskId,
                                    messages: agentMessages,
                                    workingDirectory: newWd,
                                });
                            }

                            console.log(`[Telegram] Agent returned text: "${text?.slice(0, 200)}" (length: ${text?.length}) for task ${taskId}`);
                            if (text) {
                                // Manual tasks: no reply threading, just send normally
                                const ep = getEntryPoint("telegram");
                                const { messageId: sentMsgId } = await ep.sendMessage({
                                    chatId,
                                    message: text,
                                });

                                // Track the bot's sent message for routing
                                if (sentMsgId) {
                                    await trackMessage({
                                        taskId,
                                        userId: user_id,
                                        entryPoint: "telegram",
                                        platformMessageId: sentMsgId,
                                        chatId,
                                        role: "bot",
                                    });

                                    // Set origin_message_id for future reply-to routing
                                    if (!task.origin_message_id) {
                                        const db = require("../services/db");
                                        const tasksDB = await db.getTasksDB();
                                        await tasksDB.query(
                                            `UPDATE btw.agentic_tasks SET origin_message_id = $1 WHERE id = $2`,
                                            [sentMsgId, taskId]
                                        );
                                    }
                                }

                                // Also store in chat history for legacy compatibility
                                await addToTelegramChats({
                                    chatId,
                                    message: { text, message_id: sentMsgId },
                                    type: "bot",
                                });

                                console.log(`[Telegram] Message sent to chat ${chatId} (task ${taskId})`);
                            } else {
                                console.log(`[Telegram] No text to send`);
                            }
                        } catch (err) {
                            console.log(`[Telegram] Error:`, err);
                        }
                    })();

                    return;
                } else if (req.body.message.voice || req.body.message.audio) {
                    const voiceOrAudio = req.body.message.voice || req.body.message.audio;
                    const fileId = voiceOrAudio.file_id;
                    const incomingMessageId = String(req.body.message.message_id);
                    const replyToMessageId = req.body.message.reply_to_message
                        ? String(req.body.message.reply_to_message.message_id)
                        : null;

                    if (!isTranscriptionSupported()) {
                        await sendMessageToUserOnTelegram({
                            chatId,
                            message: "Audio messages are not supported yet.",
                        });
                        success();
                        return;
                    }

                    // Download the audio file from Telegram
                    const fileResp = await fetch(`${TELEGRAM_API}/getFile`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ file_id: fileId }),
                    });
                    const fileData = await fileResp.json();

                    let transcribedText = null;
                    let transcribeError = null;

                    if (fileData.ok && fileData.result?.file_path) {
                        const downloadUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${fileData.result.file_path}`;
                        const audioResp = await fetch(downloadUrl);
                        const fileBuffer = await audioResp.buffer();
                        const fileName = fileData.result.file_path.split("/").pop() || "audio.ogg";

                        const result = await transcribeAudio({ fileBuffer, fileName });
                        transcribedText = result.text;
                        transcribeError = result.error;
                    } else {
                        transcribeError = "Failed to get file from Telegram";
                    }

                    if (!transcribedText) {
                        console.log(`[Telegram] Transcription failed:`, transcribeError);
                        await sendMessageToUserOnTelegram({
                            chatId,
                            message: "Sorry, I couldn't understand that audio. Please try again or send a text message.",
                        });
                        success();
                        return;
                    }

                    // Look up sandbox for pro users
                    let sandbox = null;
                    if (user.pro) {
                        try {
                            sandbox = await getSandbox({ user_id });
                        } catch (err) {
                            console.log(`[Telegram] Sandbox lookup error:`, err.message);
                        }
                    }

                    // Respond immediately, run agent async
                    success();

                    (async () => {
                        try {
                            // Route message to existing or new task
                            const route = await routeMessage({
                                userId: user_id,
                                chatId,
                                entryPoint: "telegram",
                                messageText: transcribedText,
                                replyToMessageId,
                            });

                            let taskId;
                            let task;

                            if (route.action === "continue") {
                                taskId = route.taskId;
                                task = await loadTask(taskId);
                            }

                            if (!task) {
                                const taskName = await generateTaskName(transcribedText);
                                taskId = await createTask({
                                    userId: user_id,
                                    chatId,
                                    entryPoint: "telegram",
                                    name: taskName,
                                    mode: "manual",
                                });
                                task = await loadTask(taskId);
                            }

                            // Track the incoming user message
                            await trackMessage({
                                taskId,
                                userId: user_id,
                                entryPoint: "telegram",
                                platformMessageId: incomingMessageId,
                                chatId,
                                role: "user",
                            });

                            const agenticTaskMessages = task.messages || [];
                            const taskWorkingDir = task.working_directory || "/root";

                            const { text, agentMessages, workingDirectory: newWd } = await runAgentLoop({
                                input: transcribedText,
                                user_id,
                                timezoneOffsetInSeconds:
                                    user.settings?.timezoneOffsetInSeconds,
                                familyUsers,
                                timezone: user.settings?.timezone,
                                isPro: !!user.pro,
                                sandbox,
                                chatId,
                                entryPoint: "telegram",
                                userName: user.name,
                                agenticTaskId: taskId,
                                agenticTaskMessages,
                                workingDirectory: { current: taskWorkingDir },
                            });

                            // Save agent state back to task (only on success)
                            if (text && agentMessages && agentMessages.length > 0) {
                                await saveTaskState({
                                    taskId,
                                    messages: agentMessages,
                                    workingDirectory: newWd,
                                });
                            }

                            console.log(`[Telegram] Agent returned text: "${text?.slice(0, 200)}" (length: ${text?.length}) for task ${taskId}`);
                            if (text) {
                                const ep = getEntryPoint("telegram");
                                const { messageId: sentMsgId } = await ep.sendMessage({
                                    chatId,
                                    message: text,
                                });

                                if (sentMsgId) {
                                    await trackMessage({
                                        taskId,
                                        userId: user_id,
                                        entryPoint: "telegram",
                                        platformMessageId: sentMsgId,
                                        chatId,
                                        role: "bot",
                                    });

                                    if (!task.origin_message_id) {
                                        const db = require("../services/db");
                                        const tasksDB = await db.getTasksDB();
                                        await tasksDB.query(
                                            `UPDATE btw.agentic_tasks SET origin_message_id = $1 WHERE id = $2`,
                                            [sentMsgId, taskId]
                                        );
                                    }
                                }

                                await addToTelegramChats({
                                    chatId,
                                    message: { text, message_id: sentMsgId },
                                    type: "bot",
                                });
                            }
                        } catch (err) {
                            console.log(`[Telegram] Error:`, err);
                        }
                    })();

                    return;
                } else if (req.body.message.contact) {
                    // user shared a contact to become part of the family.
                    // send a message to user asking if they want to pair with the user. with two buttons yes and no
                    let { phone_number, first_name } = req.body.message.contact;
                    const { message_id } = req.body.message;

                    await sendMessageToUserOnTelegram({
                        chatId,
                        message: `Do you want to pair with ${first_name} (${phone_number})?`,
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: "Yes",
                                        callback_data: `family:invitestart:${message_id}`,
                                    },
                                    {
                                        text: "No",
                                        callback_data: `family:inviteignore:${message_id}`,
                                    },
                                ],
                            ],
                        },
                    });

                    success();
                    return;
                } else {
                    success();
                    return;
                }
            } else {
                success();
                return;
            }
        } else if (req.body.callback_query) {
            const callbackQuery = req.body.callback_query;
            const chatId = callbackQuery.message.chat.id;
            const messageId = callbackQuery.message.message_id;
            const callbackData = callbackQuery.data;

            // Verify the callback sender matches the chat (prevent cross-user callback forgery)
            if (callbackQuery.from.id !== chatId) {
                console.log(`[Telegram] Callback sender ${callbackQuery.from.id} doesn't match chat ${chatId}`);
                res.status(403).json({ error: "Forbidden" });
                return;
            }

            const user_id = await loginFlowFunction({ chatId });

            // Split the callback data to identify its type
            const type = callbackData.split(":")[0];

            // Acknowledge the callback query to remove the loading state on the button
            const success = () => {
                res.json({
                    callback_query_id: callbackQuery.id,
                    text: "Timezone selected!",
                    show_alert: false,
                });
            };

            if (user_id) {
                if (type === "timezone") {
                    const selectedTimezone = callbackData.split(":")[1];
                    const offsetInSeconds = Number(callbackData.split(":")[2]);

                    // Process the selected timezone here
                    console.log(
                        `Selected Timezone: ${selectedTimezone}, Offset: ${offsetInSeconds}`
                    );

                    // edit the message to show the selected timezone and remove the buttons
                    await editMessageOnTelegram({
                        chatId,
                        message: `You have selected timezone: ${selectedTimezone}`,
                        messageId,
                        reply_markup: {
                            inline_keyboard: [],
                        },
                    });

                    // Set the timezone in the user's settings
                    await setUserTimezone({
                        user_id,
                        timezone: selectedTimezone,
                        timezoneOffsetInSeconds: offsetInSeconds,
                    });

                    await sendGreeting(chatId);
                } else if (type === "reminder") {
                    // reminder:<action>:<reminder_id>:<alert_id>
                    const action = callbackData.split(":")[1];
                    const reminder_id = callbackData.split(":")[2];
                    const alert_id =
                        callbackData.split(":").length > 2
                            ? callbackData.split(":")[3]
                            : null;

                    const reminder = await getReminderFromId({
                        reminder_id,
                        user_id,
                    });

                    const alert = alert_id
                        ? await getAlertFromId({
                              alert_id,
                              user_id,
                          })
                        : null;

                    if (action === "complete") {
                        // remove the action buttons
                        if (reminder) {
                            await markReminderAsComplete({
                                user_id,
                                reminder_id,
                            });

                            await editMessageOnTelegram({
                                chatId,
                                message: `${reminder.text} ✅`,
                                messageId,
                                reply_markup: {
                                    inline_keyboard: [],
                                },
                            });
                        }
                    } else if (action === "delete") {
                        if (reminder) {
                            await deleteReminderCompletely({
                                user_id,
                                reminder_id,
                            });

                            await editMessageOnTelegram({
                                chatId,
                                message: `${reminder.text} 👉 🗑️`,
                                messageId,
                                reply_markup: {
                                    inline_keyboard: [],
                                },
                            });
                        }
                    } else if (action === "snooze") {
                        if (reminder && alert) {
                            await addAlertToDb({
                                user_id,
                                reminder_id,
                                duedateInUTC: new Date(
                                    new Date().getTime() + 10 * 60 * 1000
                                ),
                            });

                            await editMessageOnTelegram({
                                chatId,
                                message: `${reminder.text} (😴 for 10mins)`,
                                messageId,
                                reply_markup: {
                                    inline_keyboard: [],
                                },
                            });
                        }
                    } else if (action === "ignore") {
                        // nothing to do here
                    }
                } else if (type === "approval") {
                    // approval:approve:<approvalId> or approval:deny:<approvalId>
                    const decision = callbackData.split(":")[1]; // "approve" or "deny"
                    const approvalId = callbackData.split(":")[2];

                    const approvalDecision = decision === "approve" ? "approved" : "denied";
                    await resolveApproval({ approvalId, decision: approvalDecision });

                    await editMessageOnTelegram({
                        chatId,
                        message: decision === "approve"
                            ? "Approved. Executing..."
                            : "Denied. Skipping this action.",
                        messageId,
                        reply_markup: { inline_keyboard: [] },
                    });
                } else if (type === "family") {
                    // family:<action>:<actioninfo>
                    const action = callbackData.split(":")[1];

                    if (action === "invitestart") {
                        const message_id = callbackData.split(":")[2];

                        const message = await getMessageByIdFromContext({
                            chatId,
                            messageId: message_id,
                        });

                        console.log("ABC", message);

                        let {
                            first_name,
                            last_name,
                            phone_number,
                            user_id: shared_chat_id,
                        } = (message || {}).contact || {};

                        // check if there is a telegram user for this phone number
                        let shared_user_id_attempt = await getUserForChatId(
                            shared_chat_id
                        );

                        let cleaned_phone = "";

                        if (!shared_user_id_attempt) {
                            // check if this number is sane to start with
                            const {
                                success: psuccess,
                                phone: nPhone,
                                email: nEmail,
                            } = cleanPhoneNumber(phone_number);

                            if (!psuccess) {
                                // user doesn't exist and phone number is trash. tell user to try again
                                await editMessageOnTelegram({
                                    chatId,
                                    message: `Invalid phone number. Please try again.`,
                                    messageId,
                                    reply_markup: {
                                        inline_keyboard: [],
                                    },
                                });
                            } else {
                                // atleast phone number is legit. anyway, check if there is an email of this email in the system
                                cleaned_phone = nPhone;

                                // do we have any user with this number?
                                shared_user_id_attempt = await getUserByPhone({
                                    phone: cleaned_phone,
                                });

                                shared_user_id_attempt = shared_user_id_attempt
                                    ? shared_user_id_attempt.id
                                    : null;
                            }
                        }

                        const alreadyFamily =
                            shared_user_id_attempt &&
                            (await areFamily({
                                id1: user_id,
                                id2: shared_user_id_attempt,
                            }));

                        if (alreadyFamily) {
                            // covney to the user that they are already friends and send an example on how to add a reminder on friend's plate
                            await editMessageOnTelegram({
                                chatId,
                                message: `You are already friends with ${first_name}. You can now add a reminder for them by saying "Remind ${first_name} to call Seema aunty at 4pm".`,
                                messageId,
                                reply_markup: {
                                    inline_keyboard: [],
                                },
                            });
                        } else {
                            console.log(
                                "ABCDDDDD",
                                shared_user_id_attempt,
                                cleaned_phone
                            );

                            if (shared_user_id_attempt) {
                                await generateFamilyInviteEntry({
                                    requester_user_id: user_id,
                                    requested_user_id: shared_user_id_attempt,
                                });

                                uxQueue.add("new-user-family-invites", {
                                    user_id: shared_user_id_attempt,
                                });
                                await editMessageOnTelegram({
                                    chatId,
                                    message: `Sure. We have sent a request to ${first_name}. Once they approve your request to pair, we will notify you.`,
                                    messageId,
                                    reply_markup: {
                                        inline_keyboard: [],
                                    },
                                });
                            } else if (cleaned_phone) {
                                await editMessageOnTelegram({
                                    chatId,
                                    message: `Sure. ${first_name} is not on A1 yet. You can invite them to join A1 by sharing this link: https://heya1.com. Once they join, they can approve/ ignore your request to pair`,
                                    messageId,
                                    reply_markup: {
                                        inline_keyboard: [],
                                    },
                                });
                                await generateFamilyInviteEntry({
                                    requester_user_id: user_id,
                                    requested_family_number: cleaned_phone,
                                });
                            }
                        }
                    } else if (action === "inviteignore") {
                        // ignore the invite
                        await editMessageOnTelegram({
                            chatId,
                            message: `Cool. Ignoring the message. 👍`,
                            messageId,
                            reply_markup: {
                                inline_keyboard: [],
                            },
                        });
                    } else if (action === "approve") {
                        const friend_id = Number(callbackData.split(":")[2]);

                        const alreadyFamily = await areFamily({
                            id1: user_id,
                            id2: friend_id,
                        });

                        if (alreadyFamily) {
                            await editMessageOnTelegram({
                                chatId,
                                message: `You are already friends with this user. 👍`,
                                messageId,
                                reply_markup: {
                                    inline_keyboard: [],
                                },
                            });
                        } else {
                            await addFamily({
                                id1: user_id,
                                id2: friend_id,
                            });

                            uxQueue.add("new-famly-members", {
                                requester_user_id: friend_id,
                                requested_user_id: user_id,
                            });

                            await editMessageOnTelegram({
                                chatId,
                                message: `Approved. 👍`,
                                messageId,
                                reply_markup: {
                                    inline_keyboard: [],
                                },
                            });
                        }
                    } else if (action === "ignore") {
                        await editMessageOnTelegram({
                            chatId,
                            message: `Ignored the invite. 👍`,
                            messageId,
                            reply_markup: {
                                inline_keyboard: [],
                            },
                        });
                    }
                }
            }

            success();
        }
    }
);

module.exports = router;
