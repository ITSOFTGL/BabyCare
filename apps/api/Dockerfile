# Imagen de produccion de la API (kidcare-backend). Se construye una sola vez y
# la reutilizan todas las instancias de cliente; lo unico que cambia entre ellas
# son las variables de entorno (DATABASE_URL, JWT_SECRET, TENANT_NAME).
#
# Una sola etapa a proposito: bun 1.4 instala las dependencias DENTRO de cada
# workspace (apps/api/node_modules, packages/db/node_modules...), no en el
# node_modules raiz, asi que un `COPY --from=deps /app/node_modules` se dejaria
# fuera casi todo. Como la API no tiene paso de compilacion, no hay nada que
# descartar de una etapa intermedia.
FROM oven/bun:1

WORKDIR /app
ENV NODE_ENV=production

# Manifiestos primero para aprovechar la cache de capas en cada redeploy.
COPY package.json ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/types/package.json packages/types/

RUN bun install --production

COPY tsconfig.base.json ./
COPY packages packages
COPY apps/api apps/api

# Se crea con el dueno correcto ANTES de montar el volumen: la primera vez que
# un volumen nombrado se une a un directorio no vacio, Docker copia su
# contenido (y permisos) al volumen, asi que sin esto quedaria root:root y
# el proceso (USER bun) no podria escribir las facturas.
RUN mkdir -p /app/storage/invoices && chown -R bun:bun /app/storage

USER bun
EXPOSE 3001

# Las migraciones se aplican al arrancar: cada instancia es duena de su propia
# base de datos, asi que no hay riesgo de que dos clientes migren la misma.
CMD ["sh", "-c", "bun packages/db/src/migrate.ts && bun apps/api/src/index.ts"]
