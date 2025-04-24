FROM node:18

# Create app directory
WORKDIR /app

# Create and set up both image directories
RUN mkdir -p /app/images /app/public/images
COPY images/* /app/images/
COPY images/* /app/public/images/
RUN chmod -R 755 /app/images /app/public/images

# Copy package files for better layer caching
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy remaining application files
COPY . .

# Environment variables
ENV PORT=3000
ENV RAILWAY=true
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "server.js"] 