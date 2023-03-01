const redis = require("redis");

class RedisPublisher {
    async getTasksPublisher() {
        if (!this.publisher) {
            this.publisher = redis.createClient({
                url: process.env.TASKS_REDIS_URL,
            });

            console.log("Redis tasks publisher created");
            this.publisher.on("error", (err) =>
                console.log("Redis Client Error", err)
            );

            // Publisher.connect() is not required in v3.0.2 of redis library
            // but it is a part of v4.0.1 repo
            // await this.publisher.connect();
        }

        return this.publisher;
    }

    async init() {
        await this.getTasksPublisher();
    }
}

const redisPublisherInstance = new RedisPublisher();
redisPublisherInstance.init();

module.exports = redisPublisherInstance;
