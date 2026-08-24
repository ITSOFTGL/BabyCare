/**
 * Limitador de tasa en memoria de proceso.
 *
 * Cada instancia de cliente corre su propio contenedor de API (un proceso),
 * asi que un Map en memoria es suficiente: no hace falta Redis ni ningun
 * servicio compartido para esto. Si el contenedor se reinicia, los contadores
 * se resetean, lo cual es aceptable para el caso de uso (frenar fuerza bruta
 * contra /auth/login, no un limite de facturacion).
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Evita que el Map crezca sin limite con claves de IPs/emails que ya expiraron. */
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Registra un intento bajo `key` y dice si supera `max` intentos dentro de
 * `windowMs`. Ventana fija simple (no deslizante): suficiente para frenar
 * fuerza bruta sin la complejidad de un algoritmo de token bucket.
 */
export function rateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count++;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Limpia el contador de una clave (p. ej. tras un login correcto). */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}
