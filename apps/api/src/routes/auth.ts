import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { eq, getDb, users } from '@kidcare/db';
import { env } from '../env.ts';
import { clearAuthCookie, readAuthCookie, setAuthCookie } from '../lib/cookies.ts';
import { signToken, verifyToken } from '../lib/jwt.ts';
import { hashPassword, verifyPassword } from '../lib/password.ts';
import { rateLimit, resetRateLimit } from '../lib/rateLimit.ts';
import { parseBody } from '../lib/validate.ts';
import { clientIp } from '../lib/request.ts';
import { revokeToken } from '../lib/revocation.ts';
import { requireAuth, toPublicUser, type AppEnv } from '../middleware/auth.ts';

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(1, 'La contrasena es obligatoria'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Minimo 8 caracteres'),
});

export const authRoutes = new Hono<AppEnv>();

// Ventana de 15 minutos: por IP (frena abuso general de la ruta) y por
// email (protege una cuenta puntual aunque el ataque venga de muchas IPs).
// Los limites en si viven en env.loginMaxPerIp/loginMaxPerEmail.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

authRoutes.post('/login', async (c) => {
  const { email, password } = await parseBody(c, loginSchema);
  const normalizedEmail = email.toLowerCase().trim();
  const ip = clientIp(c);

  const ipLimit = rateLimit(`login:ip:${ip}`, {
    max: env.loginMaxPerIp,
    windowMs: LOGIN_WINDOW_MS,
  });
  const emailLimit = rateLimit(`login:email:${normalizedEmail}`, {
    max: env.loginMaxPerEmail,
    windowMs: LOGIN_WINDOW_MS,
  });

  if (!ipLimit.allowed || !emailLimit.allowed) {
    const retryAfter = Math.max(
      ipLimit.retryAfterSeconds,
      emailLimit.retryAfterSeconds,
    );
    c.header('Retry-After', String(retryAfter));
    throw new HTTPException(429, {
      message: 'Demasiados intentos. Vuelve a intentarlo en unos minutos.',
    });
  }

  const db = getDb();
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  // Mismo mensaje para email inexistente y contrasena mala: no filtramos
  // que cuentas existen.
  const invalid = new HTTPException(401, {
    message: 'Email o contrasena incorrectos',
  });
  if (!row) throw invalid;

  const ok = await verifyPassword(password, row.passwordHash);
  if (!ok) throw invalid;

  // Login correcto: no sigas contando este email contra el limite.
  resetRateLimit(`login:email:${normalizedEmail}`);

  const user = toPublicUser(row);
  const token = await signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  // La cookie httpOnly es lo que usa el navegador; el token en el body queda
  // para scripts (smoke test, futura app movil) que no manejan cookies.
  setAuthCookie(c, token);

  return c.json({ token, user });
});

authRoutes.get('/me', requireAuth, (c) =>
  c.json({ user: c.get('user'), tenantName: env.tenantName }),
);

/**
 * El navegador no puede borrar una cookie httpOnly desde JS: hace falta que
 * el servidor la limpie. Ademas revoca el jti del token actual, para que si
 * alguien lo capturo antes del logout no pueda seguir usandolo hasta que
 * expire solo. No exige sesion valida (un token ya caducado igual debe poder
 * "cerrar sesion" sin romperse en el intento).
 */
authRoutes.post('/logout', async (c) => {
  const header = c.req.header('Authorization') ?? '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const token = bearer || readAuthCookie(c) || '';

  if (token) {
    try {
      const payload = await verifyToken(token);
      await revokeToken(payload.jti, payload.exp);
    } catch {
      // Token ya invalido/expirado: no hay nada que revocar.
    }
  }

  clearAuthCookie(c);
  return c.json({ ok: true });
});

authRoutes.post('/change-password', requireAuth, async (c) => {
  const { currentPassword, newPassword } = await parseBody(
    c,
    changePasswordSchema,
  );
  const user = c.get('user');
  const db = getDb();

  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (!row) throw new HTTPException(404, { message: 'Usuario no encontrado' });

  const ok = await verifyPassword(currentPassword, row.passwordHash);
  if (!ok) {
    throw new HTTPException(400, { message: 'La contrasena actual no coincide' });
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return c.json({ ok: true });
});
