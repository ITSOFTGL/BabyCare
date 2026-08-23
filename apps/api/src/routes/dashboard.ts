import { Hono } from 'hono';
import {
  and,
  asc,
  children,
  count,
  dailyActivities,
  desc,
  eq,
  getDb,
  gte,
  inArray,
  levels,
  notifications,
  payments,
  rooms,
  teachers,
  users,
} from '@kidcare/db';
import { env } from '../env.ts';
import { getVisibleChildIds } from '../lib/scope.ts';
import { requireAuth, type AppEnv } from '../middleware/auth.ts';

export const dashboardRoutes = new Hono<AppEnv>();

dashboardRoutes.use('*', requireAuth);

/**
 * Resumen unico para las tres vistas del panel. Cada rol recibe la misma forma
 * de respuesta pero recortada a lo que puede ver, asi el frontend no necesita
 * endpoints distintos por rol.
 */
dashboardRoutes.get('/', async (c) => {
  const db = getDb();
  const user = c.get('user');
  const visible = await getVisibleChildIds(user);
  const scoped = visible !== null;
  const empty = scoped && visible.length === 0;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const childRows = empty
    ? []
    : await db
        .select({ child: children, level: levels, room: rooms })
        .from(children)
        .leftJoin(levels, eq(children.levelId, levels.id))
        .leftJoin(rooms, eq(children.roomId, rooms.id))
        .where(scoped ? inArray(children.id, visible) : undefined)
        .orderBy(asc(children.name));

  const recentActivities = empty
    ? []
    : await db
        .select({
          activity: dailyActivities,
          childName: children.name,
          recordedByName: users.name,
        })
        .from(dailyActivities)
        .innerJoin(children, eq(dailyActivities.childId, children.id))
        .leftJoin(users, eq(dailyActivities.recordedBy, users.id))
        .where(scoped ? inArray(dailyActivities.childId, visible) : undefined)
        .orderBy(desc(dailyActivities.recordedAt))
        .limit(10);

  const paymentRows = empty
    ? []
    : await db
        .select({ payment: payments, childName: children.name })
        .from(payments)
        .innerJoin(children, eq(payments.childId, children.id))
        .where(scoped ? inArray(payments.childId, visible) : undefined)
        .orderBy(desc(payments.createdAt))
        .limit(20);

  const activitiesTodayFilters = [
    gte(dailyActivities.recordedAt, startOfDay),
    scoped ? inArray(dailyActivities.childId, visible) : undefined,
  ].filter(Boolean) as never[];

  const [activitiesToday] = empty
    ? [{ n: 0 }]
    : await db
        .select({ n: count() })
        .from(dailyActivities)
        .where(and(...activitiesTodayFilters));

  const [teacherCount] = await db.select({ n: count() }).from(teachers);
  const [roomCount] = await db.select({ n: count() }).from(rooms);
  const [levelCount] = await db.select({ n: count() }).from(levels);
  const [unread] = await db
    .select({ n: count() })
    .from(notifications)
    .where(
      and(eq(notifications.userId, user.id), eq(notifications.read, false)),
    );

  return c.json({
    role: user.role,
    tenantName: env.tenantName,
    totals: {
      children: childRows.length,
      teachers: teacherCount?.n ?? 0,
      rooms: roomCount?.n ?? 0,
      levels: levelCount?.n ?? 0,
      pendingPayments: paymentRows.filter((p) => p.payment.status === 'pendiente')
        .length,
      activitiesToday: activitiesToday?.n ?? 0,
    },
    children: childRows.map((r) => ({
      ...r.child,
      level: r.level,
      room: r.room,
    })),
    recentActivities: recentActivities.map((r) => ({
      ...r.activity,
      childName: r.childName,
      recordedByName: r.recordedByName,
    })),
    payments: paymentRows.map((r) => ({ ...r.payment, childName: r.childName })),
    unreadNotifications: unread?.n ?? 0,
  });
});
