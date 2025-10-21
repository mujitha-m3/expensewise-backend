# Multi-stage build for smaller production image

# Build stage (install dependencies)
FROM node:20-alpine AS builder
WORKDIR /app

# Install build deps
COPY package*.json ./
RUN npm ci --only=production

# Copy app files
COPY . .

# Final stage (runtime)
FROM node:20-alpine AS runtime
WORKDIR /app

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only production deps and app from builder
COPY --from=builder /app /app

# Use non-root
USER appuser

# Default port (Cloud Run will override via PORT env)
ENV PORT=8080
EXPOSE 8080

ENV NODE_ENV=production

CMD ["node", "server.js"]
