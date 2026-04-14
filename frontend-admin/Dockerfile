# -------- BUILD STAGE --------
  FROM node:24-alpine AS builder
  
  WORKDIR /app
  
  COPY package*.json ./
  RUN npm ci

  ARG VITE_API_BASE_URL

  ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
  
  COPY . .
  RUN npm run build
  
  
  # -------- PRODUCTION STAGE --------
  FROM node:24-alpine
  
  WORKDIR /app
  
  COPY --from=builder /app/dist ./dist
  
  RUN npm install -g serve && npm cache clean --force

  RUN addgroup -S appgroup && adduser -S appuser -G appgroup
  USER appuser
  
  EXPOSE 5173
  
  CMD ["serve", "-s", "dist", "-l", "5173"]