var express = require("express");
const { alertsQueue, baseQueue, uxQueue, sandboxQueue, agenticQueue } = require("../services/queue");
const db = require("../services/db");
var router = express.Router();

const {
    sendAlertUnitToTelegram,
    sendFamilyInviteToTelegram,
    sendMessageToUserOnTelegram,
    sendReminderUnitToTelegram,
} = require("../logic/telegram");

const {
    sendAlertUnitToWhatsapp,
    sendFamilyInviteToWhatsapp,
    sendMessageToUserOnWhatsapp,
    sendReminderUnitToWhatsapp,
} = require("../logic/whatsapp");

const { addNewAlertsForRecurringReminders } = require("../logic/ai");
const { getUserFromId } = require("../logic/user");
const { getReadableFromUTCToLocal } = require("../utils/utils");
const { runAgentLoop } = require("../logic/agent");
const { calculateNextRun, scheduleAgenticRun, createStopThisTaskTool } = require("../logic/agenticTaskTools");

// const descrForReminder = (x, offset) => `${
//     x.text
// } due on ${getReadableFromUTCToLocal(x.duedate, offset)}${!!x.completed ? " ✅" : !!x.recurring ? " ♻️" : ""}
// ${x.alerts
//     .map((y) => `🔔 on ${getReadableFromUTCToLocal(y.duedate, offset)}`)
//     .join("\n")}`;

// const descrForReminders = (reminders, offset) =>
//     reminders
//         .map(
//             (r, i) =>
//                 `${reminders.length > 1 ? `${i + 1}. ` : ``}${descrForReminder(r, offset)}`,
//         )
//         .join("\n\n");

uxQueue.process("new-user-family-invites", async (job, done) => {
    const { user_id } = job.data || {};

    // get this user's data
    const tasksDB = await db.getTasksDB();

    const { rows: users } = await tasksDB.query(
        `SELECT * FROM btw.users WHERE id = $1`,
        [user_id]
    );

    if (users.length > 0) {
        // get the user's number
        const user = users[0];
        const phoneNumber = user.settings.phone;

        // get user's telegram ids from telegram_user_map
        const { rows: telegrams } = await tasksDB.query(
            `SELECT * FROM btw.telegram_user_map WHERE user_id = $1`,
            [user_id]
        );

        const { rows: whatsapps } = await tasksDB.query(
            `SELECT * FROM btw.whatsapp_user_map WHERE user_id = $1`,
            [user_id]
        );

        // for now there are number based invites.
        // Get all entried from family_invites table with columns requester_user_id, requested_family_number = phoneNumber
        const { rows: invites } = await tasksDB.query(
            `SELECT * FROM btw.family_invites WHERE (notified IS NOT NULL AND notified IS NOT TRUE) AND (requested_family_number = $1 OR requested_user_id = $2)`,
            [phoneNumber, user_id]
        );

        for (var i = 0; i < invites.length; i++) {
            const invite = invites[i];

            const {
                requester_user_id,
                requested_family_number,
                id,
                requested_user_id,
            } = invite;

            // get user details of the requester
            const { rows: requesters } = await tasksDB.query(
                `SELECT * FROM btw.users WHERE id = $1`,
                [requester_user_id]
            );

            if (requesters.length > 0) {
                for (var j = 0; j < telegrams.length; j++) {
                    const chatId = telegrams[j].telegram_id;

                    await sendFamilyInviteToTelegram({
                        requesterName: requesters[0].name,
                        requesterNumber: requesters[0].settings.phone,
                        requesterUserId: requester_user_id,
                        chatId,
                    });
                }

                for (var j = 0; j < whatsapps.length; j++) {
                    const chatId = whatsapps[j].whatsapp_id;

                    await sendFamilyInviteToWhatsapp({
                        requesterName: requesters[0].name,
                        requesterNumber: requesters[0].settings.phone,
                        requesterUserId: requester_user_id,
                        chatId,
                    });
                }
            }

            // mark this invite as notified
            await tasksDB.query(
                `UPDATE btw.family_invites SET notified = TRUE WHERE id = $1`,
                [id]
            );
        }
    }

    done();
});

