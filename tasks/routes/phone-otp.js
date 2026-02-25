var express = require("express");
var router = express.Router();
var cors = require("cors");
var { generateOTP, validateOTP, deleteOTP } = require("../logic/otp");
var {
    createUser,
    createLoginToken,
    setUserPhone,
    setUserTimezone,
    getUserByPhone,
} = require("../logic/user");
var { cleanPhoneNumber } = require("../logic/phone");
var { sendSMS } = require("../services/twilio");
var db = require("../services/db");

const corsOptions = {
    credentials: true,
    origin: process.env.CORS_DOMAINS.split(","),
};

// Try to send OTP via Telegram if user has a linked Telegram account
async function sendOTPViaTelegram({ userId, otp }) {
    const tasksDB = await db.getTasksDB();
    const { rows } = await tasksDB.query(
        `SELECT telegram_id FROM btw.telegram_user_map WHERE user_id = $1 LIMIT 1`,
        [userId]
    );
    if (rows.length === 0) return false;

    const chatId = rows[0].telegram_id;
    const fetch = require("node-fetch");
    const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

    const resp = await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatId,
            text: `🔐 Your A1 web login code is: <b>${otp}</b>\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
            parse_mode: "HTML",
        }),
    });
    const body = await resp.json();
    return body.ok === true;
}

// Send OTP to phone number — prefer Telegram, fall back to SMS
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

    // Check if user exists and has Telegram linked
    const existingUser = await getUserByPhone({ phone: cleanedPhone });
    if (existingUser) {
        try {
            const sent = await sendOTPViaTelegram({ userId: existingUser.id, otp });
            if (sent) {
                console.log(`[PhoneOTP] OTP sent via Telegram for ${cleanedPhone}`);
                return res.json({ success: true, method: "telegram" });
            }
        } catch (err) {
            console.log(`[PhoneOTP] Telegram send failed, falling back to SMS:`, err.message);
        }
    }

    // Fall back to SMS
    try {
        await sendSMS({
            to: cleanedPhone,
            body: `Your A1 verification code is: ${otp}`,
        });
    } catch (err) {
        console.log(`[PhoneOTP] SMS send error:`, err.message);
        return res.json({ success: false, error: "Failed to send SMS" });
    }

    res.json({ success: true, method: "sms" });
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
