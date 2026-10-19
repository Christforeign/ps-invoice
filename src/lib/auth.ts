import { useSyncExternalStore } from "react";

import { getDB } from "./store";

export interface AuthSession {
  email: string;
  isLoggedIn: boolean;
  loginAt?: string;
}

const AUTH_KEY = "prime_shipping_auth_user";
const listeners = new Set<() => void>();

function getStoredSession(): AuthSession {
  if (typeof window === "undefined") {
    return { email: "", isLoggedIn: true };
  }
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.email === "string" && parsed.isLoggedIn) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse error
  }
  return { email: "", isLoggedIn: false };
}

let currentSession: AuthSession = getStoredSession();

function emitChange() {
  listeners.forEach((l) => l());
}

export function verifyCredentials(email: string, password?: string): boolean {
  const db = getDB();
  const configuredEmail = (db.settings.security?.adminEmail || "blaisechristeveste@gmail.com").trim().toLowerCase();
  const configuredPassword = db.settings.security?.adminPassword || "#Christ21";

  const inputEmail = email.trim().toLowerCase();
  const inputPassword = password ?? "";

  return inputEmail === configuredEmail && inputPassword === configuredPassword;
}

export function loginUser(email: string, password?: string): AuthSession {
  const isValid = verifyCredentials(email, password);
  if (!isValid) {
    throw new Error("Email ou mot de passe incorrect.");
  }

  const session: AuthSession = {
    email: email.trim(),
    isLoggedIn: true,
    loginAt: new Date().toISOString(),
  };
  currentSession = session;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    } catch {
      // Storage unavailable
    }
  }
  emitChange();
  return session;
}

export function logoutUser(): void {
  currentSession = { email: "", isLoggedIn: false };
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch {
      // Storage unavailable
    }
  }
  emitChange();
}

export function useAuth(): AuthSession {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => currentSession,
    () => ({ email: "", isLoggedIn: true }),
  );
}
