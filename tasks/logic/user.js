const db = require("../services/db");

const { v4: uuidv4 } = require("uuid");

const { baseQueue } = require("../services/queue");
const { customDomainSetupEmail } = require("../logic/email");

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

baseQueue.process("removeOldLoginTokens", async (job, done) => {
    const tasksDB = await db.getTasksDB();

    // remove all otps that are older than 30 days
    await tasksDB.query(
        `DELETE FROM btw.login_token WHERE created_at < NOW() - INTERVAL '30 days'`
    );

    done();
});

// function to get users
async function getUserFromToken({ token, fingerprint }) {
    const tasksDB = await db.getTasksDB();

    if (
        !Number(process.env.TURN_OFF_SINGLE_USER_MODE) &&
        !process.env.ADMIN_OTP
    ) {
        const client = await tasksDB.connect();
        // Single user mode and admin otp is not set. so we return admin user always
        const { rows } = await client.query(
            `SELECT * FROM btw.users WHERE email = $1`,
            [process.env.ADMIN_EMAIL]
        );

        client.release();

        if (rows.length > 0) {
            return rows[0];
        }

        return null;
    }

    if (!token) return null;
    if (!fingerprint) return null;

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

async function doesLoginTokenExist({ token, fingerprint }) {
    const tasksDB = await db.getTasksDB();

    const { rows } = await tasksDB.query(
        `SELECT * FROM btw.login_token WHERE uuid = $1 AND fingerprint = $2`,
        [token, fingerprint]
    );

    return rows.length > 0;
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
async function createUser({ email, slug }) {
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
            `INSERT INTO btw.users (email, processed_email, created_at, slug) VALUES ($1, $2, $3, $4)`,
            [
                email,
                email.toLowerCase().split(".").join(""),
                new Date(),
                slug || null,
            ]
        );
    }

    client.release();
}

async function setUserDetails({
    name,
    slug,
    bio,
    pic,
    twitter,
    instagram,
    linkedin,
    user_id,
}) {
    const tasksDB = await db.getTasksDB();

    console.log(
        "setUserDetails",
        name,
        slug,
        user_id,
        bio,
        pic,
        twitter,
        instagram,
        linkedin
    );

    if (!slug) {
        slug = null;
    }

    if (slug) {
        if (
            !Number(process.env.TURN_OFF_SINGLE_USER_MODE) &&
            process.env.ADMIN_SLUG
        ) {
            // single user mode. only one slug allowed
            if (slug != process.env.ADMIN_SLUG) {
                return {
                    success: false,
                    error: "Can't change slug in this instance. Sign up for an account on app.btw.so",
                };
            }
        }

        // check that the slug is unique
        const { rows } = await tasksDB.query(
            `SELECT * FROM btw.users WHERE slug = $1 AND id <> $2`,
            [slug, user_id]
        );

        if (rows.length > 0) {
            return {
                success: false,
                error: "Slug is not unique",
            };
        }
    }

    try {
        await tasksDB.query(
            `UPDATE btw.users SET name = $1, slug = $2, bio = $3, pic = $4, twitter = $5, linkedin = $6, instagram = $7 WHERE id = $8`,
            [name, slug, bio, pic, twitter, linkedin, instagram, user_id]
        );

        return {
            success: true,
        };
    } catch (e) {
        console.log(e);
        return {
            success: false,
            error: e.message,
        };
    }
}

async function getDomains({ user_id }) {
    const tasksDB = await db.getTasksDB();

    try {
        const { rows } = await tasksDB.query(
            `SELECT * FROM btw.custom_domains WHERE user_id = $1`,
            [user_id]
        );

        return {
            success: true,
            domains: rows,
        };
    } catch (e) {
        console.log(e);
        return {
            success: false,
            error: e,
        };
    }
}

/*
    TODO: (SG) Adding domain has to be synced with Cloudflare APIs
    we should maintain the verification process + verification done/not done flag in DB
*/
async function addUserDomain({ domain, user_id }) {
    const tasksDB = await db.getTasksDB();

    try {
        await tasksDB.query(
            `INSERT INTO btw.custom_domains (domain, user_id) VALUES ($1, $2)`,
            [domain, user_id]
        );

        // get user email
        const { rows: users } = await tasksDB.query(
            `SELECT * FROM btw.users WHERE id = $1`,
            [user_id]
        );

        if (users.length > 0) {
            const user = users[0];

            customDomainSetupEmail({
                email: user.email,
                domain,
            });
        }

        return {
            success: true,
        };
    } catch (e) {
        console.log(e);
        return {
            success: false,
            error: e,
        };
    }
}

module.exports = {
    getUserFromToken,
    createLoginToken,
    doesLoginTokenExist,
    createUser,
    setUserDetails,
    addUserDomain,
    getDomains,
};
