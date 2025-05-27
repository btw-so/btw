var express = require("express");
var router = express.Router();
var cors = require("cors");
var { getUserFromToken, doesLoginTokenExist } = require("../logic/user");
var {
    getList,
    getPublicNote,
    getPublicFile,
    upsertNode,
    getPinnedNodes,
    searchNodes,
} = require("../logic/list");
var crypto = require("crypto");
const { parse } = require("@postlight/parser");
const TurndownService = require("turndown");
const showdown = require("showdown");
const showdownConverter = new showdown.Converter();
const { tiptapExtensions } = require("../logic/tiptapExtensions");
const db = require("../services/db");
const { v4: uuidv4 } = require("uuid");
const { upsertNote } = require("../logic/notes");
const { generateJSON } = require("@tiptap/html");
const { TiptapTransformer } = require("@hocuspocus/transformer");

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

            if (!user) {
                throw new Error("User not found");
            }
        } catch (e) {
            res.json({
                success: false,
                error: e,
            });
            return;
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

            if (!user) {
                throw new Error("User not found");
            }

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

            if (!user) {
                throw new Error("User not found");
            }

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
    const safe = digest
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

    return safe.slice(0, length).toLowerCase();
}

router.options(
    "/public/list",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/public/list",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { id, hash } = req.body;

        try {
            // fetch the node from DB
            // compare the hash
            // then fetch the data same as list get for this node
            // then if this is not file node, then get the note from the note table same as public note get

            const pool = await db.getTasksDB();
            const { rows } = await pool.query(
                "SELECT * FROM btw.nodes WHERE id = $1",
                [id]
            );

            const node = rows[0];

            if (!node) {
                res.json({ success: false, error: "List not found" });
                return;
            }

            const hashToCompare = shortHash(
                `${node.id}-${node.note_id}-${node.user_id}-list`,
                process.env.ENCRYPTION_KEY,
                10
            );

            if (hashToCompare !== hash) {
                res.json({ success: false, error: "Invalid hash" });
                return;
            }

            const {
                nodes,
                page: pageToSend,
                total,
                limit: limitToSend,
            } = await getList({
                user_id: node.user_id,
                id: node.id,
                page: 1,
                limit: 200,
            });

            if (nodes.length === 0) {
                res.json({ success: false, error: "List is empty" });
                return;
            }

            // for all the nodes, I want to add shareUrl property so that user can click and enter that node
            nodes.forEach((node) => {
                node.shareUrl = `/public/list/${node.id}/${shortHash(
                    `${node.id}-${node.note_id}-${node.user_id}-list`,
                    process.env.ENCRYPTION_KEY,
                    10
                )}`;
            });

            const note = await getPublicNote({ id: node.note_id });
            let file = null;

            if (node.file_id) {
                file = await getPublicFile({ id: node.file_id });
            }

            res.json({
                success: true,
                data: {
                    nodes,
                    page: pageToSend,
                    total,
                    limit: limitToSend,
                    note,
                    file,
                },
            });

        } catch (err) {
            console.log("error", err);
            res.json({ success: false, error: err.message || err.toString() });
            return;
        }
    }
);

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

            if (!user) {
                throw new Error("User not found");
            }

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

// Readable content extraction endpoint
router.options(
    "/utils/readable",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/utils/readable",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { url } = req.body || {};
        if (!url) {
            res.json({ success: false, error: "Missing URL" });
            return;
        }
        try {
            const result = await parse(url);
            const turndownService = new TurndownService();
            const markdown = turndownService.turndown(result.content || "");
            res.json({ success: true, content: markdown });
        } catch (e) {
            res.json({ success: false, error: e.message || e.toString() });
        }
    }
);

// Add-child endpoint
router.options(
    "/api/child/add/:id/:hash",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/api/child/add/:id/:hash",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { id, hash } = req.params || {};
        const { title, md } = req.body || {};
        if (!id || !hash) {
            res.json({ success: false, error: "Missing required fields" });
            return;
        }
        // Validate hash
        const serverHash = shortHash(id, process.env.ENCRYPTION_KEY);
        if (serverHash !== hash) {
            res.json({ success: false, error: "Invalid hash" });
            return;
        }
        // Markdown to HTML
        let html = "";
        if (md) {
            html = showdownConverter.makeHtml(md);
        }
        // HTML to tiptap JSON
        let tiptapJSON = null;
        try {
            tiptapJSON = generateJSON(html, tiptapExtensions);
        } catch (e) {
            tiptapJSON = null;
        }
        // After you have tiptapJSON
        let ydoc = null;
        try {
            const transformer = TiptapTransformer.extensions(tiptapExtensions);
            ydoc = transformer.toYdoc(tiptapJSON, "default");
        } catch (e) {
            ydoc = null;
        }
        // Generate new note and node IDs
        const note_id = uuidv4();
        const node_id = uuidv4();
        // Find the user_id and parent node's user_id
        let user_id = null;
        try {
            const pool = await db.getTasksDB();
            const { rows } = await pool.query(
                "SELECT user_id FROM btw.nodes WHERE id = $1",
                [id]
            );
            if (rows.length > 0) user_id = rows[0].user_id;
        } catch (e) {}
        if (!user_id) {
            res.json({ success: false, error: "Parent node not found" });
            return;
        }
        // Find the max pos among children
        let pos = 1;
        try {
            const pool = await db.getTasksDB();
            const { rows } = await pool.query(
                "SELECT MAX(pos) as max_pos FROM btw.nodes WHERE parent_id = $1 AND user_id = $2",
                [id, user_id]
            );
            if (rows.length > 0 && rows[0].max_pos !== null)
                pos = rows[0].max_pos + 1;
        } catch (e) {}
        // Insert note
        await upsertNote({
            id: note_id,
            user_id,
            json: tiptapJSON,
            html,
            title,
            ydoc,
            tags: "list,auto",
        });
        // Insert node
        await upsertNode({
            id: node_id,
            user_id,
            text: title || "",
            parent_id: id,
            pos,
            note_id,
        });
        // Return the public note URL
        const publicHash = shortHash(note_id, process.env.ENCRYPTION_KEY);
        const url = `${
            process.env.LIST_DOMAIN || ""
        }/public/note/${note_id}/${publicHash}`;
        res.json({ success: true, url, node_id, note_id });
    }
);

module.exports = router;
