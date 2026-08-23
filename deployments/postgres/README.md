# Postgres compartido

Una sola instancia de Postgres para toda la VPS. Cada guardería cliente tiene su
**propia base de datos** dentro de esta instancia.

## Arranque inicial

```bash
docker network create kidcare_net        # solo la primera vez
cp .env.example .env                     # y pon una contraseña real
docker compose up -d
```

## Crear la base de datos de un cliente nuevo

```bash
docker exec -it postgres-shared \
  psql -U kidcare -d kidcare_admin -c 'CREATE DATABASE kidcare_soleil;'
```

El nombre debe coincidir con el `DB_NAME` del `.env` de esa instancia
(`deployments/<cliente>/.env`). Las tablas las crea sola la API al arrancar:
su comando ejecuta las migraciones de Drizzle antes de levantar el servidor.

Después queda pendiente crear la primera directora de esa guardería:

```bash
docker exec -it kidcare-soleil-backend bun packages/db/src/seed.ts
```

## Copia de seguridad

```bash
docker exec postgres-shared \
  pg_dump -U kidcare kidcare_soleil > backups/kidcare_soleil-$(date +%F).sql
```

El directorio `./backups` está montado dentro del contenedor en `/backups`.
