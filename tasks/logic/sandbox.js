const crypto = require("crypto");
const db = require("../services/db");
const { createServer, deleteServer, getServer, createSSHKey, deleteSSHKey } = require("../services/hetzner");

async function provisionSandbox({ user_id }) {
    console.log(`[Sandbox] Provisioning sandbox for user ${user_id}`);

    // Generate SSH keypair (pkcs1 format for ssh2 compatibility)
    const { privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 4096,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs1", format: "pem" },
    });

    // Derive OpenSSH public key from private key using ssh-keygen
    const { execSync } = require("child_process");
    const fs = require("fs");
    const tmpPriv = `/tmp/a1_key_${user_id}_${Date.now()}`;
    fs.writeFileSync(tmpPriv, privateKey, { mode: 0o600 });
    const sshPubKey = execSync(`ssh-keygen -y -f ${tmpPriv}`).toString().trim() + ` a1-sandbox-${user_id}`;
    fs.unlinkSync(tmpPriv);

    const serverName = `a1-sandbox-${user_id}-${Date.now()}`;

    // Upload SSH key to Hetzner
    let hetznerSSHKey;
    try {
        hetznerSSHKey = await createSSHKey({
            name: `a1-sandbox-${user_id}`,
            publicKey: sshPubKey,
        });
    } catch (err) {
        // Key might already exist, try to proceed without it
        console.log(`[Sandbox] SSH key upload failed (may already exist): ${err.message}`);
    }

    // User data script to set up the sandbox
    const userData = `#!/bin/bash
apt-get update -y
apt-get install -y curl wget git build-essential python3 python3-pip nodejs npm
`;

    // Create server
    const result = await createServer({
        name: serverName,
        sshKeyIds: hetznerSSHKey ? [hetznerSSHKey.id] : [],
        labels: { purpose: "a1-sandbox", user_id: String(user_id) },
        userData,
    });

    const server = result.server;

    // Save to DB
    const tasksDB = await db.getTasksDB();
    await tasksDB.query(
        `INSERT INTO btw.sandboxes (user_id, hetzner_server_id, server_name, ipv4, status, ssh_private_key, ssh_public_key)
         VALUES ($1, $2, $3, $4, 'provisioning', $5, $6)
         ON CONFLICT (user_id) DO UPDATE SET
            hetzner_server_id = $2, server_name = $3, ipv4 = $4,
            status = 'provisioning', ssh_private_key = $5, ssh_public_key = $6,
            updated_at = NOW()`,
        [
            user_id,
            server.id,
            serverName,
            server.public_net?.ipv4?.ip || "pending",
            privateKey,
            sshPubKey,
        ]
    );

    console.log(`[Sandbox] Server ${server.id} created for user ${user_id}`);
    return { serverId: server.id, serverName };
}

async function checkSandboxReady({ user_id }) {
    const tasksDB = await db.getTasksDB();
    const { rows } = await tasksDB.query(
        `SELECT * FROM btw.sandboxes WHERE user_id = $1 AND status = 'provisioning'`,
        [user_id]
    );

    if (rows.length === 0) return null;

    const sandbox = rows[0];
    const server = await getServer({ serverId: sandbox.hetzner_server_id });

    if (server.status === "running") {
        // Update sandbox record with final IP
        const ipv4 = server.public_net?.ipv4?.ip || sandbox.ipv4;
        await tasksDB.query(
            `UPDATE btw.sandboxes SET status = 'ready', ipv4 = $1, updated_at = NOW()
             WHERE user_id = $2`,
            [ipv4, user_id]
        );
        console.log(`[Sandbox] Server ready for user ${user_id} at ${ipv4}`);
        return { ready: true, ipv4 };
    }

    return { ready: false, serverStatus: server.status };
}

async function destroySandbox({ user_id }) {
    console.log(`[Sandbox] Destroying sandbox for user ${user_id}`);

    const tasksDB = await db.getTasksDB();
    const { rows } = await tasksDB.query(
        `SELECT * FROM btw.sandboxes WHERE user_id = $1 AND status IN ('provisioning', 'ready')`,
        [user_id]
    );

    if (rows.length === 0) {
        console.log(`[Sandbox] No active sandbox found for user ${user_id}`);
        return;
    }

    const sandbox = rows[0];

    try {
        await deleteServer({ serverId: sandbox.hetzner_server_id });
    } catch (err) {
        console.log(`[Sandbox] Failed to delete Hetzner server: ${err.message}`);
    }

    await tasksDB.query(
        `UPDATE btw.sandboxes SET status = 'destroyed', updated_at = NOW()
         WHERE user_id = $1 AND hetzner_server_id = $2`,
        [user_id, sandbox.hetzner_server_id]
    );

    console.log(`[Sandbox] Sandbox destroyed for user ${user_id}`);
}

async function getSandbox({ user_id }) {
    const tasksDB = await db.getTasksDB();
    const { rows } = await tasksDB.query(
        `SELECT * FROM btw.sandboxes WHERE user_id = $1 AND status = 'ready'`,
        [user_id]
    );
    return rows[0] || null;
}

module.exports = {
    provisionSandbox,
    checkSandboxReady,
    destroySandbox,
    getSandbox,
};
