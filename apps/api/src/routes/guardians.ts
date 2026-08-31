import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { eq, getDb, guardians } from '@kidcare/db';
import { paramId, parseBody, uuidSchema } from '../lib/validate.ts';
import { guardianSchema } from './children.ts';
import {
  requireAuth,
  requireDirectora,
  type AppEnv,
} from '../middleware/auth.ts';

/**
 * Edicion individual de tutores: a diferencia de crear un alumno (que puede
 * traer varios tutores de una), aqui cada uno se edita o borra por separado
 * sin tocar al resto. El alta de uno nuevo vive en POST /api/children/:id/guardians.
 */
export const guardianRoutes = new Hono<AppEnv>();

guardianRoutes.use('*', requireAuth, requireDirectora);

guardianRoutes.patch('/:id', async (c) => {
  const id = paramId(c);
  const body = await parseBody(c, guardianSchema.partial());

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.phone !== undefined) patch.phone = body.phone;
  if (body.email !== undefined) patch.email = body.email ? body.email : null;
  if (body.ci !== undefined) patch.ci = body.ci;
  if (body.isPrimary !== undefined) patch.isPrimary = body.isPrimary;

  const [updated] = await getDb()
    .update(guardians)
    .set(patch)
    .where(eq(guardians.id, id))
    .returning();

  if (!updated) throw new HTTPException(404, { message: 'Tutor no encontrado' });
  return c.json(updated);
});

guardianRoutes.delete('/:id', async (c) => {
  const id = paramId(c);
  const [deleted] = await getDb()
    .delete(guardians)
    .where(eq(guardians.id, id))
    .returning({ id: guardians.id });
  if (!deleted) throw new HTTPException(404, { message: 'Tutor no encontrado' });
  return c.json({ ok: true });
});
