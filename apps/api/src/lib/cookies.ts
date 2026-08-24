import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { env } from '../env.ts';

export const AUTH_COOKIE = 'kidcare_token';

/**
 * Guarda el JWT en una cookie httpOnly (inaccesible a JavaScript, a salvo de
 * XSS) en vez de localStorage. SameSite=Lax evita que se envie en peticiones
 * cross-site iniciadas por fetch/XHR desde otro origen.
 */
export function setAuthCookie(c: Context, token: string) {
  setCookie(c, AUTH_COOKIE, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'Lax',
    path: '/',
    maxAge: env.jwtExpiresInSeconds,
  });
}

export function clearAuthCookie(c: Context) {
  deleteCookie(c, AUTH_COOKIE, { path: '/' });
}

export function readAuthCookie(c: Context): string | undefined {
  return getCookie(c, AUTH_COOKIE);
}
