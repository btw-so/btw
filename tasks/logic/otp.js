const db = require("../services/db");

const { baseQueue } = require("../services/queue");

// add a job that runs every 2 hours and removed old otps
baseQueue.add(
    "removeOldOTPs",
    {},
    {
        repeat: {
            every: 2 * 60 * 60 * 1000,
        },
    }
);

baseQueue.process("removeOldOTPs", async () => {
    const tasksDB = await db.getTasksDB();
    const client = await tasksDB.connect();

    // remove all otps that are older than 2 hours
    await client.query(
        `DELETE FROM btw.otp WHERE created_at < NOW() - INTERVAL '120 minutes'`
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
    const client = await tasksDB.connect();

    // check if there is an OTP for this email id that is already present in DB
    const { rows } = await client.query(
        `SELECT * FROM btw.otp WHERE processed_email = $1`,
        [(email || "").toLowerCase().split(".").join("")]
    );

    if (rows.length > 0) {
        client.release();
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
            `INSERT INTO btw.otp (otp, email, processed_email, created_at) VALUES ($1, $2, $3, $4)`,
            [
                newOTP,
                email,
                (email || "").toLowerCase().split(".").join(""),
                new Date(),
            ]
        );

        client.release();

        return newOTP;
    }
}

async function validateOTP({ email, otp }) {
    const tasksDB = await db.getTasksDB();
    const client = await tasksDB.connect();

    // check if there is an OTP for this email id that is already present in DB
    const { rows } = await client.query(
        `SELECT * FROM btw.otp WHERE processed_email = $1 AND otp = $2`,
        [(email || "").toLowerCase().split(".").join(""), otp]
    );

    client.release();

    if (rows.length > 0) {
        return true;
    } else {
        return false;
    }
}

async function deleteOTP({ email }) {
    const tasksDB = await db.getTasksDB();
    const client = await tasksDB.connect();

    // delete the OTP for this email id
    await client.query(`DELETE FROM btw.otp WHERE processed_email = $1`, [
        (email || "").toLowerCase().split(".").join(""),
    ]);

    client.release();

    return true;
}

module.exports = {
    generateOTP,
    validateOTP,
    deleteOTP,
};
