import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { asc, eq, getDb, users } from '@kidcare/db';
import { ROLES } from '@kidcare/types';
import { hashPassword } from '../lib/password.ts';
import { paramId, parseBody, parseQuery } from '../lib/validate.ts';
import {
  requireAuth,
  requireDirectora,
  toPublicUser,
  type AppEnv,
} from '../middleware/auth.ts';

const createUserSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(8, 'La contrasena debe tener al menos 8 caracteres'),
  name: z.string().min(2, 'Nombre demasiado corto'),
  role: z.enum(ROLES),
  phone: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
});

const updateUserSchema = createUserSchema
  .partial()
  .omit({ password: true })
  .extend({ password: z.string().min(8).optional() });

export const userRoutes = new Hono<AppEnv>();

// Toda la gestion de cuentas es exclusiva de la directora.
userRoutes.use('*', requireAuth, requireDirectora);

userRoutes.get('/', async (c) => {
  const { role } = parseQuery(
    c,
    z.object({ role: z.enum(ROLES).optional() }),
  );
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(role ? eq(users.role, role) : undefined)
    .orderBy(asc(users.name));
  return c.json(rows.map(toPublicUser));
});

userRoutes.post('/', async (c) => {
  const body = await parseBody(c, createUserSchema);
  const db = getDb();
  const email = body.email.toLowerCase().trim();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    throw new HTTPException(409, { message: 'Ya existe una cuenta con ese email' });
  }

  const [created] = await db
    .insert(users)
    .values({
      email,
      passwordHash: await hashPassword(body.password),
      name: body.name.trim(),
      role: body.role,
      phone: body.phone ?? null,
      avatarUrl: body.avatarUrl ?? null,
    })
    .returning();

  return c.json(toPublicUser(created!), 201);
});

userRoutes.patch('/:id', async (c) => {
  const id = paramId(c);
  const body = await parseBody(c, updateUserSchema);
  const db = getDb();

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (body.email) patch.email = body.email.toLowerCase().trim();
  if (body.name) patch.name = body.name.trim();
  if (body.role) patch.role = body.role;
  if (body.phone !== undefined) patch.phone = body.phone;
  if (body.avatarUrl !== undefined) patch.avatarUrl = body.avatarUrl;
  if (body.password) patch.passwordHash = await hashPassword(body.password);

  const [updated] = await db
    .update(users)
    .set(patch)
    .where(eq(users.id, id))
    .returning();

  if (!updated) throw new HTTPException(404, { message: 'Usuario no encontrado' });
  return c.json(toPublicUser(updated));
});

userRoutes.delete('/:id', async (c) => {
  const id = paramId(c);
  if (id === c.get('user').id) {
    throw new HTTPException(400, { message: 'No puedes borrar tu propia cuenta' });
  }
  const db = getDb();
  const [deleted] = await db
    .delete(users)
    .where(eq(users.id, id))
    .returning({ id: users.id });
  if (!deleted) throw new HTTPException(404, { message: 'Usuario no encontrado' });
  return c.json({ ok: true });
});
