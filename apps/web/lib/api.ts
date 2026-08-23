export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export const TENANT_NAME =
  process.env.NEXT_PUBLIC_TENANT_NAME ?? 'KidCare';

const TOKEN_KEY = 'kidcare.token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Cliente HTTP de la API. Adjunta el JWT guardado en localStorage y convierte
 * cualquier respuesta no-2xx en un ApiError con el mensaje que manda el backend.
 */
export async function api<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const token = auth ? getToken() : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(
      body?.error ?? `Error ${res.status}`,
      res.status,
      body?.details,
    );
  }

  return body as T;
}

export const apiGet = <T>(path: string) => api<T>(path);

export const apiPost = <T>(path: string, data: unknown, auth = true) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(data), auth });

export const apiPatch = <T>(path: string, data: unknown = {}) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(data) });

export const apiDelete = <T>(path: string) =>
  api<T>(path, { method: 'DELETE' });
