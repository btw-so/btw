const fetch = require("node-fetch");

const HETZNER_API = "https://api.hetzner.cloud/v1";

function getHeaders() {
    return {
        Authorization: `Bearer ${process.env.HETZNER_API_TOKEN}`,
        "Content-Type": "application/json",
    };
}

async function createServer({ name, serverType, image, location, sshKeyIds, labels, userData }) {
    const resp = await fetch(`${HETZNER_API}/servers`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            name,
            server_type: serverType || process.env.SANDBOX_SERVER_TYPE || "cx23",
            image: image || process.env.SANDBOX_IMAGE || "ubuntu-24.04",
            location: location || process.env.SANDBOX_LOCATION || "nbg1",
            ssh_keys: sshKeyIds || [],
            labels: labels || {},
            user_data: userData || "",
            start_after_create: true,
        }),
    });

    const data = await resp.json();
    if (!resp.ok) {
        throw new Error(`Hetzner createServer failed: ${JSON.stringify(data)}`);
    }
    return data;
}

async function deleteServer({ serverId }) {
    const resp = await fetch(`${HETZNER_API}/servers/${serverId}`, {
        method: "DELETE",
        headers: getHeaders(),
    });

    if (!resp.ok) {
        const data = await resp.json();
        throw new Error(`Hetzner deleteServer failed: ${JSON.stringify(data)}`);
    }
    return true;
}

async function getServer({ serverId }) {
    const resp = await fetch(`${HETZNER_API}/servers/${serverId}`, {
        method: "GET",
        headers: getHeaders(),
    });

    const data = await resp.json();
    if (!resp.ok) {
        throw new Error(`Hetzner getServer failed: ${JSON.stringify(data)}`);
    }
    return data.server;
}

async function createSSHKey({ name, publicKey }) {
    const resp = await fetch(`${HETZNER_API}/ssh_keys`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            name,
            public_key: publicKey,
        }),
    });

    const data = await resp.json();
    if (!resp.ok) {
        throw new Error(`Hetzner createSSHKey failed: ${JSON.stringify(data)}`);
    }
    return data.ssh_key;
}

async function deleteSSHKey({ keyId }) {
    const resp = await fetch(`${HETZNER_API}/ssh_keys/${keyId}`, {
        method: "DELETE",
        headers: getHeaders(),
    });

    if (!resp.ok) {
        const data = await resp.json();
        throw new Error(`Hetzner deleteSSHKey failed: ${JSON.stringify(data)}`);
    }
    return true;
}

module.exports = {
    createServer,
    deleteServer,
    getServer,
    createSSHKey,
    deleteSSHKey,
};
