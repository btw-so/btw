var express = require("express");
var router = express.Router();
var cors = require("cors");
var { generateOTP, validateOTP, deleteOTP } = require("../logic/otp");
var { createUser, createLoginToken } = require("../logic/user");
var { emailOTP } = require("../logic/email");
var {
    getUserForChatId,
    addToWhatsappChats,
    sendTypingActionToWhatsapp,
    addUserToChatId,
    fetchUserChats,
    sendMessageToUserOnWhatsapp,
    getMessageByIdFromContext,
} = require("../logic/whatsapp");
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
var {
    aiProcessingWrapper,
    addAlertToDb,
    markReminderAsComplete,
    deleteReminderCompletely,
    getReminderFromId, getAlertFromId 
} = require("../logic/ai");
const { uxQueue } = require("../services/queue");
var LPN = require("google-libphonenumber");

// REPLACE WITH PRODUCTION ACCOUNT ID ONCE WE HAVE IT
const whatsappAccountId =
    process.env.NODE_ENV === "production"
        ? "394648927075849"
        : "376014308923284";

const loginFlowFunction = async ({ chatId }) => {
    const user_id = await getUserForChatId(chatId);

    if (user_id) {
        return user_id;
    }

    return null;
};

const getStandardTimezones = () => {
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
            gmtName: "GMT+08:00",
            timezone: "Asia/Singapore",
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
};

