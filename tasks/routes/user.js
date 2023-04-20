var express = require("express");
var router = express.Router();
var cors = require("cors");
var {
    getUserFromToken,
    setUserDetails,
    addUserDomain,
    getDomains,
} = require("../logic/user");

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
            let user = await getUserFromToken({
                token: loginToken,
                fingerprint,
            });

            const { domains, success } = await getDomains({ user_id: user.id });
            if (success) {
                user.domains = domains;
            } else {
                user.domains = [];
            }

            res.json({ success: true, data: { user, isLoggedIn: true } });
        } catch (e) {
            res.json({
                success: false,
                data: { user: null, isLoggedIn: false },
                error: e.message,
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
        const {
            fingerprint,
            name,
            slug,
            bio,
            pic,
            twitter,
            linkedin,
            instagram,
        } = req.body || {};

        // get loginToken as btw_uuid cookie
        const token = req.cookies.btw_uuid;

        try {
            const user = await getUserFromToken({
                token,
                fingerprint,
            });

            res.json(
                await setUserDetails({
                    user_id: user.id,
                    name,
                    slug,
                    bio,
                    pic,
                    twitter,
                    linkedin,
                    instagram,
                })
            );
        } catch (e) {
            res.json({
                success: false,
                error: e.message,
            });
            return;
        }
    }
);

// API to add custom domain
router.options(
    "/add/domain",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/add/domain",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { fingerprint, domain } = req.body || {};

        // get loginToken as btw_uuid cookie
        const token = req.cookies.btw_uuid;

        try {
            const user = await getUserFromToken({
                token,
                fingerprint,
            });

            res.send(
                await addUserDomain({
                    user_id: user.id,
                    domain,
                })
            );
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
