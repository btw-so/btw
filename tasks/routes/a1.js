var express = require("express");
var router = express.Router();
var cors = require("cors");
var { getUserFromToken } = require("../logic/user");
var { fetchUserChats } = require("../logic/telegram");

const isAdminEmail = (email) => {
    const emails = [
        "sid@adaface.com",
        "siddhartha.gunti191@gmail.com",
        "deepti@adaface.com",
    ];

    return emails.includes(email);
};

router.options(
    "/thread/telegram/fetch",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
);
router.post(
    "/thread/telegram/fetch",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        let {
            fingerprint,
            thread,
            loginToken,
            user_id,
            chat_id,
            before,
            after,
            limit,
        } = req.body || {};

        // get loginToken as sd_uuid cookie
        loginToken =
            loginToken || req.cookies[process.env.SD_UUID_KEY || "sd_uuid"];

        try {
            let user = await getUserFromToken({
                token: loginToken,
                fingerprint,
            });

            if (!user) {
                res.json({
                    success: false,
                    error: "User not logged in",
                });
                return;
            }

            // Default to authenticated user's own ID; only admins may specify another user_id
            const requestedUserId = user_id ? Number(user_id) : user.id;
            if (isNaN(requestedUserId) || requestedUserId <= 0) {
                res.json({ success: false, error: "Invalid user_id" });
                return;
            }

            if (!isAdminEmail(user.email) && requestedUserId !== user.id) {
                res.json({
                    success: false,
                    error: "Access denied",
                });
                return;
            }

            // Validate limit
            const safeLimit = Math.max(1, Math.min(parseInt(limit) || 20, 50));

            const {
                success,
                chats,
                chatId: potentialNewChatId,
            } = await fetchUserChats({
                userId: requestedUserId,
                chatId: chat_id,
                before,
                after,
                limit: safeLimit,
            });

            res.json({
                success,
                chats,
                userId: requestedUserId,
                chatId: potentialNewChatId,
            });
        } catch (e) {
            console.log("[a1] Error:", e.message);
            res.json({
                success: false,
                error: "An error occurred",
            });
            return;
        }
    },
);

// Migration endpoint: encrypt existing plaintext SSH keys
router.options(
    "/migrate/encrypt-ssh-keys",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
);
router.post(
    "/migrate/encrypt-ssh-keys",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { fingerprint, loginToken: bodyToken } = req.body || {};
        const loginToken = bodyToken || req.cookies[process.env.SD_UUID_KEY || "sd_uuid"];

        try {
            const user = await getUserFromToken({ token: loginToken, fingerprint });
            if (!user || !isAdminEmail(user.email)) {
                return res.status(403).json({ success: false, error: "Admin access required" });
            }

            const db = require("../services/db");
            const { encrypt } = require("../logic/encryption");
            const tasksDB = await db.getTasksDB();

            // Find all sandboxes with plaintext keys (not in encrypted format iv:authTag:ciphertext)
            const { rows } = await tasksDB.query(
                `SELECT id, ssh_private_key FROM btw.sandboxes WHERE ssh_private_key IS NOT NULL AND ssh_private_key NOT LIKE '%:%:%'`
            );

            let migrated = 0;
            for (const row of rows) {
                const encrypted = encrypt(row.ssh_private_key);
                await tasksDB.query(
                    `UPDATE btw.sandboxes SET ssh_private_key = $1 WHERE id = $2`,
                    [encrypted, row.id]
                );
                migrated++;
            }

            res.json({ success: true, migrated, total: rows.length });
        } catch (e) {
            console.log("[Migration] encrypt-ssh-keys error:", e.message);
            res.status(500).json({ success: false, error: "Migration failed" });
        }
    }
);

module.exports = router;
