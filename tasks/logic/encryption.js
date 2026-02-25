"use strict";
const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey() {
    const key = process.env.SSH_KEY_ENCRYPTION_KEY;
    if (!key) {
        return null;
    }
    // Key must be 32 bytes (256 bits) — accept hex or base64
    if (key.length === 64) return Buffer.from(key, "hex");
    if (key.length === 44) return Buffer.from(key, "base64");
    throw new Error("SSH_KEY_ENCRYPTION_KEY must be 32 bytes (64 hex chars or 44 base64 chars)");
}

function encrypt(plaintext) {
    const key = getEncryptionKey();
    if (!key) return plaintext; // No encryption key configured — store plaintext
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");
    // Format: iv:authTag:ciphertext
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

function decrypt(encryptedStr) {
    const key = getEncryptionKey();
    if (!key) return encryptedStr; // No encryption key configured — return as-is
    const parts = encryptedStr.split(":");
    if (parts.length !== 3) {
        // Likely a plaintext key (pre-migration) — return as-is
        return encryptedStr;
    }
    const [ivHex, authTagHex, ciphertext] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}

module.exports = { encrypt, decrypt };
