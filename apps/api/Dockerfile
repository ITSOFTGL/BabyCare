# Imagen de produccion de la API (kidcare-backend). Se construye una sola vez y
# la reutilizan todas las instancias de cliente; lo unico que cambia entre ellas
# son las variables de entorno (DATABASE_URL, JWT_SECRET, TENANT_NAME).
FROM oven/bun:1 AS deps

WORKDIR /app

COPY package.json ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/types/package.json packages/types/

RUN bun install --production --no-save

FROM oven/bun:1 AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules node_modules
COPY package.json tsconfig.base.json ./
COPY packages packages
COPY apps/api apps/api

USER bun
EXPOSE 3001

# Las migraciones se aplican al arrancar: cada instancia es duena de su propia
# base de datos, asi que no hay riesgo de que dos clientes migren la misma.
CMD ["sh", "-c", "bun packages/db/src/migrate.ts && bun apps/api/src/index.ts"]
