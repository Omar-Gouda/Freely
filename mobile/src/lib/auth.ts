import * as SecureStore from "expo-secure-store";

const AUTH_STORAGE_KEY = "freely-mobile-session";

type SupabaseTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
};

export type StoredAuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
};

function getSupabaseUrl() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  if (!url) {
    throw new Error("EXPO_PUBLIC_SUPABASE_URL is missing. Add it to the mobile app environment.");
  }

  return url.replace(/\/+$/, "");
}

function getSupabaseAnonKey() {
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key) {
    throw new Error("EXPO_PUBLIC_SUPABASE_ANON_KEY is missing. Add it to the mobile app environment.");
  }

  return key;
}

function normalizeSession(payload: SupabaseTokenResponse): StoredAuthSession {
  if (!payload.access_token || !payload.refresh_token) {
    throw new Error("Supabase did not return a complete session.");
  }

  const expiresAt = payload.expires_at
    ? Number(payload.expires_at)
    : Math.floor(Date.now() / 1000) + Number(payload.expires_in ?? 3600);

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt,
    tokenType: payload.token_type || "bearer"
  };
}

async function requestSupabaseSession(body: Record<string, string>) {
  const response = await fetch(`${getSupabaseUrl()}/auth/v1/token?grant_type=${body.grant_type}`, {
    method: "POST",
    headers: {
      apikey: getSupabaseAnonKey(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const payload = (await response.json().catch(() => ({}))) as SupabaseTokenResponse & { error_description?: string; msg?: string };

  if (!response.ok) {
    throw new Error(payload.error_description || payload.msg || "Unable to authenticate right now.");
  }

  return normalizeSession(payload);
}

export async function signInWithPassword(email: string, password: string) {
  return requestSupabaseSession({
    grant_type: "password",
    email: email.trim().toLowerCase(),
    password
  });
}

export async function refreshSession(refreshToken: string) {
  try {
    return await requestSupabaseSession({
      grant_type: "refresh_token",
      refresh_token: refreshToken
    });
  } catch {
    return null;
  }
}

export async function loadStoredSession() {
  const raw = await SecureStore.getItemAsync(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAuthSession;
  } catch {
    await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
    return null;
  }
}

export async function saveStoredSession(session: StoredAuthSession) {
  await SecureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export async function clearStoredSession() {
  await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
}

export function isSessionExpired(session: StoredAuthSession) {
  return session.expiresAt <= Math.floor(Date.now() / 1000) + 30;
}
