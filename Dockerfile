FROM node:18-slim

WORKDIR /app

# Copy package files first for better caching
COPY package.json ./

# Use npm install instead of npm ci
RUN npm install --no-package-lock

# Copy the rest of the application
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV RAILWAY=true

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"] 