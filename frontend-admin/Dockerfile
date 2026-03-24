# -------- BUILD STAGE --------
  FROM node:24-alpine AS builder
  
  WORKDIR /app
  
  COPY package*.json ./
  RUN npm ci
  
  COPY . .
  RUN npm run build
  
  
  # -------- PRODUCTION STAGE --------
  FROM node:24-alpine
  
  WORKDIR /app
  
  COPY --from=builder /app/dist ./dist
  
  RUN npm install -g serve && npm cache clean --force
  
  EXPOSE 5173
  
  CMD ["serve", "-s", "dist", "-l", "5173"]