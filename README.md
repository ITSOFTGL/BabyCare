# KidCare 🧸

Sistema de gestión para guarderías infantiles: alumnos, profesoras, salas,
agenda diaria, pagos y comunicados.

Cada guardería cliente corre como una **instancia Docker aislada** (backend y
frontend propios) y comparte únicamente el servidor Postgres —con una base de
datos distinta por cliente— y el túnel de Cloudflare. Todo se autoaloja en una
VPS propia: sin Vercel, Neon, Kubernetes ni Firebase.

## Stack

| Capa      | Tecnología                                   |
| --------- | -------------------------------------------- |
| Backend   | Hono sobre Bun                               |
| Base      | PostgreSQL con Drizzle ORM                   |
| Frontend  | Next.js 15 (App Router) + TailwindCSS        |
| Auth      | JWT con `jose` + `bcryptjs`                  |
| Validación| Zod                                          |
| Despliegue| Docker + docker-compose + Cloudflare Tunnel  |

## Estructura

```
kidcare-erp/
├── apps/
│   ├── api/                  # Backend Hono (Bun)
│   ├── web/                  # Frontend Next.js
│   └── mobile/               # Reservada para v2 (Expo). Solo README.
├── packages/
│   ├── db/                   # Esquema Drizzle, migraciones y seed
│   └── types/                # Tipos TypeScript compartidos
├── deployments/
│   ├── _template/            # docker-compose parametrizado por cliente
│   ├── postgres/             # Postgres compartido de la VPS
│   └── cloudflared/          # Túnel: ingress por subdominio
├── docker-compose.dev.yml    # Entorno de desarrollo local
└── README.md
```

---

## Desarrollo local

Requisitos: **Docker Desktop** (con al menos ~4 GB libres en disco). Bun solo
hace falta si quieres correr algo fuera de contenedores.

```bash
git clone <repo> kidcare-erp && cd kidcare-erp
cp .env.example .env                 # opcional: los valores por defecto ya funcionan
docker compose -f docker-compose.dev.yml up --build
```

Levanta tres servicios:

| Servicio | URL                     | Qué hace                                    |
| -------- | ----------------------- | ------------------------------------------- |
| postgres | `localhost:5433`        | Base de desarrollo `kidcare_dev`            |
| api      | `http://localhost:3001` | Migra al arrancar y sirve con `bun --hot`   |
| web      | `http://localhost:3000` | `next dev` con recarga en caliente          |

Las migraciones de Drizzle se aplican solas al arrancar el contenedor de la API.

### Crear el primer usuario (imprescindible)

Recién levantado no hay ninguna cuenta, así que no se puede entrar. El seed crea
la primera directora más dos niveles y dos salas de ejemplo:

```bash
docker compose -f docker-compose.dev.yml exec api bun run packages/db/src/seed.ts
```

Credenciales por defecto (configurables con `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD`):

```
email:    directora@kidcare.test
password: Directora123!
```

Es idempotente: se puede volver a ejecutar sin duplicar nada.

### Comandos útiles

```bash
docker compose -f docker-compose.dev.yml logs -f api      # logs del backend
docker compose -f docker-compose.dev.yml down             # parar
docker compose -f docker-compose.dev.yml down -v          # parar y borrar la BD

bun install                                               # deps en el host
bun run db:generate                                       # nueva migración tras tocar el esquema
bun run db:studio                                         # explorador de Drizzle
bun run smoke                                             # prueba de humo de punta a punta
```

`bun run smoke` recorre el flujo real contra la API levantada —la directora crea
sala, cuentas, profesora, alumno y pago; la profesora anota en la agenda; el
padre lo ve— y comprueba además que cada rol **no** puede hacer lo que no le
toca. Se puede repetir sin limpiar la base.

### Flujo de uso

1. Entra como **directora**. Ya tienes dos niveles y dos salas del seed.
2. En **Cuentas** crea usuarios con rol `profesora` y `padre`.
3. En **Profesoras** da de alta la ficha y vincúlala a la cuenta de profesora y
   a una sala: eso es lo que decide qué alumnos ve.
