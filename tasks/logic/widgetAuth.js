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
 */
async function verifyWidgetToken({ widgetToken, nodeId, fingerprint }) {
    if (!widgetToken || !nodeId || !fingerprint) {
        return null;
    }

    try {
        // Get the node to find its user_id
        const nodeResult = await db.query(
            "SELECT user_id FROM nodes WHERE id = $1",
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
        const userResult = await db.query(
            "SELECT id, email FROM users WHERE id = $1",
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

module.exports = {
    generateWidgetToken,
    verifyWidgetToken,
};
