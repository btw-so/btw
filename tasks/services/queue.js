var Queue = require("bull");

var baseQueue = new Queue("base-queue", `${process.env.TASKS_REDIS_URL}2`);
var alertsQueue = new Queue("alerts-queue", `${process.env.TASKS_REDIS_URL}2`);
var uxQueue = new Queue("ux-queue", `${process.env.TASKS_REDIS_URL}2`);

module.exports = {
    baseQueue,
    alertsQueue,
    uxQueue,
};