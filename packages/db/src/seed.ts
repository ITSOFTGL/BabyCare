/**
 * Seed inicial de una guarderia recien creada.
 *
 * Es idempotente: se puede correr varias veces sin duplicar datos.
 * Ademas de la directora, deja un equipo, familias, pagos y agenda
 * listos para una demo.
 */
import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { createClient } from './client.ts';
import {
  announcements,
  chatMembers,
  chats,
  children,
  dailyActivities,
  guardians,
  levels,
  notifications,
  payments,
  rooms,
  teachers,
  users,
} from './schema.ts';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'directora@kidcare.test';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Directora123!';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? 'Clara Soler';

const TEACHER_EMAIL = 'profesora@kidcare.test';
const TEACHER_PASSWORD = 'Profesora123!';
const PARENT_EMAIL = 'padre@kidcare.test';
const PARENT_PASSWORD = 'Padre123!';
const PARENT2_EMAIL = 'madre@kidcare.test';
const PARENT2_PASSWORD = 'Madre123!';

const { sql, db } = createClient(undefined, 1);

async function upsertUser(input: {
  email: string;
  password: string;
  name: string;
  role: 'directora' | 'profesora' | 'auxiliar' | 'padre';
  phone?: string;
}) {
  const email = input.email.toLowerCase();
  const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (found[0]) return found[0];
  const passwordHash = await bcrypt.hash(input.password, 10);
  const [created] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      name: input.name,
      role: input.role,
      phone: input.phone ?? null,
    })
    .returning();
  console.log(`[seed] cuenta creada: ${email} (${input.role})`);
  return created!;
}

