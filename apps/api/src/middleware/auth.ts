import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { Role, User } from '@kidcare/types';
import { eq, getDb, users } from '@kidcare/db';
import { verifyToken } from '../lib/jwt.ts';

export interface AppEnv {
  Variables: {
    user: User;
  };
}

export function toPublicUser(row: {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    phone: row.phone,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Exige un JWT valido y carga el usuario desde la base en cada request.
 * Releer el usuario (en vez de confiar solo en el payload) hace que un cambio
 * de rol o una baja tengan efecto inmediato sin esperar a que expire el token.
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

  if (!token) {
    throw new HTTPException(401, { message: 'Falta el token de acceso' });
  }

  let payload;
  try {
    payload = await verifyToken(token);
  } catch {
    throw new HTTPException(401, { message: 'Token invalido o expirado' });
  }

  const db = getDb();
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  if (!row) {
    throw new HTTPException(401, { message: 'La cuenta ya no existe' });
  }

  c.set('user', toPublicUser(row));
  await next();
});

/** Restringe la ruta a los roles indicados. Debe ir despues de requireAuth. */
export function requireRole(...roles: Role[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      throw new HTTPException(403, {
        message: 'No tienes permisos para esta accion',
      });
    }
    await next();
  });
}

/** Atajo para las rutas que solo puede tocar la directora. */
export const requireDirectora = requireRole('directora');

/** Personal de aula (incluye a la directora, que puede hacer todo). */
export const requireStaff = requireRole('directora', 'profesora', 'auxiliar');
