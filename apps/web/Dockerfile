# Imagen de produccion del frontend (kidcare-frontend). Se construye UNA sola
# vez y la reutilizan todas las instancias de cliente, igual que el backend:
# API_URL y TENANT_NAME se leen en runtime (ver app/layout.tsx y lib/api.ts),
# no se congelan en el build, asi que no hace falta una imagen por subdominio.
FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json ./
COPY apps/web/package.json apps/web/
COPY packages/types/package.json packages/types/

RUN bun install

COPY tsconfig.base.json ./
COPY packages/types packages/types
COPY apps/web apps/web

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app/apps/web
RUN bun run build

FROM oven/bun:1 AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# El build `standalone` reproduce la estructura del monorepo dentro de .next.
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000

CMD ["bun", "apps/web/server.js"]
