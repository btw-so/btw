const db = require("../services/db");
const { baseQueue } = require("../services/queue");
const { v4: uuidv4 } = require("uuid");
const { emailImportComplete } = require("./email");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");
const turndown = require("turndown")();
const axios = require("axios");

async function getList({
    user_id,
    page = 1,
    limit = 200,
    after = 0,
    id = "home",
}) {
    const pool = await db.getTasksDB();

    // Convert page and limit to numbers and apply constraints
    page = Number(page);
    limit = limit && limit <= 200 ? Number(limit) : 200;
    after = new Date(after);

    // console.log("Params", page, limit, after);

    // Define the CTE and query for hierarchical data up to 10 levels deep
    const query = `
    WITH RECURSIVE node_cte AS (
    SELECT 
        id, user_id, text, checked, collapsed, checked_date, parent_id, pos, updated_at, note_id, file_id, 1 AS depth
    FROM 
        btw.nodes
    WHERE 
        user_id = $2 AND id = $1 AND updated_at >= $3
    UNION ALL
    SELECT 
        n.id, n.user_id, n.text, n.checked, n.collapsed, n.checked_date, n.parent_id, n.pos, n.updated_at, n.note_id, n.file_id, c.depth + 1
    FROM 
        (SELECT * FROM btw.nodes WHERE user_id = $2) AS n
    JOIN 
        node_cte c ON n.parent_id = c.id
    WHERE 
        c.depth < 10
)
SELECT 
    nct.*, 
    CASE 
        WHEN notes.id IS NOT NULL AND notes.html IS NOT NULL AND notes.html <> '' AND notes.html <> '<p></p>' THEN TRUE
        ELSE FALSE
    END AS note_exists
FROM 
    node_cte nct
LEFT JOIN 
    btw.notes ON nct.note_id = notes.id AND notes.user_id = nct.user_id
ORDER BY 
    nct.depth ASC, nct.pos DESC
LIMIT $4 OFFSET $5;
    `;

    const rows = await pool.query(query, [
        id,
        user_id,
        after,
        limit,
        (page - 1) * limit,
    ]);

    // Query to count the total number of entries for pagination
    const countQuery = `
        WITH RECURSIVE node_cte AS (
            SELECT id, user_id, parent_id, 1 AS depth
            FROM btw.nodes
            WHERE user_id = $2 AND id = $1 AND updated_at >= $3
            UNION ALL
            SELECT n.id, n.user_id, n.parent_id, c.depth + 1
            FROM (SELECT * from btw.nodes where user_id = $2) as n
            JOIN node_cte c ON n.parent_id = c.id
            WHERE c.depth < 10
        )
        SELECT COUNT(*) AS count FROM node_cte;
    `;

    const totalRows = await pool.query(countQuery, [id, user_id, after]);

    return {
        nodes: rows.rows, // Ensure you access the correct property based on your DB library
        total: Number(totalRows.rows[0].count), // Make sure to properly extract the count
        page,
        limit,
    };
}

async function upsertNode({
    id,
    user_id,
    text,
    checked,
    checked_date,
    collapsed,
    parent_id,
    pos,
    note_id,
    file_id,
}) {
    const pool = await db.getTasksDB();

    const query = `
    INSERT INTO btw.nodes (id, user_id, text, checked, checked_date, collapsed, parent_id, pos, updated_at, note_id, file_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (user_id, id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        text = EXCLUDED.text,
        checked = EXCLUDED.checked,
        checked_date = EXCLUDED.checked_date,
        collapsed = EXCLUDED.collapsed,
        parent_id = EXCLUDED.parent_id,
        updated_at = $9,
        pos = EXCLUDED.pos,
        note_id = EXCLUDED.note_id,
        file_id = EXCLUDED.file_id
`;
    try {
        const res = await pool.query(query, [
            id,
            user_id,
            text,
            !!checked,
            checked_date ? new Date(checked_date) : null,
            !!collapsed,
            parent_id,
            pos,
            new Date(),
            note_id,
            file_id,
        ]);
        console.log("Upsert successful:", res);
    } catch (err) {
        console.error("Upsert failed:", err);
    }
}

module.exports = {
    getList,
    upsertNode,
};
