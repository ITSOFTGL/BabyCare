# Imagen de produccion del frontend (kidcare-frontend).
#
# OJO: NEXT_PUBLIC_* se congela en el bundle en tiempo de build, asi que la URL
# de la API y el nombre de la guarderia entran como build-args. Si dos clientes
# necesitan valores distintos, hay que construir una imagen por cliente
# (o pasar a leer la configuracion en runtime).
FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json ./
COPY apps/web/package.json apps/web/
COPY packages/types/package.json packages/types/

RUN bun install

COPY tsconfig.base.json ./
COPY packages/types packages/types
COPY apps/web apps/web

ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_TENANT_NAME=KidCare
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_TENANT_NAME=$NEXT_PUBLIC_TENANT_NAME
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
