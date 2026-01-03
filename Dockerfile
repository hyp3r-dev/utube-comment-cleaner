# Build stage
FROM woahbase/alpine-nodejs:24.11.1 AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM woahbase/alpine-nodejs:24.11.1 AS production

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S sveltekit -u 1001

# Create data directory for persistent storage
RUN mkdir -p /app/data && chown -R sveltekit:nodejs /app/data

# Copy built application from builder stage
COPY --from=builder --chown=sveltekit:nodejs /app/build ./build
COPY --from=builder --chown=sveltekit:nodejs /app/package.json /app/package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev && \
    npm cache clean --force

# Switch to non-root user
USER sveltekit

# Expose the port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATA_DIR=/app/data

# Health check using the health API endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "build"]
