# Túnel de Cloudflare

Expone las instancias sin abrir ningún puerto de la VPS a Internet.

```bash
cloudflared tunnel login
cloudflared tunnel create kidcare          # anota el tunnel id
cloudflared tunnel route dns kidcare soleil.tudominio.com
```

Copia el JSON de credenciales que genera `tunnel create` a este directorio, y
`config.example.yml` a `config.yml` con tu `tunnel id`. Después:

```bash
docker compose up -d
```

Cada guardería nueva añade **dos entradas** al `ingress`: una para `/api/*`
apuntando a su backend y otra para el resto apuntando a su frontend. La regla
`http_status:404` tiene que quedar siempre la última.
