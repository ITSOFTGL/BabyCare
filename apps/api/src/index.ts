import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';
import { env } from './env.ts';
import type { AppEnv } from './middleware/auth.ts';
import { authRoutes } from './routes/auth.ts';
import { userRoutes } from './routes/users.ts';
import { levelRoutes } from './routes/levels.ts';
import { roomRoutes } from './routes/rooms.ts';
import { childRoutes } from './routes/children.ts';
import { teacherRoutes } from './routes/teachers.ts';
import { activityRoutes } from './routes/activities.ts';
import { paymentRoutes } from './routes/payments.ts';
import { notificationRoutes } from './routes/notifications.ts';
import { announcementRoutes } from './routes/announcements.ts';
import { pushRoutes } from './routes/push.ts';
import { dashboardRoutes } from './routes/dashboard.ts';

const app = new Hono<AppEnv>();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: env.corsOrigins.includes('*') ? '*' : env.corsOrigins,
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  }),
);

app.get('/health', (c) =>
  c.json({ ok: true, service: 'kidcare-api', tenant: env.tenantName }),
);
app.get('/api/health', (c) =>
  c.json({ ok: true, service: 'kidcare-api', tenant: env.tenantName }),
);

app.route('/api/auth', authRoutes);
app.route('/api/users', userRoutes);
app.route('/api/levels', levelRoutes);
app.route('/api/rooms', roomRoutes);
app.route('/api/children', childRoutes);
app.route('/api/teachers', teacherRoutes);
app.route('/api/activities', activityRoutes);
app.route('/api/payments', paymentRoutes);
app.route('/api/notifications', notificationRoutes);
app.route('/api/announcements', announcementRoutes);
app.route('/api/push', pushRoutes);
app.route('/api/dashboard', dashboardRoutes);

app.notFound((c) => c.json({ error: 'Ruta no encontrada' }, 404));

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    // Las rutas que necesitan detalle adjuntan su propia respuesta JSON.
    const custom = err.getResponse();
    if (custom.headers.get('content-type')?.includes('application/json')) {
      return custom;
    }
    return c.json({ error: err.message }, err.status);
  }
  console.error('[api] error no controlado:', err);
  return c.json({ error: 'Error interno del servidor' }, 500);
});

console.log(
  `🧸 KidCare API "${env.tenantName}" escuchando en http://0.0.0.0:${env.port}`,
);

export default {
  port: env.port,
  hostname: '0.0.0.0',
  fetch: app.fetch,
};
