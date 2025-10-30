var express = require("express");
var router = express.Router();
var cors = require("cors");
var { getUserFromToken, doesLoginTokenExist } = require("../logic/user");
var {
    getScribble,
    upsertScribble,
    deleteScribble,
    getScribblePage,
    upsertScribblePage,
    deleteScribblePage,
} = require("../logic/scribbles");

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
        let { fingerprint, scribble_id } = req.body || {};

        // get loginToken as btw_uuid cookie
        let loginTokenStr = req.cookies.btw_uuid;

        // check if loginToken exists and fingerprint exists
        let exists = await doesLoginTokenExist(loginTokenStr, fingerprint);
        if (!exists) {
            return res
                .status(400)
                .json({ success: false, error: "Invalid login token" });
        }

        // get user from loginToken
        let user = await getUserFromToken(loginTokenStr, fingerprint);
        if (!user) {
            return res
                .status(400)
                .json({ success: false, error: "User not found" });
        }

        // get scribble
        let scribble = await getScribble(user, scribble_id);

        return res.json({ success: true, scribble });
    }
);

router.options(
    "/upsert",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/upsert",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        let { fingerprint, scribble_id, data, ydoc } = req.body || {};

        // get loginToken as btw_uuid cookie
        let loginTokenStr = req.cookies.btw_uuid;

        // check if loginToken exists and fingerprint exists
        let exists = await doesLoginTokenExist(loginTokenStr, fingerprint);
        if (!exists) {
            return res
                .status(400)
                .json({ success: false, error: "Invalid login token" });
        }

        // get user from loginToken
        let user = await getUserFromToken(loginTokenStr, fingerprint);
        if (!user) {
            return res
                .status(400)
                .json({ success: false, error: "User not found" });
        }

        // upsert scribble
        let scribble = await upsertScribble(user, scribble_id, data, ydoc);

        return res.json({ success: true, scribble });
    }
);

router.options(
    "/delete",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/delete",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        let { fingerprint, scribble_id } = req.body || {};

        // get loginToken as btw_uuid cookie
        let loginTokenStr = req.cookies.btw_uuid;

        // check if loginToken exists and fingerprint exists
        let exists = await doesLoginTokenExist(loginTokenStr, fingerprint);
        if (!exists) {
            return res
                .status(400)
                .json({ success: false, error: "Invalid login token" });
        }

        // get user from loginToken
        let user = await getUserFromToken(loginTokenStr, fingerprint);
        if (!user) {
            return res
                .status(400)
                .json({ success: false, error: "User not found" });
        }

        // delete scribble
        await deleteScribble(user, scribble_id);

        return res.json({ success: true });
    }
);

// Get specific page
router.options(
    "/page/get",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/page/get",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        let { fingerprint, scribble_id, page_number } = req.body || {};

        let loginTokenStr = req.cookies.btw_uuid;
        let exists = await doesLoginTokenExist(loginTokenStr, fingerprint);
        if (!exists) {
            return res
                .status(400)
                .json({ success: false, error: "Invalid login token" });
        }

        let user = await getUserFromToken(loginTokenStr, fingerprint);
        if (!user) {
            return res
                .status(400)
                .json({ success: false, error: "User not found" });
        }

        let page = await getScribblePage(user, scribble_id, page_number);
        return res.json({ success: true, page });
    }
);

// Upsert specific page
router.options(
    "/page/upsert",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/page/upsert",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        let { fingerprint, scribble_id, page_number, drawing_data, thumbnail } = req.body || {};

        let loginTokenStr = req.cookies.btw_uuid;
        let exists = await doesLoginTokenExist(loginTokenStr, fingerprint);
        if (!exists) {
            return res
                .status(400)
                .json({ success: false, error: "Invalid login token" });
        }

        let user = await getUserFromToken(loginTokenStr, fingerprint);
        if (!user) {
            return res
                .status(400)
                .json({ success: false, error: "User not found" });
        }

        let scribble = await upsertScribblePage(
            user,
            scribble_id,
            page_number,
            drawing_data,
            thumbnail
        );
        return res.json({ success: true, scribble });
    }
);

// Delete specific page
router.options(
    "/page/delete",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/page/delete",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        let { fingerprint, scribble_id, page_number } = req.body || {};

        let loginTokenStr = req.cookies.btw_uuid;
        let exists = await doesLoginTokenExist(loginTokenStr, fingerprint);
        if (!exists) {
            return res
                .status(400)
                .json({ success: false, error: "Invalid login token" });
        }

        let user = await getUserFromToken(loginTokenStr, fingerprint);
        if (!user) {
            return res
                .status(400)
                .json({ success: false, error: "User not found" });
        }

        let scribble = await deleteScribblePage(user, scribble_id, page_number);
        return res.json({ success: true, scribble });
    }
);

module.exports = router;