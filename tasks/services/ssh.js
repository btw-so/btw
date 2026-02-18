const { Client } = require("ssh2");

class SSHSession {
    constructor({ host, privateKey }) {
        this.host = host;
        this.privateKey = privateKey;
        this.client = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.client = new Client();
            this.client
                .on("ready", () => {
                    console.log(`[SSH] Connected to ${this.host}`);
                    resolve();
                })
                .on("error", (err) => reject(err))
                .connect({
                    host: this.host,
                    port: 22,
                    username: "root",
                    privateKey: this.privateKey,
                    readyTimeout: 10000,
                });
        });
    }

    async exec(command, { timeout = 30000 } = {}) {
        return new Promise((resolve, reject) => {
            let stdout = "";
            let stderr = "";
            let settled = false;

            const timer = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    reject(new Error(`Command timed out after ${timeout}ms`));
                }
            }, timeout);

            this.client.exec(command, (err, stream) => {
                if (err) {
                    clearTimeout(timer);
                    if (!settled) {
                        settled = true;
                        reject(err);
                    }
                    return;
                }

                stream.on("close", (code) => {
                    clearTimeout(timer);
                    if (!settled) {
                        settled = true;
                        resolve({ stdout, stderr, exitCode: code });
                    }
                });

                stream.on("data", (data) => {
                    stdout += data.toString();
                });

                stream.stderr.on("data", (data) => {
                    stderr += data.toString();
                });
            });
        });
    }

    async writeFile(path, content) {
        return new Promise((resolve, reject) => {
            this.client.sftp((err, sftp) => {
                if (err) return reject(err);

                // Ensure parent directory exists
                const dir = path.substring(0, path.lastIndexOf("/"));
                this.exec(`mkdir -p "${dir}"`, { timeout: 5000 })
                    .then(() => {
                        const writeStream = sftp.createWriteStream(path);
                        writeStream.on("close", () => {
                            sftp.end();
                            resolve();
                        });
                        writeStream.on("error", (err) => {
                            sftp.end();
                            reject(err);
                        });
                        writeStream.end(Buffer.from(content, "utf-8"));
                    })
                    .catch(reject);
            });
        });
    }

    async close() {
        if (this.client) {
            this.client.end();
            console.log(`[SSH] Disconnected from ${this.host}`);
        }
    }
}

module.exports = { SSHSession };