uxQueue.process("new-famly-members", async (job, done) => {
    const { requested_user_id, requester_user_id } = job.data || {};

    // get user details of the requester and requested

    // first for the requester_user_id,
    // get their platforms (for now, only telegram)
    // then for telegram, send a message "<requester_name> has added you to their family. Now you can share reminders with them. Ex:"

    // second for requested_user_id,
    // get their platforms (for now, only telegram)
    // then for telegram, send a message "You have been added to <requester_name>'s family. Now you can share reminders with them. Ex:"

    const tasksDB = await db.getTasksDB();

    const { rows: requesters } = await tasksDB.query(
        `SELECT * FROM btw.users WHERE id = $1`,
        [requester_user_id]
    );

    const { rows: requesteds } = await tasksDB.query(
        `SELECT * FROM btw.users WHERE id = $1`,
        [requested_user_id]
    );

    if (requesters.length > 0 && requesteds.length > 0) {
        const requester = requesters[0];
        const requested = requesteds[0];

        const { rows: requesterTelegrams } = await tasksDB.query(
            `SELECT * FROM btw.telegram_user_map WHERE user_id = $1`,
            [requester_user_id]
        );

        const { rows: requesterWhatsapps } = await tasksDB.query(
            `SELECT * FROM btw.whatsapp_user_map WHERE user_id = $1`,
            [requester_user_id]
        );

        const { rows: requestedTelegrams } = await tasksDB.query(
            `SELECT * FROM btw.telegram_user_map WHERE user_id = $1`,
            [requested_user_id]
        );

        const { rows: requestedWhatsapps } = await tasksDB.query(
            `SELECT * FROM btw.whatsapp_user_map WHERE user_id = $1`,
            [requested_user_id]
        );

        for (var i = 0; i < requesterTelegrams.length; i++) {
            const chatId = requesterTelegrams[i].telegram_id;

            await sendMessageToUserOnTelegram({
                chatId,
                message: `${requested.name} accepted your invite 😊. Now you can share reminders with them (and vice versa).
Ex: Just say "Remind ${requested.name} to take their meds at 8pm"`,
            });
        }

        for (var i = 0; i < requesterWhatsapps.length; i++) {
            const chatId = requesterWhatsapps[i].whatsapp_id;

            await sendMessageToUserOnWhatsapp({
                chatId,
                message: `${requested.name} accepted your invite 😊. Now you can share reminders with them (and vice versa).
Ex: Just say "Remind ${requested.name} to take their meds at 8pm"`,
                templateId: "invite_accepted",
                dataForTemplate: {
                    requesterName: requester.name,
                    requestedName: requested.name,
                },
            });
        }

        for (var i = 0; i < requestedTelegrams.length; i++) {
            const chatId = requestedTelegrams[i].telegram_id;

            await sendMessageToUserOnTelegram({
                chatId,
                message: `You have added ${requester.name} to your A1. Now you can share reminders with them (and vice versa).
Ex: Just say "Remind ${requester.name} to take their meds at 8pm"`,
            });
        }

        for (var i = 0; i < requestedWhatsapps.length; i++) {
            const chatId = requestedWhatsapps[i].whatsapp_id;

            await sendMessageToUserOnWhatsapp({
                chatId,
                templateId: "invite_accepted_requested",
                message: `You have added ${requester.name} to your A1. Now you can share reminders with them (and vice versa).
                Ex: Just say "Remind ${requester.name} to take their meds at 8pm"`,
                dataForTemplate: {
                    requesterName: requester.name,
                    requestedName: requested.name,
                },
            });
        }
    }

    done();
});

alertsQueue.process("reminder-alert", async (job, done) => {
    console.log("Processing reminder-alert job");
    const { user_id, reminder_id, id, duedate } = job.data || {};

    const tasksDB = await db.getTasksDB();

    let { rows: reminders } = await tasksDB.query(
        `SELECT * FROM btw.reminders WHERE id = $1 AND user_id = $2`,
        [reminder_id, user_id]
    );

    let { rows: alerts } = await tasksDB.query(
        `SELECT * FROM btw.alerts WHERE id = $1 AND user_id = $2`,
        [id, user_id]
    );

    reminders = reminders.filter((x) => !x.completed);

    if (reminders.length > 0 && alerts.length > 0) {
        const reminder = reminders[0];
        const alert = alerts[0];

        const { rows: users } = await tasksDB.query(
            `SELECT * FROM btw.users WHERE id = $1`,
            [user_id]
        );

        if (users.length > 0) {
            // For now we send reminders on telegram
            const { rows: telegrams } = await tasksDB.query(
                `SELECT * FROM btw.telegram_user_map WHERE user_id = $1`,
                [user_id]
            );

            const { rows: whatsapps } = await tasksDB.query(
                `SELECT * FROM btw.whatsapp_user_map WHERE user_id = $1`,
                [user_id]
            );

            for (var i = 0; i < telegrams.length; i++) {
                await sendAlertUnitToTelegram({
                    chatId: telegrams[i].telegram_id,
                    alert,
                    reminder,
                });
            }

            for (var i = 0; i < whatsapps.length; i++) {
                const chatId = whatsapps[i].whatsapp_id;

                await sendAlertUnitToWhatsapp({
                    chatId,
                    alert,
                    reminder,
                });
            }
        }
    }

    done();
});

