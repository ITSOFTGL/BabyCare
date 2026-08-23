import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { eq, getDb, users } from '@kidcare/db';
import { env } from '../env.ts';
import { signToken } from '../lib/jwt.ts';
import { hashPassword, verifyPassword } from '../lib/password.ts';
import { parseBody } from '../lib/validate.ts';
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

authRoutes.post('/login', async (c) => {
  const { email, password } = await parseBody(c, loginSchema);
  const db = getDb();

  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  // Mismo mensaje para email inexistente y contrasena mala: no filtramos
  // que cuentas existen.
  const invalid = new HTTPException(401, {
    message: 'Email o contrasena incorrectos',
  });
  if (!row) throw invalid;

  const ok = await verifyPassword(password, row.passwordHash);
  if (!ok) throw invalid;

  const user = toPublicUser(row);
  const token = await signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  return c.json({ token, user });
});

authRoutes.get('/me', requireAuth, (c) =>
  c.json({ user: c.get('user'), tenantName: env.tenantName }),
);

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
