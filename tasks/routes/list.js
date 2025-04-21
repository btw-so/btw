var express = require("express");
var router = express.Router();
var cors = require("cors");
var { getUserFromToken, doesLoginTokenExist } = require("../logic/user");
var { getList, getPublicNote, upsertNode, getPinnedNodes, searchNodes } = require("../logic/list");
var crypto = require("crypto");

router.options(
    "/pinned",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/pinned",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { fingerprint } = req.body || {};

        let user;

        const loginToken = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

        try {
            user = await getUserFromToken({
                token: loginToken,
                fingerprint,
            });
        } catch (e) {
            res.json({
                success: false,
                error: e,
            });
            return ;
        }

        const pinnedNodes = await getPinnedNodes({
            user_id: user.id,
        });

        res.json({
            success: true,
            data: { pinnedNodes },
        });
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
        const {
            fingerprint,
            page = 1,
            limit = 200,
            after,
            id,
        } = req.body || {};

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
                        data: { nodes: [] },
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
                            data: { nodes: [] },
                            isLoggedIn: false,
                        });
                        return;
                    }
                }
            }

            const {
                nodes,
                page: pageToSend,
                total,
                limit: limitToSend,
            } = await getList({
                user_id: user.id,
                id,
                page,
                limit,
                after,
            });
            res.json({
                success: true,
                data: { nodes, page: pageToSend, total, limit: limitToSend },
                isLoggedIn: !!user,
            });
        } catch (e) {
            res.json({
                success: false,
                data: { nodes: [] },
                error: e,
                isLoggedIn: !!user,
            });
            return;
        }
    }
);

router.options(
    "/update",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/update",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { nodes, fingerprint } = req.body || {};

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
                        success: false,
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
                            success: false,
                            isLoggedIn: false,
                        });
                        return;
                    }
                }
            }

            for (var i = 0; i < nodes.length; i++) {
                await upsertNode({
                    ...nodes[i],
                    user_id: user.id,
                });
            }

            res.json({
                success: true,
                isLoggedIn: !!user,
            });
        } catch (e) {
            console.log("error", e);
            res.json({
                success: false,
                error: e,
                isLoggedIn: !!user,
            });
            return;
        }
    }
);

function shortHash(x, key, length = 5) {
    const hmac = crypto.createHmac("sha256", key);
    hmac.update(x);
    const digest = hmac.digest("base64");
  
    // Make it URL-safe and trim padding
    const safe = digest.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  
    return safe.slice(0, length).toLowerCase();
  }

// get public note by node id and short hash
router.options(
    "/public/note",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/public/note",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { id, hash } = req.body;

        const serverHash = shortHash(id, process.env.ENCRYPTION_KEY);

        if (serverHash !== hash) {
            res.json({
                success: false,
                error: "Invalid hash",
            });
            return;
        }

        const note = await getPublicNote({ id });
        res.json({
            success: true,
            data: { note },
        });
    }
);

router.options(
    "/search",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/search",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { fingerprint, query, limit = 50, page = 1 } = req.body || {};

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
                        success: false,
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
                            success: false,
                            isLoggedIn: false,
                        });
                        return;
                    }
                }
            }

            const nodes = await searchNodes({
                user_id: user.id,
                query,
                limit,
                page,
            });

            res.json({
                success: true,
                data: { nodes },
                isLoggedIn: !!user,
            });
        } catch (e) {
            console.log("error", e);
            res.json({
                success: false,
                error: e,
                isLoggedIn: !!user,
            });
            return;
        }
    }
);

module.exports = router;
