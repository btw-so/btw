const db = require("../services/db");

/**
 * Get public memories for a user
 */
async function getPublicMemories(userId) {
    const tasksDB = await db.getTasksDB();
    const { rows } = await tasksDB.query(
        `SELECT * FROM btw.memories WHERE user_id = $1 AND private = false ORDER BY visited_date DESC NULLS LAST, created_at DESC`,
        [userId]
    );
    // Ensure photo_urls is parsed as array
    return rows.map(row => ({
        ...row,
        photo_urls: typeof row.photo_urls === 'string' ? JSON.parse(row.photo_urls) : row.photo_urls
    }));
}

module.exports = {
    getPublicMemories,
};
