import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import {
  and,
  children,
  dailyActivities,
  desc,
  eq,
  extraCharges,
  getDb,
  gte,
  inArray,
  lte,
  rooms,
  users,
} from '@kidcare/db';
import { ACTIVITY_LABELS, ACTIVITY_TYPES } from '@kidcare/types';
import { parseBody, parseQuery, uuidSchema } from '../lib/validate.ts';
import { canAccessChild, getVisibleChildIds } from '../lib/scope.ts';
import { notifyUser } from '../lib/notify.ts';
import {
  requireAuth,
  requireStaff,
  type AppEnv,
} from '../middleware/auth.ts';

const listQuerySchema = z.object({
  childId: uuidSchema.optional(),
  /**
   * Instantes UTC que delimitan el rango a mostrar, en formato ISO
   * (`new Date().toISOString()`). Los calcula el CLIENTE a partir de su
   * propia zona horaria (p. ej. "medianoche a medianoche de hoy en mi
   * huso"), no el servidor: un contenedor Docker corre en UTC por defecto,
   * asi que interpretar aqui una fecha suelta como "AAAA-MM-DDT00:00:00"
   * daria el dia equivocado para cualquier familia fuera de UTC.
   */
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const createSchema = z.object({
  childId: uuidSchema,
  type: z.enum(ACTIVITY_TYPES),
  description: z.string().max(1000).optional().nullable(),
  recordedAt: z.string().datetime().optional(),
  extra: z
    .object({
      kind: z.enum(['panal', 'leche', 'otro']),
      amount: z.coerce.number().min(0),
      description: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
});

export const activityRoutes = new Hono<AppEnv>();

activityRoutes.use('*', requireAuth);

activityRoutes.get('/', async (c) => {
  const query = parseQuery(c, listQuerySchema);
  const user = c.get('user');

  const visible = await getVisibleChildIds(user);
  if (visible !== null && visible.length === 0) return c.json([]);

  if (query.childId && !(await canAccessChild(user, query.childId))) {
    throw new HTTPException(403, {
      message: 'No puedes ver la agenda de este alumno',
    });
  }

  const filters = [
    query.childId
      ? eq(dailyActivities.childId, query.childId)
      : visible !== null
        ? inArray(dailyActivities.childId, visible)
        : undefined,
  ];

  if (query.from) filters.push(gte(dailyActivities.recordedAt, new Date(query.from)));
  if (query.to) filters.push(lte(dailyActivities.recordedAt, new Date(query.to)));

  const active = filters.filter(Boolean) as never[];

  const rows = await getDb()
    .select({
      activity: dailyActivities,
      childName: children.name,
      recordedByName: users.name,
      roomId: children.roomId,
      roomName: rooms.name,
    })
    .from(dailyActivities)
    .innerJoin(children, eq(dailyActivities.childId, children.id))
    .leftJoin(users, eq(dailyActivities.recordedBy, users.id))
    .leftJoin(rooms, eq(children.roomId, rooms.id))
    .where(active.length ? and(...active) : undefined)
    .orderBy(desc(dailyActivities.recordedAt))
    .limit(query.limit);

  return c.json(
    rows.map((r) => ({
      ...r.activity,
      childName: r.childName,
      recordedByName: r.recordedByName,
      roomId: r.roomId,
      roomName: r.roomName,
    })),
  );
});

// Solo el personal registra agenda: los padres la consultan, no la escriben.
activityRoutes.post('/', requireStaff, async (c) => {
  const body = await parseBody(c, createSchema);
  const user = c.get('user');

  if (!(await canAccessChild(user, body.childId))) {
    throw new HTTPException(403, {
      message: 'Ese alumno no pertenece a tu sala',
    });
  }

  const db = getDb();
  const [created] = await db
    .insert(dailyActivities)
    .values({
      childId: body.childId,
      type: body.type,
      description: body.description ?? null,
      recordedBy: user.id,
      recordedAt: body.recordedAt ? new Date(body.recordedAt) : new Date(),
    })
    .returning();

  // Aviso in-app al apoderado (v1: solo tabla, sin push).
  const [child] = await db
    .select({ name: children.name, parentId: children.parentId })
    .from(children)
    .where(eq(children.id, body.childId))
    .limit(1);

  if (child?.parentId) {
    await notifyUser({
      userId: child.parentId,
      title: `Nueva anotacion de ${child.name}`,
      message: `${ACTIVITY_LABELS[body.type]}${
        body.description ? `: ${body.description}` : ''
      }`,
      type: 'agenda',
      data: { activityId: created!.id, childId: body.childId },
    });
  }

  if (body.extra && body.extra.amount > 0) {
    await db.insert(extraCharges).values({
      childId: body.childId,
      kind: body.extra.kind,
      description: body.extra.description ?? null,
      amount: body.extra.amount.toFixed(2),
      recordedBy: user.id,
      activityId: created!.id,
    });
    if (child?.parentId) {
      await notifyUser({
        userId: child.parentId,
        title: `Cargo extra de ${child.name}`,
        message: `${body.extra.kind}: ${body.extra.amount.toFixed(2)} Bs`,
        type: 'pago',
      });
    }
  }

  return c.json(created, 201);
});

activityRoutes.delete('/:id', requireStaff, async (c) => {
  const id = c.req.param('id');
  const [deleted] = await getDb()
    .delete(dailyActivities)
    .where(eq(dailyActivities.id, id))
    .returning({ id: dailyActivities.id });
  if (!deleted) {
    throw new HTTPException(404, { message: 'Registro no encontrado' });
  }
  return c.json({ ok: true });
});
