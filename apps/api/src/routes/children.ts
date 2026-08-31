import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import {
  and,
  asc,
  children,
  eq,
  getDb,
  guardians,
  inArray,
  levels,
  rooms,
  users,
} from '@kidcare/db';
import { TURNS } from '@kidcare/types';
import { paramId, parseBody, parseQuery, uuidSchema } from '../lib/validate.ts';
import { canAccessChild, getVisibleChildIds } from '../lib/scope.ts';
import { createLoginUser, uniqueEmail } from '../lib/account.ts';
import { addParentToRoomChat } from '../lib/chat.ts';
import {
  requireAuth,
  requireDirectora,
  type AppEnv,
} from '../middleware/auth.ts';

export const guardianSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  ci: z.string().optional().nullable(),
  isPrimary: z.boolean().default(false),
});

const childSchema = z.object({
  name: z.string().min(2, 'Nombre demasiado corto'),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato AAAA-MM-DD'),
  levelId: uuidSchema.nullable().optional(),
  roomId: uuidSchema.nullable().optional(),
  turn: z.enum(TURNS).default('manana'),
  authorizedPickup: z.array(z.string().min(1)).default([]),
  allergies: z.string().optional().nullable(),
  medications: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
  parentId: uuidSchema.nullable().optional(),
  monthlyFee: z.coerce.number().min(0).optional().nullable(),
  guardians: z.array(guardianSchema).optional(),
  parentAccount: z
    .object({
      name: z.string().min(2),
      password: z.string().min(8),
      email: z.string().email().optional().nullable().or(z.literal('')),
      phone: z.string().optional().nullable(),
      ci: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
});

export const childRoutes = new Hono<AppEnv>();

childRoutes.use('*', requireAuth);

/** Devuelve los ninos visibles para el usuario, con nivel y sala resueltos. */
async function listChildren(ids: string[] | null, roomId?: string) {
  const db = getDb();
  if (ids !== null && ids.length === 0) return [];

  const filters = [
    ids !== null ? inArray(children.id, ids) : undefined,
    roomId ? eq(children.roomId, roomId) : undefined,
  ].filter(Boolean);

  const rows = await db
    .select({ child: children, level: levels, room: rooms })
    .from(children)
    .leftJoin(levels, eq(children.levelId, levels.id))
    .leftJoin(rooms, eq(children.roomId, rooms.id))
    .where(filters.length ? and(...(filters as never[])) : undefined)
    .orderBy(asc(children.name));

  return rows.map((r) => ({ ...r.child, level: r.level, room: r.room }));
}

childRoutes.get('/', async (c) => {
  const { roomId } = parseQuery(
    c,
    z.object({ roomId: uuidSchema.optional() }),
  );
  const visible = await getVisibleChildIds(c.get('user'));
  return c.json(await listChildren(visible, roomId));
});

childRoutes.get('/:id', async (c) => {
  const id = paramId(c);
  if (!(await canAccessChild(c.get('user'), id))) {
    throw new HTTPException(403, { message: 'No puedes ver esta ficha' });
  }

  const list = await listChildren([id]);
  const child = list[0];
  if (!child) throw new HTTPException(404, { message: 'Alumno no encontrado' });

  const tutors = await getDb()
    .select()
    .from(guardians)
    .where(eq(guardians.childId, id))
    .orderBy(asc(guardians.name));

  return c.json({ ...child, guardians: tutors });
});

/**
 * Reemplaza la lista de tutores de un nino. Solo se usa al CREAR el alumno
 * (alta rapida con 1+ tutores de una); para editar despues, cada tutor tiene
 * su propio endpoint (POST /:id/guardians, PATCH y DELETE en routes/guardians.ts)
 * en vez de este reemplazo en bloque.
 */
async function replaceGuardians(
  childId: string,
  list: z.infer<typeof guardianSchema>[],
) {
  const db = getDb();
  await db.delete(guardians).where(eq(guardians.childId, childId));
  if (list.length === 0) return;
  await db.insert(guardians).values(
    list.map((g) => ({
      childId,
      name: g.name.trim(),
      phone: g.phone ?? null,
      email: g.email ? g.email : null,
      ci: g.ci ?? null,
      isPrimary: g.isPrimary,
    })),
  );
}

childRoutes.post('/', requireDirectora, async (c) => {
  const body = await parseBody(c, childSchema);
  const db = getDb();

  let parentId = body.parentId ?? null;
  if (body.parentAccount) {
    const email = await uniqueEmail(body.parentAccount.name, body.parentAccount.email);
    const user = await createLoginUser({
      name: body.parentAccount.name,
      email,
      password: body.parentAccount.password,
      role: 'padre',
      phone: body.parentAccount.phone,
    });
    parentId = user.id;
  }

  const [created] = await db
    .insert(children)
    .values({
      name: body.name.trim(),
      birthDate: body.birthDate,
      levelId: body.levelId ?? null,
      roomId: body.roomId ?? null,
      turn: body.turn,
      authorizedPickup: body.authorizedPickup,
      allergies: body.allergies ?? null,
      medications: body.medications ?? null,
      observations: body.observations ?? null,
      parentId,
      monthlyFee:
        body.monthlyFee === null || body.monthlyFee === undefined
          ? null
          : body.monthlyFee.toFixed(2),
    })
    .returning();

  if (body.parentAccount && parentId) {
    const [parent] = await db.select().from(users).where(eq(users.id, parentId)).limit(1);
    await db.insert(guardians).values({
      childId: created!.id,
      name: body.parentAccount.name.trim(),
      phone: body.parentAccount.phone ?? null,
      email: parent?.email ?? null,
      ci: body.parentAccount.ci ?? null,
      isPrimary: true,
    });
  } else if (body.guardians) {
    await replaceGuardians(created!.id, body.guardians);
  }

  await addParentToRoomChat(body.roomId, parentId);

  const [full] = await listChildren([created!.id]);
  return c.json(full, 201);
});

childRoutes.patch('/:id', requireDirectora, async (c) => {
  const id = paramId(c);
  // Se omite `guardians`: editar tutores ya tiene sus propios endpoints
  // (ver mas abajo y routes/guardians.ts), no se aceptan aqui.
  const body = await parseBody(c, childSchema.omit({ guardians: true }).partial());
  const db = getDb();

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.birthDate !== undefined) patch.birthDate = body.birthDate;
  if (body.levelId !== undefined) patch.levelId = body.levelId;
  if (body.roomId !== undefined) patch.roomId = body.roomId;
  if (body.turn !== undefined) patch.turn = body.turn;
  if (body.authorizedPickup !== undefined) {
    patch.authorizedPickup = body.authorizedPickup;
  }
  if (body.allergies !== undefined) patch.allergies = body.allergies;
  if (body.medications !== undefined) patch.medications = body.medications;
  if (body.observations !== undefined) patch.observations = body.observations;
  if (body.parentId !== undefined) patch.parentId = body.parentId;
  if (body.monthlyFee !== undefined) {
    patch.monthlyFee =
      body.monthlyFee === null ? null : body.monthlyFee.toFixed(2);
  }

  if (Object.keys(patch).length > 0) {
    const [updated] = await db
      .update(children)
      .set(patch)
      .where(eq(children.id, id))
      .returning({ id: children.id, roomId: children.roomId, parentId: children.parentId });
    if (!updated) {
      throw new HTTPException(404, { message: 'Alumno no encontrado' });
    }
    await addParentToRoomChat(
      (patch.roomId as string | null | undefined) ?? updated.roomId,
      (patch.parentId as string | null | undefined) ?? updated.parentId,
    );
  }

  // Los tutores YA NO se reemplazan aqui en bloque: usa POST /:id/guardians
  // para anadir uno, o PATCH/DELETE /api/guardians/:id para editar/quitar
  // uno existente sin tocar al resto.

  const [full] = await listChildren([id]);
  if (!full) throw new HTTPException(404, { message: 'Alumno no encontrado' });
  return c.json(full);
});

/** Anade UN tutor al nino sin tocar a los que ya tiene. */
childRoutes.post('/:id/guardians', requireDirectora, async (c) => {
  const childId = paramId(c);
  const body = await parseBody(c, guardianSchema);
  const db = getDb();

  const [child] = await db
    .select({ id: children.id })
    .from(children)
    .where(eq(children.id, childId))
    .limit(1);
  if (!child) throw new HTTPException(404, { message: 'Alumno no encontrado' });

  const [created] = await db
    .insert(guardians)
    .values({
      childId,
      name: body.name.trim(),
      phone: body.phone ?? null,
      email: body.email ? body.email : null,
      ci: body.ci ?? null,
      isPrimary: body.isPrimary,
    })
    .returning();

  return c.json(created, 201);
});

childRoutes.delete('/:id', requireDirectora, async (c) => {
  const id = paramId(c);
  const [deleted] = await getDb()
    .delete(children)
    .where(eq(children.id, id))
    .returning({ id: children.id });
  if (!deleted) throw new HTTPException(404, { message: 'Alumno no encontrado' });
  return c.json({ ok: true });
});
