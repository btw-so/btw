const STORAGE_KEY = "fingerprint_uuid";

export default function getFingerprint() {
    let uuid = localStorage.getItem(STORAGE_KEY);
    if (uuid) return uuid;

    uuid =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
    localStorage.setItem(STORAGE_KEY, uuid);
    return uuid;
}
