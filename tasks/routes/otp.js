var express = require("express");
var router = express.Router();
var cors = require("cors");
const rateLimit = require("express-rate-limit");
var { generateOTP, validateOTP, deleteOTP } = require("../logic/otp");
var { createUser, createLoginToken } = require("../logic/user");
var { emailOTP } = require("../logic/email");

// Rate limiters for OTP endpoints
const otpGenerateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 requests per hour per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Too many OTP requests. Try again later." },
});

const otpValidateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per 15 min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Too many verification attempts. Try again later." },
});

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
    otpGenerateLimiter,
    async (req, res) => {
        let { email } = req.body;

        if (
            !Number(process.env.TURN_OFF_SINGLE_USER_MODE) &&
            process.env.ADMIN_EMAIL
        ) {
            // Single user mode is on
            email = process.env.ADMIN_EMAIL;
        }

        if (
            !Number(process.env.TURN_OFF_SINGLE_USER_MODE) &&
            process.env.ADMIN_OTP
        ) {
            // admin otp is set. no need to email it.
            res.json({
                success: true,
            });
            return;
        }

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
    otpValidateLimiter,
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
        res.cookie(process.env.BTW_UUID_KEY || "btw_uuid", loginToken, {
            maxAge: 1000 * 60 * 60 * 24 * 30,
            ...(process.env.NODE_ENV === "production"
                ? {
                      domain: `.${process.env.ROOT_DOMAIN}`,
                      secure: true,
                      sameSite: "lax",
                  }
                : {}),
        });

        await deleteOTP({ email });

        res.json({ success: true, data: { isValid } });
    }
);

module.exports = router;
