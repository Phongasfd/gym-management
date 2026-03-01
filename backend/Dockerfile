# ===============================
# Base image
# ===============================
FROM node:18-alpine AS base
WORKDIR /usr/src/app
COPY package*.json ./

# ===============================
# Dependencies stage
# ===============================
FROM base AS deps
RUN npm install

# ===============================
# Builder stage
# ===============================
FROM deps AS builder
COPY . .
RUN npx prisma generate


# ===============================
# Production stage
# ===============================
FROM node:18-alpine AS production
WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev

# copy necessary files from builder
COPY --from=builder /usr/src/app ./

# security: non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup || true
USER appuser

EXPOSE 3000

CMD ["node", "server.js"]