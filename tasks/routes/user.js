var express = require("express");
var router = express.Router();
var cors = require("cors");
var {
    getUserFromToken,
    doesLoginTokenExist,
    setUserDetails,
    addUserDomain,
    getDomains,
    deleteLoginToken,
} = require("../logic/user");
var { createLoginToken } = require("../logic/user");


console.log("AAA", process.env.CORS_DOMAINS);

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
        const loginToken = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

        try {
            let user = await getUserFromToken({
                token: loginToken,
                fingerprint,
            });

            if (
                !Number(process.env.TURN_OFF_SINGLE_USER_MODE) &&
                !process.env.ADMIN_OTP &&
                !loginToken
            ) {
                // Single user mode and admin otp is not set and cookie uuid is not present
                // get ip address and user agent
                const ip_address =
                    req.headers["x-forwarded-for"] ||
                    req.connection.remoteAddress;

                // create a new login token with 30 days expiry time
                const loginToken = await createLoginToken({
                    email: process.env.ADMIN_EMAIL.split(",")[0],
                    fingerprint,
                    ip_address,
                });

                // set the login token in the cookie on the root domain (so that it can be accessed by all subdomains)
                res.cookie(process.env.BTW_UUID_KEY || "btw_uuid", loginToken, {
                    maxAge: 1000 * 60 * 60 * 24 * 30,
                    ...(process.env.NODE_ENV === "production"
                        ? {
                              domain: `.${process.env.ROOT_DOMAIN}`,
                              secure: true,
                              //   httpOnly: true,
                          }
                        : {}),
                });
            } else if (
                !Number(process.env.TURN_OFF_SINGLE_USER_MODE) &&
                !process.env.ADMIN_OTP &&
                loginToken
            ) {
                // single user mode. otp is not set. loginToken exists.
                // check that this logintoken exists. if it doesn't exist, then delete the cookie so that user state will be forced to be reset

                const loginTokenExists = await doesLoginTokenExist({
                    token: loginToken,
                    fingerprint,
                });

                if (!loginTokenExists) {
                    // delete the cookie if user is not logged in
                    res.clearCookie(process.env.BTW_UUID_KEY || "btw_uuid", {
                        ...(process.env.NODE_ENV === "production"
                            ? {
                                  domain: `.${process.env.ROOT_DOMAIN}`,
                                  secure: true,
                                  //   httpOnly: true,
                              }
                            : {}),
                    });

                    res.json({
                        error: "User not logged in",
                        success: false,
                        data: {
                            user: null,
                            isLoggedIn: false,
                        },
                    });
                    return;
                } else {
                    // we are sorted. login token exists
                }
            }

            if (user) {
                const { domains, success } = await getDomains({
                    user_id: user.id,
                });
                if (success) {
                    user.domains = domains;
                } else {
                    user.domains = [];
                }
                res.json({ success: true, data: { user, isLoggedIn: true } });
            } else {
                // delete the cookie if user is not logged in
                res.clearCookie(process.env.BTW_UUID_KEY || "btw_uuid", {
                    ...(process.env.NODE_ENV === "production"
                        ? {
                              domain: `.${process.env.ROOT_DOMAIN}`,
                              secure: true,
                              //   httpOnly: true,
                          }
                        : {}),
                });

                res.json({
                    success: false,
                    error: "User not logged in",
                    data: { user: null, isLoggedIn: false },
                });
            }
        } catch (e) {
            console.log(e);
            // delete the cookie if user is not logged in
            res.clearCookie(process.env.BTW_UUID_KEY || "btw_uuid", {
                ...(process.env.NODE_ENV === "production"
                    ? {
                          domain: `.${process.env.ROOT_DOMAIN}`,
                          secure: true,
                          //   httpOnly: true,
                      }
                    : {}),
            });

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
            settings,
        } = req.body || {};

        // get loginToken as btw_uuid cookie
        const token = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

        try {
            const user = await getUserFromToken({
                token,
                fingerprint,
            });

            if (!user) {
                throw new Error("User not found");
            }

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
                    settings,
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
        const token = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

        try {
            const user = await getUserFromToken({
                token,
                fingerprint,
            });

            if (!user) {
                throw new Error("User not found");
            }

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

// API to logout user
router.options(
    "/logout",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/logout",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { fingerprint } = req.body || {};
        // get loginToken as btw_uuid cookie
        const loginToken = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];
        if (loginToken) {
            await deleteLoginToken({ token: loginToken, fingerprint });
        }
        res.clearCookie(
            process.env.BTW_UUID_KEY || "btw_uuid",
            {
                ...(process.env.NODE_ENV === "production"
                    ? {
                          domain: `.${process.env.ROOT_DOMAIN}`,
                          secure: true,
                          //   httpOnly: true,
                      }
                    : {}),
            }
        );
        res.json({ success: true });
    }
);

module.exports = router;
