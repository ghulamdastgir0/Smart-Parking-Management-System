# ---- Build stage ----
FROM node:24-slim AS build
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# ---- Production stage ----
FROM node:24-slim AS production
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build --chown=node:node /app/prisma.config.ts ./
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=node:node /app/dist ./dist

# @huggingface/transformers caches downloaded model weights here (see embedding.service.ts) —
# needs to exist and be writable by the non-root runtime user ahead of time.
RUN mkdir -p /app/.cache/huggingface && chown -R node:node /app/.cache

USER node

# Cloud Run injects PORT; main.ts already reads process.env.PORT and binds 0.0.0.0
EXPOSE 8080

# migrate deploy needs a session-mode connection (advisory locks + DDL) — if DATABASE_URL
# points at a transaction-mode pooler (e.g. Supabase's :6543), it hangs indefinitely rather
# than erroring. MIGRATE_DATABASE_URL should be the session/direct connection (e.g. :5432);
# DATABASE_URL stays the pooled connection the running app uses via the pg adapter.
CMD ["sh", "-c", "DATABASE_URL=\"${MIGRATE_DATABASE_URL:-$DATABASE_URL}\" npx prisma migrate deploy && node dist/main"]