uxQueue.process("new-reminders-child", async (job, done) => {
    let {
        userWhoAddedRemindersId,
        userToNotifyId,
        reminders,
        remindersOfId,
        update,
        deleted,
    } = job.data || {};

    userWhoAddedRemindersId = Number(userWhoAddedRemindersId);
    userToNotifyId = Number(userToNotifyId);
    remindersOfId = Number(remindersOfId);

    const userWhoAddedReminders = await getUserFromId({
        user_id: userWhoAddedRemindersId,
    });

    const userToNotify = await getUserFromId({
        user_id: userToNotifyId,
    });

    const remindersOf = await getUserFromId({ user_id: remindersOfId });

    let header = "";
    let templateId = "";

    if (!update && !deleted) {
        if (
            userWhoAddedRemindersId === userToNotifyId &&
            remindersOfId === userToNotifyId
        ) {
            // case 1. I am being notified of my notifications that I added for myself
            header = `Added ${reminders.length} new reminder${
                reminders.length > 1 ? "s" : ""
            }`;
            templateId = "added_reminder_self";
        } else if (
            userWhoAddedRemindersId === userToNotifyId &&
            remindersOfId !== userToNotifyId
        ) {
            // case 2. I am being notified of other's notifications that I added
            header = `Added ${reminders.length} new reminder${
                reminders.length > 1 ? "s" : ""
            } for ${remindersOf.name}`;
            templateId = "added_reminder_family_adder";
        } else if (
            userWhoAddedRemindersId !== userToNotifyId &&
            remindersOfId === userToNotifyId
        ) {
            // case 3. I am being notified of my notifications that someone else added
            header = `${userWhoAddedReminders.name} added ${
                reminders.length
            } new reminder${reminders.length > 1 ? "s" : ""} for you`;
            templateId = "added_reminder_family";
        }
    }

    const message = `${header}`;

    // get user's telegram ids from telegram_user_map
    const tasksDB = await db.getTasksDB();

    const { rows: telegrams } = await tasksDB.query(
        `SELECT * FROM btw.telegram_user_map WHERE user_id = $1`,
        [userToNotifyId]
    );

    const { rows: whatsapps } = await tasksDB.query(
        `SELECT * FROM btw.whatsapp_user_map WHERE user_id = $1`,
        [userToNotifyId]
    );

    for (var i = 0; i < telegrams.length; i++) {
        if (!update && !deleted) {
            await sendMessageToUserOnTelegram({
                chatId: telegrams[i].telegram_id,
                message,
            });
        }

        for (var j = 0; j < reminders.length; j++) {
            await sendReminderUnitToTelegram({
                user_id: userToNotifyId,
                chatId: telegrams[i].telegram_id,
                reminder: reminders[j],
                timezoneOffsetInSeconds:
                    userToNotify.settings.timezoneOffsetInSeconds,
                update,
                deleted,
            });
        }
    }

    for (var i = 0; i < whatsapps.length; i++) {
        if (!update && !deleted) {
            await sendMessageToUserOnWhatsapp({
                chatId: whatsapps[i].whatsapp_id,
                message,
                templateId,
                dataForTemplate: {
                    numReminders: reminders.length,
                    personName:
                        templateId === "added_reminder_family_adder"
                            ? remindersOf.name
                            : userWhoAddedReminders.name,
                },
            });
        }

        for (var j = 0; j < reminders.length; j++) {
            await sendReminderUnitToWhatsapp({
                user_id: userToNotifyId,
                chatId: whatsapps[i].whatsapp_id,
                reminder: reminders[j],
                timezoneOffsetInSeconds:
                    userToNotify.settings.timezoneOffsetInSeconds,
                update,
                deleted,
            });
        }
    }

    done();
});

uxQueue.process("reminder-digest", async (job, done) => {
    let {
        user_id,
        reminders,
        timezoneOffsetInSeconds,
        fromDateTime,
        toDateTime,
        status,
    } = job.data || {};

    console.log("Processing reminder-digest job", user_id, reminders);

    const header = `There ${reminders.length === 1 ? "is" : "are"} ${
        reminders.length
    } reminder${
        reminders.length === 1 ? "" : "s"
    } from ${getReadableFromUTCToLocal(fromDateTime, timezoneOffsetInSeconds, {
        onlyDate: true,
    })} to ${getReadableFromUTCToLocal(toDateTime, timezoneOffsetInSeconds, {
        onlyDate: true,
    })}`;

    const message = `${header}`;

    // get user's telegram ids from telegram_user_map
    const tasksDB = await db.getTasksDB();

    const { rows: telegrams } = await tasksDB.query(
        `SELECT * FROM btw.telegram_user_map WHERE user_id = $1`,
        [user_id]
    );

    const { rows: whatsapps } = await tasksDB.query(
        `SELECT * FROM btw.whatsapp_user_map WHERE user_id = $1`,
        [user_id]
    );

    for (var i = 0; i < telegrams.length; i++) {
        await sendMessageToUserOnTelegram({
            chatId: telegrams[i].telegram_id,
            message,
        });

        for (var j = 0; j < reminders.length; j++) {
            await sendReminderUnitToTelegram({
                user_id: user_id,
                chatId: telegrams[i].telegram_id,
                reminder: reminders[j],
                timezoneOffsetInSeconds,
            });
        }
    }

    for (var i = 0; i < whatsapps.length; i++) {
        await sendMessageToUserOnWhatsapp({
            chatId: whatsapps[i].whatsapp_id,
            message,
            templateId: "reminders_summary",
            dataForTemplate: {
                numReminders: reminders.length,
                from: getReadableFromUTCToLocal(
                    fromDateTime,
                    timezoneOffsetInSeconds,
                    {
                        onlyDate: true,
                    }
                ),
                to: getReadableFromUTCToLocal(
                    toDateTime,
                    timezoneOffsetInSeconds,
                    {
                        onlyDate: true,
                    }
                ),
            },
        });

        for (var j = 0; j < reminders.length; j++) {
            await sendReminderUnitToWhatsapp({
                user_id,
                chatId: whatsapps[i].whatsapp_id,
                reminder: reminders[j],
                timezoneOffsetInSeconds,
            });
        }
    }

    done();
});

