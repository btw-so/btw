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

export async function verifyOTP({ phone, otp, timezone, timezoneOffsetInSeconds }) {
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

export default api;
