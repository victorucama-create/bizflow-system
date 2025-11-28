FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Clean install without cache to avoid corruption
RUN npm ci --only=production --no-cache

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Start application
CMD ["npm", "start"]
