# Multi-stage build for api-server
FROM node:22-alpine as builder

# Set working directory
WORKDIR /app

# Copy root package.json and pnpm files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy api-server package.json
COPY packages/api-server/package.json ./packages/api-server/

# Install pnpm
RUN corepack enable pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy api-server source code
COPY packages/api-server/ ./packages/api-server/

# Build the application
WORKDIR /app/packages/api-server
RUN pnpm prisma generate && pnpm build

# Production stage
FROM node:22-alpine as production

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S apiserver -u 1001

# Set working directory
WORKDIR /app

# Copy built application and dependencies
COPY --from=builder --chown=apiserver:nodejs /app/packages/api-server/dist ./packages/api-server/dist
COPY --from=builder --chown=apiserver:nodejs /app/packages/api-server/prisma ./packages/api-server/prisma
COPY --from=builder --chown=apiserver:nodejs /app/packages/api-server/node_modules ./packages/api-server/node_modules
COPY --from=builder --chown=apiserver:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=apiserver:nodejs /app/package.json ./package.json

# Install runtime dependencies for Prisma
RUN apk add --no-cache openssl

# Set working directory to api-server
WORKDIR /app/packages/api-server

# Switch to api-server user
USER apiserver

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Create startup script to handle database migration and startup
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/index.js"]
