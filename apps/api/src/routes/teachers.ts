import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { asc, eq, getDb, rooms, teachers } from '@kidcare/db';
import { TURNS } from '@kidcare/types';
import { paramId, parseBody, uuidSchema } from '../lib/validate.ts';
import {
  requireAuth,
  requireDirectora,
  type AppEnv,
} from '../middleware/auth.ts';

const teacherSchema = z.object({
  /** Cuenta de acceso asociada; se crea aparte con POST /api/users. */
  userId: uuidSchema.nullable().optional(),
  name: z.string().min(2, 'Nombre demasiado corto'),
  specialty: z.string().optional().nullable(),
  roomId: uuidSchema.nullable().optional(),
  turn: z.enum(TURNS).default('manana'),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
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
  const [created] = await getDb()
    .insert(teachers)
    .values({
      userId: body.userId ?? null,
      name: body.name.trim(),
      specialty: body.specialty ?? null,
      roomId: body.roomId ?? null,
      turn: body.turn,
      phone: body.phone ?? null,
      email: body.email ? body.email : null,
    })
    .returning();
  return c.json(created, 201);
});

teacherRoutes.patch('/:id', requireDirectora, async (c) => {
  const id = paramId(c);
  const body = await parseBody(c, teacherSchema.partial());

  const patch: Record<string, unknown> = {};
  if (body.userId !== undefined) patch.userId = body.userId;
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
  if (!updated) {
    throw new HTTPException(404, { message: 'Profesora no encontrada' });
  }
  return c.json(updated);
});

teacherRoutes.delete('/:id', requireDirectora, async (c) => {
  const id = paramId(c);
  const [deleted] = await getDb()
    .delete(teachers)
    .where(eq(teachers.id, id))
    .returning({ id: teachers.id });
  if (!deleted) {
    throw new HTTPException(404, { message: 'Profesora no encontrada' });
  }
  return c.json({ ok: true });
});