4. En **Alumnos** crea un niño, asígnalo a esa sala y al padre.
5. Entra como **profesora** → anota en la agenda diaria.
6. Entra como **padre** → verás la anotación y el estado de los pagos.

---

## API

Todas las rutas cuelgan de `/api`. Salvo `POST /api/auth/login`, todas exigen
sesión: el navegador la manda sola en una cookie httpOnly; un script (el
smoke test, una futura app móvil) puede seguir usando
`Authorization: Bearer <token>`.

| Método | Ruta                        | Quién                        |
| ------ | --------------------------- | ---------------------------- |
| POST   | `/auth/login`               | público (rate-limited)       |
| GET    | `/auth/me`                  | autenticado                  |
| POST   | `/auth/logout`              | público (revoca el token actual) |
| POST   | `/auth/change-password`     | autenticado                  |
| GET/POST/PATCH/DELETE | `/users`     | directora                    |
| GET    | `/levels`, `/rooms`         | autenticado                  |
| POST/PATCH/DELETE | `/levels`, `/rooms` | directora             |
| GET    | `/children`                 | según rol (ver abajo)        |
| POST/PATCH/DELETE | `/children` | directora                    |
| POST   | `/children/:id/guardians`   | directora (añade un tutor)   |
| PATCH/DELETE | `/guardians/:id`      | directora (edita/quita un tutor) |
| GET/POST/PATCH/DELETE | `/teachers` | leer: autenticado; escribir: directora |
| GET    | `/activities`               | según rol                    |
| POST   | `/activities`               | directora, profesora, auxiliar |
| GET    | `/payments`                 | según rol                    |
| POST/PATCH/DELETE | `/payments` | directora                    |
| PATCH  | `/payments/:id/pay`         | directora                    |
| GET    | `/payments/:id/invoice`     | directora, o el padre dueño de ese pago |
| GET    | `/notifications`            | autenticado (solo las suyas) |
| GET/POST | `/announcements`          | directora                    |
| GET    | `/push/vapid-public-key`    | autenticado                  |
| POST/DELETE | `/push/subscribe`      | autenticado                  |
| GET    | `/dashboard`                | autenticado                  |

**Visibilidad por rol** (`apps/api/src/lib/scope.ts`):

- `directora` — toda la guardería.
- `profesora` / `auxiliar` — solo los niños de la sala de su ficha de profesora.
- `padre` — solo los niños con `parent_id` igual a su usuario.

**Filtro de agenda por fecha** — `GET /activities?from=&to=` recibe instantes
UTC en ISO calculados por el cliente (ver `lib/format.ts#dayBoundsLocal`), no
una fecha suelta interpretada por el servidor: así "hoy" es siempre el día
real de quien mira la pantalla, sin importar en qué huso corra el contenedor.

### Seguridad de la sesión

- **Cookie httpOnly + SameSite=Lax** en vez de `localStorage`: el JWT nunca es
  visible para JavaScript, a salvo de robo por XSS.
- **Rate limiting** en `/auth/login`: `LOGIN_MAX_PER_IP` (40/15min, frena abuso
  general) y `LOGIN_MAX_PER_EMAIL` (5/15min, protege una cuenta puntual).
- **Revocación por `jti`**: cada token lleva un id único; `POST /auth/logout`
  lo marca revocado en la tabla `revoked_tokens` aunque todavía no haya
  caducado. Rotar `JWT_SECRET` invalida TODOS los tokens de golpe (útil si se
  filtra el secreto).

### Comunicados

`POST /announcements` (solo directora) manda un aviso a **todos** los padres,
a los de **una sala**, o al apoderado de **un alumno puntual**. La entrega
in-app reutiliza la tabla `notifications` de siempre (una fila por
destinatario, deduplicada por si un padre tiene varios hijos); `announcements`
solo guarda el comunicado en sí para el historial (`GET /announcements`).

### Web Push (sin Firebase)

Protocolo estándar del navegador (VAPID), no un servicio de terceros.
`notifyUser()` —el mismo punto por el que ya pasan agenda, pagos y
comunicados— manda también un push tras guardar la notificación in-app, así
que ninguna ruta existente tuvo que tocarse para esto.

