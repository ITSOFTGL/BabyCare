import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { and, desc, eq, getDb, notifications } from '@kidcare/db';
import { paramId } from '../lib/validate.ts';
import { requireAuth, type AppEnv } from '../middleware/auth.ts';

export const notificationRoutes = new Hono<AppEnv>();

notificationRoutes.use('*', requireAuth);

notificationRoutes.get('/', async (c) => {
  const rows = await getDb()
    .select()
    .from(notifications)
    .where(eq(notifications.userId, c.get('user').id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
  return c.json(rows);
});

notificationRoutes.patch('/:id/read', async (c) => {
  const id = paramId(c);
  const [updated] = await getDb()
    .update(notifications)
    .set({ read: true })
    // El filtro por userId evita marcar como leida la notificacion de otro.
    .where(
      and(eq(notifications.id, id), eq(notifications.userId, c.get('user').id)),
    )
    .returning();
  if (!updated) {
    throw new HTTPException(404, { message: 'Notificacion no encontrada' });
  }
  return c.json(updated);
});

notificationRoutes.patch('/read-all', async (c) => {
  await getDb()
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.userId, c.get('user').id));
  return c.json({ ok: true });
});
