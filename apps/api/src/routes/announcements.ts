import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import {
  and,
  announcements,
  children,
  desc,
  eq,
  getDb,
  isNotNull,
  rooms,
} from '@kidcare/db';
import { parseBody, uuidSchema } from '../lib/validate.ts';
import { notifyUser } from '../lib/notify.ts';
import { createAnnouncementChat } from '../lib/chat.ts';
import {
  requireAuth,
  requireDirectora,
  type AppEnv,
} from '../middleware/auth.ts';

/**
 * Comunicados: la directora manda un aviso a todos los padres, a los de una
 * sala, o al apoderado de un alumno puntual. La entrega en si reutiliza la
 * tabla `notifications` (una fila por destinatario, via notifyUser); esta
 * tabla solo guarda el comunicado en si para el historial.
 */
const sendSchema = z.discriminatedUnion('audience', [
  z.object({
    audience: z.literal('todos'),
    title: z.string().min(2, 'Título demasiado corto'),
    message: z.string().min(1, 'El mensaje no puede estar vacío'),
  }),
  z.object({
    audience: z.literal('sala'),
    title: z.string().min(2, 'Título demasiado corto'),
    message: z.string().min(1, 'El mensaje no puede estar vacío'),
    roomId: uuidSchema,
  }),
  z.object({
    audience: z.literal('padre'),
    title: z.string().min(2, 'Título demasiado corto'),
    message: z.string().min(1, 'El mensaje no puede estar vacío'),
    childId: uuidSchema,
  }),
]);

export const announcementRoutes = new Hono<AppEnv>();

// Solo la directora envia comunicados; son avisos oficiales de la guarderia.
announcementRoutes.use('*', requireAuth);

announcementRoutes.get('/', requireDirectora, async (c) => {
  const rows = await getDb()
    .select()
    .from(announcements)
    .orderBy(desc(announcements.createdAt))
    .limit(50);
  return c.json(rows);
});

announcementRoutes.post('/', requireDirectora, async (c) => {
  const body = await parseBody(c, sendSchema);
  const db = getDb();
  const user = c.get('user');
  const title = body.title.trim();
  const message = body.message.trim();

  let recipientParentIds: string[] = [];
  let roomId: string | null = null;
  let childId: string | null = null;

  if (body.audience === 'todos') {
    const rows = await db
      .select({ parentId: children.parentId })
      .from(children)
      .where(isNotNull(children.parentId));
    recipientParentIds = [...new Set(rows.map((r) => r.parentId as string))];
  } else if (body.audience === 'sala') {
    roomId = body.roomId;
    const [room] = await db
      .select({ id: rooms.id })
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1);
    if (!room) throw new HTTPException(404, { message: 'Sala no encontrada' });

    const rows = await db
      .select({ parentId: children.parentId })
      .from(children)
      .where(and(eq(children.roomId, roomId), isNotNull(children.parentId)));
    recipientParentIds = [...new Set(rows.map((r) => r.parentId as string))];
  } else {
    childId = body.childId;
    const [child] = await db
      .select({ parentId: children.parentId })
      .from(children)
      .where(eq(children.id, childId))
      .limit(1);
    if (!child) throw new HTTPException(404, { message: 'Alumno no encontrado' });
    if (!child.parentId) {
      throw new HTTPException(400, {
        message: 'Ese alumno todavía no tiene un apoderado asignado',
      });
    }
    recipientParentIds = [child.parentId];
  }

  const [created] = await db
    .insert(announcements)
    .values({
      title,
      message,
      audience: body.audience,
      roomId,
      childId,
      createdBy: user.id,
      recipientCount: recipientParentIds.length,
    })
    .returning();

  await Promise.all(
    recipientParentIds.map((parentId) =>
      notifyUser({
        userId: parentId,
        title: `📢 ${title}`,
        message,
        type: 'comunicado',
        data: { announcementId: created!.id },
      }),
    ),
  );

  const chat = await createAnnouncementChat({
    announcementId: created!.id,
    title,
    body: message,
    createdBy: user.id,
    parentIds: recipientParentIds,
    roomId,
  });

  return c.json({ ...created, chatId: chat.id }, 201);
});
