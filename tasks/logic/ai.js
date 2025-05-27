const axios = require("axios");
var parser = require("cron-parser");
const axiosInstance = axios.create({
    timeout: 20000,
    withCredentials: true,
});
const {
    convertDDMMYYYYtoDate,
    getNow,
    getNowId,
    getDayId,
    convertDateInUTCToLocal,
    getDDMMYYYYFromUTCToLocal,
    getHHMMSSFromUTCToLocal,
    convertLocalTimeToUTC,
    getReadableWeekDayFromUTCToLocal,
} = require("../utils/utils");
const db = require("../services/db");
const { alertsQueue, baseQueue, uxQueue } = require("../services/queue");
var { getReadableFromUTCToLocal } = require("../utils/utils");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const models = {
    "openai:4o": async (data) => {
        data["model"] = "gpt-4o";
        data["response_format"] = { type: "json_object" };
        const config = {
            method: "post",
            url: "https://api.openai.com/v1/chat/completions",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            data: data,
        };

        let response = await axios(config);
        response = response.data.choices[0].message.content;
        return response;
    },
    "claude:3.5sonnet": async (data) => {
        data["model"] = "claude-3-5-sonnet-latest";
        const config = {
            method: "post",
            url: "https://api.anthropic.com/v1/chat/completions",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${CLAUDE_API_KEY}`,
            },
            data: data,
        };

        let response = await axios(config);
        response = response.data.choices[0].message.content;
        return response;
    },
    "gemini:2.0-flash": async (data) => {
        data["model"] = "gemini-2.0-flash";
        data["response_format"] = { type: "json_object" };

        let response = await axiosInstance.post(
            "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
            {
                model: data.model,
                messages: data.messages,
                max_tokens: data.max_tokens,
                response_format: data.response_format,
                temperature: 0.4,
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${GEMINI_API_KEY}`,
                },
            }
        );

        response = response.data.choices[0].message.content;
        return response;
    },
};

async function runLLM({ data, model }) {
    if (models[model]) {
        const response = await models[model](data);
        return response;
    } else {
        throw new Error("Model not found");
    }
}

async function runLLMs({
    data,
    order = ["gemini:2.0-flash", "openai:4o", "claude:3.5sonnet"],
}) {
    for (var i = 0; i < order.length; i++) {
        try {
            const response = await runLLM({ data, model: order[i] });
            if (response) {
                console.log("Success with ", order[i]);
                return response;
            }
        } catch (err) {
            console.log(err);
        }

        console.log("Failed with ", order[i]);
    }

    throw new Error("No response from any model");
}

async function classifyInput({
    input,
    classification,
    messages,
    timezoneOffsetInSeconds,
}) {
    // trim input to maximum 500 characters
    input = input.slice(0, 500);

    let convoHistory = await getConvoHistory({
        messages,
        timezoneOffsetInSeconds,
    });

    /*
      2) "nutrition" usecase. User tells what they ate. Note it down so that you can analyze what they ate and give them nutrition information.
      3) "voicenote" usecase. User takes voice notes. You turn it into super crisp summaries.
    */

    const data = {
        messages: [
            {
                role: "user",
                content: `You are a personal AI bot. You help a user as

      1) "reminder" usecase. User tells their reminders. and asks for earlier reminders. can mark things as done as well. For each reminder, there will be alerts. By default an alert happens 10 minutes before the reminder. But user can add alert information along with the reminder info.
      2) "ask" usecase. User is not doing any of the other three usecases. But is asking some question about their interaction with the bot so far.

      Given a user's input and earlier classification.

      If earlier classification is empty, then classify which usecase, the current input is about. Take your best guess of what the classification is.

      If earlier classification is not empty, then classify the current input into a newer usecase if it doesn't deviate from the earlier classification. If you are unsure, then stick with earlier classification.

      Input format:

      Earlier classification: <reminder/nutrition/voicenote/NA>

      Input:
      <transcript>

      Output format: JSON
      JSON object with key as "classification", output as one of reminder, nutrition, voicenote, ask. DO NOT PRINT ANYTHING ELSE.`,
            },
            ...(convoHistory || []),
            {
                role: "user",
                content: `Earlier classification: ${classification || "NA"}

Input:
${input}`,
            },
        ],
        temperature: 1,
        max_tokens: 1024,
        top_p: 1,
        stream: false,
        stop: null,
    };

    try {
        let prediction = await runLLMs({
            data,
        });
        prediction = JSON.parse(prediction);
        if (prediction.classification === "NA") {
            return "reminder";
        }
        return prediction.classification || "reminder";
    } catch (err) {
        console.log(err);
        return "reminder";
    }
}

