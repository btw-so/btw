var Queue = require("bull");

var baseQueue = new Queue("base-queue", `${process.env.TASKS_REDIS_URL}2`, {
    redis: { tls: true, enableTLSForSentinelMode: false },
});

module.exports = {
    baseQueue,
};
