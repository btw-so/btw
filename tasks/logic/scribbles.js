const db = require("../services/db");
const Y = require('yjs');

/**
 * Get scribble data for a user
 * @param {Object} user - User object with id
 * @param {string} scribble_id - Scribble ID
 * @returns {Promise<Object|null>} Scribble data or null
 */
async function getScribble(user, scribble_id) {
    const pool = await db.getTasksDB();
    const { rows } = await pool.query(
        `SELECT * FROM btw.scribbles WHERE id = $1 AND user_id = $2`,
        [scribble_id, user.id]
    );

    if (rows.length > 0) {
        return rows[0];
    } else {
        return null;
    }
}

/**
 * Upsert scribble data
 * Supports both legacy (data, ydoc) and new page-based format (pages)
 * @param {Object} user - User object with id
 * @param {string} scribble_id - Scribble ID
 * @param {Object} data - Legacy Excalidraw data (optional)
 * @param {Object} ydoc - Y.js document data (optional)
 * @param {Array} pages - Array of page objects with drawing_data and thumbnail (optional)
 * @param {Object} settings - Scribble settings like background, tools, etc. (optional)
 * @returns {Promise<Object>} Updated scribble
 */
async function upsertScribble(user, scribble_id, data = null, ydoc = null, pages = null, settings = null) {
    const created_at = new Date();
    const updated_at = new Date();
    const pool = await db.getTasksDB();

    // Check if scribble exists
    const existing = await getScribble(user, scribble_id);

    if (existing) {
        // Update existing scribble
        let updateFields = ['updated_at = $1'];
        let updateValues = [updated_at];
        let paramIndex = 2;

        // Legacy format support
        if (data !== null) {
            updateFields.push(`data = $${paramIndex}`);
            updateValues.push(data);
            paramIndex++;
        }

        if (ydoc !== null) {
            // If ydoc is a Y.Doc, serialize it
            let ydocBuffer;
            if (typeof ydoc.encodeStateAsUpdate === 'function' || (ydoc.constructor && ydoc.constructor.name === 'Doc')) {
                const update = Y.encodeStateAsUpdate(ydoc);
                ydocBuffer = Buffer.from(update);
            } else if (Buffer.isBuffer(ydoc)) {
                ydocBuffer = ydoc;
            } else if (ydoc instanceof Uint8Array) {
                ydocBuffer = Buffer.from(ydoc);
            } else {
                throw new Error("Invalid ydoc type");
            }
            updateFields.push(`ydoc = $${paramIndex}`);
            updateValues.push(ydocBuffer);
            paramIndex++;
        }

        // New page-based format
        if (pages !== null) {
            updateFields.push(`pages = $${paramIndex}`);
            updateValues.push(JSON.stringify(pages));
            paramIndex++;
        }

        if (settings !== null) {
            updateFields.push(`settings = $${paramIndex}`);
            updateValues.push(JSON.stringify(settings));
            paramIndex++;
        }

        // Add WHERE clause parameters
        updateValues.push(scribble_id, user.id);

        const updateQuery = `
            UPDATE btw.scribbles
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        `;

        await pool.query(updateQuery, updateValues);
    } else {
        // Insert new scribble
        let ydocBuffer = null;
        if (ydoc !== null) {
            if (typeof ydoc.encodeStateAsUpdate === 'function' || (ydoc.constructor && ydoc.constructor.name === 'Doc')) {
                const update = Y.encodeStateAsUpdate(ydoc);
                ydocBuffer = Buffer.from(update);
            } else if (Buffer.isBuffer(ydoc)) {
                ydocBuffer = ydoc;
            } else if (ydoc instanceof Uint8Array) {
                ydocBuffer = Buffer.from(ydoc);
            }
        }

        await pool.query(
            `INSERT INTO btw.scribbles (id, user_id, data, ydoc, pages, settings, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                scribble_id,
                user.id,
                data,
                ydocBuffer,
                pages ? JSON.stringify(pages) : null,
                settings ? JSON.stringify(settings) : null,
                created_at,
                updated_at
            ]
        );
    }

    return await getScribble(user, scribble_id);
}

/**
 * Delete a scribble
 * @param {Object} user - User object with id
 * @param {string} scribble_id - Scribble ID
 * @returns {Promise<Object>} Success status
 */
async function deleteScribble(user, scribble_id) {
    const pool = await db.getTasksDB();
    await pool.query(
        `DELETE FROM btw.scribbles WHERE id = $1 AND user_id = $2`,
        [scribble_id, user.id]
    );

    return { success: true };
}

/**
 * Get a specific page from a scribble
 * @param {Object} user - User object with id
 * @param {string} scribble_id - Scribble ID
 * @param {number} page_number - Page number (1-indexed)
 * @returns {Promise<Object|null>} Page data or null
 */
async function getScribblePage(user, scribble_id, page_number) {
    const scribble = await getScribble(user, scribble_id);
    if (!scribble || !scribble.pages) {
        return null;
    }

    const pages = JSON.parse(scribble.pages);
    const page = pages.find(p => p.page_number === page_number);
    return page || null;
}

/**
 * Upsert a specific page in a scribble
 * @param {Object} user - User object with id
 * @param {string} scribble_id - Scribble ID
 * @param {number} page_number - Page number (1-indexed)
 * @param {string} drawing_data - Base64 encoded PKDrawing data
 * @param {string} thumbnail - Base64 encoded thumbnail image (optional)
 * @returns {Promise<Object>} Updated scribble
 */
async function upsertScribblePage(user, scribble_id, page_number, drawing_data, thumbnail = null) {
    const scribble = await getScribble(user, scribble_id);
    let pages = scribble && scribble.pages ? JSON.parse(scribble.pages) : [];

    const pageIndex = pages.findIndex(p => p.page_number === page_number);
    const pageData = {
        page_number,
        drawing_data,
        thumbnail,
        modified: new Date().toISOString()
    };

    if (pageIndex >= 0) {
        // Update existing page
        pages[pageIndex] = pageData;
    } else {
        // Add new page
        pages.push(pageData);
        // Sort pages by page_number
        pages.sort((a, b) => a.page_number - b.page_number);
    }

    return await upsertScribble(user, scribble_id, null, null, pages, null);
}

/**
 * Delete a specific page from a scribble
 * @param {Object} user - User object with id
 * @param {string} scribble_id - Scribble ID
 * @param {number} page_number - Page number (1-indexed)
 * @returns {Promise<Object>} Updated scribble
 */
async function deleteScribblePage(user, scribble_id, page_number) {
    const scribble = await getScribble(user, scribble_id);
    if (!scribble || !scribble.pages) {
        return null;
    }

    let pages = JSON.parse(scribble.pages);
    pages = pages.filter(p => p.page_number !== page_number);

    // Reindex remaining pages
    pages = pages.map((p, index) => ({
        ...p,
        page_number: index + 1
    }));

    return await upsertScribble(user, scribble_id, null, null, pages, null);
}

module.exports = {
    getScribble,
    upsertScribble,
    deleteScribble,
    getScribblePage,
    upsertScribblePage,
    deleteScribblePage
};
