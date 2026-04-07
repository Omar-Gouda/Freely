import { clearStoredSession, isSessionExpired, refreshSession, saveStoredSession, type StoredAuthSession } from "./auth";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type ApiPayload<T> = {
  data?: T;
  error?: string;
  details?: unknown;
};

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: Record<string, unknown> | null;
  headers?: Record<string, string>;
};

type ApiResult<T> = {
  data: T;
  session: StoredAuthSession | null;
};

export function getApiBaseUrl() {
  const url = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!url) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is missing. Add it to the mobile app environment.");
  }

  return url.replace(/\/+$/, "");
}

async function parseResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as ApiPayload<T>;
  if (!response.ok || payload.error) {
    throw new ApiError(payload.error || `Request failed with status ${response.status}`, response.status, payload.details);
  }

  return payload.data as T;
}

async function issueRequest<T>(path: string, options: ApiRequestOptions, session: StoredAuthSession) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  return response;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}, session: StoredAuthSession | null): Promise<ApiResult<T>> {
  if (!session) {
    throw new ApiError("You are signed out. Please log in again.", 401);
  }

  let activeSession = session;
  if (isSessionExpired(activeSession)) {
    const nextSession = await refreshSession(activeSession.refreshToken);
    if (!nextSession) {
      await clearStoredSession();
      throw new ApiError("Your session expired. Please log in again.", 401);
    }

    activeSession = nextSession;
    await saveStoredSession(activeSession);
  }

  let response = await issueRequest<T>(path, options, activeSession);
  if (response.status === 401) {
    const nextSession = await refreshSession(activeSession.refreshToken);
    if (!nextSession) {
      await clearStoredSession();
      throw new ApiError("Your session expired. Please log in again.", 401);
    }

    activeSession = nextSession;
    await saveStoredSession(activeSession);
    response = await issueRequest<T>(path, options, activeSession);
  }

  const data = await parseResponse<T>(response);
  return { data, session: activeSession };
}
