# Runbook de Producción — Sistema La Esperanza v1.0.0

Esta guía es para operar el sistema en el VPS. Para el código mismo y la
arquitectura, mirá `README.md` y `docs/`.

---

## 1. Topología

```
                 Internet (HTTPS 443)
                          │
                          ▼
                ┌───────────────────┐
                │   Caddy 2.x       │  TLS + reverse proxy + Let's Encrypt
                │   :80 :443        │
                └─────────┬─────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │ /              │ /api/*  /health │
        ▼                ▼                  
┌───────────────┐   ┌─────────────────┐
│  Frontend     │   │  Backend NestJS │
│  nginx alpine │   │  Node 20 + pnpm │
│  (sirve dist) │   │  :3000          │
└───────────────┘   └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   Postgres 16   │
                    │   /var/lib/...  │
                    └─────────────────┘
```

VPS: DigitalOcean NYC1, Ubuntu 24.04.3 LTS, 1 vCPU, 1 GB RAM + 2 GB swap, 25 GB SSD.
Dominio: `comunidad-esperanza.duckdns.org`.

---

## 2. Estructura en el VPS

```
/opt/esperanza/
├── backend/                       # repo la-esperanza-backend
│   ├── docker-compose.prod.yml    # orquestación de los 4 servicios
│   ├── Caddyfile                  # config del proxy
│   ├── .env                       # secretos productivos (NO commitear)
│   ├── Dockerfile                 # imagen del backend
│   └── scripts/
│       ├── deploy.sh              # actualización del sistema
│       ├── backup-db.sh           # backup nocturno
│       └── restore-db.sh          # restore de un .dump
└── frontend/                      # repo la-esperanza
    ├── Dockerfile                 # imagen del frontend
    └── nginx.conf
```

Backups en `/var/backups/esperanza/`.

---

## 3. Primer deploy (desde cero)

> Requisitos: VPS Ubuntu con Docker + Docker Compose + ufw (puertos 22, 80, 443).
> El provisioning inicial se documenta en `docs/07-guia-instalacion.md`.

```bash
# Como root en el VPS:
cd /opt/esperanza
git clone https://github.com/AlexAlvarado1290/la-esperanza-backend.git backend
git clone https://github.com/AlexAlvarado1290/la-esperanza.git frontend

cd backend
cp .env.production.example .env
nano .env   # rellenar TODOS los secretos antes de continuar

# Validar que el DNS del dominio ya apunta al VPS:
dig +short ${DOMAIN}    # debe responder con la IP pública del droplet

# Levantar el stack:
docker compose --env-file .env -f docker-compose.prod.yml up -d --build

# Esperar 30–60s para que Caddy obtenga el cert. Probar:
curl -I https://${DOMAIN}/health
```

Si todo va bien:
- `https://${DOMAIN}/` muestra la app.
- `https://${DOMAIN}/api/docs` es Swagger.
- `https://${DOMAIN}/health` devuelve JSON `{"status":"ok",...}`.

---

## 4. Actualizar el sistema

Cuando hay cambios en backend o frontend:

```bash
cd /opt/esperanza/backend
./scripts/deploy.sh           # pull + build incremental + restart
# o:
./scripts/deploy.sh --rebuild # ignorar cache de Docker (más lento)
```

---

## 5. Backups

### Manual
```bash
cd /opt/esperanza/backend
./scripts/backup-db.sh
ls -lh /var/backups/esperanza/
```

### Automático (cron)
Editar `crontab -e` como root y agregar:

```cron
0 3 * * * /opt/esperanza/backend/scripts/backup-db.sh >> /var/log/esperanza-backup.log 2>&1
```

Se ejecuta todos los días a las 03:00 UTC. Retención de 7 días.

### Restaurar
```bash
cd /opt/esperanza/backend
./scripts/restore-db.sh /var/backups/esperanza/esperanza-20260605T030000Z.dump
```

---

## 6. Operaciones comunes

| Tarea | Comando |
|---|---|
| Ver estado de servicios | `docker compose -f docker-compose.prod.yml ps` |
| Ver logs en vivo del backend | `docker logs -f esperanza-backend` |
| Ver logs en vivo de Caddy | `docker logs -f esperanza-caddy` |
| Reiniciar sólo el backend | `docker compose -f docker-compose.prod.yml restart backend` |
| Bajar el stack completo | `docker compose -f docker-compose.prod.yml down` |
| Conectarse a Postgres | `docker exec -it esperanza-postgres psql -U esperanza -d esperanza` |
| Reset duro (⚠️ borra datos) | `docker compose -f docker-compose.prod.yml down -v` |

---

## 7. Renovación TLS

Caddy renueva el certificado de Let's Encrypt automáticamente. **No hace falta cron**.
Si por alguna razón querés forzar:

```bash
docker exec esperanza-caddy caddy reload --config /etc/caddy/Caddyfile
```

---

## 8. Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| Caddy no obtiene cert | DNS no apunta al VPS | `dig +short ${DOMAIN}` debe responder la IP correcta |
| Backend reinicia en loop | Variable JWT_SECRET no definida | revisar `.env` |
| Frontend muestra "No se pudo conectar" | VITE_API_URL apunta a localhost | reconstruir con `./scripts/deploy.sh --rebuild` |
| Postgres no arranca | volumen corrupto | `docker compose down`, mirar logs |
| HTTPS rate-limit Let's Encrypt | demasiados intentos | en Caddyfile descomentar `acme_ca staging` mientras se prueba |