uxQueue.process("updated-reminders", async (job, done) => {
    let { reminders, user_id } = job.data || {};

    try {
        let remindersProcessed = [];

        const tasksDB = await db.getTasksDB();

        // replace the reminders here with actual reminders from DB.
        for (var i = 0; i < reminders.length; i++) {
            const { rows } = await tasksDB.query(
                `SELECT * FROM btw.reminders WHERE id = $1 AND user_id = $2`,
                [reminders[i].id, reminders[i].user_id]
            );

            if (rows.length > 0) {
                // get alerts of this reminder from db
                const { rows: alerts } = await tasksDB.query(
                    `SELECT * FROM btw.alerts WHERE reminder_id = $1 AND user_id = $2`,
                    [reminders[i].id, reminders[i].user_id]
                );

                rows[0].alerts = alerts;

                remindersProcessed.push(rows[0]);
            }
        }
        // now we are going to make use of new-reminders job to notify the users about the updated reminders.
        uxQueue.add("new-reminders", {
            user_id,
            reminders: remindersProcessed,
            update: true,
        });
    } catch (err) {}

    done();
});

uxQueue.process("deleted-reminders", async (job, done) => {
    let { reminders, user_id } = job.data || {};

    try {
        // now we are going to make use of new-reminders job to notify the users about the updated reminders.
        uxQueue.add("new-reminders", {
            user_id,
            reminders,
            deleted: true,
        });
    } catch (err) {}

    done();
});

uxQueue.process("new-reminders", async (job, done) => {
    const {
        user_id: userWhoAddedRemindersId,
        reminders,
        update = false,
        deleted = false,
    } = job.data || {};

    console.log(
        "Processing new-reminders job",
        reminders,
        userWhoAddedRemindersId,
        update,
        deleted
    );

    var remindersByUsers = {};

    for (var i = 0; i < reminders.length; i++) {
        const reminder = reminders[i];

        if (!remindersByUsers[reminder.user_id]) {
            remindersByUsers[reminder.user_id] = [];
        }

        remindersByUsers[reminder.user_id].push(reminder);
    }

    // for each user, send a job to let them know about the new/updated reminders
    for (var user_id in remindersByUsers) {
        uxQueue.add(
            "new-reminders-child",
            {
                userWhoAddedRemindersId,
                userToNotifyId: user_id,
                reminders: remindersByUsers[user_id],
                remindersOfId: user_id,
                update,
                deleted,
            },
            {
                removeOnComplete: true,
                removeOnFail: true,
                attempts: 2,
            }
        );

        if ("" + user_id !== "" + userWhoAddedRemindersId) {
            uxQueue.add(
                "new-reminders-child",
                {
                    userWhoAddedRemindersId,
                    userToNotifyId: userWhoAddedRemindersId,
                    reminders: remindersByUsers[user_id],
                    remindersOfId: user_id,
                    update,
                    deleted,
                },
                {
                    removeOnComplete: true,
                    removeOnFail: true,
                    attempts: 2,
                }
            );
        }
    }

    done();
});

// Add a recurring job that runs every 10 hours. Check aletts that should be live and add those alerts jobs
// This is a fail safe mechanism to ensure that alerts are sent even if the server is down for some time
alertsQueue.add(
    "addLiveAlerts",
    {},
    {
        repeat: {
            every: 10 * 60 * 60 * 1000,
        },
    }
);