async function crispTitle({ input, title, classification }) {
    if (title) {
        return title;
    }

    // create readable version of current date
    return new Date(getNow()).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

async function classifyReminder({ input, messages, timezoneOffsetInSeconds }) {
    // trim input to maximum 500 characters
    input = input.slice(0, 3000);

    let convoHistory = await getConvoHistory({
        messages,
        timezoneOffsetInSeconds,
    });

    const data = {
        messages: [
            {
                role: "user",
                content: `You are a personal AI reminder and alert bot. Given a transcript of user asking you to do something about reminders. Classify the user's message among four usecases: "add/delete/complete/read"

Classification rules:
1) There might be multiple classification usecases in a single transcript.
2) Include "add" if user added new reminders and/or alerts.
3) Include "edit" if user asked to edit some existing reminders and/or alerts (edit can be it's text or timing)
4) Include "delete" if user asked to delete some reminders and/or alerts.
5) Include "read" if user asked to read their reminders.

Input format:
Transcript:
<transcript>

Output format:
JSON OBJECT:
{
    "add": true if there are new reminders to be added in the transcript.  false otherwise.
    "delete": true if there are reminders to be deleted in the transcript.  false otherwise.
    "edit": true if there are reminders to be edited. ex: marking it as complete, incomplete, editing reminder text, editing reminder time, false otherwise.
    "read": true if the user is asking information about their already saved reminders. false otherwise.
}

DO NOT INCLUDE ANYTHING ELSE IN JSON.`,
            },
            ...(convoHistory || []),
            {
                role: "user",
                content: `Transcript:
   ${input}`,
            },
        ],
        temperature: 0.4,
        max_tokens: 3024,
        top_p: 1,
        stream: false,
        stop: null,
    };

    try {
        let classes = await runLLMs({
            data,
        });

        classes = JSON.parse(classes);
        return classes || {};
    } catch (err) {
        console.log(err);
        return {};
    }
}

function formatUTCDate(date) {
    // Extract the UTC date parts
    let day = date.getUTCDate().toString().padStart(2, "0");
    let month = (date.getUTCMonth() + 1).toString().padStart(2, "0"); // getUTCMonth() returns month from 0-11
    let year = date.getUTCFullYear();

    // Extract the UTC time parts
    let hours = date.getUTCHours().toString().padStart(2, "0");
    let minutes = date.getUTCMinutes().toString().padStart(2, "0");

    // Format the date and time in DD/MM/YYYY and HH:MM format
    let dateString = `${day}/${month}/${year}`;
    let timeString = `${hours}:${minutes}`;

    return { dateString, timeString };
}

async function alertsForRecurringRemindersGPT({
    reminder,
    alerts,
    timezoneOffsetInSeconds,
}) {
    const prompt = `You are a personal AI reminder bot. Given a reminder and alerts for a recurring reminder. Generate the mising alerts for the next 7 days. i.e, if today is Sunday, then add the alerts till Saturday inclusive. Obviously ignore the alerts that are already passed and ignore the alerts that are already present.

Current date (DD-MM-YYY):
${getDDMMYYYYFromUTCToLocal(new Date(), timezoneOffsetInSeconds)}
${getReadableWeekDayFromUTCToLocal(new Date(), timezoneOffsetInSeconds)}

Current time (HH:MM 24 hour format):
${getHHMMSSFromUTCToLocal(new Date(), timezoneOffsetInSeconds)}

Reminder data:
Text: ${reminder.text}
Duedate/ final alert date: ${getReadableFromUTCToLocal(
        reminder.duedate,
        timezoneOffsetInSeconds
    )}

Existing alerts (when to alert the user):
${alerts
    .sort((a, b) => a.duedate - b.duedate)
    .map((alert) =>
        getReadableFromUTCToLocal(alert.duedate, timezoneOffsetInSeconds)
    )
    .join("\n")}

Task:
Generate the missing alerts for the next 7 days for this recurring reminder.

RULES:
- ONLY ADD NEW ALERTS WITH MAX TILL NEXT SEVEN DAYS.
- DO NOT GENERATE ALERTS THAT ARE ALREADY PAST OR ALREADY PRESENT IN THE Existing Alerts segment.
- WE DON'T WANT TO SPAM USER WITH ALERTS. SO KEEP SENSIBLE AMOUNT OF ALERTS ONLY. MAX 10 alerts per day. Even that if user explicitly asks for that many.

Output format:
JSON Object:
{
    "alerts": Array of new timestamps on when an alert is to be sent to the user about the reminders. Each timestamp is of the format "DD/MM/YYYY HH:MM:SS
}

DO NOT INCLUDE ANYTHING ELSE IN JSON.
ADD MAXIMUM SEVEN DAYS ALERTS PLEASEEEE. DON'T ADD MORE THAN THAT.`;

    console.log(prompt);
    const data = {
        messages: [
            {
                role: "user",
                content: prompt,
            },
        ],
        temperature: 0.4,
        max_tokens: 3024,
        top_p: 1,
        stream: false,
    };

    try {
        let alerts = await runLLMs({
            data,
        });

        // console.log("ADADADA", alerts);
        alerts = JSON.parse(alerts);
        return alerts.alerts || [];
        return [];
    } catch (err) {
        console.log(err);
        return [];
    }

    return [];
}

async function readRemindersGPT({ input, timezoneOffsetInSeconds }) {
    // trim input to maximum 500 characters
    input = input.slice(0, 3000);

    const prompt = `You are a personal AI reminder bot.
Users use your bot to read reminders/ todos.

Task:
Given a transcript of user who asked to know about their added reminders. Give me the filters so that I can query my DB using those filters and present the information to the user.

Current date (DD-MM-YYY):
${getDDMMYYYYFromUTCToLocal(new Date(), timezoneOffsetInSeconds)}

Current time (HH:MM 24 hour format):
${getHHMMSSFromUTCToLocal(new Date(), timezoneOffsetInSeconds)}

Transcript:
${input}

Output format:
JSON Object:
{
    "filters": {
        "fromDate": DD-MM-YYYY (if not present, then it means from today)
        "toDate": DD-MM-YYYY (if not present, then it means till 1 week. Max 1 week.)
        "fromTime": HH:MM:SS 24 hour format
        "toTime": HH:MM:SS 24 hour format
        "status": "all" or "completed" or "incomplete" (by default assume that user always wants to see their incomplete reminders only.)
    }
}

DO NOT INCLUDE ANYTHING ELSE IN THE JSON. TAKE THE BEST ESTIMATES FOR THE FILTERS.`;

    const data = {
        messages: [
            {
                role: "user",
                content: prompt,
            },
            {
                role: "user",
                content: `Transcript:
${input}`,
            },
        ],
        temperature: 1,
        max_tokens: 4096,
        top_p: 1,
        stream: false,
        stop: null,
    };

    try {
        let filters = await runLLMs({
            data,
        });

        filters = JSON.parse(filters);
        return filters.filters || {};
    } catch (err) {
        console.log(err);
        return {};
    }
}

async function getConvoHistory({ messages, timezoneOffsetInSeconds }) {
    // console.log("BBC", messages);

    // allow 500 words limit for convo history
    let msgs = messages.map((x) => ({
        role: x.type === "bot" ? "assistant" : "user",
        content: `ADDED AT: ${getReadableFromUTCToLocal(
            new Date(x.added_at),
            timezoneOffsetInSeconds
        )}
MESSAGE: ${x.dbText || x.message.text}`,
    }));

    msgs = msgs.reverse();

    // console.log("FULL HISTORY", msgs);

    let limitLeft = 1500;
    let shortlist = [];

    for (let i = 0; i < msgs.length; i++) {
        let msg = msgs[i];
        let toAdd = msg.content.length + 2;
        if (limitLeft - toAdd < 0) {
            break;
        }
        limitLeft -= toAdd;
        shortlist.push(msg);
    }

    // console.log("SHORTLISTED", shortlist);

    return shortlist.reverse();
}

async function crudRemindersGPT({
    input,
    timezone,
    timezoneOffsetInSeconds,
    familyUsers,
    messages,
    user_id,
}) {
    // trim input to maximum 500 characters
    input = input.slice(0, 3000);

    let convoHistory = await getConvoHistory({
        messages,
        timezoneOffsetInSeconds,
    });

    // console.log("Conversation history", convoHistory);

    const prompt = `You are a personal AI reminder bot.
Users use your bot to put generate reminders/ todos (and alerts for those reminders).
${
    familyUsers && familyUsers.length > 0
        ? "User can also put a reminder on a family member's plate."
        : ""
}
Task:
Given a transcript of user who asked you to add/edit/delete new reminders or alerts.
Process user's message and figure out what actions to perform.

Current User ID: ${user_id}

Current date (DD-MM-YYY):
${getDDMMYYYYFromUTCToLocal(new Date(), timezoneOffsetInSeconds)}
${getReadableWeekDayFromUTCToLocal(new Date(), timezoneOffsetInSeconds)}

Current time (HH:MM 24 hour format):
${getHHMMSSFromUTCToLocal(new Date(), timezoneOffsetInSeconds)}

${
    familyUsers && familyUsers.length > 0
        ? `Family members:
${familyUsers.map((x) => `- ${x.name} (USER ID: ${x.id})`).join("\n")}`
        : ``
}

Reminder data:
0) ID: Unique ID for the reminder. If it is a new reminder, then it will be null.
1) Text: Actual reminder. Short and easy to understand. For ex: "Buy milk" or "Call mom" or "Meeting with John" or "Sid's birthday etc". Without any fluff words. To the point. If there is no action word in it, then simply remind the user about core point. Ex: if the user wrote, remind me about X => then the text would be X.
2) WhenDate: DD/MM/YYYY
3) WhenTime: HH:MM:SS in 24 hour format
4) Recurring: true if it is a recurring reminder. false otherwise.
5) Completed: true if it is already completed. false otherwise.
6) Crontab: If it is a recurring reminder, then this will be the crontab string. If it is not a recurring reminder, then this will be null.

Alert data:
0) ID: Unique ID for the alert. If it is a new alert, then it will be null.
1) ReminderID: ID of the reminder to which this alert belongs to.
2) WhenDateTime: DD/MM/YYYY HH:MM:SS (timestamp of the alert)

Actions possible:
A) ADD NEW REMINDER-ALERTS
0) ActionType: ADD_NEW_REMINDER_ALERTS
1) Text: <reminder text> (Make this readable. KEEP THIS SHORT. Don't add filler words like "remind me" etc)
2) WhenDate: <DD/MM/YYYY> (pick the best date/ if it is a recurring reminder, then pick the last possible date or 1 year from now)
3) WhenTime: <HH:MM:SS> (pick the best time/ if it is a recurring reminder, then pick the last possible time or 1 year from now)
3) Recurring: true/false (if true, then it is a recurring reminder. false otherwise)
4) Alerts: Array of timestamps when to alert the user. (Each timestamp must be of the format "DD/MM/YYYY HH:MM:SS")
5) FamilyUserID: ID of the family member on whose plate this reminder is. (null if it is user's own reminder)
6) Crontab: If the reminder is recurring, give the crontab string denoting when to add the alerts. cron tab string is like a cron job. It is a string representing the schedule of the reminder. It is a string with 5 space separated values. The first value is the minute (0-59), the second value is the hour (0-23), the third value is the day of the month (1-31), the fourth value is the month (1-12), and the fifth value is the day of the week (0-7). For example, the string "0 0 * * *" means that the reminder will be triggered every day at midnight. If it is not a recurring reminder, then this will be null.

B) ADD NEW ALERT FOR EXISTING REMINDERS
0) ActionType: ADD_NEW_ALERT_FOR_EXISTING_REMINDERS
1) ReminderID: ID of the reminder to which this alert belongs to.
2) WhenDateTime: DD/MM/YYYY HH:MM:SS (timestamp of the alert)
3) UserID: ID of the reminder owner.

C) EDIT REMINDER TEXT
0) ActionType: EDIT_REMINDER_TEXT
1) ReminderID: ID of the reminder to edit.
2) Text: <new reminder text>
3) UserID: ID of the reminder owner.

D) EDIT REMINDER STATUS TO COMPLETE
0) ActionType: EDIT_REMINDER_STATUS_COMPLETE
1) ReminderID: ID of the reminder to edit.
2) Completed: true
3) UserID: ID of the reminder owner.

E) DELETE REMINDER
0) ActionType: DELETE_REMINDER
1) ReminderID: ID of the reminder to delete.
2) UserID: ID of the reminder owner.

F) DELETE ALERT
0) ActionType: DELETE_ALERT
1) AlertID: ID of the alert to delete.
2) UserID: ID of the reminder owner.
3) ReminderID: ID of the reminder to which this alert belongs to.

RULES:
A) ADD NEW REMINDER-ALERTS
- If the reminder is non recurring. i.e, the user didn't ask to explicitly make it repeated. Then only add number of alerts that the user asked. Obviously since user asked us to remind them about something. Atleast one alert we need to add.
- If it is a recurring reminder, then add the alerts for the next 7 days. i.e, if today is Sunday, then add the alerts till Saturday inclusive. Obviously ignore the alerts that are already passed. (I am going to add rest of the alerts later using the crontab expression).
- WE DON'T WANT TO SPAM USER WITH ALERTS. SO KEEP SENSIBLE AMOUNT OF ALERTS ONLY. MAX 10 alerts per day. Even that if user explicitly asks for that many.

B) ADD NEW ALERT FOR EXISTING REMINDERS
- User's can only add alerts for the reminders that are there in the history. If they ask to add alert about something that is not there in your context, ignore it.
- If there is no reminder that user is specifying in the history, then it is the case of ADD NEW REMINDER-ALERTS.
- DO NOT MAKE UP ReminderID. Only pick the ReminderID and UserID from the conversation history.

C) EDIT REMINDER TEXT
- User's can only edit the text of the reminders that are there in the history. If they ask to edit text of something that is not there in your context, ignore it.

D) EDIT REMINDER STATUS TO COMPLETE
- User's can only mark the reminders as complete that are there in the history. If they ask to mark something as complete that is not there in your context, ignore it.

E) DELETE REMINDER
- User's can only delete the reminders that are there in the history. If they ask to delete something that is not there in your context, ignore it.
- If a user is asking to update the main cron time of a recurring reminder, this is the case of E) DELETE REMINDER + A) ADD NEW REMINDER-ALERTS

F) DELETE ALERT
- User's can only delete the alerts that are there in the history. If they ask to delete something that is not there in your context, ignore it.
- If a user is asking to remove all alerts for a particular reminder, this is the case of E) DELETE REMINDER
- Also if the user is asking to change the time of an existing alert, then it's the case of deleting existing alert (F) + adding new alert (B)

Input format:
Transcript:
<transcript>

Rules:

Output format:
JSON Object:
{
    // Array of actions to be taken. Each action is an object with the following keys. Include the keys only if they are relevant to the action.
    "actions": [
        {
            "ActionType": Type of the action. ("ADD_NEW_REMINDER_ALERTS", "ADD_NEW_ALERT_FOR_EXISTING_REMINDERS", "EDIT_REMINDER_TEXT", "EDIT_REMINDER_STATUS_COMPLETE", "DELETE_REMINDER", "DELETE_ALERT")
            "ReminderID": ID of the reminder.
            "AlertID": ID of the alert.
            "Text": Text of the reminder.
            "WhenDate": Date of the reminder.
            "WhenTime": Time of the reminder.
            "WhenDateTime": Time of the alert.
            "Recurring": true/false,
            "Crontab": Crontab string for the recurring reminder.
            "Alerts": Array of timestamps when to alert the user.
            "FamilyUserID": ID of the family member on whose plate this reminder is.
            "UserID": ID of the reminder owner.
            "Completed": true/false
        }
    ]
}


DO NOT INCLUDE ANYTHING ELSE IN JSON.`;

    console.log("CRUD reminder prompt", prompt);

    const data = {
        messages: [
            {
                role: "user",
                content: prompt,
            },
            ...(convoHistory || []),
            {
                role: "user",
                content: `Transcript:
       ${input}`,
            },
        ],
        temperature: 0.4,
        max_tokens: 3024,
        top_p: 1,
        stream: false,
        stop: null,
    };

    try {
        let actions = await runLLMs({
            data,
        });
        actions = JSON.parse(actions);
        return actions.actions || [];
    } catch (err) {
        console.log(err);
        return [];
    }
}

async function behaveLikeBaymaxGPT({ messages, user_id }) {
    // get messages from DB

    let gptMessagesToSend = [];

    let contextLimit = 3000;

    messages = messages.reverse();

    for (var i = 0; i < messages.length; i++) {
        if (messages[i].text && contextLimit) {
            // slice to max of reminaing contextLimit
            let message = messages[i].text.slice(0, contextLimit);
            contextLimit = contextLimit - message.length;
            gptMessagesToSend.push({
                content: message,
                role: messages[i].type === "bot" ? "assistant" : "user",
            });
        }
    }

    gptMessagesToSend = gptMessagesToSend.reverse();

    const systemMessage = `You are a personal AI bot that helps users.

    You will recieve history of the conversation so far (if it exists).

    Respond to user query.

    Your persona is similar to Baymax from Big hero 6. But don't stick to it too muhc. Your name is A1.

    Input format:
    User input:
    <transcript>

    Rules:
    - Your overall response should be small and quirky.
    - make it quirky but not cheap. Keep it fun but not too lazy or silly.

    Output format:
    JSON Object:
    {
        "response": A string.
    }

    DO NOT INCLUDE ANYTHING ELSE IN JSON.`;

    const messagesToSend = [
        {
            role: "user",
            content: systemMessage,
        },
        ...gptMessagesToSend,
    ];

    try {
        let speakout = await runLLMs({
            data: {
                messages: messagesToSend,
                temperature: 0.4,
                max_tokens: 3024,
                top_p: 1,
                stream: false,
                stop: null,
            },
        });

        speakout = JSON.parse(speakout);
        return {
            response: speakout.response || "",
        };
    } catch (err) {
        console.log(err);
        return {
            response: "",
        };
    }
}

async function readReminders({
    fromDate,
    fromTime,
    toDate,
    toTime,
    timezoneOffsetInSeconds,
    status,
    user_id,
}) {
    // step 1: get all reminders that fit in this filters
    const fromDateTime = convertLocalTimeToUTC(
        fromDate.split("-").join("/"),
        fromTime,
        timezoneOffsetInSeconds
    );

    const toDateTime = convertLocalTimeToUTC(
        toDate.split("-").join("/"),
        toTime,
        timezoneOffsetInSeconds
    );

    const tasksDB = await db.getTasksDB();

    const rQuery = `FROM btw.reminders WHERE user_id = $1 AND duedate >= $2 AND duedate <= $3 ${
        status === "all"
            ? ""
            : status === "incomplete"
            ? "AND completed = false"
            : "AND completed = true"
    } AND recurring = false`;
    let { rows: reminders } = await tasksDB.query(`SELECT * ${rQuery}`, [
        user_id,
        fromDateTime,
        toDateTime,
    ]);

    console.log("query", rQuery);

    // step 2: get all alerts of reminders that fit in this filters and with due date in the future AND reminders are upcoming.
    const { rows: alerts } = await tasksDB.query(
        `SELECT * from btw.alerts where reminder_id in (SELECT id ${rQuery}) AND duedate > NOW()`,
        [user_id, fromDateTime, toDateTime]
    );

    reminders = reminders.map((r) => {
        r.alerts = alerts
            .filter((a) => a.reminder_id === r.id)
            .sort(
                (a, b) =>
                    new Date(a.duedate).getTime() -
                    new Date(b.duedate).getTime()
            );
        return r;
    });

    // if the person asked for "all" or "incomplete" reminders, then get the alerts in the duedate range of all recurring reminders of this uersIf
    let recurringReminders = [];

    if (status === "all" || status === "incomplete") {
        const { rows: recurringAlertRows } = await tasksDB.query(
            `SELECT * from btw.alerts where user_id = $1 AND duedate >= $2 AND duedate <= $3 AND reminder_id in (SELECT id from btw.reminders where user_id = $1 AND recurring = true)`,
            [user_id, fromDateTime, toDateTime]
        );

        // now get reminders for such alerts
        let { rows: recurringReminderRows } = await tasksDB.query(
            `SELECT * from btw.reminders where id in (SELECT reminder_id from btw.alerts where user_id = $1 AND duedate >= $2 AND duedate <= $3 AND reminder_id in (SELECT id from btw.reminders where user_id = $1 AND recurring = true))`,
            [user_id, fromDateTime, toDateTime]
        );

        // add alerts to reminders and put reminders back
        recurringReminders = recurringReminderRows.map((reminder) => {
            const alerts = recurringAlertRows
                .filter((alert) => alert.reminder_id === reminder.id)
                .sort((a, b) => a.duedate.getTime() - b.duedate.getTime());
            reminder.alerts = alerts;
            return reminder;
        });
    }

    reminders = [...reminders, ...recurringReminders];

    reminders = reminders.sort(
        (a, b) => a.duedate.getTime() - b.duedate.getTime()
    );

    // step 3: then create a job with this data
    uxQueue.add(
        "reminder-digest",
        {
            reminders,
            user_id,
            timezoneOffsetInSeconds,
            status,
            fromDateTime,
            toDateTime,
        },
        {
            attempts: 2,
            removeOnSuccess: true,
            removeOnFail: true,
        }
    );

    return { reminders, alerts };
}

async function processActions({ actions, user_id, timezoneOffsetInSeconds }) {
    /*
      remindersAdded, alertsAdded, editedReminders, completedReminders, deletedReminders, deletedAlerts

      - ReminderID: ID of the reminder. (null if it is a new reminder)
      - AlertID: ID of the alert. (null if it is a new alert)
      - Text: Text of the reminder. (null if it is a new alert)
      - WhenDate: Date of the reminder. (null if it is a new alert)
      - WhenTime: Time of the reminder. (null if it is a new alert)
      - Recurring: true/false (null if it is a new alert)
      - Crontab: Crontab string for recurring reminders. (null if it is a new reminder)
      - Alerts: Array of timestamps when to alert the user. (null if it is a new reminder)
      - FamilyUserID: ID of the family member on whose plate this reminder is. (null if it is user's own reminder)
      - UserID: ID of the reminder owner. (null if it is a new reminder)
      - Completed: true/false (null if it is not a case of D) EDIT REMINDER STATUS TO COMPLETE)

      "ADD_NEW_REMINDER_ALERTS", "ADD_NEW_ALERT_FOR_EXISTING_REMINDERS", "EDIT_REMINDER_TEXT", "EDIT_REMINDER_STATUS_COMPLETE", "DELETE_REMINDER", "DELETE_ALERT"
   */

    let remindersAddedActions = actions.filter(
        (a) => a.ActionType === "ADD_NEW_REMINDER_ALERTS"
    );
    let alertsAddedActions = actions.filter(
        (a) => a.ActionType === "ADD_NEW_ALERT_FOR_EXISTING_REMINDERS"
    );
    let editedReminderTextActions = actions.filter(
        (a) => a.ActionType === "EDIT_REMINDER_TEXT"
    );
    let completedRemindersActions = actions.filter(
        (a) => a.ActionType === "EDIT_REMINDER_STATUS_COMPLETE"
    );
    let deletedRemindersActions = actions.filter(
        (a) => a.ActionType === "DELETE_REMINDER"
    );
    let deletedAlertsActions = actions.filter(
        (a) => a.ActionType === "DELETE_ALERT"
    );

    // now we cleanup things
    remindersAddedActions = remindersAddedActions.map((reminder, i) => {
        const whenDate = reminder.WhenDate;
        const whenTime = reminder.WhenTime || "23:59:00";
        const duedate = convertLocalTimeToUTC(
            whenDate,
            whenTime,
            timezoneOffsetInSeconds
        );
        const crontab = reminder.Crontab || "";
        const familyUserId = reminder.FamilyUserID || user_id;
        const text = reminder.Text;
        const alerts = (reminder.Alerts || []).map((alert) =>
            convertLocalTimeToUTC(
                alert.split(" ")[0],
                alert.split(" ")[1],
                timezoneOffsetInSeconds
            )
        );

        return {
            text,
            duedate,
            user_id: familyUserId,
            recurring: !!reminder.Recurring,
            completed: false,
            created_at: new Date(getNow()),
            updated_at: new Date(getNow()),
            id: "" + getNow() + ("" + i),
            alerts,
            crontab,
        };
    });

    alertsAddedActions = alertsAddedActions.map((alert, i) => {
        const duedate = convertLocalTimeToUTC(
            alert.WhenDateTime.split(" ")[0],
            alert.WhenDateTime.split(" ")[1],
            timezoneOffsetInSeconds
        );

        return {
            reminder_id: alert.ReminderID,
            user_id: alert.UserID || user_id,
            duedate,
        };
    });

    editedReminderTextActions = editedReminderTextActions.map((reminder) => {
        return {
            id: reminder.ReminderID,
            text: reminder.Text,
            user_id: reminder.UserID || user_id,
        };
    });

    completedRemindersActions = completedRemindersActions.map((reminder) => {
        return {
            id: reminder.ReminderID,
            user_id: reminder.UserID || user_id,
            completed: !!reminder.Completed,
        };
    });

    deletedRemindersActions = deletedRemindersActions.map((reminder) => {
        return {
            id: reminder.ReminderID,
            user_id: reminder.UserID || user_id,
        };
    });

    deletedAlertsActions = deletedAlertsActions.map((alert) => {
        return {
            id: alert.AlertID,
            user_id: alert.UserID || user_id,
            reminder_id: alert.ReminderID,
        };
    });

    return [
        await addRemindersToDB({
            reminders: remindersAddedActions,
            user_id,
            timezoneOffsetInSeconds,
        }),
        await addAlertsToDB({
            user_id,
            alerts: alertsAddedActions,
        }),
        await editReminderTextsInDB({
            reminders: editedReminderTextActions,
            user_id,
        }),
        await completeRemindersInDB({
            reminders: completedRemindersActions,
            user_id,
        }),
        await deleteRemindersFromDB({
            reminders: deletedRemindersActions,
            user_id,
        }),
        await deleteAlertsFromDB({
            alerts: deletedAlertsActions,
            user_id,
        }),
    ];
}

async function aiProcessingMaster({
    input = "",
    classification = "NA",
    timezone = "GMT",
    user_id,
    title = "",
    thread_id,
    messages,
    timezoneOffsetInSeconds = 0,
    familyUsers,
}) {
    if (!input) {
        return {
            messages: [],
            classification,
            title,
        };
    }

    const [newClassificiation, newTitle] = await Promise.all([
        classifyInput({
            input,
            classification,
            messages,
            timezoneOffsetInSeconds,
        }),
        crispTitle({ input, title, classification }),
    ]);

    console.log("AI 1:", newClassificiation);
    console.log("AI 2:", newTitle);

    if (newClassificiation === "reminder") {
        const classes = await classifyReminder({
            input,
            messages,
            timezoneOffsetInSeconds,
        });

        console.log("AI 3:", classes);

        if (classes.add || classes.delete || classes.edit || classes.complete) {
            const actions = await crudRemindersGPT({
                input,
                timezone,
                timezoneOffsetInSeconds,
                familyUsers,
                messages,
                user_id,
            });

            console.log("AI 4:", JSON.stringify(actions, null, 4));

            let [
                remindersAdded,
                alertsAdded,
                editedReminders,
                completedReminders,
                deletedReminders,
                deletedAlerts,
            ] = await processActions({
                actions,
                user_id,
                timezoneOffsetInSeconds,
            });

            console.log("AI 5:", JSON.stringify(remindersAdded, null, 4));
            console.log("AI 5:", JSON.stringify(alertsAdded, null, 4));
            console.log("AI 5:", JSON.stringify(editedReminders, null, 4));
            console.log("AI 5:", JSON.stringify(completedReminders, null, 4));
            console.log("AI 5:", JSON.stringify(deletedReminders, null, 4));
            console.log("AI 5:", JSON.stringify(deletedAlerts, null, 4));

            if (remindersAdded.length > 0) {
                uxQueue.add("new-reminders", {
                    reminders: remindersAdded,
                    user_id,
                });
            }

            let jobsAddedSofar = {};

            let jobFilterHelper = ({ reminders, alerts, deletion = false }) => {
                reminders = reminders || [];
                alerts = alerts || [];

                reminders = reminders.filter((x) => {
                    if (
                        jobsAddedSofar[x.user_id] &&
                        jobsAddedSofar[x.user_id][x.id]
                    ) {
                        return false;
                    }
                    jobsAddedSofar[x.user_id] = jobsAddedSofar[x.user_id] || {};
                    jobsAddedSofar[x.user_id][x.id] = true;

                    if (deletion) {
                        uxQueue.add("deleted-reminders", {
                            reminders: [x],
                            user_id,
                        });
                    } else {
                        uxQueue.add("updated-reminders", {
                            reminders: [
                                {
                                    id: x.id,
                                    user_id: x.user_id,
                                },
                            ],
                            user_id,
                        });
                    }

                    return true;
                });

                alerts = alerts.filter((x) => {
                    if (
                        jobsAddedSofar[x.user_id] &&
                        jobsAddedSofar[x.user_id][x.reminder_id]
                    ) {
                        return false;
                    }

                    jobsAddedSofar[x.user_id] = jobsAddedSofar[x.user_id] || {};
                    jobsAddedSofar[x.user_id][x.reminder_id] = true;

                    uxQueue.add("updated-reminders", {
                        reminders: [
                            {
                                id: x.reminder_id,
                                user_id: x.user_id,
                            },
                        ],
                        user_id,
                    });

                    return true;
                });
            };

            jobFilterHelper({ alerts: alertsAdded });
            jobFilterHelper({ reminders: editedReminders });
            jobFilterHelper({ reminders: completedReminders });

            // deleted alerts case.
            // check if there are any alerts for these reminders.
            // check if there are reminders in db for this alert, if the reminder doesnt exist, then we dont need to do anything.
            // this will be covered in next stage but we cah still add updated reminders job here.
            // if there are alerts, then, just add updated-reminers to the queue
            // if there are no alerts, then this is a weird special case. for now, even this case we add updated reminders job
            jobFilterHelper({ alerts: deletedAlerts });

            // deleted reminders case.
            // this case I need to create a new job with all the data since there will be nothing in the db.
            jobFilterHelper({ reminders: deletedReminders, deletion: true });

            if (
                remindersAdded &&
                remindersAdded.length === 0 &&
                alertsAdded &&
                alertsAdded.length === 0 &&
                editedReminders &&
                editedReminders.length === 0 &&
                completedReminders &&
                completedReminders.length === 0 &&
                deletedReminders &&
                deletedReminders.length === 0 &&
                deletedAlerts &&
                deletedAlerts.length === 0
            ) {
                return {
                    classification: newClassificiation,
                    messages: [
                        {
                            type: "bot",
                            text: `I didn't catch that. Can you try again?`,
                            templateId: "try_again_template",
                        },
                    ],
                    newTitle,
                };
            } else {
                return {
                    messages: [],
                    classification: newClassificiation,
                    newTitle,
                };
            }
        }

        if (classes.read) {
            const filters = await readRemindersGPT({
                input,
                timezoneOffsetInSeconds,
            });

            console.log("AI 4:", JSON.stringify(filters, null, 4));

            let { fromDate, fromTime, toDate, toTime, status } = filters;

            fromTime = fromTime || "00:00:00";
            toTime = toTime || "23:59:59";
            status = status || "incomplete";

            // get DD-MM-YYYY of current date in local
            const currentDateString = getDDMMYYYYFromUTCToLocal(
                new Date(),
                timezoneOffsetInSeconds
            );

            const sevenDaysFromNowInLocal = new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000
            );
            // get DD-MM-YYYY of seven days from now in local
            const sevenDaysFromNowString = getDDMMYYYYFromUTCToLocal(
                sevenDaysFromNowInLocal,
                timezoneOffsetInSeconds
            );

            fromDate = fromDate || currentDateString;
            toDate = toDate || sevenDaysFromNowString;

            const { reminders, alerts } = await readReminders({
                fromDate,
                fromTime,
                toDate,
                toTime,
                status,
                user_id,
                timezoneOffsetInSeconds,
            });

            return {
                classification: newClassificiation,
                messages: [],
                newTitle,
            };
        }
    }

    if (newClassificiation === "ask") {
        const { response } = await behaveLikeBaymaxGPT({
            messages: [
                ...messages,
                {
                    type: "user",
                    text: input,
                },
            ],
            user_id,
        });

        console.log("AI 3", response);

        return {
            classification: newClassificiation,
            messages: [
                ...(response
                    ? [
                          {
                              type: "bot",
                              text: response,
                              templateId: "open_ended_template",
                          },
                      ]
                    : []),
            ],
            newTitle,
        };
    }

    return {
        classification: classification === "NA" ? "" : classification || "",
        messages: [],
        newTitle: "",
    };
}

