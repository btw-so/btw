var express = require("express");
var router = express.Router();
var cors = require("cors");
var path = require("path");
var { webAuth } = require("../logic/webAuth");
var { getSandbox } = require("../logic/sandbox");
var { SSHSession } = require("../services/ssh");

const corsOptions = {
    credentials: true,
    origin: process.env.CORS_DOMAINS.split(","),
};
router.use(cors(corsOptions));

function shellQuote(s) {
    return "'" + s.replace(/'/g, "'\"'\"'") + "'";
}

function validateSandboxPath(rawPath) {
    if (!rawPath) return "/root";
    const resolved = path.posix.resolve("/root", rawPath);
    const allowed = ["/root", "/tmp", "/home", "/opt", "/var", "/usr/local"];
    if (!allowed.some((p) => resolved === p || resolved.startsWith(p + "/"))) {
        return null;
    }
    return resolved;
}

async function getSession(user) {
    if (!user.pro) return null;
    let sandbox;
    try {
        sandbox = await getSandbox({ user_id: user.id });
    } catch (_) {}
    if (!sandbox) return null;
    const session = new SSHSession({
        host: sandbox.ipv4,
        privateKey: sandbox.ssh_private_key,
    });
    await session.connect();
    return session;
}

// GET /sandbox-fs/list?path=/root&showHidden=true
router.get("/list", webAuth, async (req, res) => {
    let session;
    try {
        session = await getSession(req.user);
        if (!session)
            return res.json({ success: false, error: "Sandbox not available" });

        const dirPath = validateSandboxPath(req.query.path);
        if (!dirPath)
            return res
                .status(400)
                .json({ success: false, error: "Invalid path" });

        const showHidden = req.query.showHidden === "true";
        const hiddenFilter = showHidden ? "" : '! -name ".*"';

        const { stdout } = await session.exec(
            `find ${shellQuote(dirPath)} -maxdepth 1 -mindepth 1 ${hiddenFilter} -printf '%y\\t%f\\n' 2>/dev/null | sort -t$'\\t' -k1,1 -k2,2`,
            { timeout: 10000 }
        );

        const entries = (stdout || "")
            .trim()
            .split("\n")
            .filter(Boolean)
            .map((line) => {
                const tab = line.indexOf("\t");
                const type = line.slice(0, tab);
                const name = line.slice(tab + 1);
                return {
                    name,
                    type: type === "d" ? "directory" : "file",
                    path: path.posix.join(dirPath, name),
                };
            });

        res.json({ success: true, data: { path: dirPath, entries } });
    } catch (err) {
        console.log("[SandboxFS] List error:", err.message);
        res.status(500).json({
            success: false,
            error: "Failed to list directory",
        });
    } finally {
        if (session) await session.close();
    }
});

// GET /sandbox-fs/read?path=/root/file.txt
router.get("/read", webAuth, async (req, res) => {
    let session;
    try {
        session = await getSession(req.user);
        if (!session)
            return res.json({ success: false, error: "Sandbox not available" });

        const filePath = validateSandboxPath(req.query.path);
        if (!filePath)
            return res
                .status(400)
                .json({ success: false, error: "Invalid path" });

        const { stdout, stderr, exitCode } = await session.exec(
            `cat ${shellQuote(filePath)}`,
            { timeout: 15000 }
        );

        if (exitCode !== 0) {
            return res.status(404).json({
                success: false,
                error: stderr?.trim() || "File not found",
            });
        }

        res.json({ success: true, data: { path: filePath, content: stdout } });
    } catch (err) {
        console.log("[SandboxFS] Read error:", err.message);
        res.status(500).json({
            success: false,
            error: "Failed to read file",
        });
    } finally {
        if (session) await session.close();
    }
});

// GET /sandbox-fs/raw?path=/root/image.png
router.get("/raw", webAuth, async (req, res) => {
    let session;
    try {
        session = await getSession(req.user);
        if (!session) return res.status(404).send("Sandbox not available");

        const filePath = validateSandboxPath(req.query.path);
        if (!filePath) return res.status(400).send("Invalid path");

        const { stdout, exitCode } = await session.exec(
            `base64 -w0 ${shellQuote(filePath)}`,
            { timeout: 30000 }
        );

        if (exitCode !== 0 || !stdout) {
            return res.status(404).send("File not found");
        }

        const buffer = Buffer.from(stdout, "base64");
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".svg": "image/svg+xml",
            ".bmp": "image/bmp",
            ".ico": "image/x-icon",
            ".pdf": "application/pdf",
            ".mp3": "audio/mpeg",
            ".wav": "audio/wav",
            ".ogg": "audio/ogg",
            ".flac": "audio/flac",
            ".aac": "audio/aac",
            ".m4a": "audio/mp4",
        };

        res.set("Content-Type", mimeTypes[ext] || "application/octet-stream");
        res.set("Content-Length", buffer.length);
        res.set("Cache-Control", "no-cache");
        res.send(buffer);
    } catch (err) {
        console.log("[SandboxFS] Raw error:", err.message);
        res.status(500).send("Failed to read file");
    } finally {
        if (session) await session.close();
    }
});

// GET /sandbox-fs/download?path=/root/mydir
router.get("/download", webAuth, async (req, res) => {
    let session;
    try {
        session = await getSession(req.user);
        if (!session) return res.status(404).send("Sandbox not available");

        const targetPath = validateSandboxPath(req.query.path);
        if (!targetPath) return res.status(400).send("Invalid path");

        const baseName = path.posix.basename(targetPath);

        const { stdout: typeCheck } = await session.exec(
            `test -d ${shellQuote(targetPath)} && echo dir || echo file`,
            { timeout: 5000 }
        );

        if (typeCheck.trim() === "dir") {
            const parentDir = path.posix.dirname(targetPath);
            const { stdout, exitCode } = await session.exec(
                `tar czf - -C ${shellQuote(parentDir)} ${shellQuote(baseName)} | base64 -w0`,
                { timeout: 60000 }
            );

            if (exitCode !== 0 || !stdout) {
                return res.status(500).send("Failed to create archive");
            }

            const buffer = Buffer.from(stdout, "base64");
            res.set("Content-Type", "application/gzip");
            res.set(
                "Content-Disposition",
                `attachment; filename="${baseName}.tar.gz"`
            );
            res.set("Content-Length", buffer.length);
            res.send(buffer);
        } else {
            const { stdout, exitCode } = await session.exec(
                `base64 -w0 ${shellQuote(targetPath)}`,
                { timeout: 30000 }
            );

            if (exitCode !== 0 || !stdout) {
                return res.status(404).send("File not found");
            }

            const buffer = Buffer.from(stdout, "base64");
            res.set("Content-Type", "application/octet-stream");
            res.set(
                "Content-Disposition",
                `attachment; filename="${baseName}"`
            );
            res.set("Content-Length", buffer.length);
            res.send(buffer);
        }
    } catch (err) {
        console.log("[SandboxFS] Download error:", err.message);
        res.status(500).send("Failed to download");
    } finally {
        if (session) await session.close();
    }
});

module.exports = router;
