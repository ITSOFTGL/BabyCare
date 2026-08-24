/**
 * Configuracion inyectada por app/layout.tsx (un <script> con
 * window.__KIDCARE_CONFIG__) leida en CADA request del servidor Next, no
 * congelada en el build. Esto permite un solo `kidcare-frontend:latest`
 * compartido por todos los clientes: cada instancia solo cambia sus
 * variables de entorno (API_URL, TENANT_NAME), sin reconstruir la imagen.
 *
 * Los NEXT_PUBLIC_* siguen de respaldo para `next dev` sin Docker y por si
 * el script aun no corrio (SSR muy temprano).
 */
declare global {
  interface Window {
    __KIDCARE_CONFIG__?: { apiUrl: string; tenantName: string };
  }
}

export function getApiUrl(): string {
  if (typeof window !== 'undefined' && window.__KIDCARE_CONFIG__) {
    return window.__KIDCARE_CONFIG__.apiUrl;
  }
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
}

export function getTenantName(): string {
  if (typeof window !== 'undefined' && window.__KIDCARE_CONFIG__) {
    return window.__KIDCARE_CONFIG__.tenantName;
  }
  return process.env.NEXT_PUBLIC_TENANT_NAME ?? 'KidCare';
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
 * Cliente HTTP de la API. La sesion viaja en una cookie httpOnly (no en
 * localStorage, a salvo de XSS): `credentials: 'include'` es lo que hace que
 * el navegador la adjunte sola en cada request. Convierte cualquier
 * respuesta no-2xx en un ApiError con el mensaje que manda el backend.
 */
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { headers, ...rest } = options;

  const res = await fetch(`${getApiUrl()}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
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

export const apiPost = <T>(path: string, data: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(data) });

export const apiPatch = <T>(path: string, data: unknown = {}) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(data) });

export const apiDelete = <T>(path: string) =>
  api<T>(path, { method: 'DELETE' });
