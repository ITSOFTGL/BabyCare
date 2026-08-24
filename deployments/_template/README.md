# Plantilla de instancia de cliente

Copia este directorio una vez por guardería:

```bash
cp -r deployments/_template deployments/soleil
cd deployments/soleil
cp .env.example .env      # rellena TENANT_SLUG, TENANT_NAME, DB_NAME, SUBDOMAIN…
docker compose up -d
```

Antes hace falta que existan:

1. La red compartida: `docker network create kidcare_net`
2. El Postgres compartido corriendo (`deployments/postgres`)
3. La base de datos del cliente: `CREATE DATABASE kidcare_soleil;`
4. Las imágenes construidas — **una sola vez, se comparten entre todos los
   clientes** (`API_URL`/`TENANT_NAME` se leen en runtime, no se congelan en
   el build; ver `apps/web/app/layout.tsx` y `apps/web/lib/api.ts`):
   ```bash
   docker build -t kidcare-backend:latest  -f apps/api/Dockerfile .
   docker build -t kidcare-frontend:latest -f apps/web/Dockerfile .
   ```
   No hace falta reconstruir el frontend por cada cliente nuevo: basta con
   copiar la plantilla y poner su `API_URL`/`TENANT_NAME` en el `.env`.

Al terminar, crea la primera cuenta de directora de esa guardería:

```bash
docker exec -it kidcare-soleil-backend bun packages/db/src/seed.ts
```

y añade el subdominio al `ingress` de `deployments/cloudflared/config.yml`.
