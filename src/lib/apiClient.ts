/**
 * Thin fetch wrapper: sends cookies, and on a 401 tries POST /api/auth/refresh
 * once before retrying the original request. Keeps every component from
 * having to know about the access/refresh token dance.
 */
let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then((res) => res.ok)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<{ ok: boolean; status: number; data: T }> {
  const doFetch = () =>
    fetch(path, {
      ...options,
      credentials: 'include',
      headers: {
        ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });

  let res = await doFetch();

  if (res.status === 401 && path !== '/api/auth/refresh' && path !== '/api/auth/login') {
    const refreshed = await refreshTokens();
    if (refreshed) {
      res = await doFetch();
    }
  }

  let data: T;
  try {
    data = await res.json();
  } catch {
    data = {} as T;
  }

  return { ok: res.ok, status: res.status, data };
}

export const api = {
  get: <T = any>(path: string) => apiFetch<T>(path),
  post: <T = any>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T = any>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T = any>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'DELETE', body: body !== undefined ? JSON.stringify(body) : undefined }),
  upload: <T = any>(path: string, formData: FormData) => apiFetch<T>(path, { method: 'POST', body: formData }),
};