alertsQueue.process("addLiveAlerts", async (job, done) => {
    const tasksDB = await db.getTasksDB();

    // Check all alerts for which the reminder is not completed and alert due date is within next 10 hours
    const { rows: alerts } = await tasksDB.query(
        `select btw.alerts.id, btw.alerts.reminder_id, btw.alerts.user_id, btw.alerts.duedate from btw.alerts left join btw.reminders on alerts.reminder_id = reminders.id where (reminders.completed is NULL or reminders.completed is NOT TRUE) and btw.alerts.duedate >= NOW() and btw.alerts.duedate < NOW() + INTERVAL '10 hours'`
    );

    for (var i = 0; i < alerts.length; i++) {
        const alert = alerts[i];

        alertsQueue.add(
            "reminder-alert",
            {
                user_id: alert.user_id,
                reminder_id: alert.reminder_id,
                id: alert.id,
                duedate: alert.duedate,
            },
            {
                jobId: `${alert.id}`,
                delay: new Date(alert.duedate).getTime() - new Date().getTime(),
            }
        );
    }

    done();
});

alertsQueue.add(
    "addRecurringReminders",
    {},
    {
        repeat: {
            cron: "0 0 * * *",
        },
    }
);

// Now add a job that runs every day at midnight, that pulls all reminders that are recurring and has duedate more than today and are not completed.
// For each such reminder, create a child-job that runs immediately and adds the reminder alert job
alertsQueue.process("addRecurringReminders", async (job, done) => {
    const tasksDB = await db.getTasksDB();

    // pull all reminders that are recurring, not completed, has duedate > current time
    const { rows: reminders } = await tasksDB.query(
        `select id, user_id from btw.reminders where recurring is TRUE and duedate > NOW() and (completed is NULL or completed is NOT TRUE)`
    );

    for (var i = 0; i < reminders.length; i++) {
        const reminder = reminders[i];

        alertsQueue.add(
            "addRecurringReminderChild",
            {
                user_id: reminder.user_id,
                reminder_id: reminder.id,
            },
            {
                jobId: `${reminder.id}-${reminder.user_id}`,
                removeOnComplete: true,
                removeOnFail: true,
                attempts: 2,
            }
        );
    }

    done();
});

// now for the child job, 1) we will get all uncompleted alerts for that reminder 2) send reminder info and alert info to GPT to figure out what new alerts to add
alertsQueue.process("addRecurringReminderChild", async (job, done) => {
    const { user_id, reminder_id } = job.data || {};

    const tasksDB = await db.getTasksDB();

    // pull all alerts for this reminder where duedate is in future
    const { rows: alerts } = await tasksDB.query(
        `select * from btw.alerts where reminder_id = $1 and duedate > NOW()`,
        [reminder_id]
    );

    const { rows: reminders } = await tasksDB.query(
        `select * from btw.reminders where id = $1 and user_id = $2 and recurring is TRUE and duedate > NOW() and (completed is NULL or completed is NOT TRUE)`,
        [reminder_id, user_id]
    );

    // get user settings
    const { rows: users } = await tasksDB.query(
        `select settings from btw.users where id = $1`,
        [user_id]
    );

    if (reminders.length > 0 && users.length > 0) {
        const reminder = reminders[0];

        await addNewAlertsForRecurringReminders({
            reminder,
            alerts,
            user_id,
            timezoneOffsetInSeconds: users[0].settings.timezoneOffsetInSeconds,
        });
    }

    done();
});

// Add a recurring job that runs every day at midnight. it checks for all reminders that has duedate past but completed is not true. set completed to true
alertsQueue.add(
    "markCompletedReminders",
    {},
    {
        repeat: {
            cron: "0 0 * * *",
        },
    }
);

alertsQueue.process("markCompletedReminders", async (job, done) => {
    const tasksDB = await db.getTasksDB();

    // Check all reminders for which the duedate has passed but the reminder is not completed
    const { rows: reminders } = await tasksDB.query(
        `select * from btw.reminders where duedate < NOW() and (completed is NULL or completed is NOT TRUE)`
    );

    for (var i = 0; i < reminders.length; i++) {
        const reminder = reminders[i];

        await tasksDB.query(
            `UPDATE btw.reminders SET completed = TRUE WHERE id = $1`,
            [reminder.id]
        );
    }

    done();
});

router.get("/admin/run-add-missing-recurring-alerts", async (req, res) => {
    const { user_id, reminder_id } = req.query || {};

    if (!user_id || !reminder_id) {
        return res.status(400).send("Invalid request");
    }

    alertsQueue.add(
        "addRecurringReminderChild",
        {
            user_id: user_id,
            reminder_id: reminder_id,
        },
        {
            jobId: `${reminder_id}-${user_id}`,
            removeOnComplete: true,
            removeOnFail: true,
            attempts: 2,
        }
    );

    return res.send("Added reminder alert job");
});

// ============================================
// Sandbox Queue Processors
// ============================================

const { provisionSandbox, checkSandboxReady, destroySandbox, getSandbox } = require("../logic/sandbox");

