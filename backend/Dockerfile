FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies (use package-lock if present)
COPY package*.json ./
RUN npm install --production

# Copy app source
COPY . .

# Generate prisma client  
RUN npx prisma generate

# Use a non-root user in production-friendly images (optional)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup || true
USER appuser

ENV NODE_ENV=production

# Expose the application port
EXPOSE 3000

# Start the app
CMD ["node", "server.js"]
