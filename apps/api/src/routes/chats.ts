import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import {
  and,
  asc,
  chatMembers,
  chatMessages,
  chats,
  desc,
  eq,
  getDb,
  gte,
  teachers,
  users,
} from '@kidcare/db';
import { parseBody } from '../lib/validate.ts';
import { addChatMember, ensureRoomChat, syncAllRoomChats } from '../lib/chat.ts';
import { requireAuth, type AppEnv } from '../middleware/auth.ts';

export const chatRoutes = new Hono<AppEnv>();
chatRoutes.use('*', requireAuth);

async function canSeeChat(userId: string, role: string, chatId: string) {
  if (role === 'directora') return true;
  const [m] = await getDb()
    .select()
    .from(chatMembers)
    .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)))
    .limit(1);
  return Boolean(m);
}

chatRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = getDb();
  await syncAllRoomChats();

  if (user.role === 'directora') {
    const rooms = await db.select().from(chats).orderBy(desc(chats.createdAt));
    return c.json(rooms);
  }

  if (user.role === 'profesora' || user.role === 'auxiliar') {
    const [ficha] = await db
      .select()
      .from(teachers)
      .where(eq(teachers.userId, user.id))
      .limit(1);
    if (ficha?.roomId) {
      const chat = await ensureRoomChat(ficha.roomId);
      await addChatMember(chat.id, user.id);
    }
  }

  const memberships = await db
    .select({ chat: chats })
    .from(chatMembers)
    .innerJoin(chats, eq(chatMembers.chatId, chats.id))
    .where(eq(chatMembers.userId, user.id))
    .orderBy(desc(chats.createdAt));

  return c.json(memberships.map((m) => m.chat));
});

chatRoutes.get('/:id/messages', async (c) => {
  const user = c.get('user');
  const chatId = c.req.param('id');
  if (!(await canSeeChat(user.id, user.role, chatId))) {
    throw new HTTPException(403, { message: 'No formas parte de este chat' });
  }

  const db = getDb();
  const [member] = await db
    .select()
    .from(chatMembers)
    .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, user.id)))
    .limit(1);

  const joinedAt = user.role === 'directora' ? new Date(0) : member?.joinedAt ?? new Date();

  const rows = await db
    .select({ msg: chatMessages, authorName: users.name })
    .from(chatMessages)
    .leftJoin(users, eq(chatMessages.userId, users.id))
    .where(and(eq(chatMessages.chatId, chatId), gte(chatMessages.createdAt, joinedAt)))
    .orderBy(asc(chatMessages.createdAt))
    .limit(200);

  return c.json(
    rows.map((r) => ({ ...r.msg, authorName: r.authorName })),
  );
});

chatRoutes.post('/:id/messages', async (c) => {
  const user = c.get('user');
  const chatId = c.req.param('id');
  if (!(await canSeeChat(user.id, user.role, chatId))) {
    throw new HTTPException(403, { message: 'No formas parte de este chat' });
  }
  const body = await parseBody(c, z.object({ body: z.string().min(1).max(2000) }));
  const [created] = await getDb()
    .insert(chatMessages)
    .values({ chatId, userId: user.id, body: body.body.trim() })
    .returning();
  return c.json({ ...created, authorName: user.name }, 201);
});
