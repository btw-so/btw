const db = require("../services/db");
const { baseQueue } = require("../services/queue");
const { v4: uuidv4 } = require("uuid");
const { emailImportComplete } = require("./email");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");
const turndown = require("turndown")();
const axios = require("axios");

// do a POST request to process.env.PUBLISHER_SERVER_URL with user_id of the note
// to the url /internal/cache/refresh/notes
// this will refresh the cache for the user
const noteCacheHelper = (user_id) => {
    console.log("refreshing note cache for user", user_id);
    const publisherServerUrl = process.env.PUBLISHER_SERVER_URL;
    if (publisherServerUrl) {
        try {
            const publisherServerRefreshUrl = `http${
                !!Number(process.env.HTTPS_DOMAIN) ? "s" : ""
            }://${publisherServerUrl}/internal/cache/refresh/notes`;
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

baseQueue.add(
    "updateNoteCache",
    {},
    {
        repeat: {
            every: 10 * 60 * 1000,
        },
    }
);

baseQueue.process("updateNoteCache", async (job, done) => {
    const tasksDB = await db.getTasksDB();

    // get all the notes that are published and are edited in the last 20 minutes
    // for each note, get the user_id
    // call noteCacheHelper with user_id
    const { rows } = await tasksDB.query(
        `SELECT DISTINCT user_id FROM btw.notes WHERE publish = TRUE AND updated_at > NOW() - INTERVAL '20 minutes'`
    );

    for (const row of rows) {
        noteCacheHelper(row.user_id);
        // wait for 5 seconds before calling the next noteCacheHelper
        await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    done();
});

baseQueue.add(
    "htmlToImage",
    {},
    {
        repeat: {
            every: 10 * 60 * 1000,
        },
    }
);

baseQueue.process("htmlToImage", async (job, done) => {
    const tasksDB = await db.getTasksDB();

    // get all the posts with non-empty html and has "<img" portion in its html content
    //  or updated in last 2 hours
    // get the first image in the html
    // set the image in the db for this note
    const { rows } = await tasksDB.query(
        `SELECT * FROM btw.notes WHERE ((html IS NOT NULL AND html <> '' AND html LIKE '%<img%') AND (image IS NULL OR image = '')) OR updated_at > NOW() - INTERVAL '2 hours'`
    );

    for (const row of rows) {
        let image = "";
        // do a simple parse for first <img src=""> tag via regex and get the src
        const match = (row.html || "").match(/<img.*?src="(.*?)"/);
        if (match && match.length > 1) {
            image = match[1];
        }
        await tasksDB.query(`UPDATE btw.notes SET image = $1 WHERE id = $2`, [
            image,
            row.id,
        ]);
    }

    done();
});

// run every 10 minutes
baseQueue.add(
    "htmlToMarkdown",
    {},
    {
        repeat: {
            every: 10 * 60 * 1000,
        },
    }
);

baseQueue.process("htmlToMarkdown", async (job, done) => {
    const tasksDB = await db.getTasksDB();

    // get all the posts with non-empty html or updated in last 2 hours
    // convert each html to markdown
    // update the markdown in the DB
    const { rows } = await tasksDB.query(
        `SELECT id, html FROM btw.notes WHERE ((html IS NOT NULL AND html <> '') AND (md IS NULL OR md = '')) OR updated_at > NOW() - INTERVAL '2 hours'`
    );

    for (const row of rows) {
        let markdown = "";
        try {
            // remove the first <h1> from the html if it is not empty using regex
            // this is because the first <h1> is the title of the note and we don't want that in the markdown

            markdown = turndown.turndown(
                (row.html || "").replace(/<h1.*?>.*?<\/h1>/g, "")
            );
        } catch (e) {
            console.log(e);
        }
        await tasksDB.query(`UPDATE btw.notes SET md = $1 WHERE id = $2`, [
            markdown,
            row.id,
        ]);
    }

    done();
});

// add a job that runs every 2 hours and removes old posts
baseQueue.add(
    "removeOldPosts",
    {},
    {
        repeat: {
            every: 2 * 60 * 60 * 1000,
        },
    }
);

baseQueue.process("removeOldPosts", async (job, done) => {
    // Not starting this job right away since it is key job and we want to make sure that it is working as expected
    // try {
    //     const tasksDB = await db.getTasksDB();

    //     const { rows } = await tasksDB.query(
    //         `SELECT * FROM btw.notes WHERE delete = TRUE and deleted_at < NOW() - INTERVAL '30 days'`
    //     );

    //     for (const row of rows) {
    //         // TODO: (SG) need a better solution for this where we force a user to refresh their notes state
    //         // delete the login tokens for this user so that their notes are refreshed in their UIs.
    //         // or else there is a chance that a new note with deleted note will be created
    //         await tasksDB.query(
    //             `DELETE FROM btw.login_token WHERE user_id = $1`,
    //             [row.user_id]
    //         );
    //     }

    //     // remove all otps that are older than 30 days
    //     await tasksDB.query(
    //         `DELETE FROM btw.notes WHERE delete = TRUE and deleted_at < NOW() - INTERVAL '30 days'`
    //     );
    // } catch (e) {
    //     console.log(e);
    // }

    done();
});

// functions to CRUD on notes
async function getNote({ id, user_id }) {
    const pool = await db.getTasksDB();
    const { rows } = await pool.query(
        `SELECT * FROM btw.notes WHERE id = $1 AND user_id = $2`,
        [id, user_id]
    );

    if (rows.length > 0) {
        return rows[0];
    } else {
        return null;
    }
}

async function upsertNote({ id, user_id, json, html, title: defaultTitle }) {
    const created_at = new Date();
    const updated_at = new Date();

    const hasHTML = typeof html === "string";

    let title = defaultTitle ? defaultTitle : "";
    if (json && !title) {
        try {
            title = json.content[0].content[0].text;
        } catch (e) {
            // console.log(e);
        }
    }

    const pool = await db.getTasksDB();
    let query = `INSERT INTO btw.notes (id, user_id, created_at, updated_at ${
        title ? `,title` : ""
    } ${json ? `,json` : ""} ${
        hasHTML ? `,html` : ""
    } ) VALUES ($1, $2, $3, $4`;

    var nums = (title ? 1 : 0) + (hasHTML ? 1 : 0) + (json ? 1 : 0);
    for (var i = 0; i < nums; i++) {
        query += `,$${i + 5}`;
    }
    var titlenum = title ? 5 : 0;
    var jsonnum = json ? 5 + (title ? 1 : 0) : 0;
    var htmlnum = hasHTML ? 5 + (title && json ? 2 : title || json ? 1 : 0) : 0;

    query += `) ON CONFLICT (id, user_id) DO UPDATE SET ${
        json ? `json = $${jsonnum},` : ""
    } ${hasHTML ? `html = $${htmlnum},` : ""} ${
        title ? `title = $${titlenum},` : ""
    } updated_at = CASE WHEN notes."json"::jsonb @> EXCLUDED.json::jsonb
    OR notes.html <> EXCLUDED.html
    OR notes.title <> EXCLUDED.title
    OR FALSE THEN
    EXCLUDED.updated_at
    ELSE
    notes.updated_at
END`;

    await pool.query(query, [
        id,
        user_id,
        created_at,
        updated_at,
        ...(title ? [title] : []),
        ...(json ? [json] : []),
        ...(hasHTML ? [html.replaceAll("\u0000", "")] : []),
    ]);
}

async function getNotes({ user_id, page, limit, after = 0 }) {
    const pool = await db.getTasksDB();

    // if page is not set, then set it to 1. ensure it is a number
    page = page || 1;
    page = Number(page);
    // if limit is not set or set to > 50, set it to 50
    limit = limit && limit <= 50 ? limit : 50;
    limit = Number(limit);
    after = new Date(after);
    const { rows } = await pool.query(
        `SELECT id, user_id, title, md, created_at, updated_at, published_at, publish, private, slug, ydoc, delete, archive, deleted_at FROM btw.notes WHERE user_id = $1 AND (created_at >=$2 OR updated_at >= $3) AND (tags <> 'list' OR tags IS NULL) ORDER BY updated_at DESC LIMIT $4 OFFSET $5`,
        [user_id, after, after, limit, (page - 1) * limit]
    );

    // get total number of notes
    const { rows: totalRows } = await pool.query(
        `SELECT COUNT(*) as count FROM btw.notes WHERE user_id = $1 AND (created_at >=$2 OR updated_at >= $3) AND (tags <> 'list' OR tags IS NULL)`,
        [user_id, after, after]
    );

    return {
        notes: rows,
        total: Number(totalRows.length > 0 ? totalRows[0].count : 0),
        page,
        limit,
    };
}

async function archiveNote({ user_id, id }) {
    const pool = await db.getTasksDB();

    await pool.query(
        `UPDATE btw.notes SET archive = true, updated_at = $3 WHERE id = $1 AND user_id = $2`,
        [id, user_id, new Date()]
    );

    return {
        success: true,
    };
}

async function unarchiveNote({ user_id, id }) {
    const pool = await db.getTasksDB();

    await pool.query(
        `UPDATE btw.notes SET archive = false, updated_at = $3 WHERE id = $1 AND user_id = $2`,
        [id, user_id, new Date()]
    );

    return {
        success: true,
    };
}

async function deleteNote({ user_id, id }) {
    // delete only if it is not published
    const pool = await db.getTasksDB();

    await pool.query(
        `UPDATE btw.notes SET delete = true, deleted_at = $3, updated_at = $4, archive = false WHERE id = $1 AND user_id = $2`,
        [id, user_id, new Date(), new Date()]
    );

    return {
        success: true,
    };
}

async function undeleteNote({ user_id, id, moveToArchive = false }) {
    // remove delete flag from note and set deleted_at to null and optionally move to archive
    const pool = await db.getTasksDB();

    await pool.query(
        `UPDATE btw.notes SET delete = false, deleted_at = null, archive = $3, updated_at = $4 WHERE id = $1 AND user_id = $2 AND delete = true`,
        [id, user_id, moveToArchive, new Date()]
    );

    return {
        success: true,
    };
}

async function unpublishNote({ user_id, id }) {
    const pool = await db.getTasksDB();

    await pool.query(
        `UPDATE btw.notes SET publish = false WHERE id = $1 AND user_id = $2`,
        [id, user_id]
    );

    noteCacheHelper(user_id);

    return {
        success: true,
    };
}

async function setNoteSlug({ user_id, id, slug }) {
    // get the note from db
    // create slug for it
    // set published to true
    // set published_at to now
    const pool = await db.getTasksDB();

    const { rows } = await pool.query(
        `SELECT * FROM btw.notes WHERE id = $1 AND user_id = $2`,
        [id, user_id]
    );

    if (rows.length === 0) {
        return {
            success: false,
            error: "Note not found",
        };
    }

    const note = rows[0];

    slug = (slug || "")
        .toLowerCase()
        .replace(/ /g, "-")
        .replace(/[^\w-]+/g, "");

    await pool.query(
        `UPDATE btw.notes SET slug = $1 WHERE id = $2 AND user_id = $3`,
        [slug, id, user_id]
    );

    noteCacheHelper(user_id);

    return {
        success: true,
    };
}

async function publishNote({ user_id, id }) {
    // get the note from db
    // create slug for it
    // set published to true
    // set published_at to now

    const pool = await db.getTasksDB();

    const { rows } = await pool.query(
        `SELECT * FROM btw.notes WHERE id = $1 AND user_id = $2`,
        [id, user_id]
    );

    if (rows.length === 0) {
        return {
            success: false,
            error: "Note not found",
        };
    }

    const note = rows[0];

    const slug = note.title
        .toLowerCase()
        .replace(/ /g, "-")
        .replace(/[^\w-]+/g, "");

    const html = note.html || "";
    let image = "";

    // from regex get first <img src="" from html and extract src as image
    const regex = /<img.*?src="(.*?)"/;
    const found = html.match(regex);

    if (found && found.length > 1) {
        image = found[1];
    }

    await pool.query(
        `UPDATE btw.notes SET publish = true, published_at = $1, slug = $2, image = $3 WHERE id = $4 AND user_id = $5`,
        [new Date(), slug, image, id, user_id]
    );

    noteCacheHelper(user_id);

    return {
        success: true,
        slug,
    };
}

async function importNote({ user_id, job, url, email }) {
    baseQueue.add("importNote", {
        user_id,
        jobType: job,
        url,
        email,
    });
}

baseQueue.process("importNote", async (job, done) => {
    const { user_id, jobType, url, email } = job.data;

    if (jobType === "import" && url) {
        // check if the url is for a html file (.html)
        if (url.indexOf(".html") !== -1) {
            try {
                // then get the content of the HTML by fetching on that url
                const response = await fetch(url);
                const html = await response.text();
                // if the html has <h1> then use that as the title
                var title = "";
                try {
                    const dom = new JSDOM(html);

                    // Get the first h1 element
                    const h1 = dom.window.document.querySelector("h1");

                    // Extract the content of the h1 element
                    title = h1.textContent;
                } catch (e) {
                    title = "Imported Note";
                }

                const id = uuidv4();
                // create a new note for this user with title, html
                await upsertNote({
                    id,
                    user_id,
                    title,
                    html,
                });
            } catch (e) {
                console.log("Error upserting HTML", e);
                // TODO: we can send an email to the user here that the import of xyz doc failed
            }
        }
    } else if (jobType === "notify" && email) {
        // inform user import is complete
        await emailImportComplete({ email });
    }

    done();
});

async function makeNotePrivate({ user_id, id }) {
    // set private to true

    const pool = await db.getTasksDB();

    await pool.query(
        `UPDATE btw.notes SET private = true WHERE id = $1 AND user_id = $2`,
        [id, user_id]
    );

    noteCacheHelper(user_id);

    return {
        success: true,
    };
}

async function makeNotePublic({ user_id, id }) {
    // set private to false
    const pool = await db.getTasksDB();

    await pool.query(
        `UPDATE btw.notes SET private = false WHERE id = $1 AND user_id = $2`,
        [id, user_id]
    );

    noteCacheHelper(user_id);

    return {
        success: true,
    };
}

module.exports = {
    getNote,
    upsertNote,
    getNotes,
    importNote,
    unpublishNote,
    publishNote,
    deleteNote,
    undeleteNote,
    archiveNote,
    unarchiveNote,
    setNoteSlug,
    noteCacheHelper,
    makeNotePrivate,
    makeNotePublic,
};
