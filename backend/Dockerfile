# One image, two processes: the API (default CMD) and the background worker
# (`node dist/worker.js`, see docker-compose.prod.yml).

# ---- build: install everything, generate the Prisma client, compile TypeScript ----
FROM node:24-alpine AS builder
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate && npm run build && npm prune --omit=dev

# ---- runtime: compiled JS and production dependencies only ----
FROM node:24-alpine AS production
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/dist ./dist

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:3000/health || exit 1
# Migrations run once, from the API container, before it starts serving.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
