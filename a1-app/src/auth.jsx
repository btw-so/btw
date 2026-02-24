import { createContext, useContext, useState, useEffect } from "react";
import { setAuthToken } from "./api";

const AUTH_STORAGE_KEY = "a1_auth";

const AuthContext = createContext(null);

function loadAuth() {
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch {}
    return null;
}

function saveAuth(auth) {
    if (auth) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
    } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
    }
}

export function AuthProvider({ children }) {
    const [auth, setAuthState] = useState(() => {
        const stored = loadAuth();
        if (stored?.token) {
            setAuthToken(stored.token);
        }
        return stored;
    });

    const login = ({ token, userId, isNewUser }) => {
        const authData = { token, userId, isNewUser };
        setAuthToken(token);
        saveAuth(authData);
        setAuthState(authData);
    };

    const logout = () => {
        setAuthToken(null);
        saveAuth(null);
        setAuthState(null);
    };

    const isLoggedIn = !!auth?.token;

    return (
        <AuthContext.Provider value={{ auth, isLoggedIn, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be inside AuthProvider");
    return ctx;
}
