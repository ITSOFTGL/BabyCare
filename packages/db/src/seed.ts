/**
 * Seed inicial de una guarderia recien creada.
 *
 * Sin esto no hay forma de entrar al sistema: crea la primera cuenta de
 * directora, que despues puede dar de alta al resto (profesoras, auxiliares y
 * padres) desde `POST /api/users`.
 *
 * Es idempotente: se puede correr varias veces sin duplicar datos.
 */
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { createClient } from './client.ts';
import { levels, rooms, users } from './schema.ts';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'directora@kidcare.test';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Directora123!';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? 'Directora Demo';

const { sql, db } = createClient(undefined, 1);

try {
  // --- Usuario directora -----------------------------------------------
  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1);

  if (existingAdmin.length > 0) {
    console.log(`[seed] la directora ${ADMIN_EMAIL} ya existe, se omite`);
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await db.insert(users).values({
      email: ADMIN_EMAIL,
      passwordHash,
      name: ADMIN_NAME,
      role: 'directora',
      phone: '+34 600 000 000',
    });
    console.log(`[seed] directora creada: ${ADMIN_EMAIL}`);
  }

  // --- Niveles educativos ------------------------------------------------
  const levelSeed = [
    { name: 'Lactantes', ageMin: 0, ageMax: 1, monthlyFee: '320.00' },
    { name: 'Maternal', ageMin: 2, ageMax: 3, monthlyFee: '280.00' },
  ];

  const levelIds: Record<string, string> = {};

  for (const level of levelSeed) {
    const found = await db
      .select()
      .from(levels)
      .where(eq(levels.name, level.name))
      .limit(1);

    if (found.length > 0) {
      levelIds[level.name] = found[0]!.id;
      console.log(`[seed] nivel "${level.name}" ya existe, se omite`);
      continue;
    }

    const [created] = await db.insert(levels).values(level).returning();
    levelIds[level.name] = created!.id;
    console.log(`[seed] nivel creado: ${level.name}`);
  }

  // --- Salas --------------------------------------------------------------
  const roomSeed = [
    {
      name: 'Sala Ositos 🧸',
      levelName: 'Lactantes',
      turn: 'manana' as const,
      capacity: 12,
    },
    {
      name: 'Sala Girasoles 🌻',
      levelName: 'Maternal',
      turn: 'completo' as const,
      capacity: 18,
    },
  ];

  for (const room of roomSeed) {
    const found = await db
      .select()
      .from(rooms)
      .where(eq(rooms.name, room.name))
      .limit(1);

    if (found.length > 0) {
      console.log(`[seed] sala "${room.name}" ya existe, se omite`);
      continue;
    }

    await db.insert(rooms).values({
      name: room.name,
      levelId: levelIds[room.levelName] ?? null,
      turn: room.turn,
      capacity: room.capacity,
    });
    console.log(`[seed] sala creada: ${room.name}`);
  }

  console.log('\n[seed] listo ✅');
  console.log('---------------------------------------------');
  console.log(`  email:    ${ADMIN_EMAIL}`);
  console.log(`  password: ${ADMIN_PASSWORD}`);
  console.log('---------------------------------------------');
} catch (error) {
  console.error('[seed] fallo:', error);
  process.exitCode = 1;
} finally {
  await sql.end();
}
