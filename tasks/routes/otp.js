var express = require("express");
var router = express.Router();
var cors = require("cors");
var { generateOTP, validateOTP, deleteOTP } = require("../logic/otp");
var { createUser, createLoginToken } = require("../logic/user");
var { emailOTP } = require("../logic/email");

// create an api to generate otp
router.options(
    "/generate",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/generate",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { email } = req.body;

        // check that otp is in right format
        if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            res.json({
                success: false,
                data: { isValid: false },
                error: "Invalid email",
            });
            return;
        }

        const otp = await generateOTP({ email });

        emailOTP({ email, otp });

        res.json({ success: true });
    }
);

// create an api to validate otp
router.options(
    "/validate",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/validate",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { email, otp, fingerprint } = req.body;
        const isValid = await validateOTP({ email, otp });

        if (!isValid) {
            res.json({
                success: false,
                data: { isValid },
                error: "Expired or invalid OTP",
            });
            return;
        }

        // create user if does not exist
        try {
            await createUser({ email });
        } catch (e) {
            console.log(e);
            res.send({
                success: false,
                data: { isValid },
                error: "Error creating user",
            });
        }

        // get ip address and user agent
        const ip_address =
            req.headers["x-forwarded-for"] || req.connection.remoteAddress;

        // create a new login token with 30 days expiry time
        const loginToken = await createLoginToken({
            email,
            fingerprint,
            ip_address,
        });

        // set the login token in the cookie on the root domain (so that it can be accessed by all subdomains)
        res.cookie("btw_uuid", loginToken, {
            maxAge: 1000 * 60 * 60 * 24 * 30,
            ...(process.env.NODE_ENV === "production"
                ? {
                      domain: `.${process.env.ROOT_DOMAIN}`,
                      secure: true,
                      httpOnly: true,
                  }
                : {}),
        });

        await deleteOTP({ email });

        res.json({ success: true, data: { isValid } });
    }
);

module.exports = router;
