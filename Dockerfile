# syntax=docker/dockerfile:1.7

# Debian slim para evitar problemas de detección de OpenSSL del engine de Prisma
# en Alpine ARM64 (Prisma autodetecta openssl-1.1 pero Alpine 3.20+ trae 3.0).

# ---- builder ----
FROM node:20-bookworm-slim AS builder

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY prisma ./prisma
RUN pnpm prisma generate

COPY src ./src
RUN pnpm build

# ---- runtime ----
FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates tini wget \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable && corepack prepare pnpm@9.15.9 --activate

# Mantenemos node_modules completo (incluye tsx + prisma CLI) para correr
# `prisma migrate deploy` y el seed dentro del contenedor.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json pnpm-lock.yaml ./

EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini", "--"]

# Migraciones idempotentes + seed (upserts) + API.
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm tsx prisma/seed.ts && node dist/main.js"]