sandboxQueue.process("provision-sandbox", async (job, done) => {
    const { user_id, chat_id } = job.data || {};

    try {
        console.log(`[SandboxQueue] Provisioning sandbox for user ${user_id}`);
        await provisionSandbox({ user_id });

        // Schedule a check to see if the server is ready
        sandboxQueue.add(
            "check-sandbox-ready",
            { user_id, chat_id, attempts: 0 },
            { delay: 15000 } // Check after 15 seconds
        );

        done();
    } catch (err) {
        console.log(`[SandboxQueue] Provision error for user ${user_id}:`, err.message);

        // Notify user of failure
        if (chat_id) {
            try {
                const { rows: telegrams } = await (await db.getTasksDB()).query(
                    `SELECT telegram_id FROM btw.telegram_user_map WHERE user_id = $1`,
                    [user_id]
                );
                for (const t of telegrams) {
                    await sendMessageToUserOnTelegram({
                        chatId: t.telegram_id,
                        message: "Sorry, there was an error provisioning your sandbox VM. We'll retry shortly.",
                    });
                }
            } catch (_) {}
        }

        done(err);
    }
});

sandboxQueue.process("check-sandbox-ready", async (job, done) => {
    const { user_id, chat_id, attempts = 0 } = job.data || {};
    const MAX_ATTEMPTS = 20; // ~5 minutes of checking

    try {
        const result = await checkSandboxReady({ user_id });

        if (!result) {
            done();
            return;
        }

        if (result.ready) {
            console.log(`[SandboxQueue] Sandbox ready for user ${user_id} at ${result.ipv4}`);

            // Notify user
            const tasksDB = await db.getTasksDB();
            const { rows: telegrams } = await tasksDB.query(
                `SELECT telegram_id FROM btw.telegram_user_map WHERE user_id = $1`,
                [user_id]
            );

            for (const t of telegrams) {
                await sendMessageToUserOnTelegram({
                    chatId: t.telegram_id,
                    message: `Your sandbox VM is ready! You now have a dedicated Linux server (Ubuntu 24.04, 2 vCPU, 4GB RAM).\n\nJust ask me to write code, run scripts, install packages, or anything else you'd do on a Linux server!`,
                });
            }

            done();
        } else if (attempts < MAX_ATTEMPTS) {
            // Re-schedule check
            sandboxQueue.add(
                "check-sandbox-ready",
                { user_id, chat_id, attempts: attempts + 1 },
                { delay: 15000 }
            );
            done();
        } else {
            console.log(`[SandboxQueue] Sandbox still not ready after ${MAX_ATTEMPTS} attempts for user ${user_id}`);
            done(new Error("Sandbox provisioning timed out"));
        }
    } catch (err) {
        console.log(`[SandboxQueue] Check ready error:`, err.message);
        done(err);
    }
});

sandboxQueue.process("destroy-sandbox", async (job, done) => {
    const { user_id } = job.data || {};

    try {
        console.log(`[SandboxQueue] Destroying sandbox for user ${user_id}`);
        await destroySandbox({ user_id });
        done();
    } catch (err) {
        console.log(`[SandboxQueue] Destroy error for user ${user_id}:`, err.message);
        done(err);
    }
});

// ============================================
// Agentic Tasks: Scheduled Autonomous Agent Loops
// ============================================

const { getUserEntryPoints } = require("../logic/entryPoints");
const { saveTaskState } = require("../logic/messageRouter");
const { ensureAllHeartbeats } = require("../logic/heartbeat");

// Ensure heartbeat tasks exist for all users (runs every 5 minutes)
agenticQueue.add(
    "ensure-heartbeats",
    {},
    {
        repeat: {
            every: 5 * 60 * 1000,
        },
    }
);

agenticQueue.process("ensure-heartbeats", async (job, done) => {
    try {
        await ensureAllHeartbeats();
    } catch (err) {
        console.log("[Heartbeat] Error in ensure-heartbeats job:", err.message);
    }
    done();
});

// Poll every 60 seconds for due auto tasks
agenticQueue.add(
    "check-due-tasks",
    {},
    {
        repeat: {
            every: 60 * 1000,
        },
    }
);

