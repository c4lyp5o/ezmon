# ============================
# Stage 1: Builder
# ============================
FROM oven/bun:1.4.5-alpine AS builder

WORKDIR /app

# Install backend deps from the lockfile
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy client and build it
COPY client ./client
RUN cd client && bun install --frozen-lockfile && bun run build


# ============================
# Stage 2: Production
# ============================
FROM oven/bun:1.4.5-alpine

WORKDIR /app

# Install system deps
RUN apk add --no-cache tzdata curl
ENV TZ=Asia/Kuala_Lumpur

# Only install production deps for backend
COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile

# Copy backend
COPY src ./src
COPY ecosystem.config.js ./
# Configuration (API_KEY, alert webhooks, ...) comes from the environment at
# runtime (compose env_file), never baked into the image.

# Copy built client bundle
COPY --from=builder /app/dist ./dist

# Install PM2 globally using Bun
RUN bun add -g pm2

EXPOSE 5000

# If you use PM2 ecosystem
CMD ["bun", "start"]
