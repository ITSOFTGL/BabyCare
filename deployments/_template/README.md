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
4. Las imágenes construidas:
   ```bash
   docker build -t kidcare-backend:latest  -f apps/api/Dockerfile .
   docker build -t kidcare-frontend:latest -f apps/web/Dockerfile \
     --build-arg NEXT_PUBLIC_API_URL=https://soleil.tudominio.com/api \
     --build-arg NEXT_PUBLIC_TENANT_NAME="Guardería Soleil" .
   ```

> **Importante:** las variables `NEXT_PUBLIC_*` se congelan en el bundle durante
> el `docker build`, no en runtime. Por eso el frontend se construye por cliente
> (o se le pasa un `NEXT_PUBLIC_API_URL` relativo como `/api` y se resuelve el
> enrutado en el proxy).

Al terminar, crea la primera cuenta de directora de esa guardería:

```bash
docker exec -it kidcare-soleil-backend bun packages/db/src/seed.ts
```

y añade el subdominio al `ingress` de `deployments/cloudflared/config.yml`.
