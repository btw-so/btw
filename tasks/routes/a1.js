var express = require("express");
var router = express.Router();
var cors = require("cors");
var { getUserFromToken } = require("../logic/user");
var { fetchUserChats } = require("../logic/telegram");

const isAdminEmail = (email) => {
    const emails = [
        "sid@adaface.com",
        "siddhartha.gunti191@gmail.com",
        "deepti@adaface.com",
    ];

    return emails.includes(email);
};

router.options(
    "/thread/telegram/fetch",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
);
router.post(
    "/thread/telegram/fetch",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        let {
            fingerprint,
            thread,
            loginToken,
            user_id,
            chat_id,
            before,
            after,
            limit,
        } = req.body || {};

        // get loginToken as sd_uuid cookie
        loginToken =
            loginToken || req.cookies[process.env.SD_UUID_KEY || "sd_uuid"];

        try {
            let user = await getUserFromToken({
                token: loginToken,
                fingerprint,
            });

            if (!user) {
                res.json({
                    success: false,
                    error: "User not logged in",
                });
                return;
            }

            user_id = Number(user_id);

            if (!isAdminEmail(user.email) && user_id !== user.id) {
                res.json({
                    success: false,
                    error: "User not authorized",
                });
                return;
            }

            const {
                success,
                chats,
                chatId: potentialNewChatId,
            } = await fetchUserChats({
                userId: user_id || user.id,
                chatId: chat_id,
                before,
                after,
                limit,
            });

            res.json({
                success,
                chats,
                userId: user_id || user.id,
                chatId: potentialNewChatId,
            });
        } catch (e) {
            console.log(e);
            res.json({
                success: false,
                error: e.message,
            });
            return;
        }
    },
);

module.exports = router;