Sin `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` configuradas, la API funciona
igual y solo desactiva el envío de push (log de aviso una sola vez al
arrancar). Para generar tu propio par en producción:

```bash
bunx web-push generate-vapid-keys
```

Para probarlo en local: inicia sesión, abre la campana 🔔 y pulsa "Activar
notificaciones push" (el navegador pide permiso). Después, cualquier evento
que ya notifique in-app —una anotación de agenda, un pago, un comunicado—
también llega como notificación nativa del sistema operativo.

### Factura en PDF

Al cobrar un pago (`PATCH /payments/:id/pay`) se genera automáticamente un
PDF (pdf-lib) con los datos de la guardería, el alumno, el concepto, los
meses cubiertos, el monto y un número de factura secuencial
(`INV-{año}-{n}`), guardado en `STORAGE_DIR/invoices/{paymentId}.pdf` — un
volumen Docker nombrado, para que sobreviva a redeploys.

`GET /payments/:id/invoice` la descarga; solo la directora o el padre dueño
de ese alumno pueden acceder. El botón "📄 Descargar factura" aparece en el
historial de pagos (directora y padre) en cuanto el pago queda marcado como
pagado.

---

## Base de datos

**Una base de datos = una guardería.** El aislamiento entre clientes es a nivel
de base de datos completa, por eso no existe ninguna columna `tenant_id`.

Tablas de v1: `users`, `levels`, `rooms`, `children`, `guardians`, `teachers`,
`daily_activities`, `payments`, `notifications`, `revoked_tokens`. De fase 2
(comunicados y Web Push): `announcements`, `push_subscriptions`.

Tras modificar `packages/db/src/schema.ts`:

```bash
bun run db:generate                                        # genera el SQL
docker compose -f docker-compose.dev.yml restart api       # lo aplica al arrancar
```

---

## Producción: añadir una guardería nueva

Una sola vez en la VPS:

```bash
docker network create kidcare_net

cd deployments/postgres && cp .env.example .env   # pon una contraseña real
docker compose up -d

cd ../cloudflared && cp config.example.yml config.yml   # pon tu tunnel id
docker compose up -d
```

Y las imágenes compartidas — **una sola vez, sirven para todos los
clientes** (`API_URL`/`TENANT_NAME` del frontend se leen en runtime, no se
congelan en el build; ver `apps/web/app/layout.tsx`):

```bash
docker build -t kidcare-backend:latest  -f apps/api/Dockerfile .
docker build -t kidcare-frontend:latest -f apps/web/Dockerfile .
```

### Por cada cliente nuevo

1. **Base de datos propia**

   ```bash
   docker exec -it postgres-shared \
     psql -U kidcare -d kidcare_admin -c 'CREATE DATABASE kidcare_soleil;'
   ```

2. **Instancia** a partir de la plantilla

   ```bash
   cp -r deployments/_template deployments/soleil
   cd deployments/soleil
   cp .env.example .env      # TENANT_SLUG, TENANT_NAME, DB_NAME, SUBDOMAIN,
                             # POSTGRES_ADMIN_PASSWORD y un JWT_SECRET propio
   docker compose up -d
   ```

   El backend aplica las migraciones al arrancar.

3. **Primera directora de esa guardería**

   ```bash
   docker exec -it kidcare-soleil-backend bun packages/db/src/seed.ts
   ```

4. **Ingress del túnel** — dos entradas nuevas en
   `deployments/cloudflared/config.yml` (una para `/api/*` al backend y otra
   para el resto al frontend), y `docker compose restart cloudflared`.

### Copias de seguridad

```bash
docker exec postgres-shared \
  pg_dump -U kidcare kidcare_soleil > backups/kidcare_soleil-$(date +%F).sql
```

---

## Alcance

**v1 (implementado):** auth y roles, niveles y salas, alumnos con datos médicos
y personas autorizadas, profesoras, agenda diaria, pagos manuales, dashboard por
rol y notificaciones in-app.

**v2 — implementado hasta ahora:** comunicados (a todos / por sala / a un
alumno puntual), notificaciones Web Push con VAPID, y factura en PDF
automática al cobrar un pago.

**v2 — todavía no implementado:** chat por sala, 2FA
y app móvil.