agenticQueue.process("check-due-tasks", async (job, done) => {
    try {
        const tasksDB = await db.getTasksDB();

        // Failsafe poll: find any tasks that are due but haven't been picked up
        // (normally tasks are scheduled as precise delayed jobs, this catches missed ones)
        const { rows: dueTasks } = await tasksDB.query(
            `SELECT t.id, t.cron_expression, t.end_at, u.settings
             FROM btw.agentic_tasks t
             JOIN btw.users u ON u.id = t.user_id
             WHERE t.status = 'active' AND t.mode = 'auto' AND t.next_run_at <= NOW()`
        );

        if (dueTasks.length > 0) {
            console.log(`[AgenticScheduler] Failsafe: found ${dueTasks.length} overdue task(s)`);
        }

        for (const task of dueTasks) {
            // Check deadline: if end_at has passed, mark completed and skip
            if (task.end_at && new Date(task.end_at) <= new Date()) {
                console.log(`[AgenticScheduler] Task ${task.id} past deadline, marking completed`);
                await tasksDB.query(
                    `UPDATE btw.agentic_tasks SET status = 'completed', updated_at = NOW() WHERE id = $1`,
                    [task.id]
                );
                continue;
            }
            // Advance next_run_at immediately to prevent re-pickup on next poll
            if (task.cron_expression) {
                const timezoneOffset = task.settings?.timezoneOffsetInSeconds || 0;
                const nextRun = calculateNextRun(task.cron_expression, timezoneOffset);
                if (nextRun) {
                    await tasksDB.query(
                        `UPDATE btw.agentic_tasks SET next_run_at = $1, updated_at = NOW() WHERE id = $2`,
                        [nextRun, task.id]
                    );
                }
            }
            // Schedule run immediately (delay=0), with jobId to deduplicate
            await scheduleAgenticRun(task.id, new Date());
        }
    } catch (err) {
        console.log("[AgenticScheduler] Error checking due tasks:", err.message);
    }

    done();
});

