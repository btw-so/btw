const db = require("../services/db");
const { baseQueue } = require("../services/queue");
const { v4: uuidv4 } = require("uuid");
const { emailImportComplete } = require("./email");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

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
            console.log(e);
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
    } updated_at = $4`;

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
        `SELECT id, user_id, title, created_at, updated_at, published_at, publish, slug, ydoc, delete, archive, deleted_at FROM btw.notes WHERE user_id = $1 AND (created_at >=$2 OR updated_at >= $3) ORDER BY updated_at DESC LIMIT $4 OFFSET $5`,
        [user_id, after, after, limit, (page - 1) * limit]
    );

    // get total number of notes
    const { rows: totalRows } = await pool.query(
        `SELECT COUNT(*) FROM btw.notes WHERE user_id = $1 AND (created_at >=$2 OR updated_at >= $3)`,
        [user_id, after, after]
    );

    return {
        notes: rows,
        total: totalRows.length > 1 ? totalRows[0].count : 0,
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

    await pool.query(
        `UPDATE btw.notes SET slug = $1 WHERE id = $2 AND user_id = $3`,
        [slug, id, user_id]
    );

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

    await pool.query(
        `UPDATE btw.notes SET publish = true, published_at = $1, slug = $2 WHERE id = $3 AND user_id = $4`,
        [new Date(), slug, id, user_id]
    );

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
};
