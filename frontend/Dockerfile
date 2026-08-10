# ---- Build stage ----
FROM node:24-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Baked in at build time — Next.js inlines NEXT_PUBLIC_* vars into the client bundle,
# so this must point at the backend's Cloud Run URL for the build that gets deployed.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ---- Production stage ----
FROM node:24-slim AS production
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static

USER node

# Cloud Run injects PORT; Next's standalone server.js reads it directly
EXPOSE 8080

CMD ["node", "server.js"]
