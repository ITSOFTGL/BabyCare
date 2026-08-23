import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.ts';

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL no esta definida. Revisa tu .env o las variables del contenedor.',
    );
  }
  return url;
}

/**
 * Crea una conexion nueva. Util para scripts de un solo uso (migrate, seed),
 * donde conviene cerrar el pool explicitamente al terminar.
 */
export function createClient(url = getDatabaseUrl(), max = 10) {
  const sql = postgres(url, { max });
  return { sql, db: drizzle(sql, { schema }) };
}

/**
 * Conexion compartida del proceso. La API la reutiliza durante toda su vida.
 * Es lazy para que importar `@kidcare/db` no explote si falta DATABASE_URL
 * (por ejemplo al correr drizzle-kit).
 */
let cached: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (!cached) cached = createClient();
  return cached.db;
}

export function getSql() {
  if (!cached) cached = createClient();
  return cached.sql;
}
