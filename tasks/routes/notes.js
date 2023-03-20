var express = require("express");
var router = express.Router();
var cors = require("cors");
var { getUserFromToken } = require("../logic/user");
var {
    getNotes,
    getNote,
    upsertNote,
    importNote,
    publishNote,
    unpublishNote,
} = require("../logic/notes");

router.options(
    "/import",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/import",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        let { fingerprint, urls } = req.body || {};

        // HACK. for some reason DO us adding S3 endpoint twice in its urls
        // so we need to remove the first one
        // If the URL has process.env.S3_ENDPOINT + "/" +  process.env.S3_ENDPOINT, remove the first one
        if (process.env.S3_ENDPOINT) {
            urls = (urls || []).map((url, index) => {
                return url
                    .split(
                        `${process.env.S3_ENDPOINT}/${process.env.S3_ENDPOINT}`
                    )
                    .join(process.env.S3_ENDPOINT);
            });
        }

        // get loginToken as btw_uuid cookie
        const loginToken = req.cookies.btw_uuid;

        try {
            const user = await getUserFromToken({
                token: loginToken,
                fingerprint,
            });

            (urls || []).map((url) => {
                importNote({
                    user_id: user.id,
                    url,
                    job: "import",
                    email: user.email,
                });
            });

            importNote({
                user_id: user.id,
                job: "notify",
                email: user.email,
            });

            res.json({
                success: true,
                data: {},
            });
        } catch (e) {
            res.json({
                success: false,
                data: {},
                error: e,
            });
            return;
        }
    }
);

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
        const { fingerprint, id } = req.body || {};

        // get loginToken as btw_uuid cookie
        const loginToken = req.cookies.btw_uuid;

        try {
            const user = await getUserFromToken({
                token: loginToken,
                fingerprint,
            });
            const note = await getNote({
                user_id: user.id,
                id,
            });
            res.json({
                success: true,
                data: { note },
            });
        } catch (e) {
            res.json({
                success: false,
                data: { note: null },
                error: e,
            });
            return;
        }
    }
);

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
            if (user.id !== user_id) {
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

router.options(
    "/update/publish",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/update/publish",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { fingerprint, id, user_id, publish } = req.body || {};

        // get loginToken as btw_uuid cookie
        const loginToken = req.cookies.btw_uuid;

        try {
            const user = await getUserFromToken({
                token: loginToken,
                fingerprint,
            });

            // access check. for now the access check requires user to own the note
            // in future, we can add collaborators
            if (user.id !== user_id) {
                res.json({
                    success: false,
                    error: "Access denied",
                });
                return;
            }

            if (publish) {
                res.send(
                    await publishNote({
                        id,
                        user_id,
                    })
                );
            } else {
                res.send(
                    await unpublishNote({
                        id,
                        user_id,
                    })
                );
            }
        } catch (e) {
            res.json({
                success: false,
                error: e.message,
            });
            return;
        }
    }
);

module.exports = router;