const cleanPhoneNumber = (phone) => {
    if (!phone) {
        return {
            success: false,
            error: "Phone number is required",
        };
    }

    if (!phone.startsWith("+")) {
        phone = `+${phone}`;
    }

    // check if the number is valid without the country code
    const phoneUtil = LPN.PhoneNumberUtil.getInstance();

    try {
        const number = phoneUtil.parse(phone);
        if (phoneUtil.isValidNumber(number)) {
            phone = phoneUtil.format(number, LPN.PhoneNumberFormat.E164);
        } else {
            return {
                success: false,
                error: "Invalid phone number",
            };
        }
    } catch (err) {
        return {
            success: false,
            error: "Invalid phone number",
        };
    }

    return {
        success: true,
        phone,
        email: `${phone}@a1number.com`,
    };
};

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
        console.log(JSON.stringify(req.body, null, 4));

        const sendGreeting = async (chatId) => {
            await sendMessageToUserOnWhatsapp({
                chatId,
                message: `Sweet! I will be your personal assistant. I can help remind you about calls, meetings, birthdays etc.

You can say "Meeting with Drake at 6PM on Mar 29 at Raffles Hotel. Remind me the day before at 9PM" or "Remind me to wish Katlyn on Dec 23 every year" or "Remind me to drink water every hour from 9AM to 8PM".`,
                templateId: "direct_message",
                dataForTemplate: {
                    message: `Sweet! I will be your personal assistant. I can help remind you about calls, meetings, birthdays etc.

You can say "Meeting with Drake at 6PM on Mar 29 at Raffles Hotel. Remind me the day before at 9PM" or "Remind me to wish Katlyn on Dec 23 every year" or "Remind me to drink water every hour from 9AM to 8PM".`,
                },
            });

            // this is a good time to start invite cron
            uxQueue.add("new-user-family-invites", {
                user_id: await getUserForChatId(chatId),
            });
        };

        // if it's chat message
        if (
            req.body.entry[0].changes[0].field === "messages" &&
            req.body.entry[0].id === whatsappAccountId &&
            req.body.entry[0].changes[0].value.messages &&
            req.body.entry[0].changes[0].value.messages.length > 0 &&
            req.body.entry[0].changes[0].value.messages[0].type === "text"
        ) {
            const fullMessage = req.body.entry[0].changes[0].value;
            let message = fullMessage.messages[0];
            const chatId = message.from;
            const sentMessage = message.text.body;

            // I am going to transform the message object to match the format of the telegram message object
            if (message.type === "text") {
                message = {
                    id: message.id,
                    message_id: message.id,
                    text: sentMessage,
                };
            } else {
                await sendMessageToUserOnWhatsapp({
                    chatId,
                    message: "I don't know how to handle this yet",
                    templateId: "direct_message",
                    dataForTemplate: {
                        message: "I don't know how to handle this yet",
                    },
                });
                return;
            }

            const user_id = await loginFlowFunction({ chatId });

            const add = async () => {
                await addToWhatsappChats({
                    chatId,
                    message,
                });
            };

            // Maintain a log of all messages that came to the bot
            await add();

            // Show a typing indicator
            await sendTypingActionToWhatsapp({ chatId });

            const success = () => {
                // res.status(200).send("EVENT_RECEIVED");
                res.sendStatus(200);
            };

            if (!user_id) {
                // no need to do much. we already have their number. just log them in.

                var phone =
                    req.body.entry[0].changes[0].value.contacts[0].wa_id || "";

                const {
                    success: psuccess,
                    error: perror,
                    phone: nPhone,
                    email: pemail,
                } = cleanPhoneNumber(phone);

                if (psuccess && nPhone) {
                    phone = nPhone;
                } else {
                    await sendMessageToUserOnWhatsapp({
                        chatId,
                        message: perror || "Invalid phone number",
                        templateId: "direct_message",
                        dataForTemplate: {
                            message: perror || "Invalid phone number",
                        },
                    });
                    success();
                    return;
                }

                const email = pemail;

                const { userId: id, newUser } = await createUser({
                    email,
                });

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
                    fullMessage.contacts &&
                    fullMessage.contacts[0].profile?.name
                ) {
                    const name = fullMessage.contacts[0].profile.name;

                    await setUserName({
                        user_id: id,
                        name,
                    });
                }

                // if the user's message starts with "Hey A1, I’m in", then it is of the form "Hey A1, I’m in Asia/Calcutta timezone. Let’s start."
                // extract location from this.
                if (sentMessage.startsWith("Hey A1, I’m in ")) {
                    let location = sentMessage
                        .split("Hey A1, I’m in ")[1]
                        .split(" ")[0];
                    const allTimezones = getStandardTimezones();
                    let selectedTimezone = allTimezones.find(
                        (x) => x.timezone === location
                    );

                    if (!selectedTimezone) {
                        location = "Asia/Kolkata";
                        selectedTimezone = allTimezones.find(
                            (x) => x.timezone === location
                        );
                    }

                    await setUserTimezone({
                        user_id: id,
                        timezone: location,
                        timezoneOffsetInSeconds:
                            selectedTimezone.offsetInSeconds,
                    });
                }

                console.log("ABC", user_id, chatId);

                await sendGreeting(chatId);

                success();
                return;
            }

            if (user_id) {
                const user = await getUserFromId({
                    user_id,
                });

                console.log("ABC", user_id, chatId, sentMessage);

                const familyUsers = await getFamilyUsers({
                    id: user_id,
                });

                if (sentMessage.startsWith("Hey A1, I’m in ")) {
                    // if the user's message starts with "Hey A1, I’m in", then it is of the form "Hey A1, I’m in Asia/Calcutta timezone. Let’s start."
                    // extract location from this.
                    let location = sentMessage
                        .split("Hey A1, I’m in ")[1]
                        .split(" ")[0];
                    const allTimezones = getStandardTimezones();
                    let selectedTimezone = allTimezones.find(
                        (x) => x.timezone === location
                    );

                    if (!selectedTimezone) {
                        location = "Asia/Kolkata";
                        selectedTimezone = allTimezones.find(
                            (x) => x.timezone === location
                        );
                    }

                    await setUserTimezone({
                        user_id: user_id,
                        timezone: location,
                        timezoneOffsetInSeconds:
                            selectedTimezone.offsetInSeconds,
                    });

                    await sendGreeting(chatId);
                } else if (sentMessage) {
                    let history = await fetchUserChats({
                        userId: user_id,
                        chatId,
                        before: Date.now(),
                    });

                    history = history.chats || [];
                    history = history.filter(
                        (x) => x.message.message_id !== message.message_id
                    );

                    try {
                        const { dbUnits, newMessages, newClassification } =
                            await aiProcessingWrapper({
                                input: sentMessage,
                                classification: "NA", // TODO: Helps in establishing existing context. but NA shouldn't be bad either
                                user_id,
                                timezone: user.settings.timezone,
                                timezoneOffsetInSeconds:
                                    user.settings.timezoneOffsetInSeconds,
                                title: "", // title of the thread. can skip. we don't use this for now.
                                thread_id: chatId, // there will be one single thread ofr every user-telegram chat
                                messages: history,
                                familyUsers,
                            });

                        for (newMessage of newMessages) {
                            if (newMessage.type === "bot" && newMessage.text) {
                                await sendMessageToUserOnWhatsapp({
                                    chatId,
                                    message: newMessage.text,
                                    templateId: "direct_message",
                                    dataForTemplate: {
                                        message: newMessage.text,
                                    },
                                });
                            }
                        }
                    } catch (err) {
                        console.log(err);
                    }

                    success();
                    return;
                }
            }
        } else if (
            req.body.entry[0].changes[0].field === "messages" &&
            req.body.entry[0].id === whatsappAccountId &&
            req.body.entry[0].changes[0].value.messages &&
            req.body.entry[0].changes[0].value.messages.length > 0 &&
            req.body.entry[0].changes[0].value.messages[0].type ===
                "interactive"
        ) {
            const chatId = req.body.entry[0].changes[0].value.messages[0].from;
            const button =
                req.body.entry[0].changes[0].value.messages[0].interactive
                    .button_reply.id;
            const type = button.split(":")[0];
            const user_id = await loginFlowFunction({ chatId });

            if (user_id) {
                if (type === "reminder") {
                    // reminder:<action>:<reminder_id>:<alert_id>
                    const action = button.split(":")[1];
                    const reminder_id = button.split(":")[2];
                    const alert_id =
                        button.split(":").length > 2
                            ? button.split(":")[3]
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

                            await sendMessageToUserOnWhatsapp({
                                chatId,
                                message: `${reminder.text} ✅`,
                                templateId: "direct_message",
                                dataForTemplate: {
                                    message: `${reminder.text} ✅`,
                                },
                            });
                        }
                    } else if (action === "delete") {
                        if (reminder) {
                            await deleteReminderCompletely({
                                user_id,
                                reminder_id,
                            });

                            await sendMessageToUserOnWhatsapp({
                                chatId,
                                message: `${reminder.text} 👉 🗑️`,
                                templateId: "direct_message",
                                dataForTemplate: {
                                    message: `${reminder.text} 👉 🗑️`,
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

                            await sendMessageToUserOnWhatsapp({
                                chatId,
                                message: `${reminder.text} (😴 for 10mins)`,
                                templateId: "direct_message",
                                dataForTemplate: {
                                    message: `${reminder.text} (😴 for 10mins)`,
                                },
                            });
                        }
                    } else if (action === "ignore") {
                        // nothing to do here
                    }
                } else if (type === "family") {
                    // family:<action>:<actioninfo>
                    const action = button.split(":")[1];

                    if (action === "invitestart") {
                        const phone_number = button.split(":")[2];
                        const first_name = button.split(":")[3];
                        const shared_chat_id = button.split(":")[4];

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
                                await sendMessageToUserOnWhatsapp({
                                    chatId,
                                    message: `Invalid phone number. Please try again.`,
                                    templateId: "direct_message",
                                    dataForTemplate: {
                                        message: `Invalid phone number. Please try again.`,
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
                            await sendMessageToUserOnWhatsapp({
                                chatId,
                                message: `You are already friends with ${first_name}. You can now add a reminder for them by saying "Remind ${first_name} to call Seema aunty at 4PM".`,
                                templateId: "direct_message",
                                dataForTemplate: {
                                    message: `You are already friends with ${first_name}. You can now add a reminder for them by saying "Remind ${first_name} to call Seema aunty at 4pm".`,
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
                                await sendMessageToUserOnWhatsapp({
                                    chatId,
                                    message: `Sure. We have sent a request to ${first_name}. Once they approve your request to pair, we will notify you.`,
                                    templateId: "direct_message",
                                    dataForTemplate: {
                                        message: `Sure. We have sent a request to ${first_name}. Once they approve your request to pair, we will notify you.`,
                                    },
                                });
                            } else if (cleaned_phone) {
                                await sendMessageToUserOnWhatsapp({
                                    chatId,
                                    message: `Sure. ${first_name} is not on A1 yet. You can invite them to join A1 by sharing this link: https://heya1.com. Once they join, they can approve/ ignore your request to pair`,
                                    templateId: "direct_message",
                                    dataForTemplate: {
                                        message: `Sure. ${first_name} is not on A1 yet. You can invite them to join A1 by sharing this link: https://heya1.com. Once they join, they can approve/ ignore your request to pair`,
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
                        await sendMessageToUserOnWhatsapp({
                            chatId,
                            message: `Cool. Ignoring the message. 👍`,
                            templateId: "direct_message",
                            dataForTemplate: {
                                message: `Cool. Ignoring the message. 👍`,
                            },
                        });
                    } else if (action === "approve") {
                        const friend_id = Number(button.split(":")[2]);

                        const alreadyFamily = await areFamily({
                            id1: user_id,
                            id2: friend_id,
                        });

                        if (alreadyFamily) {
                            await sendMessageToUserOnWhatsapp({
                                chatId,
                                message: `You are already friends with this user. 👍`,
                                templateId: "direct_message",
                                dataForTemplate: {
                                    message: `You are already friends with this user. 👍`,
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

                            await sendMessageToUserOnWhatsapp({
                                chatId,
                                message: `Approved. 👍`,
                                templateId: "direct_message",
                                dataForTemplate: {
                                    message: `Approved. 👍`,
                                },
                            });
                        }
                    } else if (action === "ignore") {
                        await sendMessageToUserOnWhatsapp({
                            chatId,
                            message: `Ignored the invite. 👍`,
                            templateId: "direct_message",
                            dataForTemplate: {
                                message: `Ignored the invite. 👍`,
                            },
                        });
                    }
                }
            }
        } else if (
            req.body.entry[0].changes[0].field === "messages" &&
            req.body.entry[0].id === whatsappAccountId &&
            req.body.entry[0].changes[0].value.messages &&
            req.body.entry[0].changes[0].value.messages.length > 0 &&
            req.body.entry[0].changes[0].value.messages[0].type === "button"
        ) {
            const message =
                req.body.entry[0].changes[0].value.messages[0].button.text;
            const contextId =
                req.body.entry[0].changes[0].value.messages[0].context.id;

            const chatId = req.body.entry[0].changes[0].value.messages[0].from;

            const user_id = await loginFlowFunction({ chatId });

            if (user_id) {
                if (message === "Mark as completed") {
                    // get the original message from contextId
                    const originalMessage = await getMessageByIdFromContext({
                        chatId,
                        messageId: contextId,
                    });

                    if (originalMessage) {
                        var { recurring, reminderId, reminderText } =
                            (originalMessage.metadata || {}).dataForTemplate ||
                            {};

                        if (!recurring && reminderId) {
                            await markReminderAsComplete({
                                user_id: user_id,
                                reminder_id: reminderId,
                            });

                            await sendMessageToUserOnWhatsapp({
                                chatId,
                                message: `${reminderText} ✅`,
                                templateId: "direct_message",
                                dataForTemplate: {
                                    message: `${reminderText} ✅`,
                                },
                            });
                        }
                    }
                }
            }
        } else if (
            req.body.entry[0].changes[0].field === "messages" &&
            req.body.entry[0].id === whatsappAccountId &&
            req.body.entry[0].changes[0].value.messages &&
            req.body.entry[0].changes[0].value.messages.length > 0 &&
            req.body.entry[0].changes[0].value.messages[0].type === "contacts"
        ) {
            const contactShared =
                req.body.entry[0].changes[0].value.messages[0].contacts &&
                req.body.entry[0].changes[0].value.messages[0].contacts.length >
                    0
                    ? req.body.entry[0].changes[0].value.messages[0].contacts[0]
                    : null;
            const chatId = req.body.entry[0].changes[0].value.messages[0].from;

            const user_id = await loginFlowFunction({ chatId });

            if (user_id) {
                if (contactShared) {
                    const { first_name, last_name } = contactShared.name || {};
                    const phone =
                        contactShared.phones && contactShared.phones.length > 0
                            ? contactShared.phones[0].phone
                            : null;
                    const shared_chat_id = phone
                        ? contactShared.phones[0].wa_id
                        : null;

                    if (phone && shared_chat_id) {
                        await sendMessageToUserOnWhatsapp({
                            chatId,
                            message: `Do you want to pair with ${first_name} (${phone})?`,
                            templateId: "invite_ask",
                            dataForTemplate: {
                                message: `Do you want to pair with ${first_name} (${phone})?`,
                                phone,
                                first_name,
                                shared_chat_id,
                            },
                        });
                    }
                }
            }
        }

        res.sendStatus(200);
        // res.status(200).send("EVENT_RECEIVED");
    }
);

// create an api to validate otp
router.options(
    "/webhook",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.get(
    "/webhook",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        // Your verify token should be a random string that you have previously decided
        const VERIFY_TOKEN = "kalki";

        // Parse the query params
        let mode = req.query["hub.mode"];
        let token = req.query["hub.verify_token"];
        let challenge = req.query["hub.challenge"];

        console.log(req.body);

        // Checks if a token and mode is in the query string of the request
        if (mode && token) {
            // Checks the mode and token sent are correct
            if (mode === "subscribe" && token === VERIFY_TOKEN) {
                // Responds with the challenge token from the request
                console.log("WEBHOOK_VERIFIED");
                res.status(200).send(challenge);
            } else {
                // Responds with '403 Forbidden' if verify tokens do not match
                res.sendStatus(403);
            }
        } else {
            res.sendStatus(403);
        }
    }
);

module.exports = router;
