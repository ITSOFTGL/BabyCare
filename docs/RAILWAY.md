# Demo en Railway (temporal, dos URLs)

La API y la web pueden vivir en dominios distintos: el navegador manda
`Authorization: Bearer` igual que Retimax. Es menos seguro que la cookie
httpOnly (un XSS podría leer el token). Sirve para una demo; en producción
con un solo dominio la cookie sigue funcionando.

## Servicios

Crea **un proyecto** con tres servicios. Root Directory = **raíz del repo**
(vacío), no `apps/api` ni `apps/web`.

### 1. PostgreSQL

**+ New → Database → PostgreSQL**

### 2. API

- Config-as-code: `railway.api.toml`
- Builder: Dockerfile (`apps/api/Dockerfile`)

Variables:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<genera uno largo, p. ej. openssl rand -base64 48>
TENANT_NAME=Guarderia Demo
CORS_ORIGINS=https://TU-WEB.up.railway.app
COOKIE_SECURE=true
STORAGE_DIR=/app/storage
```

No pongas `PORT`: Railway lo inyecta solo. Las migraciones corren al arrancar.

Tras el primer deploy, abre la consola del servicio API y crea las cuentas demo:

```
bun packages/db/src/seed.ts
```

### 3. Web

- Config-as-code: `railway.web.toml`
- Builder: Dockerfile (`apps/web/Dockerfile`)

Variables:

```
API_URL=https://TU-API.up.railway.app/api
TENANT_NAME=Guarderia Demo
```

Tampoco pongas `PORT` en la web.

## Orden

1. Postgres
2. API → copia su URL pública
3. Web con `API_URL` = `https://…api…/api` (con `/api` al final)
4. En la API, `CORS_ORIGINS` = URL exacta de la web (sin barra final) → Redeploy API

## Entrar

| Rol | Email | Contraseña |
|-----|-------|------------|
| Directora | `directora@kidcare.test` | `Directora123!` |
| Profesora | `profesora@kidcare.test` | `Profesora123!` |
| Padre | `padre@kidcare.test` | `Padre123!` |

## Notas de demo

- Los recibos PDF y el QR se pierden en cada redeploy si no hay Volume en `/app/storage`.
- El plan gratuito de Railway cambia; si pide tarjeta, es el mismo esquema que usaste con Retimax.
- Si ves CORS o “Falta el token”, revisa que `CORS_ORIGINS` coincida letra por letra con la URL de la web y que `API_URL` termine en `/api`.
