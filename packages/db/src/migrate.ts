/**
 * Aplica las migraciones SQL generadas por drizzle-kit (carpeta ./drizzle).
 * Se ejecuta al arrancar el contenedor de la API en desarrollo.
 */
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient } from './client.ts';

const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'drizzle',
);

const { sql, db } = createClient(undefined, 1);

try {
  console.log(`[db] aplicando migraciones desde ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.log('[db] migraciones aplicadas ✅');
} catch (error) {
  console.error('[db] fallo al migrar:', error);
  process.exitCode = 1;
} finally {
  await sql.end();
}
