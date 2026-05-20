# Sistema La Esperanza — Backend (Proyecto III, UMG)

API REST que respalda al prototipo React de la **Comunidad Agrícola La Esperanza**.
Implementa los requisitos funcionales de prioridad **Alta** del DERCAS (Fase II) y deja
la base para los de prioridad media (offline, SMS real, KPIs avanzados).

- **Stack** (Anexo B del DERCAS): NestJS 10 · TypeScript 5 · Prisma 5 · PostgreSQL 16
  (Docker local) · Passport-JWT · bcryptjs · `@nestjs/swagger` · `nestjs-pino` ·
  `class-validator` + `class-transformer` · Jest · Supertest.
- **Patrones de diseño aplicados (RNF27)**:
  - **Repository** — clases `*.repository.ts` que encapsulan Prisma.
  - **Factory Method** — `UserRepository.factory(env)` (real vs in-memory) y `SmsAdapter` provider en `CommonModule`.
  - **Adapter** — `SmsAdapter` (stub que loguea) en backend; `HttpClient` (`src/lib/api.ts`) en frontend.
  - **State** — `AgreementStateMachine` con las 12 transiciones del diagrama 5.13 del DERCAS.
  - **Strategy** — `NotificationChannelStrategy` (in-app vs SMS).
  - **Observer** — `AuditService` y `NotificationsService` suscritos a eventos de dominio vía `@nestjs/event-emitter`.

---

## 1. Requisitos previos

- macOS / Linux
- **Node.js ≥ 20** (probado con 20.19.4)
- **pnpm ≥ 9** (`corepack enable && corepack prepare pnpm@latest --activate`)
- **Docker Desktop** (para `postgres:16` local)

---

## 2. Levantar el backend desde cero (7 pasos)

```bash
# 1) Postgres local
cd backend
docker compose up -d           # postgres:16 escuchando en 5432

# 2) Variables de entorno
cp .env.example .env           # ya viene con DATABASE_URL apuntando al contenedor

# 3) Dependencias
pnpm install

# 4) Migración y cliente Prisma
pnpm prisma migrate dev        # crea/migra el esquema
pnpm prisma generate           # se ejecuta automáticamente con migrate

# 5) Datos de prueba
pnpm seed                      # 3 usuarios, 3 categorías, 4 unidades, 3 puntos, 6 productos, 1 acuerdo

# 6) API en modo desarrollo
pnpm start:dev
# → http://localhost:3000
# → Swagger UI: http://localhost:3000/api/docs

# 7) Frontend (en otra terminal)
cd "../../Proyecto 1/Proyecto La Esperanza/LA ESPERANZA"
echo "VITE_API_URL=http://localhost:3000" > .env   # solo la primera vez
pnpm install
pnpm dev                       # → http://localhost:5173
```

---

## 3. Credenciales de prueba (seed)

Política de PIN aplicada (RF26 + RNF13):

| Rol        | Teléfono     | PIN inicial | Long. PIN | Tras primer login                 |
| ---------- | ------------ | ----------- | --------- | --------------------------------- |
| Admin      | `0999999991` | `000000`    | 6 dígitos | obligatorio cambiar (RNF13)       |
| Productor  | `0999999992` | `0000`      | 4 dígitos | obligatorio cambiar               |
| Comprador  | `0999999993` | `0000`      | 4 dígitos | obligatorio cambiar               |

> Todos los usuarios se crean con `must_change_pin = true`. La pantalla de login del frontend
> detecta esta condición y redirige al formulario de cambio de PIN.

---

## 4. Verificación rápida (criterios de aceptación)

```bash
# Catálogo público sin token
curl -s http://localhost:3000/api/catalog/products | jq '.[0].nombre'

# Login admin
curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"telefono":"0999999991","pin":"000000"}'

# Swagger interactivo
open http://localhost:3000/api/docs
```

Para validar el flujo end-to-end del acuerdo, ejecuta:

```bash
pnpm test:e2e
```

> 10 pasos verificados: login comprador → solicitud → login productor → aceptar →
> avanzar 4 estados → comprador confirma recepción → bitácora completa.

---

## 5. Estructura del backend

```
backend/
├── prisma/
│   ├── schema.prisma     # 12 entidades del ER + AUDIT_LOG + NOTIFICACION
│   ├── seed.ts           # datos de demo
│   └── migrations/       # generadas por prisma migrate
├── src/
│   ├── main.ts           # bootstrap + Swagger + pipes globales
│   ├── app.module.ts
│   ├── common/           # PrismaModule, guards, decoradores, filtros,
│   │                     # SmsAdapter (Adapter) y eventos de dominio (Observer)
│   └── modules/
│       ├── auth/                # RF01, RF03, RF04, RF06
│       ├── users/               # RF26-RF30
│       ├── master-data/         # RF23-RF25
│       ├── products/            # RF07-RF10
│       ├── catalog/             # RF02, RF11, RF12 (público)
│       ├── requests/            # RF13, RF16, RF20
│       ├── agreements/          # RF14, RF15, RF17-RF22
│       │   ├── state-machine.ts # PATRÓN State
│       │   ├── messages/
│       │   └── tracking/
│       ├── incidents/           # RF31-RF33
│       ├── notifications/       # RF38 (PATRÓN Strategy)
│       ├── audit/               # RF37, RF39 (PATRÓN Observer)
│       └── reports/             # RF34, RF35, RF36
├── test/
│   └── happy-path.e2e-spec.ts   # E2E del flujo principal
├── docker-compose.yml
└── package.json
```

---

## 6. Endpoints implementados (resumen)

Todos los endpoints están documentados en Swagger (`/api/docs`).
Resumen por módulo:

| Módulo                | Endpoints clave                                                                                                                                                                                                                                                                                  | RFs           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------|
| Auth                  | `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` · `PATCH /auth/change-pin` · `PATCH /auth/profile`                                                                                                                                                                                     | RF01, RF03, RF04, RF06 |
| Catálogo público      | `GET /catalog/products` · `GET /catalog/products/:id`                                                                                                                                                                                                                                            | RF02, RF11, RF12 |
| Productos             | `GET /products/mine` · `POST /products` · `PATCH /products/:id` · `DELETE /products/:id`                                                                                                                                                                                                          | RF07-RF10     |
| Solicitudes           | `GET /requests` · `POST /requests` · `POST /requests/:id/reject` · `DELETE /requests/:id`                                                                                                                                                                                                         | RF13, RF14, RF16, RF20 |
| Acuerdos              | `GET /agreements` · `GET /agreements/:id` · `POST /agreements/from-request/:id` · `PATCH /agreements/:id/transition` · `PATCH /agreements/:id/cancel` · `PATCH /agreements/:id/pago` · `GET /agreements/:id/messages` · `POST /agreements/:id/messages` · `GET /agreements/:id/tracking`           | RF14-RF22, RF36 |
| Maestros (admin)      | `GET|POST|PATCH /master-data/categories` · `GET|POST|PATCH /master-data/units` · `GET|POST|PATCH /master-data/delivery-points`                                                                                                                                                                    | RF23-RF25     |
| Usuarios (admin)      | `GET /users` · `GET /users/:id` · `POST /users` · `PATCH /users/:id` · `POST /users/:id/reset-pin` · `PATCH /users/:id/estado`                                                                                                                                                                    | RF26-RF30     |
| Incidencias           | `GET /incidents` · `POST /incidents/agreements/:id` · `PATCH /incidents/:id/resolve`                                                                                                                                                                                                              | RF31-RF33     |
| Notificaciones        | `GET /notifications` · `GET /notifications/count-unread` · `PATCH /notifications/:id/read` · `PATCH /notifications/read-all`                                                                                                                                                                      | RF38          |
| Reportes              | `GET /reports/general` · `GET /reports/sales-history`                                                                                                                                                                                                                                             | RF34, RF35    |
| Auditoría             | `GET /audit`                                                                                                                                                                                                                                                                                      | RF37, RF39    |
| Salud                 | `GET /health` (excluido del prefijo `/api`)                                                                                                                                                                                                                                                       | —             |

