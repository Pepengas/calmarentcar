FROM node:18

# Create app directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Ensure images directory exists and has proper permissions
RUN mkdir -p /app/images
RUN chmod -R 755 /app/images

# Environment variables
ENV PORT=3000
ENV RAILWAY=true

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "server.js"] 