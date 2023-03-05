var express = require("express");
var router = express.Router();
var cors = require("cors");
var { getUserFromToken, setUserDetails } = require("../logic/user");

// API to fetch user data
// also tells if user is logged in currently or not
router.options(
    "/details",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/details",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { fingerprint } = req.body || {};

        // get loginToken as btw_uuid cookie
        const loginToken = req.cookies.btw_uuid;

        try {
            const user = await getUserFromToken({
                token: loginToken,
                fingerprint,
            });
            res.json({ success: true, data: { user, isLoggedIn: true } });
        } catch (e) {
            res.json({
                success: false,
                data: { user: null, isLoggedIn: false },
                error: e,
            });
            return;
        }
    }
);

// API to update user data
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
        const { fingerprint, name, slug } = req.body || {};

        // get loginToken as btw_uuid cookie
        const loginToken = req.cookies.btw_uuid;

        try {
            const user = await getUserFromToken({
                loginToken,
                fingerprint,
            });

            await setUserDetails({
                userId: user.id,
                name,
                slug,
            });

            res.json({ success: true });
        } catch (e) {
            res.json({
                success: false,
                error: e,
            });
            return;
        }
    }
);

module.exports = router;
