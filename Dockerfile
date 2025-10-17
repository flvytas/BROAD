# Build stage
FROM node:20-bullseye AS builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application (creates dist/index.js and dist/public/)
RUN npm run build

# Production stage
FROM node:20-bullseye

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy built files from builder
# Backend: dist/index.js
# Frontend: dist/public/
COPY --from=builder /app/dist ./dist

# Copy source folders that might be needed at runtime
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared

# Create necessary directories with proper permissions
RUN mkdir -p recordings media uploads && \
    chmod 755 recordings media uploads

# Expose ports
EXPOSE 5000 1935 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/streams || exit 1

# Start the application
CMD ["npm", "start"]
