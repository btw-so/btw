const db = require("../services/db");
const { v4: uuidv4 } = require("uuid");

/**
 * Get all memories for a user
 */
async function getMemories(userId) {
    const tasksDB = await db.getTasksDB();
    const { rows } = await tasksDB.query(
        `SELECT * FROM btw.memories WHERE user_id = $1 ORDER BY visited_date DESC NULLS LAST, created_at DESC`,
        [userId]
    );
    // Ensure photo_urls is parsed as array
    return rows.map(row => ({
        ...row,
        photo_urls: typeof row.photo_urls === 'string' ? JSON.parse(row.photo_urls) : row.photo_urls
    }));
}

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

/**
 * Add a new memory
 */
async function addMemory(userId, memory) {
    const tasksDB = await db.getTasksDB();
    const id = uuidv4();
    const {
        name,
        place_name,
        place_address,
        latitude,
        longitude,
        place_type,
        city,
        country_code,
        description,
        photo_urls,
        visited_date,
        private: isPrivate
    } = memory;

    const { rows } = await tasksDB.query(
        `INSERT INTO btw.memories
        (id, user_id, name, place_name, place_address, latitude, longitude, place_type, city, country_code, description, photo_urls, visited_date, private, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        RETURNING *`,
        [
            id,
            userId,
            name,
            place_name,
            place_address || null,
            latitude,
            longitude,
            place_type || null,
            city,
            country_code,
            description || null,
            photo_urls ? JSON.stringify(photo_urls) : null,
            visited_date || null,
            isPrivate !== undefined ? isPrivate : false
        ]
    );

    return rows[0];
}

/**
 * Update an existing memory
 */
async function updateMemory(userId, memoryId, updates) {
    const tasksDB = await db.getTasksDB();
    const {
        name,
        place_name,
        place_address,
        latitude,
        longitude,
        place_type,
        city,
        country_code,
        description,
        photo_urls,
        visited_date,
        private: isPrivate
    } = updates;

    const { rows } = await tasksDB.query(
        `UPDATE btw.memories
        SET name = $1, place_name = $2, place_address = $3, latitude = $4, longitude = $5, place_type = $6,
            city = $7, country_code = $8, description = $9, photo_urls = $10, visited_date = $11, private = $12, updated_at = NOW()
        WHERE id = $13 AND user_id = $14
        RETURNING *`,
        [
            name,
            place_name,
            place_address || null,
            latitude,
            longitude,
            place_type || null,
            city,
            country_code,
            description || null,
            photo_urls ? JSON.stringify(photo_urls) : null,
            visited_date || null,
            isPrivate !== undefined ? isPrivate : false,
            memoryId,
            userId
        ]
    );

    return rows[0];
}

/**
 * Delete a memory
 */
async function deleteMemory(userId, memoryId) {
    const tasksDB = await db.getTasksDB();
    const { rows } = await tasksDB.query(
        `DELETE FROM btw.memories WHERE id = $1 AND user_id = $2 RETURNING *`,
        [memoryId, userId]
    );

    return rows[0];
}

module.exports = {
    getMemories,
    getPublicMemories,
    addMemory,
    updateMemory,
    deleteMemory,
};