agenticQueue.process("run-agentic-task", async (job, done) => {
    const { taskId } = job.data || {};

    let runId = null;

    try {
        const tasksDB = await db.getTasksDB();

        // Load the task and verify it's still active
        const { rows: tasks } = await tasksDB.query(
            `SELECT t.*, u.settings, u.pro, u.name as user_name
             FROM btw.agentic_tasks t
             JOIN btw.users u ON u.id = t.user_id
             WHERE t.id = $1 AND t.status = 'active'`,
            [taskId]
        );

        if (tasks.length === 0) {
            console.log(`[AgenticRunner] Task ${taskId} not found or inactive, skipping`);
            done();
            return;
        }

        const task = tasks[0];

        // Check deadline: if end_at has passed, mark completed and skip
        if (task.end_at && new Date(task.end_at) <= new Date()) {
            console.log(`[AgenticRunner] Task ${taskId} past deadline (${task.end_at}), marking completed`);
            await tasksDB.query(
                `UPDATE btw.agentic_tasks SET status = 'completed', updated_at = NOW() WHERE id = $1`,
                [taskId]
            );
            done();
            return;
        }

        console.log(`[AgenticRunner] Starting task ${taskId} "${task.name}" for user ${task.user_id}`);

        // Immediately advance next_run_at to prevent failsafe poll from scheduling a duplicate
        if (task.cron_expression) {
            const timezoneOffset = task.settings?.timezoneOffsetInSeconds || 0;
            const nextRun = calculateNextRun(task.cron_expression, timezoneOffset);
            if (nextRun) {
                await tasksDB.query(
                    `UPDATE btw.agentic_tasks SET next_run_at = $1, updated_at = NOW() WHERE id = $2`,
                    [nextRun, taskId]
                );
                console.log(`[AgenticRunner] Advanced next_run_at for task ${taskId} to ${nextRun.toISOString()}`);
            }
        }

        // Create a task_runs audit row
        const { rows: runRows } = await tasksDB.query(
            `INSERT INTO btw.task_runs (task_id, user_id) VALUES ($1, $2) RETURNING id`,
            [taskId, task.user_id]
        );
        runId = runRows[0].id;

        // Load sandbox if pro (getSandbox decrypts the SSH private key)
        let sandbox = null;
        if (task.pro) {
            sandbox = await getSandbox({ user_id: task.user_id });
        }

        // Load task's persisted message history
        const agenticTaskMessages = task.messages || [];

        // Set up workspace for pro+sandbox tasks
        let taskWorkspace = task.workspace || null;
        let taskWorkingDir = task.working_directory || "/root";

        if (sandbox && !taskWorkspace) {
            // First run: assign a workspace path and persist it
            taskWorkspace = `/root/tasks/task_${taskId}`;
            await tasksDB.query(
                `UPDATE btw.agentic_tasks SET workspace = $1 WHERE id = $2`,
                [taskWorkspace, taskId]
            );
        }

        if (sandbox && taskWorkspace) {
            // Create workspace dir on sandbox via SSH
            try {
                const { SSHSession } = require("../services/ssh");
                const sshSetup = new SSHSession({
                    host: sandbox.ipv4,
                    privateKey: sandbox.ssh_private_key,
                });
                await sshSetup.connect();
                await sshSetup.exec(`mkdir -p ${taskWorkspace}`);
                await sshSetup.close();
                // Use workspace as working directory
                taskWorkingDir = taskWorkspace;
            } catch (err) {
                console.log(`[AgenticRunner] Failed to create workspace dir: ${err.message}`);
            }
        }

        // Detect heartbeat type
        const heartbeatType = task.system_type || null;
        const isHeartbeat = heartbeatType && heartbeatType.startsWith("heartbeat_");

        // Run the agent loop with persisted state
        const { text, agentMessages, workingDirectory: newWd } = await runAgentLoop({
            input: task.instruction,
            user_id: task.user_id,
            timezoneOffsetInSeconds: task.settings?.timezoneOffsetInSeconds || 0,
            familyUsers: [],
            timezone: task.settings?.timezone || "GMT",
            isPro: !!task.pro,
            sandbox,
            chatId: null, // null = skip approval for auto tasks
            entryPoint: task.entry_point || "telegram",
            userName: task.user_name,
            agenticTaskId: taskId,
            agenticTaskMessages,
            isScheduledRun: true,
            workingDirectory: { current: taskWorkingDir },
            agenticInstruction: task.instruction,
            taskWorkspace,
            heartbeatType,
        });

        // Save agent state back to task
        // Heartbeat runs: clear messages (each run is independent, no continuity needed)
        if (isHeartbeat) {
            await saveTaskState({
                taskId,
                messages: [],
                workingDirectory: newWd,
            });
        } else if (agentMessages && agentMessages.length > 0) {
            await saveTaskState({
                taskId,
                messages: agentMessages,
                workingDirectory: newWd,
            });
        }

        // Mark run as completed
        await tasksDB.query(
            `UPDATE btw.task_runs SET status = 'completed', completed_at = NOW() WHERE id = $1`,
            [runId]
        );

        // Broadcast result to ALL connected entry points (auto mode)
        // Suppress for: daily heartbeat (always silent), or any [NO_MESSAGE] response
        const isNoMessage = text && text.trim() === "[NO_MESSAGE]";
        const isSilentHeartbeat = heartbeatType === "heartbeat_daily";
        if (text && !isNoMessage && !isSilentHeartbeat) {
            const allEPs = await getUserEntryPoints(task.user_id);
            for (const ep of allEPs) {
                try {
                    await ep.impl.sendMessage({
                        chatId: ep.chatId,
                        message: text,
                    });
                } catch (epErr) {
                    console.log(`[AgenticRunner] Failed to send to ${ep.entryPoint}:`, epErr.message);
                }
            }
        } else if (isHeartbeat) {
            console.log(`[AgenticRunner] Heartbeat ${heartbeatType} task ${taskId}: ${isNoMessage ? "no message to send" : "silent run completed"}`);
        }

        // Schedule next run if recurring (chain scheduling for precise timing)
        // next_run_at was already advanced at the start of this run to prevent double-firing
        if (task.cron_expression) {
            // Re-check task status (agent may have called stop_this_task)
            const { rows: updatedTask } = await tasksDB.query(
                `SELECT next_run_at, status, end_at FROM btw.agentic_tasks WHERE id = $1`,
                [taskId]
            );

            if (updatedTask.length > 0 && updatedTask[0].status === 'active') {
                const nextRunAt = updatedTask[0].next_run_at ? new Date(updatedTask[0].next_run_at) : null;
                const endAt = updatedTask[0].end_at ? new Date(updatedTask[0].end_at) : null;

                // If next run would be past the deadline, complete the task
                if (endAt && nextRunAt && nextRunAt >= endAt) {
                    console.log(`[AgenticRunner] Task ${taskId} next run (${nextRunAt.toISOString()}) past deadline (${endAt.toISOString()}), completing`);
                    await tasksDB.query(
                        `UPDATE btw.agentic_tasks SET status = 'completed', updated_at = NOW() WHERE id = $1`,
                        [taskId]
                    );
                } else if (nextRunAt) {
                    await scheduleAgenticRun(taskId, nextRunAt);
                }
            } else {
                console.log(`[AgenticRunner] Task ${taskId} no longer active, skipping next schedule`);
            }
        } else {
            // One-shot auto task — mark completed after running
            await tasksDB.query(
                `UPDATE btw.agentic_tasks SET status = 'completed', updated_at = NOW() WHERE id = $1`,
                [taskId]
            );
        }

        console.log(`[AgenticRunner] Task ${taskId} run ${runId} completed. Text: "${(text || "").slice(0, 100)}"`);
    } catch (err) {
        console.log(`[AgenticRunner] Task ${taskId} run ${runId} failed:`, err.message);

        // Mark run as failed
        if (runId) {
            try {
                const tasksDB = await db.getTasksDB();
                await tasksDB.query(
                    `UPDATE btw.task_runs SET status = 'failed', completed_at = NOW(), error = $1 WHERE id = $2`,
                    [err.message, runId]
                );
            } catch (_) {}
        }
    }

    done();
});

module.exports = router;