---

## 7. RFs/RNFs cubiertos en v1.0.0

Implementados (prioridad **Alta** del DERCAS):

```
RF01 RF02 RF03 RF04 RF06 RF07 RF08 RF09 RF10 RF11 RF12 RF13 RF14
RF15 RF16 RF17 RF18 RF19 RF20 RF21 RF22 RF23 RF24 RF25 RF26 RF27
RF28 RF29 RF30 RF31 RF32 RF33 RF34 RF35 RF36 RF37 RF38 RF39
```

No funcionales relevantes ya cubiertos:

- **RNF06** TLS — listo para terminar en un proxy/nginx en producción (no aplica en local).
- **RNF07** bcrypt factor 10.
- **RNF08** JWT con expiración 8 h.
- **RNF09** RBAC con guard de roles, validado en backend.
- **RNF10** 5 intentos fallidos = 10 min de bloqueo.
- **RNF13** Admin con PIN de 6 dígitos (forzado en alta y cambio).
- **RNF14** Headers de seguridad básicos (X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
- **RNF15** API stateless.
- **RNF18** Despliegue reproducible con `docker compose`.
- **RNF26** Capas separadas (presentación / aplicación / persistencia / maestros).
- **RNF27** 6 patrones de diseño (ver introducción).
- **RNF28** Pruebas mínimas: 23 unitarias del state machine y la reserva, 10 e2e del happy path.
- **RNF30** Logs estructurados JSON con `nestjs-pino` (`pino-pretty` en dev).

### TODOs explícitos (RF de prioridad Media/Baja no incluidos en v1.0.0)

- **RF05** Recuperación de PIN por SMS (depende de gateway real). El `SmsAdapter` queda
  listo para enchufar Twilio: basta cambiar `SMS_PROVIDER` y crear `TwilioSmsAdapter`.
- **RF40** Operación offline con sincronización (PWA + cola IndexedDB).
- Indicadores avanzados de confiabilidad y KPIs por rango personalizado (parcialmente cubiertos en `RF30`/`RF34`).
- Política completa de retención y anonimización (`RNF39`).

---

## 8. Scripts útiles

```bash
pnpm start:dev          # API con watch (puerto 3000)
pnpm test               # pruebas unitarias (Jest)
pnpm test:e2e           # pruebas end-to-end (Supertest)
pnpm prisma studio      # GUI de la base
pnpm prisma migrate reset --force   # ⚠️ resetea esquema + corre seed
pnpm lint               # ESLint + Prettier
```

---

## 9. Convención de commits y ramas

- **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`).
- Ramas `feature/<slug>` y PRs revisados antes de mezclar a `main` (RNF29).
- Tag inicial sugerido: `v1.0.0`.

---

## 10. Frontend conectado

El frontend ya existente (`/Proyecto 1/Proyecto La Esperanza/LA ESPERANZA`) consume este
backend a través de `src/lib/api.ts` (HttpClient Adapter sobre `fetch`). El JWT y el
usuario actual viven en `localStorage` bajo las claves `esperanza.token` / `esperanza.user`
(el código legado `userRole` / `userName` / `userPhone` se mantiene por compatibilidad y se
actualiza desde `setSession`). El componente `ProtectedRoute` filtra el acceso por token y
rol y permite el modo invitado para el catálogo público (RF02).

Para arrancar el frontend conectado, dentro de `LA ESPERANZA/`:

```bash
pnpm install   # primera vez
pnpm dev       # http://localhost:5173
```

Y desde el navegador, usa los tres usuarios de prueba con sus PINs iniciales. El
sistema te pedirá cambiar el PIN antes de continuar.
