const db = require("../services/db");
const { baseQueue } = require("../services/queue");
const { v4: uuidv4 } = require("uuid");
const { emailImportComplete } = require("./email");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");
const turndown = require("turndown")();
const axios = require("axios");


async function getFile({
    file_id,
    user_id,
}) {
    const pool = await db.getTasksDB();

    const { rows } = await pool.query(
        `SELECT * FROM btw.files WHERE id = $1 AND user_id = $2`,
        [file_id, user_id]
    );

    if (rows.length === 0) {
        return null;
    }

    return rows[0];
}

async function addFile({
    url,
    user_id,
    name,
    id
}) {
    const pool = await db.getTasksDB();

    await pool.query(
        `INSERT INTO btw.files (id, user_id, name, url, created_at) VALUES ($1, $2, $3, $4, $5)`,
        [id, user_id, name, url, new Date()]
    );

    return id;
}

module.exports = {
    getFile,
    addFile,
};
