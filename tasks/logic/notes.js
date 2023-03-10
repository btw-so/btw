const db = require("../services/db");

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

async function upsertNote({ id, user_id, json, html }) {
    const created_at = new Date();
    const updated_at = new Date();

    const hasHTML = typeof html === "string";

    let title = "";
    if (json) {
        try {
            title = json.content[0].content[0].text;
        } catch (e) {
            console.log(e);
        }
    }

    const pool = await db.getTasksDB();
    let query = `INSERT INTO btw.notes (id, user_id,created_at, updated_at ${
        title ? `,title` : ""
    } ${json ? `,json` : ""} ${
        hasHTML ? `,html` : ""
    } ) VALUES ($1, $2, $3, $4`;

    var nums = (title ? 1 : 0) + (hasHTML ? 1 : 0) + (json ? 1 : 0);
    for (var i = 0; i < nums; i++) {
        query += `,$${i + 5}`;
    }
    var jsonnum = json ? 5 + nums : 0;
    var htmlnum = hasHTML ? 5 + nums + (nums > 1 ? 1 : 0) : 0;
    var titlenum = title ? 5 + nums + (nums > 2 ? 2 : nums > 1 ? 1 : 0) : 0;

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
        ...(hasHTML ? [html] : []),
        ...(json ? [json] : []),
        ...(hasHTML ? [html] : []),
        ...(title ? [title] : []),
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
        `SELECT id, user_id, title, created_at, updated_at, ydoc FROM btw.notes WHERE user_id = $1 AND (created_at >=$2 OR updated_at >= $3) ORDER BY updated_at DESC LIMIT $4 OFFSET $5`,
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

module.exports = {
    getNote,
    upsertNote,
    getNotes,
};