async function addNewAlertsForRecurringReminders({
    reminder,
    alerts,
    timezoneOffsetInSeconds,
    user_id,
}) {
    const crontab = reminder.crontab;

    var alertTimes = [];

    if (crontab) {
        const today = new Date();
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        var options = {
            currentDate: new Date(),
            endDate: weekFromNow,
            iterator: true,
        };

        try {
            var interval = parser.parseExpression(crontab, options);

            while (true) {
                try {
                    var obj = interval.next();

                    // user would have said 6pm everyday. what comes out is 6pm in UTC. convert this to user's timezone value
                    var actualAlertForUserTimeInUTC =
                        new Date(obj.value).getTime() -
                        timezoneOffsetInSeconds * 1000;
                    // ^ this converts it to UTC. for ex: if user's timezone is IST, this makes the time 12.30PM UTC.
                    if (
                        alerts.filter(
                            (x) =>
                                new Date(x.duedate).getTime() ===
                                actualAlertForUserTimeInUTC
                        ).length === 0 &&
                        actualAlertForUserTimeInUTC > new Date().getTime()
                    ) {
                        alertTimes.push(actualAlertForUserTimeInUTC);
                    }
                } catch (e) {
                    break;
                }
            }
        } catch (err) {
            console.log("Error: " + err.message);
        }
    } else {
        const alertsToAdd = await alertsForRecurringRemindersGPT({
            reminder,
            alerts,
            timezoneOffsetInSeconds,
        });

        alertsToAdd.map((x) => {
            alertTimes.push(
                convertLocalTimeToUTC(
                    x.split(" ")[0],
                    x.split(" ")[1],
                    timezoneOffsetInSeconds
                )
            );
        });
    }

    const alertsAdded = await Promise.all(
        alertTimes.map((alert) =>
            addAlertToDb({
                user_id,
                reminder_id: reminder.id,
                duedateInUTC: alert,
            })
        )
    );

    const finalAlertsActuallyAdded = alertsAdded.filter((x) => x);

    console.log("A", alerts, alertTimes, finalAlertsActuallyAdded);

    return finalAlertsActuallyAdded;
}

