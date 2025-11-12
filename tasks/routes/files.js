var express = require("express");
var router = express.Router();
var cors = require("cors");
const db = require("../services/db");
var { getUserFromToken, doesLoginTokenExist } = require("../logic/user");
var { addFile, getFile } = require("../logic/files");

router.options(
    "/get-by-id",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/get-by-id",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { fingerprint, file_id, user_id } = req.body || {};

        // get loginToken as btw_uuid cookie
        const loginToken = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

        try {
            const user = await getUserFromToken({
                token: loginToken,
                fingerprint,
            });

            if (!user) {
                throw new Error("User not found");
            }

            const file = await getFile({
                user_id: user.id,
                file_id,
            });
            res.json({
                success: true,
                data: { file },
            });
        } catch (e) {
            res.json({
                success: false,
                data: { file: null },
                error: e,
            });
            return;
        }
    }
);


router.options(
    "/add-file",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/add-file",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { fingerprint, id, url, user_id, name } = req.body || {};

        // get loginToken as btw_uuid cookie
        const loginToken = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

        try {
            const user = await getUserFromToken({
                token: loginToken,
                fingerprint,
            });
            if (!user || !user.id || (user.id !== user_id)) {
                throw new Error("User not found");
            }
            const file_id = await addFile({
                url,
                user_id,
                name,
                id
            });
            res.json({
                success: true,
                data: { file_id },
            });
        } catch (e) {
            res.json({
                success: false,
                data: { file_id: null },
                error: e,
            });
            return;
        }
    }
);

router.options(
    "/backup/files",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/backup/files",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { fingerprint, page = 1, limit = 100 } = req.body || {};

        // get loginToken as btw_uuid cookie
        const loginToken = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

        try {
            const user = await getUserFromToken({
                token: loginToken,
                fingerprint,
            });

            if (!user) {
                throw new Error("User not found");
            }

            const pageNum = Number(page);
            const limitNum = limit && limit <= 100 ? Number(limit) : 100;
            const pool = await db.getTasksDB();

            // Get all files for user
            const query = `
                SELECT *
                FROM btw.files
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
            `;

            const rows = await pool.query(query, [
                user.id,
                limitNum,
                (pageNum - 1) * limitNum,
            ]);

            // Count total files
            const countQuery = `
                SELECT COUNT(*) as count
                FROM btw.files
                WHERE user_id = $1
            `;

            const totalRows = await pool.query(countQuery, [user.id]);

            res.json({
                success: true,
                data: {
                    files: rows.rows,
                    page: pageNum,
                    total: Number(totalRows.rows[0].count),
                    limit: limitNum,
                },
                isLoggedIn: true,
            });
        } catch (e) {
            res.json({
                success: false,
                error: e.message,
                isLoggedIn: false,
            });
        }
    }
);

router.options(
    "/backup/files/modified",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/backup/files/modified",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { fingerprint, modified_since, page = 1, limit = 200 } = req.body || {};

        // get loginToken as btw_uuid cookie
        const loginToken = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

        try {
            const user = await getUserFromToken({
                token: loginToken,
                fingerprint,
            });

            if (!user) {
                throw new Error("User not found");
            }

            if (!modified_since) {
                throw new Error("modified_since parameter is required");
            }

            // Parse and validate the modified_since date
            const modifiedDate = new Date(modified_since);
            if (isNaN(modifiedDate.getTime())) {
                throw new Error("Invalid date format for modified_since");
            }

            const pageNum = Number(page);
            const limitNum = limit && limit <= 200 ? Number(limit) : 200;
            const pool = await db.getTasksDB();

            // Get files modified after specified date
            const query = `
                SELECT *
                FROM btw.files
                WHERE user_id = $1
                  AND updated_at > $2
                ORDER BY updated_at DESC
                LIMIT $3 OFFSET $4
            `;

            const rows = await pool.query(query, [
                user.id,
                modifiedDate,
                limitNum,
                (pageNum - 1) * limitNum,
            ]);

            // Count total modified files
            const countQuery = `
                SELECT COUNT(*) as count
                FROM btw.files
                WHERE user_id = $1
                  AND updated_at > $2
            `;

            const totalRows = await pool.query(countQuery, [user.id, modifiedDate]);

            res.json({
                success: true,
                data: {
                    files: rows.rows,
                    page: pageNum,
                    total: Number(totalRows.rows[0].count),
                    limit: limitNum,
                    modified_since: modified_since,
                },
                isLoggedIn: true,
            });
        } catch (e) {
            console.log("Backup modified files error:", e);
            res.json({
                success: false,
                error: e.message || e.toString(),
                isLoggedIn: false,
            });
        }
    }
);

module.exports = router;
