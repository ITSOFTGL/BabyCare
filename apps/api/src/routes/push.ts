import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { eq, getDb, pushSubscriptions } from '@kidcare/db';
import { env } from '../env.ts';
import { parseBody } from '../lib/validate.ts';
import { requireAuth, type AppEnv } from '../middleware/auth.ts';

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const pushRoutes = new Hono<AppEnv>();

pushRoutes.use('*', requireAuth);

pushRoutes.get('/vapid-public-key', (c) => {
  if (!env.vapidPublicKey) {
    throw new HTTPException(503, {
      message: 'Web Push no está configurado en este servidor',
    });
  }
  return c.json({ publicKey: env.vapidPublicKey });
});

/** Guarda (o actualiza) la suscripcion de ESTE navegador para el usuario actual. */
pushRoutes.post('/subscribe', async (c) => {
  const body = await parseBody(c, subscribeSchema);
  const user = c.get('user');

  const [created] = await getDb()
    .insert(pushSubscriptions)
    .values({
      userId: user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId: user.id,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
      },
    })
    .returning({ id: pushSubscriptions.id });

  return c.json({ ok: true, id: created!.id }, 201);
});

/** Se llama al desactivar push desde ESTE navegador (identificado por su endpoint). */
pushRoutes.delete('/subscribe', async (c) => {
  const endpoint = c.req.query('endpoint');
  if (!endpoint) {
    throw new HTTPException(400, { message: 'Falta el parámetro endpoint' });
  }
  await getDb()
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
  return c.json({ ok: true });
});
