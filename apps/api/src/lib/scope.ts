/**
 * Reglas de visibilidad por rol.
 *
 * - directora: ve toda la guarderia.
 * - profesora / auxiliar: solo los ninos de la sala que tiene asignada.
 * - padre: solo sus propios hijos.
 */
import { and, children, eq, getDb, teachers } from '@kidcare/db';
import type { User } from '@kidcare/types';

/** Sala asignada al usuario segun su ficha de profesora, o null. */
export async function getStaffRoomId(userId: string): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({ roomId: teachers.roomId })
    .from(teachers)
    .where(eq(teachers.userId, userId))
    .limit(1);
  return row?.roomId ?? null;
}

/**
 * Ids de los ninos que el usuario puede consultar.
 * `null` significa "sin restriccion" (directora).
 */
export async function getVisibleChildIds(
  user: User,
): Promise<string[] | null> {
  const db = getDb();

  if (user.role === 'directora') return null;

  if (user.role === 'padre') {
    const rows = await db
      .select({ id: children.id })
      .from(children)
      .where(eq(children.parentId, user.id));
    return rows.map((r) => r.id);
  }

  const roomId = await getStaffRoomId(user.id);
  if (!roomId) return [];

  const rows = await db
    .select({ id: children.id })
    .from(children)
    .where(and(eq(children.roomId, roomId)));
  return rows.map((r) => r.id);
}

export async function canAccessChild(
  user: User,
  childId: string,
): Promise<boolean> {
  const visible = await getVisibleChildIds(user);
  return visible === null || visible.includes(childId);
}
