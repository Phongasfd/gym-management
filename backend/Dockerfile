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

COPY --from=builder /usr/src/app ./

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000
CMD ["node", "server.js"]