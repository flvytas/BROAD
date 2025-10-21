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

# Build the application
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

# Install ALL dependencies (not just production)
RUN npm install

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy source folders
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared

# Create necessary directories
RUN mkdir -p recordings media uploads && \
    chmod 755 recordings media uploads

# Expose ports
EXPOSE 5000 1935 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/streams || exit 1

# Start the application
CMD ["npm", "start"]
