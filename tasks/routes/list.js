var express = require("express");
var router = express.Router();
var cors = require("cors");
var { getUserFromToken, doesLoginTokenExist } = require("../logic/user");
var { getList, upsertNode } = require("../logic/list");

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

module.exports = router;
