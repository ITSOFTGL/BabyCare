import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    'DATABASE_URL no esta definida. Ejemplo: postgres://kidcare:kidcare_dev@localhost:5433/kidcare_dev',
  );
}

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
  verbose: true,
  strict: false,
});