try {
  const admin = await upsertUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    name: ADMIN_NAME,
    role: 'directora',
    phone: '70010001',
  });

  const teacherUser = await upsertUser({
    email: TEACHER_EMAIL,
    password: TEACHER_PASSWORD,
    name: 'Marta López',
    role: 'profesora',
    phone: '70020002',
  });

  const parent = await upsertUser({
    email: PARENT_EMAIL,
    password: PARENT_PASSWORD,
    name: 'Andrés Fernández',
    role: 'padre',
    phone: '70030003',
  });

  const parent2 = await upsertUser({
    email: PARENT2_EMAIL,
    password: PARENT2_PASSWORD,
    name: 'Elena Ruiz',
    role: 'padre',
    phone: '70030004',
  });

  const levelSeed = [
    { name: 'Lactantes', ageMin: 0, ageMax: 1, monthlyFee: '350.00' },
    { name: 'Maternal', ageMin: 2, ageMax: 3, monthlyFee: '300.00' },
    { name: 'Infantil', ageMin: 3, ageMax: 5, monthlyFee: '250.00' },
  ];

  const levelIds: Record<string, string> = {};

  for (const level of levelSeed) {
    const found = await db
      .select()
      .from(levels)
      .where(eq(levels.name, level.name))
      .limit(1);

    if (found[0]) {
      levelIds[level.name] = found[0].id;
      continue;
    }

    const [created] = await db.insert(levels).values(level).returning();
    levelIds[level.name] = created!.id;
    console.log(`[seed] nivel creado: ${level.name}`);
  }

  const roomSeed = [
    { name: 'Sala Ositos', levelName: 'Lactantes', turn: 'manana' as const, capacity: 12 },
    { name: 'Sala Girasoles', levelName: 'Maternal', turn: 'completo' as const, capacity: 18 },
    { name: 'Sala Robles', levelName: 'Infantil', turn: 'completo' as const, capacity: 20 },
  ];

  const roomIds: Record<string, string> = {};
  const allRooms = await db.select().from(rooms);

  for (const room of roomSeed) {
    const found =
      allRooms.find((r) => r.name === room.name) ??
      allRooms.find((r) => r.name.startsWith(room.name));

    if (found) {
      roomIds[room.name] = found.id;
      continue;
    }

    const [created] = await db
      .insert(rooms)
      .values({
        name: room.name,
        levelId: levelIds[room.levelName] ?? null,
        turn: room.turn,
        capacity: room.capacity,
      })
      .returning();
    roomIds[room.name] = created!.id;
    console.log(`[seed] sala creada: ${room.name}`);
  }

  const existingTeacher = await db
    .select()
    .from(teachers)
    .where(eq(teachers.email, TEACHER_EMAIL))
    .limit(1);

  if (existingTeacher.length === 0) {
    await db.insert(teachers).values({
      userId: teacherUser.id,
      name: 'Marta López',
      specialty: 'Educación infantil',
      roomId: roomIds['Sala Girasoles'] ?? null,
      turn: 'completo',
      phone: '70020002',
      email: TEACHER_EMAIL,
    });
    console.log('[seed] ficha de profesora creada');
  }

  const childSeed = [
    {
      name: 'Lucía Fernández',
      birthDate: '2023-04-12',
      level: 'Maternal',
      room: 'Sala Girasoles',
      turn: 'completo' as const,
      parentId: parent.id,
      allergies: 'Frutos secos',
      medications: null,
      authorizedPickup: ['Abuela Rosa', 'Tío Marc'],
      monthlyFee: '300.00',
      guardian: { name: 'Andrés Fernández', phone: '70030003', email: PARENT_EMAIL, ci: '1234567' },
    },
    {
      name: 'Leo Ruiz',
      birthDate: '2024-09-03',
      level: 'Lactantes',
      room: 'Sala Ositos',
      turn: 'manana' as const,
      parentId: parent2.id,
      allergies: null,
      medications: null,
      authorizedPickup: ['Elena Ruiz'],
      monthlyFee: '350.00',
      guardian: { name: 'Elena Ruiz', phone: '70030004', email: PARENT2_EMAIL, ci: '7654321' },
    },
    {
      name: 'Sofía Martín',
      birthDate: '2021-11-20',
      level: 'Infantil',
      room: 'Sala Robles',
      turn: 'completo' as const,
      parentId: null,
      allergies: null,
      medications: 'Salbutamol puntual',
      authorizedPickup: ['Padre Jorge'],
      monthlyFee: '250.00',
      guardian: { name: 'Jorge Martín', phone: '70040005', email: 'jorge@familia.test', ci: '4455667' },
    },
    {
      name: 'Mateo Vidal',
      birthDate: '2022-06-08',
      level: 'Maternal',
      room: 'Sala Girasoles',
      turn: 'completo' as const,
      parentId: null,
      allergies: 'Lactosa',
      medications: null,
      authorizedPickup: ['Madre Ana'],
      monthlyFee: '300.00',
      guardian: { name: 'Ana Vidal', phone: '70040006', email: 'ana@familia.test', ci: '8899001' },
    },
  ];

  const childIds: Record<string, string> = {};

  for (const kid of childSeed) {
    const found = await db
      .select()
      .from(children)
      .where(eq(children.name, kid.name))
      .limit(1);

    if (found[0]) {
      childIds[kid.name] = found[0].id;
      continue;
    }

    const [created] = await db
      .insert(children)
      .values({
        name: kid.name,
        birthDate: kid.birthDate,
        levelId: levelIds[kid.level] ?? null,
        roomId: roomIds[kid.room] ?? null,
        turn: kid.turn,
        authorizedPickup: kid.authorizedPickup,
        allergies: kid.allergies,
        medications: kid.medications,
        parentId: kid.parentId,
        monthlyFee: kid.monthlyFee,
      })
      .returning();
    childIds[kid.name] = created!.id;
    await db.insert(guardians).values({
      childId: created!.id,
      name: kid.guardian.name,
      phone: kid.guardian.phone,
      email: kid.guardian.email,
      ci: kid.guardian.ci,
      isPrimary: true,
    });
    console.log(`[seed] alumno creado: ${kid.name}`);
  }

  for (const [name, rid] of Object.entries(roomIds)) {
    if (!rid) continue;
    const foundChat = await db
      .select()
      .from(chats)
      .where(and(eq(chats.kind, 'sala'), eq(chats.roomId, rid)))
      .limit(1);
    let chatId = foundChat[0]?.id;
    if (!chatId) {
      const [createdChat] = await db
        .insert(chats)
        .values({ kind: 'sala', title: name, roomId: rid })
        .returning();
      chatId = createdChat!.id;
    }
    const members = new Set<string>([admin.id, teacherUser.id]);
    for (const kid of childSeed) {
      if (kid.room === name && kid.parentId) members.add(kid.parentId);
    }
    for (const userId of members) {
      const already = await db
        .select()
        .from(chatMembers)
        .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)))
        .limit(1);
      if (already[0]) continue;
      await db.insert(chatMembers).values({ chatId, userId });
    }
  }

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const month = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}`;
  const nextDue = iso(new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()));
  const prevPaidAt = new Date(now.getFullYear(), now.getMonth() - 1, 8);
  const prevDue = iso(new Date(prevPaidAt.getFullYear(), prevPaidAt.getMonth() + 1, prevPaidAt.getDate()));

  const luciaId = childIds['Lucía Fernández'];
  const leoId = childIds['Leo Ruiz'];
  const sofiaId = childIds['Sofía Martín'];

  if (luciaId) {
    const existingPay = await db
      .select()
      .from(payments)
      .where(eq(payments.childId, luciaId))
      .limit(1);
    if (existingPay.length === 0) {
      await db.insert(payments).values([
        {
          childId: luciaId,
          amount: '300.00',
          months: [prevMonth],
          status: 'pagado',
          method: 'qr',
          paidAt: prevPaidAt,
          invoiceNumber: `REC-${now.getFullYear()}-0001`,
          payerName: 'Andrés Fernández',
          payerCi: '1234567',
          periodStart: iso(prevPaidAt),
          dueDate: prevDue,
        },
        {
          childId: luciaId,
          amount: '300.00',
          months: [month],
          status: 'pendiente',
          periodStart: iso(now),
          dueDate: nextDue,
        },
      ]);
      if (leoId) {
        await db.insert(payments).values({
          childId: leoId,
          amount: '350.00',
          months: [month],
          status: 'pendiente',
          periodStart: iso(now),
          dueDate: nextDue,
        });
      }
      if (sofiaId) {
        await db.insert(payments).values({
          childId: sofiaId,
          amount: '250.00',
          months: [month],
          status: 'pagado',
          method: 'efectivo',
          paidAt: new Date(),
          invoiceNumber: `REC-${now.getFullYear()}-0002`,
          payerName: 'Jorge Martín',
          payerCi: '4455667',
          periodStart: iso(now),
          dueDate: nextDue,
        });
      }
      console.log('[seed] pagos de demo creados');
    }
  }

  if (luciaId) {
    const existingAct = await db
      .select()
      .from(dailyActivities)
      .where(eq(dailyActivities.childId, luciaId))
      .limit(1);
    if (existingAct.length === 0) {
      await db.insert(dailyActivities).values([
        {
          childId: luciaId,
          type: 'comida',
          description: 'Comió todo el puré de calabaza y pidió un poco más.',
          recordedBy: teacherUser.id,
        },
        {
          childId: luciaId,
          type: 'siesta',
          description: 'Durmió 1 hora y 20 minutos. Despertó de buen humor.',
          recordedBy: teacherUser.id,
        },
        {
          childId: luciaId,
          type: 'observacion',
          description: 'Jugó con Mateo en el rincón de construcciones.',
          recordedBy: teacherUser.id,
        },
      ]);
      if (leoId) {
        await db.insert(dailyActivities).values({
          childId: leoId,
          type: 'biberon',
          description: 'Tomó 180 ml a las 10:30.',
          recordedBy: teacherUser.id,
        });
      }
      console.log('[seed] agenda de hoy creada');
    }
  }

  const existingAnn = await db.select().from(announcements).limit(1);
  if (existingAnn.length === 0) {
    await db.insert(announcements).values({
      title: 'Bienvenida al curso',
      message:
        'Os damos la bienvenida a la casa. Esta semana adaptamos horarios con calma. Cualquier duda, escribid a dirección.',
      audience: 'todos',
      createdBy: admin.id,
      recipientCount: 2,
    });
    await db.insert(notifications).values([
      {
        userId: parent.id,
        title: 'Bienvenida al curso',
        message: 'Os damos la bienvenida a la casa. Esta semana adaptamos horarios con calma.',
        type: 'comunicado',
      },
      {
        userId: parent2.id,
        title: 'Bienvenida al curso',
        message: 'Os damos la bienvenida a la casa. Esta semana adaptamos horarios con calma.',
        type: 'comunicado',
      },
      {
        userId: parent.id,
        title: `Nueva cuota pendiente de Lucía Fernández`,
        message: `${month} — 300.00 Bs`,
        type: 'pago',
      },
    ]);
    console.log('[seed] comunicado y avisos de demo creados');
  }

  console.log('\n[seed] listo');
  console.log('---------------------------------------------');
  console.log(`  Directora  ${ADMIN_EMAIL}  /  ${ADMIN_PASSWORD}`);
  console.log(`  Profesora  ${TEACHER_EMAIL}  /  ${TEACHER_PASSWORD}`);
  console.log(`  Padre      ${PARENT_EMAIL}     /  ${PARENT_PASSWORD}`);
  console.log(`  Madre      ${PARENT2_EMAIL}     /  ${PARENT2_PASSWORD}`);
  console.log('---------------------------------------------');
} catch (error) {
  console.error('[seed] fallo:', error);
  process.exitCode = 1;
} finally {
  await sql.end();
}
