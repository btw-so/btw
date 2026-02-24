"use strict";

const { getUserFromToken } = require("./user");

async function webAuth(req, res, next) {
    try {
        // Extract token from Authorization header or cookie
        let token = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.slice(7);
        }
        if (!token) {
            token = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];
        }

        // Extract fingerprint from header or body
        const fingerprint = req.headers["x-fingerprint"] || req.body?.fingerprint;

        if (!token || !fingerprint) {
            return res.status(401).json({ success: false, error: "Authentication required" });
        }

        const user = await getUserFromToken({ token, fingerprint });
        if (!user) {
            return res.status(401).json({ success: false, error: "Invalid or expired token" });
        }

        req.user = user;
        req.authToken = token;
        next();
    } catch (err) {
        console.log(`[WebAuth] Error:`, err.message);
        res.status(500).json({ success: false, error: "Authentication error" });
    }
}

module.exports = { webAuth };
