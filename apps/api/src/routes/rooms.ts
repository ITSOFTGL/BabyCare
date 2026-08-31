import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { asc, eq, getDb, levels, rooms } from '@kidcare/db';
import { TURNS } from '@kidcare/types';
import { paramId, parseBody, uuidSchema } from '../lib/validate.ts';
import { ensureRoomChat } from '../lib/chat.ts';
import {
  requireAuth,
  requireDirectora,
  type AppEnv,
} from '../middleware/auth.ts';

const roomSchema = z.object({
  name: z.string().min(2, 'Nombre demasiado corto'),
  levelId: uuidSchema.nullable().optional(),
  turn: z.enum(TURNS).default('manana'),
  capacity: z.coerce.number().int().min(0).max(200).default(0),
});

export const roomRoutes = new Hono<AppEnv>();

roomRoutes.use('*', requireAuth);

roomRoutes.get('/', async (c) => {
  const rows = await getDb()
    .select({ room: rooms, level: levels })
    .from(rooms)
    .leftJoin(levels, eq(rooms.levelId, levels.id))
    .orderBy(asc(rooms.name));
  return c.json(rows.map((r) => ({ ...r.room, level: r.level })));
});

roomRoutes.post('/', requireDirectora, async (c) => {
  const body = await parseBody(c, roomSchema);
  const [created] = await getDb()
    .insert(rooms)
    .values({
      name: body.name.trim(),
      levelId: body.levelId ?? null,
      turn: body.turn,
      capacity: body.capacity,
    })
    .returning();
  await ensureRoomChat(created!.id, created!.name);
  return c.json(created, 201);
});

roomRoutes.patch('/:id', requireDirectora, async (c) => {
  const id = paramId(c);
  const body = await parseBody(c, roomSchema.partial());

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.levelId !== undefined) patch.levelId = body.levelId;
  if (body.turn !== undefined) patch.turn = body.turn;
  if (body.capacity !== undefined) patch.capacity = body.capacity;

  const [updated] = await getDb()
    .update(rooms)
    .set(patch)
    .where(eq(rooms.id, id))
    .returning();
  if (!updated) throw new HTTPException(404, { message: 'Sala no encontrada' });
  return c.json(updated);
});

roomRoutes.delete('/:id', requireDirectora, async (c) => {
  const id = paramId(c);
  const [deleted] = await getDb()
    .delete(rooms)
    .where(eq(rooms.id, id))
    .returning({ id: rooms.id });
  if (!deleted) throw new HTTPException(404, { message: 'Sala no encontrada' });
  return c.json({ ok: true });
});
