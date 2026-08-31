import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { asc, eq, getDb, rooms, teachers, users } from '@kidcare/db';
import { TURNS } from '@kidcare/types';
import { paramId, parseBody } from '../lib/validate.ts';
import { createLoginUser, uniqueEmail } from '../lib/account.ts';
import { addParentToRoomChat } from '../lib/chat.ts';
import { hashPassword } from '../lib/password.ts';
import {
  requireAuth,
  requireDirectora,
  type AppEnv,
} from '../middleware/auth.ts';

const teacherSchema = z.object({
  name: z.string().min(2, 'Nombre demasiado corto'),
  specialty: z.string().optional().nullable(),
  roomId: z.string().uuid().nullable().optional(),
  turn: z.enum(TURNS).default('manana'),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  password: z.string().min(8).optional(),
});

export const teacherRoutes = new Hono<AppEnv>();

teacherRoutes.use('*', requireAuth);

teacherRoutes.get('/', async (c) => {
  const rows = await getDb()
    .select({ teacher: teachers, room: rooms })
    .from(teachers)
    .leftJoin(rooms, eq(teachers.roomId, rooms.id))
    .orderBy(asc(teachers.name));
  return c.json(rows.map((r) => ({ ...r.teacher, room: r.room })));
});

teacherRoutes.post('/', requireDirectora, async (c) => {
  const body = await parseBody(c, teacherSchema);
  if (!body.password) {
    throw new HTTPException(400, {
      message: 'Indica una contraseña para que la profesora pueda entrar',
    });
  }
  const email = await uniqueEmail(body.name, body.email);
  const user = await createLoginUser({
    name: body.name,
    email,
    password: body.password,
    role: 'profesora',
    phone: body.phone,
  });
  const [created] = await getDb()
    .insert(teachers)
    .values({
      userId: user.id,
      name: body.name.trim(),
      specialty: body.specialty ?? null,
      roomId: body.roomId ?? null,
      turn: body.turn,
      phone: body.phone ?? null,
      email,
    })
    .returning();
  if (body.roomId) await addParentToRoomChat(body.roomId, user.id);
  return c.json({ ...created, loginEmail: email }, 201);
});

teacherRoutes.patch('/:id', requireDirectora, async (c) => {
  const id = paramId(c);
  const body = await parseBody(c, teacherSchema.partial());
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.specialty !== undefined) patch.specialty = body.specialty;
  if (body.roomId !== undefined) patch.roomId = body.roomId;
  if (body.turn !== undefined) patch.turn = body.turn;
  if (body.phone !== undefined) patch.phone = body.phone;
  if (body.email !== undefined) patch.email = body.email ? body.email : null;

  const [updated] = await getDb()
    .update(teachers)
    .set(patch)
    .where(eq(teachers.id, id))
    .returning();
  if (!updated) throw new HTTPException(404, { message: 'Profesora no encontrada' });
  if (body.roomId && updated.userId) await addParentToRoomChat(body.roomId, updated.userId);
  if (updated.userId && (body.password || body.email || body.name || body.phone !== undefined)) {
    const userPatch: Record<string, unknown> = {};
    if (body.name !== undefined) userPatch.name = body.name.trim();
    if (body.email) userPatch.email = body.email.toLowerCase();
    if (body.phone !== undefined) userPatch.phone = body.phone;
    if (body.password) userPatch.passwordHash = await hashPassword(body.password);
    if (Object.keys(userPatch).length > 0) {
      await getDb().update(users).set(userPatch).where(eq(users.id, updated.userId));
    }
  }
  return c.json(updated);
});

teacherRoutes.delete('/:id', requireDirectora, async (c) => {
  const id = paramId(c);
  const [deleted] = await getDb()
    .delete(teachers)
    .where(eq(teachers.id, id))
    .returning({ id: teachers.id });
  if (!deleted) throw new HTTPException(404, { message: 'Profesora no encontrada' });
  return c.json({ ok: true });
});
