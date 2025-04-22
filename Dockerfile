FROM node:18

# Create app directory
WORKDIR /app

# Copy application files
COPY . .

# Install dependencies manually (avoid npm ci)
RUN rm -f package-lock.json
RUN npm install

# Environment variables
ENV PORT=3000
ENV RAILWAY=true

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "server.js"] 