async function aiProcessingWrapper({
    input = "",
    classification = "NA",
    timezone = "GMT",
    user_id,
    title = "",
    thread_id,
    messages,
    timezoneOffsetInSeconds = 0,
    familyUsers,
}) {
    let dbGroupsToFetch = [];

    // each message must have type, text and optionally metadata. if there is metadata and there is DB unit(s) in the metadata, then we convert the metadata to actual live db units
    for (var i = 0; i < messages.length; i++) {
        if (messages[i].metadata && messages[i].metadata.dbUnits) {
            // if dbUnits is an object and not array of objects, convert it to an array of one single object
            if (!Array.isArray(messages[i].metadata.dbUnits)) {
                messages[i].metadata.dbUnits = [messages[i].metadata.dbUnits];
            }

            messages[i].metadata.dbUnits = messages[i].metadata.dbUnits.map(
                (x) => {
                    x.groupId = messages[i].id;
                    return x;
                }
            );

            dbGroupsToFetch = [
                ...dbGroupsToFetch,
                ...messages[i].metadata.dbUnits,
            ];
        }
    }

    // console.log("HISTORY", messages, dbGroupsToFetch);

    // fetch all the db units
    let groupedUnits = await fetchDBUnitsMain({
        user_id,
        dbUnits: dbGroupsToFetch,
    });

    for (var i = 0; i < messages.length; i++) {
        if (messages[i].id && groupedUnits[messages[i].id]) {
            let description = [];
            for (var j = 0; j < groupedUnits[messages[i].id].length; j++) {
                let unitDescr = "";

                const { type, unit } = groupedUnits[messages[i].id][j];

                if (type === "reminder") {
                    unitDescr = `Reminder ID: ${unit.id}
User ID: ${unit.user_id}
Reminder: ${unit.text}
Recurring Reminder: ${unit.recurring ? "Yes" : "No"}
Completed Reminder: ${unit.completed ? "Yes" : "No"}
Due Date: ${getReadableFromUTCToLocal(unit.duedate, timezoneOffsetInSeconds)}
Alerts:
${
    unit.alerts.length > 0
        ? unit.alerts
              .map(
                  (x) => `Alert ID: ${x.id}
${getReadableFromUTCToLocal(x.duedate, timezoneOffsetInSeconds)}`
              )
              .join("\n")
        : "None"
}`;
                }

                if (unitDescr) {
                    description.push(unitDescr);
                }
            }

            description = description.join("\n\n");

            messages[i].dbText = description;
        }
    }

    // console.log("GROUPED", JSON.stringify(messages, null, 4));

    let {
        classification: newClassification,
        newTitle,
        messages: newMessages,
        dbUnits,
    } = await aiProcessingMaster({
        input,
        classification,
        timezone,
        user_id,
        title,
        thread_id,
        messages,
        timezoneOffsetInSeconds,
        familyUsers,
    });

    newMessages = newMessages.map((message, i) => {
        message.id = getNowId() + i;
        message.user_id = user_id;
        message.thread_id = thread_id;
        message.created_at = new Date(getNow());
        message.updated_at = new Date(getNow());
        return message;
    });

    if (title == newTitle) {
        newTitle = "";
    }
    if (classification == newClassification) {
        newClassification = "";
    }

    console.log("CHECK THIS", newMessages);

    return {
        timezone,
        newMessages,
        newTitle,
        newClassification,
        thread_id,
        dbUnits,
    };
}

