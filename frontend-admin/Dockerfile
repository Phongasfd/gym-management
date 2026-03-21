# frontend-admin/Dockerfile

# build stage
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 5173 
CMD ["node", "server.js"] 