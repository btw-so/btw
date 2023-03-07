var express = require("express");
var router = express.Router();
var cors = require("cors");
var { getUserFromToken } = require("../logic/user");
var { getNotes, upsertNote } = require("../logic/notes");

router.options(
    "/get",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/get",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { fingerprint, page = 1, limit = 50, after } = req.body || {};

        // get loginToken as btw_uuid cookie
        const loginToken = req.cookies.btw_uuid;

        try {
            const user = await getUserFromToken({
                token: loginToken,
                fingerprint,
            });
            const {
                notes,
                page: pageToSend,
                total,
                limit: limitToSend,
            } = await getNotes({
                user_id: user.id,
                page,
                limit,
                after,
            });
            res.json({
                success: true,
                data: { notes, page: pageToSend, total, limit: limitToSend },
            });
        } catch (e) {
            res.json({
                success: false,
                data: { notes: [] },
                error: e,
            });
            return;
        }
    }
);

router.options(
    "/update/html",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/update/html",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { fingerprint, id, user_id, html } = req.body || {};

        // get loginToken as btw_uuid cookie
        const loginToken = req.cookies.btw_uuid;

        try {
            const user = await getUserFromToken({
                token: loginToken,
                fingerprint,
            });

            // access check. for now the access check requires user to own the note
            // in future, we can add collaborators
            if (user._id !== user_id) {
                res.json({
                    success: false,
                    data: { notes: [] },
                    error: "Access denied",
                });
                return;
            }

            await upsertNote({
                id,
                user_id,
                html,
            });
        } catch (e) {
            res.json({
                success: false,
                data: { notes: [] },
                error: e,
            });
            return;
        }
    }
);

module.exports = router;
