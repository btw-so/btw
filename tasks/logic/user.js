const db = require("../services/db");

const { v4: uuidv4 } = require("uuid");

const { baseQueue } = require("../services/queue");
const { customDomainSetupEmail } = require("../logic/email");
const axios = require("axios");
const hri = require("human-readable-ids").hri;

// do a POST request to process.env.PUBLISHER_SERVER_URL with user_id of the note
// to the url /internal/cache/refresh/notes
// this will refresh the cache for the user
const userCacheHelper = (user_id) => {
    console.log("refreshing cache for user", user_id);
    const publisherServerUrl = process.env.PUBLISHER_SERVER_URL;
    if (publisherServerUrl) {
        try {
            const publisherServerRefreshUrl = `http${
                !!Number(process.env.HTTPS_DOMAIN) ? "s" : ""
            }://${publisherServerUrl}/internal/cache/refresh/user`;
            const publisherServerRefreshResponse = axios.post(
                publisherServerRefreshUrl,
                {
                    user_id,
                }
            );
        } catch (e) {
            console.log("error in refreshing cache", e);
        }
    }
};

// add a job that runs every 24 hours for all existing users
// if umami_site_id exists, upsert the website name, domain of this site id
// ^ do the same for custom_domains
baseQueue.add(
    "upsertUmamiSiteId",
    {},
    {
        repeat: {
            every: 24 * 60 * 60 * 1000,
        },
    }
);

baseQueue.process("upsertUmamiSiteId", async (job, done) => {
    // schedule a child job for every user
    const tasksDB = await db.getTasksDB();

    const { rows: users } = await tasksDB.query(
        `SELECT id, name, slug, share_id, umami_site_id FROM btw.users WHERE umami_site_id IS NOT NULL AND slug IS NOT NULL`
    );

    for (let i = 0; i < users.length; i++) {
        let domain = `${users[i].slug}.${process.env.ROOT_DOMAIN}`;
        let umami_site_id = users[i].umami_site_id;
        let name = users[i].name || `Blog - ${users[i].slug}`;
        let share_id = users[i].share_id;

        if (umami_site_id) {
            // upsert the website name, domain of this site id
            baseQueue.add(
                "upsertUmamiSiteIdForUser",
                {
                    domain,
                    umami_site_id,
                    name,
                    share_id,
                },
                {
                    removeOnComplete: true,
                    removeOnFail: true,
                }
            );
        }
    }

    // get entries from custom_domains table
    const { rows: custom_domains } = await tasksDB.query(
        `SELECT domain, btw.custom_domains.share_id, btw.custom_domains.umami_site_id, btw.users.name FROM btw.custom_domains LEFT JOIN btw.users ON btw.custom_domains.user_id = btw.users.id WHERE btw.custom_domains.umami_site_id IS NOT NULL`
    );

    for (let i = 0; i < custom_domains.length; i++) {
        let domain = custom_domains[i].domain;
        let umami_site_id = custom_domains[i].umami_site_id;
        let share_id = custom_domains[i].share_id;
        let name = custom_domains[i].name || `Blog - ${custom_domains[i].id}`;

        if (umami_site_id) {
            // upsert the website name, domain of this site id
            baseQueue.add(
                "upsertUmamiSiteIdForUser",
                {
                    domain,
                    umami_site_id,
                    share_id,
                    name,
                },
                {
                    removeOnComplete: true,
                    removeOnFail: true,
                }
            );
        }
    }

    done();
});

