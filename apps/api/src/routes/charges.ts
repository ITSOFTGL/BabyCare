import { Hono } from 'hono';
import { z } from 'zod';
import {
  and,
  children,
  desc,
  eq,
  extraCharges,
  getDb,
  inArray,
  users,
} from '@kidcare/db';
import { parseBody, uuidSchema } from '../lib/validate.ts';
import { canAccessChild, getVisibleChildIds } from '../lib/scope.ts';
import { requireAuth, requireStaff, type AppEnv } from '../middleware/auth.ts';

export const chargeRoutes = new Hono<AppEnv>();
chargeRoutes.use('*', requireAuth);

chargeRoutes.get('/', async (c) => {
  const user = c.get('user');
  const visible = await getVisibleChildIds(user);
  if (visible !== null && visible.length === 0) return c.json([]);
  const rows = await getDb()
    .select({
      charge: extraCharges,
      childName: children.name,
      recordedByName: users.name,
    })
    .from(extraCharges)
    .innerJoin(children, eq(extraCharges.childId, children.id))
    .leftJoin(users, eq(extraCharges.recordedBy, users.id))
    .where(visible !== null ? inArray(extraCharges.childId, visible) : undefined)
    .orderBy(desc(extraCharges.createdAt));
  return c.json(
    rows.map((r) => ({
      ...r.charge,
      childName: r.childName,
      recordedByName: r.recordedByName,
    })),
  );
});

chargeRoutes.post('/', requireStaff, async (c) => {
  const user = c.get('user');
  const body = await parseBody(
    c,
    z.object({
      childId: uuidSchema,
      kind: z.enum(['panal', 'leche', 'otro']).default('otro'),
      amount: z.coerce.number().min(0),
      description: z.string().optional().nullable(),
    }),
  );
  if (!(await canAccessChild(user, body.childId))) {
    return c.json({ error: 'Ese alumno no es de tu sala' }, 403);
  }
  const [created] = await getDb()
    .insert(extraCharges)
    .values({
      childId: body.childId,
      kind: body.kind,
      amount: body.amount.toFixed(2),
      description: body.description ?? null,
      recordedBy: user.id,
    })
    .returning();
  return c.json(created, 201);
});
