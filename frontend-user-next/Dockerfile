# -------- deps --------
  FROM node:24-alpine AS deps
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci && npm cache clean --force
  
  # -------- builder --------
  FROM node:24-alpine AS builder
  WORKDIR /app
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  RUN npm run build
  
  # -------- runner --------
  FROM node:24-alpine AS runner
  WORKDIR /app
  
  ENV NODE_ENV=production
  ENV NEXT_TELEMETRY_DISABLED=1
  
  COPY --from=builder /app/.next/standalone ./
  COPY --from=builder /app/.next/static ./.next/static
  COPY --from=builder /app/public ./public
  
  RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
  USER nextjs
  
  EXPOSE 3000
  
  CMD ["node", "server.js"]