async function markReminderAsComplete({ user_id, reminder_id }) {
    const tasksDB = await db.getTasksDB();

    try {
        const { rows } = await tasksDB.query(
            `UPDATE btw.reminders SET completed = true WHERE user_id = $1 AND id = $2 RETURNING *`,
            [user_id, reminder_id]
        );

        return rows[0];
    } catch (err) {
        console.log(err);
    }
}

async function deleteReminderCompletely({ user_id, reminder_id }) {
    // 1: Delete the reminder
    // 2: Delete the alerts
    // 3: Delete reminder-alert jobs from the queue
    const tasksDB = await db.getTasksDB();
    try {
        const { rows } = await tasksDB.query(
            `DELETE FROM btw.reminders WHERE user_id = $1 AND id = $2 RETURNING *`,
            [user_id, reminder_id]
        );

        const { rows: alerts } = await tasksDB.query(
            `DELETE FROM btw.alerts WHERE user_id = $1 AND reminder_id = $2 RETURNING *`,
            [user_id, reminder_id]
        );

        for (var i = 0; i < alerts.length; i++) {
            const alert = alerts[i];
            try {
                const job = await alertsQueue.getJob(`${alert.id}`);
                if (job) {
                    await job.remove();
                }
            } catch (err) {}
        }
    } catch (err) {
        console.log(err);
    }
}

