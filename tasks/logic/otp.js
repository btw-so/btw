const db = require("../services/db");

const { baseQueue } = require("../services/queue");

// add a job that runs every 10 mins and removed old otps
baseQueue.add(
    "removeOldOTPs",
    {},
    {
        repeat: {
            every: 10 * 60 * 1000,
        },
    }
);

baseQueue.process("removeOldOTPs", async () => {
    const tasksDB = await db.getTasksDB();

    // remove all otps that are older than 10 mins
    await tasksDB.query(
        `DELETE FROM btw.otp WHERE created_at < NOW() - INTERVAL '10 minutes'`
    );
});

// generate random 6 digit OTP
function uniqueOTP() {
    const digits = "0123456789";
    let OTP = "";

    for (let i = 0; i < 6; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }

    return OTP;
}

async function generateOTP({ email }) {
    const tasksDB = await db.getTasksDB();

    // check if there is an OTP for this email id that is already present in DB
    const { rows } = await tasksDB.query(
        `SELECT * FROM btw.otp WHERE processed_email = $1`,
        [(email || "").split(".").join("")]
    );

    if (rows.length > 0) {
        return rows[0].otp;
    } else {
        // generate a new OTP until the newly generated OTP is not present in DB
        let newOTP = uniqueOTP();
        while (true) {
            const { rows } = await tasksDB.query(
                `SELECT * FROM btw.otp WHERE otp = $1`,
                [newOTP]
            );

            if (rows.length > 0) {
                newOTP = uniqueOTP();
            } else {
                break;
            }
        }

        // insert the new OTP in DB
        await tasksDB.query(
            `INSERT INTO btw.otp (otp, processed_email) VALUES ($1, $2)`,
            [newOTP, (email || "").split(".").join("")]
        );

        return newOTP;
    }
}

async function validateOTP({ email, otp }) {
    const tasksDB = await db.getTasksDB();

    // check if there is an OTP for this email id that is already present in DB
    const { rows } = await tasksDB.query(
        `SELECT * FROM btw.otp WHERE processed_email = $1 AND otp = $2`,
        [(email || "").split(".").join(""), otp]
    );

    if (rows.length > 0) {
        return true;
    } else {
        return false;
    }
}

module.export = {
    generateOTP,
    validateOTP,
};
