const Redis = require("ioredis");

class RedisClient {
    constructor() {
        this.client = null;
    }

    getClient() {
        if (!this.client) {
            // Use database 3 to avoid conflicts with Bull queues (which use database 2)
            // Use same format as Bull queues in queue.js
            const redisUrl = `${process.env.TASKS_REDIS_URL}3`;

            this.client = new Redis(redisUrl);

            this.client.on("error", (err) => {
                console.error("Redis Client Error:", err);
            });

            this.client.on("connect", () => {
                console.log("Redis Client Connected to database 3");
            });
        }

        return this.client;
    }

    async set(key, value, expiryInSeconds) {
        const client = this.getClient();
        if (expiryInSeconds) {
            return await client.set(key, value, "EX", expiryInSeconds);
        }
        return await client.set(key, value);
    }

    async get(key) {
        const client = this.getClient();
        return await client.get(key);
    }

    async del(key) {
        const client = this.getClient();
        return await client.del(key);
    }

    async exists(key) {
        const client = this.getClient();
        return await client.exists(key);
    }
}

const redisClient = new RedisClient();

module.exports = redisClient;