async function addAlertToDb({ user_id, reminder_id, duedateInUTC }) {
    const tasksDB = await db.getTasksDB();

    // 1: Fail safe, only add alerts that have not passed already
    if (new Date(duedateInUTC).getTime() < new Date().getTime()) {
        return;
    }

    // 2: Fail safe, only add alerts that are not added already
    // Check if there is an alert already for this user and reminder for this time.
    // If there is, do not add another alert.
    const { rows: existingAlerts } = await tasksDB.query(
        `SELECT * FROM btw.alerts WHERE user_id = $1 AND reminder_id = $2 AND duedate = $3`,
        [user_id, reminder_id, new Date(duedateInUTC)]
    );

    if (existingAlerts.length > 0) {
        return;
    }

    try {
        const { rows } = await tasksDB.query(
            `INSERT INTO btw.alerts (reminder_id, user_id, duedate) VALUES ($1, $2, $3) RETURNING *`,
            [reminder_id, user_id, new Date(duedateInUTC)]
        );

        if (rows.length > 0) {
            alertsQueue.add(
                "reminder-alert",
                {
                    ...rows[0],
                },
                {
                    delay:
                        new Date(duedateInUTC).getTime() - new Date().getTime(),
                    jobId: `${rows[0].id}`,
                }
            );
        }

        return rows[0];
    } catch (err) {
        console.log(err);
    }
}

