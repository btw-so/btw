var express = require("express");
const { alertsQueue, baseQueue, uxQueue } = require("../services/queue");
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

module.exports = router;
