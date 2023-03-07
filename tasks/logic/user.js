const db = require("../services/db");

const { v4: uuidv4 } = require("uuid");

const { baseQueue } = require("../services/queue");

// add a job that runs every 2 hours and removed old login tokens
baseQueue.add(
    "removeOldLoginTokens",
    {},
    {
        repeat: {
            every: 2 * 60 * 60 * 1000,
        },
    }
);

baseQueue.process("removeOldLoginTokens", async () => {
    const tasksDB = await db.getTasksDB();
    const client = await tasksDB.connect();

    // remove all otps that are older than 30 days
    await client.query(
        `DELETE FROM btw.login_token WHERE created_at < NOW() - INTERVAL '30 days'`
    );

    client.release();
});

// function to get users
async function getUserFromToken({ token, fingerprint }) {
    if (!token) return null;
    if (!fingerprint) return null;

    const tasksDB = await db.getTasksDB();
    const client = await tasksDB.connect();

    const { rows } = await client.query(
        `SELECT * FROM btw.login_token WHERE uuid = $1`,
        [token]
    );

    if (rows.length > 0) {
        const loginTokens = rows[0];

        if (fingerprint && fingerprint == loginTokens.fingerprint) {
            // get the user of this login token
            const { rows: users } = await client.query(
                `SELECT * FROM btw.users WHERE id = $1`,
                [loginTokens.user_id]
            );

            if (users.length > 0) {
                client.release();
                return users[0];
            } else {
                // delete the token from DB
                await client.query(
                    `DELETE FROM btw.login_token WHERE uuid = $1`,
                    [token]
                );

                client.release();
                return null;
            }
        } else {
            // delete the token from DB
            await client.query(`DELETE FROM btw.login_token WHERE uuid = $1`, [
                token,
            ]);

            client.release();
            return null;
        }
    } else {
        client.release();
        return null;
    }
}

// function to create login token for user
async function createLoginToken({ email, fingerprint, ip_address }) {
    const tasksDB = await db.getTasksDB();
    const client = await tasksDB.connect();

    // get the user
    const { rows: users } = await client.query(
        `SELECT * FROM btw.users WHERE processed_email = $1`,
        [email.toLowerCase().split(".").join("")]
    );

    if (users.length > 0) {
        const user = users[0];

        // create a random uuid token
        const token = uuidv4();

        // insert the token in DB
        await client.query(
            `INSERT INTO btw.login_token (uuid, user_id, ip_address, fingerprint, created_at) VALUES ($1, $2, $3, $4, $5)`,
            [token, user.id, ip_address, fingerprint, new Date()]
        );

        client.release();
        return token;
    } else {
        client.release();
        throw new Error("User does not exist");
    }
}

// function to create user
async function createUser({ email }) {
    const tasksDB = await db.getTasksDB();
    const client = await tasksDB.connect();

    // check if user already exists
    const { rows } = await client.query(
        `SELECT * FROM btw.users WHERE processed_email = $1`,
        [email.toLowerCase().split(".").join("")]
    );

    if (rows.length == 0) {
        // create user
        await client.query(
            `INSERT INTO btw.users (email, processed_email, created_at) VALUES ($1, $2, $3)`,
            [email, email.toLowerCase().split(".").join(""), new Date()]
        );
    }

    client.release();
}

async function setUserDetails({ email, name, slug }) {
    const tasksDB = await db.getTasksDB();
    const client = await tasksDB.connect();

    if (name) {
        // UPSERT name
        await client.query(
            `INSERT INTO btw.users (processed_email, name) VALUES ($1, $2) ON CONFLICT (processed_email) DO UPDATE SET name = $2`,
            [email.toLowerCase().split(".").join(""), name]
        );
    }

    if (slug) {
        // Check if there is already a row with this slug
        const { rows } = await client.query(
            `SELECT * FROM btw.users WHERE slug = $1 and processed_email <> $2`,
            [slug, (email || "").toLowerCase().split(".").join("")]
        );

        if (rows.length > 0) {
            client.release();
            throw new Error("Slug already exists");
        }

        // UPSERT slug
        await client.query(
            `INSERT INTO btw.users (processed_email, slug) VALUES ($1, $2) ON CONFLICT (processed_email) DO UPDATE SET slug = $2`,
            [(email || "").toLowerCase().split(".").join(""), slug]
        );
    }

    client.release();
}

module.exports = {
    getUserFromToken,
    createLoginToken,
    createUser,
    setUserDetails,
};
