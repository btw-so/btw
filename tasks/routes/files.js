var express = require("express");
var router = express.Router();
var cors = require("cors");
var { getUserFromToken, doesLoginTokenExist } = require("../logic/user");
var { addFile, getFile } = require("../logic/files");

router.options(
    "/get-by-id",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/get-by-id",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { fingerprint, file_id, user_id } = req.body || {};

        // get loginToken as btw_uuid cookie
        const loginToken = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

        try {
            const user = await getUserFromToken({
                token: loginToken,
                fingerprint,
            });
            const file = await getFile({
                user_id: user.id,
                file_id,
            });
            res.json({
                success: true,
                data: { file },
            });
        } catch (e) {
            res.json({
                success: false,
                data: { file: null },
                error: e,
            });
            return;
        }
    }
);


router.options(
    "/add-file",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/add-file",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { fingerprint, id, url, user_id, name } = req.body || {};

        // get loginToken as btw_uuid cookie
        const loginToken = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

        try {
            const user = await getUserFromToken({
                token: loginToken,
                fingerprint,
            });
            const file_id = await addFile({
                url,
                user_id,
                name,
                id
            });
            res.json({
                success: true,
                data: { file_id },
            });
        } catch (e) {
            res.json({
                success: false,
                data: { file_id: null },
                error: e,
            });
            return;
        }
    }
);


module.exports = router;
