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

/**
 * Token para demos con API en otro origen (Railway). En un solo dominio
 * la cookie httpOnly sigue valiendo; Bearer cubre el caso de dos URLs.
 */
const TOKEN_KEY = 'kidcare_token';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string | null | undefined) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

function withAuthHeaders(headers?: HeadersInit): Headers {
  const next = new Headers(headers);
  const token = getAccessToken();
  if (token && !next.has('Authorization')) {
    next.set('Authorization', `Bearer ${token}`);
  }
  return next;
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
 * Cliente HTTP. En el mismo dominio usa la cookie; si web y API están
 * en URLs distintas (demo Railway) manda también Authorization: Bearer.
 */
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { headers, ...rest } = options;
  const merged = withAuthHeaders(headers);
  if (!merged.has('Content-Type')) merged.set('Content-Type', 'application/json');

  const res = await fetch(`${getApiUrl()}${path}`, {
    ...rest,
    credentials: 'include',
    headers: merged,
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

export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${getApiUrl()}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: withAuthHeaders(),
    body: form,
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(body?.error ?? `Error ${res.status}`, res.status, body?.details);
  }
  return body as T;
}

export function qrImageUrl() {
  return `${getApiUrl()}/settings/qr`;
}

/** El QR vive en otro origen: hay que pedirlo con cookie, no vale un <img src>. */
export async function fetchQrObjectUrl(): Promise<string> {
  const res = await fetch(qrImageUrl(), {
    credentials: 'include',
    headers: withAuthHeaders(),
  });
  if (!res.ok) {
    throw new ApiError('No hay QR cargado', res.status);
  }
  return URL.createObjectURL(await res.blob());
}

export function whatsappLink(phone: string | null | undefined, text: string) {
  if (!phone) return null;
  const n = phone.replace(/\D/g, '');
  if (n.length < 8) return null;
  const withCc = n.startsWith('591') ? n : `591${n.replace(/^0/, '')}`;
  return `https://wa.me/${withCc}?text=${encodeURIComponent(text)}`;
}

/**
 * Descarga un archivo binario protegido (la factura en PDF) y dispara el
 * guardado en el navegador. No usa `api()` porque la respuesta no es JSON.
 */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const res = await fetch(`${getApiUrl()}${path}`, {
    credentials: 'include',
    headers: withAuthHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = `Error ${res.status}`;
    try {
      message = text ? (JSON.parse(text).error ?? message) : message;
    } catch {
      // el cuerpo no era JSON; nos quedamos con el mensaje generico
    }
    throw new ApiError(message, res.status);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
