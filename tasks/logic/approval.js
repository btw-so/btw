const { v4: uuidv4 } = require("uuid");
const redisClient = require("../services/redis");
const { sendMessageToUserOnTelegram } = require("./telegram");

const APPROVAL_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
const POLL_INTERVAL_MS = 1000; // 1 second

function formatToolPreview(toolName, args) {
    switch (toolName) {
        case "sandbox_bash":
            return `$ ${args.command}`;
        case "sandbox_write": {
            const preview = args.content.length > 200
                ? args.content.slice(0, 200) + "...[truncated]"
                : args.content;
            return `Write: ${args.file_path}\n---\n${preview}`;
        }
        case "sandbox_edit": {
            const oldPreview = args.old_string.length > 100
                ? args.old_string.slice(0, 100) + "..."
                : args.old_string;
            const newPreview = args.new_string.length > 100
                ? args.new_string.slice(0, 100) + "..."
                : args.new_string;
            return `Edit: ${args.file_path}\n- ${oldPreview}\n+ ${newPreview}`;
        }
        default:
            return JSON.stringify(args, null, 2).slice(0, 300);
    }
}

async function requestApproval({ chatId, toolName, toolArgs }) {
    const approvalId = uuidv4();
    const preview = formatToolPreview(toolName, toolArgs);

    // Store pending status in Redis with TTL
    const ttlSeconds = Math.ceil(APPROVAL_TIMEOUT_MS / 1000) + 30;
    await redisClient.set(`approval:${approvalId}`, "pending", ttlSeconds);

    // Send approval request to Telegram
    await sendMessageToUserOnTelegram({
        chatId,
        message: `Tool: ${toolName}\n\n${preview}\n\nApprove this action?`,
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "✅ Approve",
                        callback_data: `approval:approve:${approvalId}`,
                    },
                    {
                        text: "❌ Deny",
                        callback_data: `approval:deny:${approvalId}`,
                    },
                ],
            ],
        },
    });

    return approvalId;
}

async function waitForApproval(approvalId) {
    const start = Date.now();

    while (Date.now() - start < APPROVAL_TIMEOUT_MS) {
        const val = await redisClient.get(`approval:${approvalId}`);

        if (val === "approved") {
            await redisClient.del(`approval:${approvalId}`);
            return "approved";
        }
        if (val === "denied") {
            await redisClient.del(`approval:${approvalId}`);
            return "denied";
        }
        if (!val) {
            // Key expired
            return "denied";
        }

        // Wait before polling again
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }

    // Timeout — treat as denied
    await redisClient.del(`approval:${approvalId}`);
    return "denied";
}

async function resolveApproval({ approvalId, decision }) {
    // decision should be "approved" or "denied"
    await redisClient.set(`approval:${approvalId}`, decision, 30);
}

module.exports = {
    requestApproval,
    waitForApproval,
    resolveApproval,
    APPROVAL_TIMEOUT_MS,
};
