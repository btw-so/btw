import axios from "axios";
import getFingerprint from "./fingerprint";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:9210";

const api = axios.create({
    baseURL: API_URL,
    timeout: 120000, // 2 min — agent loop can take long
    withCredentials: true,
});

// Attach fingerprint to every request
api.interceptors.request.use((config) => {
    config.headers["X-Fingerprint"] = getFingerprint();
    return config;
});

// Auth
export async function sendOTP(phone) {
    const { data } = await api.post("/phone-otp/send", { phone });
    return data;
}

export async function verifyOTP({
    phone,
    otp,
    timezone,
    timezoneOffsetInSeconds,
}) {
    const fingerprint = getFingerprint();
    const { data } = await api.post("/phone-otp/verify", {
        phone,
        otp,
        fingerprint,
        timezone,
        timezoneOffsetInSeconds,
    });
    return data;
}

// Chat
export async function sendMessage({ message, taskId }) {
    const { data } = await api.post("/web-chat/send", { message, taskId });
    return data;
}

export async function getTasks() {
    const { data } = await api.get("/web-chat/tasks");
    return data;
}

export async function getTaskMessages(taskId) {
    const { data } = await api.get(`/web-chat/tasks/${taskId}`);
    return data;
}

export async function getInbox() {
    const { data } = await api.get("/web-chat/inbox");
    return data;
}

// Set auth token for Bearer auth (cross-origin)
export function setAuthToken(token) {
    if (token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common["Authorization"];
    }
}

// ---------- Sandbox filesystem ----------

function getAuthHeaders() {
    const headers = {};
    const token = api.defaults.headers.common["Authorization"];
    if (token) headers["Authorization"] = token;
    headers["X-Fingerprint"] = getFingerprint();
    return headers;
}

export async function listSandboxDirectory(dirPath, showHidden = false) {
    const params = new URLSearchParams({ path: dirPath });
    if (showHidden) params.set("showHidden", "true");
    const { data } = await api.get(`/sandbox-fs/list?${params.toString()}`);
    return data;
}

export async function readSandboxFile(filePath) {
    const params = new URLSearchParams({ path: filePath });
    const { data } = await api.get(`/sandbox-fs/read?${params.toString()}`);
    return data;
}

export async function fetchSandboxRawBlob(filePath) {
    const params = new URLSearchParams({ path: filePath });
    const url = `${API_URL}/sandbox-fs/raw?${params.toString()}`;

    const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
    });

    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

export async function downloadSandboxPath(targetPath) {
    const params = new URLSearchParams({ path: targetPath });
    const url = `${API_URL}/sandbox-fs/download?${params.toString()}`;

    const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
    });

    if (!response.ok) throw new Error(`Failed: ${response.status}`);

    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition");
    let filename = "download";
    if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
    }

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
}

export default api;
