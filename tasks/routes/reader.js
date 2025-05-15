var express = require("express");
var router = express.Router();
var cors = require("cors");
var {
    addBook,
    updateBook,
    getBooks,
    addReadingSession,
    getReadingStats,
} = require("../logic/reader");
var { getUserFromToken, doesLoginTokenExist } = require("../logic/user");

// Add a new book
router.options(
    "/books/add",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/books/add",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const {
            fingerprint,
            title,
            author,
            cover_image,
            status,
            start_date,
            end_date,
        } = req.body || {};

        let user;

        const loginToken = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

        console.log("loginToken", loginToken, fingerprint);

        try {
            user = await getUserFromToken({
                token: loginToken,
                fingerprint,
            });

            console.log("user", user);

            if (!user) {
                res.json({ success: false, error: "User not found" });
                return;
            }

            const book = await addBook({
                user_id: user.id,
                title,
                author,
                cover_image,
                status,
                start_date,
                end_date,
            });
            res.json({ success: true, data: book });
        } catch (e) {
            console.error(e);
            res.json({ success: false, error: "Error adding book" });
            return;
        }
    }
);

router.options(
    "/books/all",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);

// Get all books
router.post(
    "/books/all",
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
                res.json({ success: false, error: "User not found" });
                return;
            }
            const books = await getBooks({ user_id: user.id });
            res.json({ success: true, data: books });
        } catch (e) {
            console.error(e);
            res.json({ success: false, error: "Error fetching books" });
        }
    }
);

// Update book status
router.options(
    "/books/:id",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/books/:id",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { fingerprint } = req.body || {};

        let user;

        const loginToken = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

        const { id } = req.params;
        const { title, author, cover_image, status, start_date, end_date } =
            req.body;

        try {
            user = await getUserFromToken({
                token: loginToken,
                fingerprint,
            });

            if (!user) {
                res.json({ success: false, error: "User not found" });
                return;
            }

            const book = await updateBook({
                user_id: user.id,
                book_id: id,
                title,
                author,
                cover_image,
                status,
                start_date,
                end_date,
            });
            res.json({ success: true, data: book });
        } catch (e) {
            console.error(e);
            res.json({ success: false, error: "Error updating book status" });
        }
    }
);

// Add reading session
router.options(
    "/books/:id/sessions",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/books/:id/sessions",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { id } = req.params;
        const { minutes_read } = req.body;
        const user_id = req.user.id;

        const { fingerprint } = req.body || {};

        let user;

        const loginToken = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

        try {
            user = await getUserFromToken({
                token: loginToken,
                fingerprint,
            });

            if (!user) {
                res.json({ success: false, error: "User not found" });
                return;
            }
            await addReadingSession({
                user_id: user.id,
                book_id: id,
                minutes_read,
            });
            res.json({ success: true });
        } catch (e) {
            console.error(e);
            res.json({ success: false, error: "Error adding reading session" });
        }
    }
);

router.options(
    "/stats",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);

// Get reading stats
router.post(
    "/stats",
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
                res.json({ success: false, error: "User not found" });
                return;
            }

            const stats = await getReadingStats({ user_id: user.id });
            res.json({ success: true, data: stats });
        } catch (e) {
            console.error(e);
            res.json({
                success: false,
                error: "Error fetching reading stats",
            });
        }
    }
);

module.exports = router;
