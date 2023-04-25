var express = require("express");
var router = express.Router();
var cors = require("cors");
var { getUserFromToken, doesLoginTokenExist } = require("../logic/user");
var {
    getNotes,
    getNote,
    upsertNote,
    importNote,
    publishNote,
    unpublishNote,
    archiveNote,
    unarchiveNote,
    deleteNote,
    undeleteNote,
    setNoteSlug,
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
        const loginToken = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

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
        const loginToken = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

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
        const loginToken = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

        let user;

        try {
            user = await getUserFromToken({
                token: loginToken,
                fingerprint,
            });

            if (!Number(process.env.TURN_OFF_SINGLE_USER_MODE)) {
                // single user mode.
                if (!loginToken || !user) {
                    res.json({
                        success: true,
                        data: { notes: [] },
                        isLoggedIn: false,
                    });
                    return;
                } else {
                    const exists = await doesLoginTokenExist({
                        token: loginToken,
                        fingerprint,
                    });

                    if (!exists) {
                        res.json({
                            success: true,
                            data: { notes: [] },
                            isLoggedIn: false,
                        });
                        return;
                    }
                }
            }

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
                isLoggedIn: !!user,
            });
        } catch (e) {
            res.json({
                success: false,
                data: { notes: [] },
                error: e,
                isLoggedIn: !!user,
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
        const loginToken = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

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
    "/update/delete",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/update/delete",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const {
            fingerprint,
            id,
            user_id,
            delete: deleteAs,
            moveToArchive,
        } = req.body || {};

        // get loginToken as btw_uuid cookie
        const loginToken = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

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

            if (deleteAs) {
                res.send(
                    await deleteNote({
                        id,
                        user_id,
                    })
                );
            } else {
                res.send(
                    await undeleteNote({
                        id,
                        user_id,
                        moveToArchive,
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

router.options(
    "/update/archive",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/update/archive",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { fingerprint, id, user_id, archive } = req.body || {};

        // get loginToken as btw_uuid cookie
        const loginToken = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

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

            if (archive) {
                res.send(
                    await archiveNote({
                        id,
                        user_id,
                    })
                );
            } else {
                res.send(
                    await unarchiveNote({
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
        const loginToken = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

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

router.options(
    "/update/slug",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/update/slug",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { fingerprint, id, user_id, slug } = req.body || {};

        // get loginToken as btw_uuid cookie
        const loginToken = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

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

            res.send(await setNoteSlug({ id, user_id, slug }));
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