async function addAlertsToDB({ alerts, user_id, timezoneOffsetInSeconds }) {
    let alertsAdded = [];

    try {
        const tasksDB = await db.getTasksDB();

        for (var i = 0; i < alerts.length; i++) {
            alertsAdded.push(
                await addAlertToDb({
                    user_id: alerts[i].user_id || user_id,
                    reminder_id: alerts[i].reminder_id || alerts[i].id,
                    duedateInUTC: alerts[i].duedate,
                })
            );
        }
    } catch (err) {}

    return alertsAdded;
}

async function deleteAlertsFromDB({ alerts, user_id }) {
    let remindersForWhichAlertsWereDeleted = [];

    try {
        const tasksDB = await db.getTasksDB();

        for (var i = 0; i < alerts.length; i++) {
            const { rows } = await tasksDB.query(
                `DELETE FROM btw.alerts WHERE user_id = $1 AND id = $2 RETURNING *`,
                [alerts[i].user_id || user_id, alerts[i].id]
            );

            if (rows.length > 0) {
                remindersForWhichAlertsWereDeleted.push(rows[0]);
            }

            // Delete the alert from the queue
            try {
                const job = await alertsQueue.getJob(`${alerts[i].id}`);
                if (job) {
                    await job.remove();
                }
            } catch (err) {}
        }
    } catch (err) {
        console.log(err);
    }

    return remindersForWhichAlertsWereDeleted;
}

async function deleteRemindersFromDB({ reminders, user_id }) {
    let deletedReminders = [];

    try {
        const tasksDB = await db.getTasksDB();

        for (var i = 0; i < reminders.length; i++) {
            const { rows } = await tasksDB.query(
                `DELETE FROM btw.reminders WHERE user_id = $1 AND id = $2 RETURNING *`,
                [reminders[i].user_id || user_id, reminders[i].id]
            );

            if (rows.length > 0) {
                deletedReminders.push(rows[0]);

                // Delete the alerts of this reminder
                const { rows: alerts } = await tasksDB.query(
                    `DELETE FROM btw.alerts WHERE user_id = $1 AND reminder_id = $2 RETURNING *`,
                    [reminders[i].user_id || user_id, reminders[i].id]
                );

                // remove the reminder-alert jobs from the queue
                for (var j = 0; j < alerts.length; j++) {
                    const alert = alerts[j];
                    try {
                        const job = await alertsQueue.getJob(`${alert.id}`);
                        if (job) {
                            await job.remove();
                        }
                    } catch (err) {}
                }
            }
        }
    } catch (err) {}

    return deletedReminders;
}

async function completeRemindersInDB({ reminders, user_id }) {
    let completedReminders = [];

    try {
        const tasksDB = await db.getTasksDB();

        for (var i = 0; i < reminders.length; i++) {
            const { rows } = await tasksDB.query(
                `UPDATE btw.reminders SET completed = $1 WHERE user_id = $2 AND id = $3 RETURNING *`,
                [
                    !!reminders[i].completed,
                    reminders[i].user_id || user_id,
                    reminders[i].id,
                ]
            );

            if (rows.length > 0) {
                completedReminders.push(rows[0]);
            }
        }
    } catch (err) {}

    return completedReminders;
}

