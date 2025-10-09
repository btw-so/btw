const crypto = require("crypto");
const db = require("../services/db");

const WIDGET_SECRET = process.env.WIDGET_SECRET || "Leonardo Da Vinci";

/**
 * Generate a widget token hash
 * Hash = SHA256(nodeId + userId + fingerprint + SECRET)
 */
function generateWidgetToken({ nodeId, userId, fingerprint }) {
    const data = `${nodeId}:${userId}:${fingerprint}:${WIDGET_SECRET}`;
    return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Verify widget token and return user info if valid
 * This function verifies the token was generated for the exact nodeId provided
 */
async function verifyWidgetToken({ widgetToken, nodeId, fingerprint }) {
    if (!widgetToken || !nodeId || !fingerprint) {
        return null;
    }

    try {
        const pool = await db.getTasksDB();

        // Get the node to find its user_id
        const nodeResult = await pool.query(
            "SELECT user_id FROM btw.nodes WHERE id = $1",
            [nodeId]
        );

        if (nodeResult.rows.length === 0) {
            return null;
        }

        const userId = nodeResult.rows[0].user_id;

        // Generate expected token
        const expectedToken = generateWidgetToken({
            nodeId,
            userId,
            fingerprint,
        });

        // Verify token matches
        if (widgetToken !== expectedToken) {
            return null;
        }

        // Return user info
        const userResult = await pool.query(
            "SELECT id, email FROM btw.users WHERE id = $1",
            [userId]
        );

        if (userResult.rows.length === 0) {
            return null;
        }

        return userResult.rows[0];
    } catch (error) {
        console.error("Error verifying widget token:", error);
        return null;
    }
}

/**
 * Verify widget token for a parent node, and allow access to ANY node belonging to the same user
 * Used when widgets need to access child nodes using a parent's token
 */
async function verifyWidgetTokenForUser({ widgetToken, parentNodeId, nodeId, fingerprint }) {
    if (!widgetToken || !parentNodeId || !nodeId || !fingerprint) {
        return null;
    }

    try {
        const pool = await db.getTasksDB();

        // First, verify the token was generated for the parent node
        const parentNodeResult = await pool.query(
            "SELECT user_id FROM btw.nodes WHERE id = $1",
            [parentNodeId]
        );

        if (parentNodeResult.rows.length === 0) {
            return null;
        }

        const userId = parentNodeResult.rows[0].user_id;

        // Generate expected token for the parent node
        const expectedToken = generateWidgetToken({
            nodeId: parentNodeId,
            userId,
            fingerprint,
        });

        // Verify token matches for parent
        if (widgetToken !== expectedToken) {
            return null;
        }

        // Token is valid! Now verify the requested node belongs to the same user
        const nodeResult = await pool.query(
            "SELECT user_id FROM btw.nodes WHERE id = $1 AND user_id = $2",
            [nodeId, userId]
        );

        if (nodeResult.rows.length === 0) {
            return null;
        }

        // Return user info
        const userResult = await pool.query(
            "SELECT id, email FROM btw.users WHERE id = $1",
            [userId]
        );

        if (userResult.rows.length === 0) {
            return null;
        }

        return userResult.rows[0];
    } catch (error) {
        console.error("Error verifying widget token for user:", error);
        return null;
    }
}

module.exports = {
    generateWidgetToken,
    verifyWidgetToken,
    verifyWidgetTokenForUser,
};