baseQueue.process("upsertUmamiSiteIdForUser", async (job, done) => {
    let { domain, umami_site_id, name, share_id } = job.data;

    // check that UMAMI_SOURCE AND UMAMI_TOKEN are available in process.env
    if (!process.env.UMAMI_SOURCE || !process.env.UMAMI_TOKEN) {
        console.log("UMAMI_SOURCE or UMAMI_TOKEN not set");
        done();
        return;
    }

    // DO A POST request to UMAMI_SOURCE on POST /api/websites/{websiteId}
    // with body { domain, name, shareId }

    try {
        const response = await axios.post(
            `${process.env.UMAMI_SOURCE}/api/websites/${umami_site_id}`,
            {
                domain,
                name,
                shareId: share_id,
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.UMAMI_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );
    } catch (e) {
        console.log(e);
    }

    done();
});

// add a job that runs every 1 hour. checks if there is no umami_site_id for a user. if not, create one
baseQueue.add(
    "createUmamiSiteId",
    {},
    {
        repeat: {
            every: 60 * 60 * 1000,
        },
    }
);

baseQueue.add(
    "createUmamiShareId",
    {},
    {
        repeat: {
            every: 60 * 60 * 1000,
        },
    }
);

baseQueue.process("createUmamiShareId", async (job, done) => {
    // schedule a child job for every user
    // for whom siteid exists but share id is null
    const tasksDB = await db.getTasksDB();

    const { rows: users } = await tasksDB.query(
        `SELECT id, name, slug, umami_site_id FROM btw.users WHERE umami_site_id IS NOT NULL AND slug IS NOT NULL AND share_id IS NULL`
    );

    for (let i = 0; i < users.length; i++) {
        let domain = `${users[i].slug}.${process.env.ROOT_DOMAIN}`;
        let name = users[i].name || `Blog - ${users[i].slug}`;
        let id = users[i].id;
        umami_site_id = users[i].umami_site_id;
        let share_id = hri.random();
        share_id = share_id.replace(/-\d+$/, `-0${id}`);

        // update this data in sql table
        await tasksDB.query(
            `UPDATE btw.users SET share_id = $1 WHERE id = $2`,
            [share_id, id]
        );

        // upsert the website name, domain of this site id
        baseQueue.add(
            "upsertUmamiSiteIdForUser",
            {
                domain,
                umami_site_id,
                name,
                share_id,
            },
            {
                removeOnComplete: true,
                removeOnFail: true,
            }
        );
    }

    // now for custom domains
    const { rows: custom_domains } = await tasksDB.query(
        `SELECT domain, btw.custom_domains.umami_site_id, btw.custom_domains.id, btw.custom_domains.share_id, btw.users.name FROM btw.custom_domains LEFT JOIN btw.users ON btw.custom_domains.user_id = btw.users.id WHERE btw.custom_domains.umami_site_id IS NOT NULL AND btw.custom_domains.share_id IS NULL`
    );

    for (let i = 0; i < custom_domains.length; i++) {
        let domain = custom_domains[i].domain;
        let name = custom_domains[i].name || `Blog - ${custom_domains[i].id}`;
        let id = custom_domains[i].id;
        let share_id = hri.random();
        share_id = share_id.replace(/-\d+$/, `-1${id}`);
        let umami_site_id = custom_domains[i].umami_site_id;

        // update this data in sql table
        await tasksDB.query(
            `UPDATE btw.custom_domains SET share_id = $1 WHERE id = $2`,
            [share_id, id]
        );

        // upsert the website name, domain of this site id
        baseQueue.add(
            "upsertUmamiSiteIdForUser",
            {
                domain,
                umami_site_id,
                name,
                share_id,
            },
            {
                removeOnComplete: true,
                removeOnFail: true,
            }
        );
    }

    done();
});

baseQueue.process("createUmamiSiteId", async (job, done) => {
    // schedule a child job for every user
    const tasksDB = await db.getTasksDB();

    const { rows: users } = await tasksDB.query(
        `SELECT id, name, slug, umami_site_id FROM btw.users WHERE umami_site_id IS NULL AND slug IS NOT NULL`
    );

    for (let i = 0; i < users.length; i++) {
        let domain = `${users[i].slug}.${process.env.ROOT_DOMAIN}`;
        let name = users[i].name || `Blog - ${users[i].slug}`;
        let id = users[i].id;

        // create a new site id
        baseQueue.add(
            "createUmamiSiteIdForUser",
            {
                domain,
                name,
                id,
                type: "user",
            },
            {
                removeOnComplete: true,
                removeOnFail: true,
            }
        );
    }

    // now for custom domains
    const { rows: custom_domains } = await tasksDB.query(
        `SELECT domain, btw.custom_domains.id, btw.custom_domains.share_id, btw.users.name FROM btw.custom_domains LEFT JOIN btw.users ON btw.custom_domains.user_id = btw.users.id WHERE btw.custom_domains.umami_site_id IS NULL`
    );

    for (let i = 0; i < custom_domains.length; i++) {
        let domain = custom_domains[i].domain;
        let name = custom_domains[i].name || `Blog - ${custom_domains[i].id}`;
        let id = custom_domains[i].id;

        // create a new site id
        baseQueue.add(
            "createUmamiSiteIdForUser",
            {
                domain,
                name,
                id,
                type: "custom_domain",
            },
            {
                removeOnComplete: true,
                removeOnFail: true,
            }
        );
    }

    done();
});

baseQueue.process("createUmamiSiteIdForUser", async (job, done) => {
    const { domain, name, id, type } = job.data;

    // check that UMAMI_SOURCE AND UMAMI_TOKEN are available in process.env
    if (!process.env.UMAMI_SOURCE || !process.env.UMAMI_TOKEN) {
        console.log("UMAMI_SOURCE or UMAMI_TOKEN not set");
        done();
        return;
    }

    // DO A POST request to UMAMI_SOURCE on POST /api/websites
    // with body { domain, name }
    // create share_id using hri
    // const share_id = hri.random() + "-" + id;
    let share_id = hri.random();
    // ^ this gives something of the form <some words separated by hyphen>-<some number>
    // replace the number with user id
    share_id = share_id.replace(
        /-\d+$/,
        `-${type === "custom_domain" ? "1" : "0"}${id}`
    );

    try {
        const response = await axios.post(
            `${process.env.UMAMI_SOURCE}/api/websites`,
            {
                domain,
                name,
                shareId: share_id,
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.UMAMI_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        // update the umami_site_id and share_id in btw.users
        const tasksDB = await db.getTasksDB();

        if (type == "user") {
            await tasksDB.query(
                `UPDATE btw.users SET umami_site_id = $1, share_id = $2 WHERE id = $3`,
                [response.data.id, share_id, id]
            );
        } else {
            await tasksDB.query(
                `UPDATE btw.custom_domains SET umami_site_id = $1, share_id = $2 WHERE id = $3`,
                [response.data.id, share_id, id]
            );
        }
    } catch (e) {
        console.log(e);
    }

    done();
});

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

async function getUserFromId({ user_id }) {
    const tasksDB = await db.getTasksDB();

    const { rows } = await tasksDB.query(
        `SELECT * FROM btw.users WHERE id = $1`,
        [user_id]
    );

    return rows.length > 0 ? rows[0] : null;
}

// function to get users
async function getUserFromToken({ token, fingerprint }) {
    const tasksDB = await db.getTasksDB();

    if (
        !Number(process.env.TURN_OFF_SINGLE_USER_MODE) &&
        !process.env.ADMIN_OTP
    ) {
        // Single user mode and admin otp is not set. so we return admin user always
        const { rows } = await tasksDB.query(
            `SELECT * FROM btw.users WHERE email = $1`,
            [process.env.ADMIN_EMAIL.split(",")[0]]
        );

        if (rows.length > 0) {
            return rows[0];
        }

        return null;
    }

    if (!token) return null;
    if (!fingerprint) return null;

    const { rows } = await tasksDB.query(
        `SELECT * FROM btw.login_token WHERE uuid = $1`,
        [token]
    );

    if (rows.length > 0) {
        const loginTokens = rows[0];

        if (fingerprint && fingerprint == loginTokens.fingerprint) {
            // get the user of this login token
            const { rows: users } = await tasksDB.query(
                `SELECT * FROM btw.users WHERE id = $1`,
                [loginTokens.user_id]
            );

            if (users.length > 0) {
                return users[0];
            } else {
                // delete the token from DB
                await tasksDB.query(
                    `DELETE FROM btw.login_token WHERE uuid = $1`,
                    [token]
                );

                return null;
            }
        } else {
            // delete the token from DB
            await tasksDB.query(`DELETE FROM btw.login_token WHERE uuid = $1`, [
                token,
            ]);

            return null;
        }
    } else {
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

    if (!email) {
        return {
            success: false,
            error: "Email is required",
        };
    }

    // check if user already exists
    const { rows } = await tasksDB.query(
        `SELECT * FROM btw.users WHERE processed_email = $1`,
        [(email || "").toLowerCase().split(".").join("")]
    );

    if (rows.length == 0) {
        // create user
        const { rows: nRows } = await tasksDB.query(
            `INSERT INTO btw.users (email, processed_email, created_at, slug) VALUES ($1, $2, $3, $4) RETURNING *`,
            [
                email,
                email.toLowerCase().split(".").join(""),
                new Date(),
                slug || null,
            ]
        );

        return {
            userId: nRows[0].id,
            newUser: true,
        };
    } else {
        return {
            userId: rows[0].id,
            newUser: false,
        };
    }
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
    settings,
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
        linkedin,
        settings
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
            `UPDATE btw.users SET name = $1, slug = $2, bio = $3, pic = $4, twitter = $5, linkedin = $6, instagram = $7, settings = $8 WHERE id = $9`,
            [
                name,
                slug,
                bio,
                pic,
                twitter,
                linkedin,
                instagram,
                settings,
                user_id,
            ]
        );

        userCacheHelper(user_id);

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

async function setUserName({ user_id, name }) {
    const tasksDB = await db.getTasksDB();

    try {
        await tasksDB.query(`UPDATE btw.users SET name = $1 WHERE id = $2`, [
            name,
            user_id,
        ]);

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

async function setUserTimezone({ user_id, timezone, timezoneOffsetInSeconds }) {
    const tasksDB = await db.getTasksDB();

    // get settings
    const { rows } = await tasksDB.query(
        `SELECT settings FROM btw.users WHERE id = $1`,
        [user_id]
    );

    let settings = rows[0].settings || {};

    settings.timezone = timezone;
    settings.timezoneOffsetInSeconds = timezoneOffsetInSeconds;

    await tasksDB.query(`UPDATE btw.users SET settings = $1 WHERE id = $2`, [
        settings,
        user_id,
    ]);
}

async function setUserPhone({ user_id, phone }) {
    const tasksDB = await db.getTasksDB();

    // get settings
    const { rows } = await tasksDB.query(
        `SELECT settings FROM btw.users WHERE id = $1`,
        [user_id]
    );

    let settings = rows[0].settings || {};

    settings.phone = phone;

    await tasksDB.query(`UPDATE btw.users SET settings = $1 WHERE id = $2`, [
        settings,
        user_id,
    ]);
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
            `INSERT INTO btw.custom_domains (domain, user_id) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET domain = EXCLUDED.domain`,
            [domain || "", user_id]
        );

        // get user email
        const { rows: users } = await tasksDB.query(
            `SELECT * FROM btw.users WHERE id = $1`,
            [user_id]
        );

        if (users.length > 0 && domain) {
            const user = users[0];

            customDomainSetupEmail({
                email: user.email,
                domain,
            });
        }

        userCacheHelper(user_id);

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

async function deleteLoginToken({ token, fingerprint }) {
    const tasksDB = await db.getTasksDB();
    await tasksDB.query(
        `DELETE FROM btw.login_token WHERE uuid = $1 AND fingerprint = $2`,
        [token, fingerprint]
    );
}

async function areFamily({ id1, id2 }) {
    // if id2 is < id1, swap them
    if (id2 < id1) {
        const temp = id1;
        id1 = id2;
        id2 = temp;
    }

    // check in family_users db if id1 column = id1 and id2 column = id2 entry exists or not
    const tasksDB = await db.getTasksDB();
    const { rows } = await tasksDB.query(
        `SELECT * FROM btw.family_users WHERE id1 = $1 AND id2 = $2`,
        [id1, id2]
    );

    return rows.length > 0;
}

async function addFamily({ id1, id2 }) {
    // if id2 is < id1, swap them
    if (id2 < id1) {
        const temp = id1;
        id1 = id2;
        id2 = temp;
    }

    const alreadyFamily = await areFamily({ id1, id2 });

    if (!alreadyFamily) {
        // insert into family_users
        const tasksDB = await db.getTasksDB();
        await tasksDB.query(
            `INSERT INTO btw.family_users (id1, id2) VALUES ($1, $2)`,
            [id1, id2]
        );
    }
}

async function getFamilyUsers({ id }) {
    const tasksDB = await db.getTasksDB();
    const { rows } = await tasksDB.query(
        `SELECT * FROM btw.family_users WHERE id1 = $1 OR id2 = $1`,
        [id]
    );

    let familyUsers = [];

    for (var i = 0; i < rows.length; i++) {
        if (rows[i].id1 == id) {
            familyUsers.push(rows[i].id2);
        } else {
            familyUsers.push(rows[i].id1);
        }
    }

    // get all user details of family users and send them
    const users = [];

    for (var i = 0; i < familyUsers.length; i++) {
        const user = await getUserFromId({ user_id: familyUsers[i] });
        users.push(user);
    }

    return users;
}

async function getUserByPhone({ phone }) {
    const tasksDB = await db.getTasksDB();
    const { rows } = await tasksDB.query(
        `SELECT * FROM btw.users WHERE settings->>'phone' = $1`,
        [phone]
    );

    return rows.length > 0 ? rows[0] : null;
}

async function generateFamilyInviteEntry({
    requester_user_id,
    requested_family_number,
    requested_user_id,
}) {
    const tasksDB = await db.getTasksDB();

    // insert into family_invites
    await tasksDB.query(
        `INSERT INTO btw.family_invites (requester_user_id, requested_family_number, requested_user_id, created_on, notified) VALUES ($1, $2, $3, $4, $5)`,
        [
            requester_user_id,
            requested_family_number,
            requested_user_id,
            new Date(),
            false,
        ]
    );
}

module.exports = {
    getUserFromToken,
    createLoginToken,
    doesLoginTokenExist,
    createUser,
    setUserDetails,
    addUserDomain,
    getDomains,
    deleteLoginToken,
    getUserFromId,
    areFamily,
    addFamily,
    getFamilyUsers,
    getUserByPhone,
    generateFamilyInviteEntry,
    setUserName,
    setUserTimezone,
    setUserPhone,
};