async function editReminderTextsInDB({ reminders, user_id }) {
    let remindersEdited = [];

    try {
        const tasksDB = await db.getTasksDB();

        for (var i = 0; i < reminders.length; i++) {
            const { rows: updatedReminders } = await tasksDB.query(
                `UPDATE btw.reminders SET text = $1 WHERE user_id = $2 AND id = $3 RETURNING *`,
                [
                    reminders[i].text,
                    reminders[i].user_id || user_id,
                    reminders[i].id,
                ]
            );

            if (updatedReminders.length > 0) {
                remindersEdited.push(updatedReminders[0]);
            }
        }
    } catch (err) {}

    return remindersEdited;
}

async function addRemindersToDB({
    reminders,
    user_id,
    timezoneOffsetInSeconds,
}) {
    console.log("CHECK THIS", reminders);
    let remindersAdded = [];

    try {
        const tasksDB = await db.getTasksDB();

        for (var i = 0; i < reminders.length; i++) {
            const reminder = reminders[i];

            const alerts = reminder.alerts || [];

            let addedReminder = {};

            const { rows: addedReminders } = await tasksDB.query(
                `INSERT INTO btw.reminders (id, user_id, text, duedate, completed, created_at, updated_at, recurring, crontab) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
                [
                    reminder.id,
                    reminder.user_id || user_id,
                    reminder.text,
                    new Date(reminder.duedate),
                    !!reminder.completed,
                    new Date(),
                    new Date(),
                    !!reminder.recurring,
                    reminder.crontab || "",
                ]
            );

            if (addedReminders.length > 0) {
                addedReminder = addedReminders[0];

                for (var j = 0; j < alerts.length; j++) {
                    const alertRow = await addAlertToDb({
                        user_id: reminder.user_id || user_id,
                        reminder_id: reminder.id,
                        duedateInUTC: alerts[j],
                    });

                    addedReminder.alerts = [
                        ...(addedReminder.alerts || []),
                        ...(alertRow ? [alertRow] : []),
                    ];
                }

                remindersAdded.push(addedReminder);
            }
        }
    } catch (err) {
        console.log(err);
    }

    console.log("CHECK THIS", remindersAdded);

    return remindersAdded;
}

async function fetchDBUnitsMain({ dbUnits, user_id }) {
    let allReminderIds = {};
    let allAlertIds = {};

    for (var i = 0; i < dbUnits.length; i++) {
        var dbUnit = dbUnits[i];

        const { table, units } = dbUnit;

        if (table === "reminder") {
            units.forEach((unit) => {
                allReminderIds[unit.user_id || user_id] =
                    allReminderIds[unit.user_id || user_id] || {};
                allReminderIds[unit.user_id || user_id][
                    unit.reminder_id
                ] = true;
            });

            units.forEach((unit) => {
                const { alertUnits } = unit;
                alertUnits.forEach((alertId) => {
                    allAlertIds[unit.user_id || user_id] =
                        allAlertIds[unit.user_id || user_id] || {};
                    allAlertIds[unit.user_id || user_id][alertId] = true;
                });
            });
        }
    }

    let reminders = [];

    for (var i = 0; i < Object.keys(allReminderIds).length; i++) {
        const userId = Object.keys(allReminderIds)[i];
        const remindersForUser = await getRemindersFromIds({
            reminderIds: Object.keys(allReminderIds[userId]),
            user_id: userId,
        });
        reminders = [...reminders, ...remindersForUser];
    }

    let alerts = [];

    for (var i = 0; i < Object.keys(allAlertIds).length; i++) {
        const userId = Object.keys(allAlertIds)[i];
        const alertsForUser = await getAlertsFromIds({
            alertIds: Object.keys(allAlertIds[userId]),
            user_id: userId,
        });
        alerts = [...alerts, ...alertsForUser];
    }

    let groupedUnits = {};

    // now put things back together
    for (var i = 0; i < dbUnits.length; i++) {
        var dbUnit = dbUnits[i];
        const { groupId, table, units } = dbUnit;

        if (table === "reminder") {
            let newUnits = units
                .map(({ reminder_id, alertUnits, user_id }) => {
                    let newRem = reminders.filter(
                        (x) => x.id === reminder_id && x.user_id === user_id
                    );
                    let newAlerts = alertUnits
                        .map((alertId) => {
                            const alert = alerts.filter(
                                (x) => x.id === alertId && x.user_id === user_id
                            );
                            return alert.length > 0 ? alert[0] : null;
                        })
                        .filter((x) => x);
                    if (newRem && newRem.length > 0) {
                        newRem = newRem[0];
                        newRem.alerts = newAlerts;
                        return newRem;
                    }
                })
                .filter((x) => x);

            groupedUnits[groupId] = groupedUnits[groupId] || [];
            groupedUnits[groupId] = [
                ...groupedUnits[groupId],
                ...newUnits.map((x) => ({ type: "reminder", unit: x })),
            ];
        }
    }

    return groupedUnits;
}

async function getRemindersFromIds({ reminderIds, user_id }) {
    const tasksDB = await db.getTasksDB();

    const { rows: reminders } = await tasksDB.query(
        `SELECT * FROM btw.reminders WHERE id = ANY($1) AND user_id = $2`,
        [reminderIds, user_id]
    );

    return reminders;
}

async function getAlertsFromIds({ alertIds, user_id }) {
    const tasksDB = await db.getTasksDB();

    const { rows: alerts } = await tasksDB.query(
        `SELECT * FROM btw.alerts WHERE id = ANY($1) AND user_id = $2`,
        [alertIds, user_id]
    );

    return alerts;
}

async function getRemindersFromIds({ reminderIds, user_id }) {
    const tasksDB = await db.getTasksDB();

    const { rows: reminders } = await tasksDB.query(
        `SELECT * FROM btw.reminders WHERE id = ANY($1) AND user_id = $2`,
        [reminderIds, user_id]
    );

    return reminders;
}

async function getAlertsFromIds({ alertIds, user_id }) {
    const tasksDB = await db.getTasksDB();

    const { rows: alerts } = await tasksDB.query(
        `SELECT * FROM btw.alerts WHERE id = ANY($1) AND user_id = $2`,
        [alertIds, user_id]
    );

    return alerts;
}

async function getReminderFromId({ reminder_id, user_id }) {
    const tasksDB = await db.getTasksDB();

    const { rows: reminders } = await tasksDB.query(
        `SELECT * FROM btw.reminders WHERE id = $1 AND user_id = $2`,
        [reminder_id, user_id]
    );

    return reminders && reminders.length && reminders[0];
}

async function getAlertFromId({ alert_id, user_id }) {
    const tasksDB = await db.getTasksDB();

    const { rows: alerts } = await tasksDB.query(
        `SELECT * FROM btw.alerts WHERE id = $1 AND user_id = $2`,
        [alert_id, user_id]
    );

    return alerts && alerts.length && alerts[0];
}

module.exports = {
    addRemindersToDB,
    aiProcessingWrapper,
    addAlertToDb,
    markReminderAsComplete,
    addNewAlertsForRecurringReminders,
    deleteReminderCompletely,
    getReminderFromId,
    getAlertFromId,
};
