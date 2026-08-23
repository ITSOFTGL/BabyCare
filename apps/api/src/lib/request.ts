import type { Context } from 'hono';

/**
 * IP real del cliente detras del tunel de Cloudflare / proxy inverso.
 * Cloudflare siempre manda CF-Connecting-IP; X-Forwarded-For es el respaldo
 * generico para desarrollo local o cualquier otro proxy.
 */
export function clientIp(c: Context): string {
  const cf = c.req.header('CF-Connecting-IP');
  if (cf) return cf;

  const forwarded = c.req.header('X-Forwarded-For');
  if (forwarded) return forwarded.split(',')[0]!.trim();

  return 'unknown';
}
