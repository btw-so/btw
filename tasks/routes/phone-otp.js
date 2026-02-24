var express = require("express");
var router = express.Router();
var cors = require("cors");
var { generateOTP, validateOTP, deleteOTP } = require("../logic/otp");
var {
    createUser,
    createLoginToken,
    setUserPhone,
    setUserTimezone,
} = require("../logic/user");
var { cleanPhoneNumber } = require("../logic/phone");
var { sendSMS } = require("../services/twilio");

const corsOptions = {
    credentials: true,
    origin: process.env.CORS_DOMAINS.split(","),
};

// Send OTP to phone number via SMS
router.options("/send", cors(corsOptions));
router.post("/send", cors(corsOptions), async (req, res) => {
    const { phone } = req.body;

    const {
        success,
        error,
        phone: cleanedPhone,
        email,
    } = cleanPhoneNumber(phone);

    if (!success) {
        return res.json({ success: false, error });
    }

    const otp = await generateOTP({ email });

    try {
        await sendSMS({
            to: cleanedPhone,
            body: `Your A1 verification code is: ${otp}`,
        });
    } catch (err) {
        console.log(`[PhoneOTP] SMS send error:`, err.message);
        return res.json({ success: false, error: "Failed to send SMS" });
    }

    res.json({ success: true });
});

// Verify OTP and create/login user
router.options("/verify", cors(corsOptions));
router.post("/verify", cors(corsOptions), async (req, res) => {
    const { phone, otp, fingerprint, timezone, timezoneOffsetInSeconds } =
        req.body;

    const {
        success,
        error,
        phone: cleanedPhone,
        email,
    } = cleanPhoneNumber(phone);

    if (!success) {
        return res.json({ success: false, error });
    }

    const isValid = await validateOTP({ email, otp });
    if (!isValid) {
        return res.json({
            success: false,
            error: "Expired or invalid OTP",
        });
    }

    try {
        const { userId, newUser } = await createUser({ email });

        if (newUser) {
            await setUserPhone({ user_id: userId, phone: cleanedPhone });
        }

        if (timezone && timezoneOffsetInSeconds !== undefined) {
            await setUserTimezone({
                user_id: userId,
                timezone,
                timezoneOffsetInSeconds,
            });
        }

        const ip_address =
            req.headers["x-forwarded-for"] || req.connection.remoteAddress;

        const token = await createLoginToken({
            email,
            fingerprint,
            ip_address,
        });

        // Set cookie for same-domain scenarios
        res.cookie(process.env.BTW_UUID_KEY || "btw_uuid", token, {
            maxAge: 1000 * 60 * 60 * 24 * 30,
            ...(process.env.NODE_ENV === "production"
                ? {
                      domain: `.${process.env.ROOT_DOMAIN}`,
                      secure: true,
                  }
                : {}),
        });

        await deleteOTP({ email });

        // Return token in body for cross-origin SPA usage
        res.json({
            success: true,
            data: { token, userId, isNewUser: newUser },
        });
    } catch (err) {
        console.log(`[PhoneOTP] Verify error:`, err.message);
        res.json({ success: false, error: err.message });
    }
});

module.exports = router;
