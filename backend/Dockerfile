# build stage
FROM node:24-alpine AS builder
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm prune --omit=dev


# production stage
FROM node:24-alpine AS production
WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy only production dependencies
COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy Prisma files needed for migrations and client
COPY --from=builder /usr/src/app/prisma ./prisma

# Copy only the necessary source files (exclude tests, config files, etc.)
COPY server.js ./
COPY app.js ./
COPY prismaClient.js ./
COPY config ./config
COPY controllers ./controllers
COPY middleware ./middleware
COPY routes ./routes
COPY services ./services
COPY utils ./utils

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]