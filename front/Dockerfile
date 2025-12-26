# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments
ARG VITE_API_URL=http://localhost:8000/api
ENV VITE_API_URL=$VITE_API_URL

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN npm install -g bun && bun install

# Copy application code
COPY . .

# Build the application
RUN bun run build

# Production stage - Use Node with serve instead of nginx
FROM node:20-alpine

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Start serve with SPA support
CMD ["serve", "-s", "dist", "-l", "80"]
