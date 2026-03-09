# frontend-user-next/Dockerfile

# dependencies stage
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# build stage
FROM node:24-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build
RUN npm prune --omit=dev

# production stage
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
USER nextjs
EXPOSE 3000
CMD ["npm", "start"]
