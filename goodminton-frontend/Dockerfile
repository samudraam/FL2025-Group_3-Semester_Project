# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Install Expo CLI globally
RUN npm install -g @expo/cli

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose Expo ports
EXPOSE 19000 19001 19002 19006

# Health check for Expo server
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:19000 || exit 1

# Start Expo development server
CMD ["npm", "start"]
