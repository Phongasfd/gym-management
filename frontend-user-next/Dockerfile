# frontend-user-next/Dockerfile

# dependencies stage
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# build stage
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# production stage
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
USER nextjs
EXPOSE 3000
CMD ["npm", "start"]
