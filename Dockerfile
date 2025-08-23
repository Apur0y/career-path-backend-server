# Use official Node.js LTS version
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies for Prisma and other native modules
RUN apk add --no-cache \
    openssl \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Copy package files for dependency installation
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --production --frozen-lockfile && yarn cache clean

# Development stage
FROM base AS development

# Install all dependencies (including dev dependencies)
RUN yarn install --frozen-lockfile && yarn cache clean

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose the development port
EXPOSE 5000

# Start development server
CMD ["yarn", "dev"]

# Build stage
FROM base AS build

# Install all dependencies (including dev dependencies)
RUN yarn install --frozen-lockfile && yarn cache clean

# Copy source code and configuration files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the TypeScript application
RUN yarn build

# Production stage
FROM node:18-alpine AS production

# Set NODE_ENV to production
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    openssl \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package.json yarn.lock ./

# Install only production dependencies
RUN yarn install --production --frozen-lockfile && yarn cache clean

# Copy built application from build stage
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=build --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=nodejs:nodejs /app/views ./views

# Create uploads directory with proper permissions
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app/uploads

# Switch to non-root user
USER nodejs

# Expose the application port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "const http = require('http'); const options = { host: 'localhost', port: 5000, path: '/health', timeout: 2000 }; const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.end();"

# Start the application
CMD ["node", "dist/server.js"]