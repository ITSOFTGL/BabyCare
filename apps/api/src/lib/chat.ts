import { and, chats, chatMembers, chatMessages, children, eq, getDb, isNotNull, rooms, teachers, users } from '@kidcare/db';

export async function ensureRoomChat(roomId: string, title?: string) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(chats)
    .where(and(eq(chats.kind, 'sala'), eq(chats.roomId, roomId)))
    .limit(1);
  if (existing) return existing;

  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
  const [created] = await db
    .insert(chats)
    .values({
      kind: 'sala',
      title: title ?? room?.name ?? 'Sala',
      roomId,
    })
    .returning();
  return created!;
}

export async function addChatMember(chatId: string, userId: string | null | undefined) {
  if (!userId) return;
  const db = getDb();
  const [found] = await db
    .select()
    .from(chatMembers)
    .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)))
    .limit(1);
  if (found) return;
  await db.insert(chatMembers).values({ chatId, userId });
}

export async function addParentToRoomChat(roomId: string | null | undefined, parentId: string | null | undefined) {
  if (!roomId || !parentId) return;
  const chat = await ensureRoomChat(roomId);
  await addChatMember(chat.id, parentId);
  const staff = await getDb()
    .select({ userId: teachers.userId })
    .from(teachers)
    .where(eq(teachers.roomId, roomId));
  for (const t of staff) await addChatMember(chat.id, t.userId);
  for (const id of await directorIds()) await addChatMember(chat.id, id);
}

/** Crea el chat de cada sala y mete a dirección, profes y papás actuales. */
export async function syncAllRoomChats() {
  const db = getDb();
  const allRooms = await db.select().from(rooms);
  const dirs = await directorIds();
  for (const room of allRooms) {
    const chat = await ensureRoomChat(room.id);
    if (room.name && chat.title !== room.name) {
      await db.update(chats).set({ title: room.name }).where(eq(chats.id, chat.id));
      chat.title = room.name;
    }
    for (const id of dirs) await addChatMember(chat.id, id);
    const staff = await db
      .select({ userId: teachers.userId })
      .from(teachers)
      .where(eq(teachers.roomId, room.id));
    for (const t of staff) await addChatMember(chat.id, t.userId);
    const kids = await db
      .select({ parentId: children.parentId })
      .from(children)
      .where(and(eq(children.roomId, room.id), isNotNull(children.parentId)));
    for (const kid of kids) await addChatMember(chat.id, kid.parentId);
  }
}

export async function createAnnouncementChat(input: {
  announcementId: string;
  title: string;
  body: string;
  createdBy: string;
  parentIds: string[];
  roomId?: string | null;
}) {
  const db = getDb();
  const [chat] = await db
    .insert(chats)
    .values({
      kind: 'comunicado',
      title: input.title,
      announcementId: input.announcementId,
      roomId: input.roomId ?? null,
    })
    .returning();

  await addChatMember(chat!.id, input.createdBy);
  for (const id of input.parentIds) await addChatMember(chat!.id, id);

  await db.insert(chatMessages).values({
    chatId: chat!.id,
    userId: input.createdBy,
    body: input.body,
  });

  return chat!;
}

export async function parentIdsInRoom(roomId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ parentId: children.parentId })
    .from(children)
    .where(and(eq(children.roomId, roomId), isNotNull(children.parentId)));
  return [...new Set(rows.map((r) => r.parentId as string))];
}

export async function directorIds(): Promise<string[]> {
  const rows = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, 'directora'));
  return rows.map((r) => r.id);
}
