import { defineConfig } from 'drizzle-kit';

// `drizzle-kit generate` no toca la base, asi que le vale un placeholder.
// `push` y `studio` si necesitan una DATABASE_URL real.
const url =
  process.env.DATABASE_URL ?? 'postgres://kidcare:kidcare@localhost:5432/kidcare';

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
  verbose: true,
  strict: false,
});
