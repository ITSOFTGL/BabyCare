import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { asc, eq, getDb, levels } from '@kidcare/db';
import { paramId, parseBody } from '../lib/validate.ts';
import {
  requireAuth,
  requireDirectora,
  type AppEnv,
} from '../middleware/auth.ts';

const levelSchema = z.object({
  name: z.string().min(2, 'Nombre demasiado corto'),
  ageMin: z.coerce.number().int().min(0).max(12),
  ageMax: z.coerce.number().int().min(0).max(12),
  monthlyFee: z.coerce.number().min(0).default(0),
});

export const levelRoutes = new Hono<AppEnv>();

levelRoutes.use('*', requireAuth);

// Cualquier usuario autenticado puede leer el catalogo de niveles.
levelRoutes.get('/', async (c) => {
  const rows = await getDb().select().from(levels).orderBy(asc(levels.ageMin));
  return c.json(rows);
});

levelRoutes.post('/', requireDirectora, async (c) => {
  const body = await parseBody(c, levelSchema);
  if (body.ageMax < body.ageMin) {
    throw new HTTPException(400, {
      message: 'La edad maxima no puede ser menor que la minima',
    });
  }
  const [created] = await getDb()
    .insert(levels)
    .values({
      name: body.name.trim(),
      ageMin: body.ageMin,
      ageMax: body.ageMax,
      monthlyFee: body.monthlyFee.toFixed(2),
    })
    .returning();
  return c.json(created, 201);
});

levelRoutes.patch('/:id', requireDirectora, async (c) => {
  const id = paramId(c);
  const body = await parseBody(c, levelSchema.partial());

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.ageMin !== undefined) patch.ageMin = body.ageMin;
  if (body.ageMax !== undefined) patch.ageMax = body.ageMax;
  if (body.monthlyFee !== undefined) {
    patch.monthlyFee = body.monthlyFee.toFixed(2);
  }

  const [updated] = await getDb()
    .update(levels)
    .set(patch)
    .where(eq(levels.id, id))
    .returning();
  if (!updated) throw new HTTPException(404, { message: 'Nivel no encontrado' });
  return c.json(updated);
});

levelRoutes.delete('/:id', requireDirectora, async (c) => {
  const id = paramId(c);
  const [deleted] = await getDb()
    .delete(levels)
    .where(eq(levels.id, id))
    .returning({ id: levels.id });
  if (!deleted) throw new HTTPException(404, { message: 'Nivel no encontrado' });
  return c.json({ ok: true });
});
