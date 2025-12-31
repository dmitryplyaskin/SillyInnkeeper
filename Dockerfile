# Stage 1: Build Client
FROM node:24-alpine AS client-builder

RUN corepack enable && corepack prepare yarn@4.12.0 --activate

WORKDIR /app

COPY SillyInnkeeper/package.json ./
COPY SillyInnkeeper/client ./client

WORKDIR /app/client

RUN yarn install --immutable
RUN yarn build

# Stage 2: Build Server
FROM node:24-alpine AS server-builder

RUN corepack enable && corepack prepare yarn@4.12.0 --activate

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app/server

COPY SillyInnkeeper/server ./

RUN yarn install
RUN yarn build

# Stage 3: Production Runtime
FROM node:24-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    shadow \
    python3 \
    make \
    g++ \
    su-exec

RUN corepack enable && corepack prepare yarn@4.12.0 --activate

WORKDIR /app

# Copy server package files and install production dependencies
COPY SillyInnkeeper/server/package.json SillyInnkeeper/server/yarn.lock ./
RUN NODE_ENV=production yarn install

# Copy built artifacts
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=client-builder /app/client/dist ./client/dist

# Create data directory
RUN mkdir -p /app/data && chown node:node /app/data

# Environment variables
ENV NODE_ENV=production \
    INNKEEPER_HOST=0.0.0.0 \
    INNKEEPER_PORT=48912

EXPOSE 48912

# Create entrypoint script
RUN echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'PUID=${PUID:-1000}' >> /entrypoint.sh && \
    echo 'PGID=${PGID:-1000}' >> /entrypoint.sh && \
    echo 'echo "Running as UID:GID $PUID:$PGID"' >> /entrypoint.sh && \
    echo 'groupmod -o -g "$PGID" node' >> /entrypoint.sh && \
    echo 'usermod -o -u "$PUID" node' >> /entrypoint.sh && \
    echo 'chown -R node:node /app/data' >> /entrypoint.sh && \
    echo 'exec su-exec node node server/dist/server.js' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

