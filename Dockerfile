# syntax=docker/dockerfile:1

# =============================================================================
# PondyHub — Production Dockerfile
# =============================================================================
# Multi-stage build. Note this app runs via a custom server (server.ts,
# executed with tsx) rather than `next start`, because Socket.IO needs a
# real http.Server instance to attach to (see server.ts for the full
# rationale). That means we cannot use Next's `output: "standalone"` trace
# trick the way a stock `next start` deployment would -- we need the real
# node_modules (next, tsx, socket.io, @prisma/client, etc.) present in the
# final runtime image, not just a pruned trace. The stages below still
# separate dependency installation, the Next.js build, and the final
# runtime image so layer caching stays effective and the image doesn't
# carry build-only tooling it doesn't need at runtime.

# -----------------------------------------------------------------------------
# Stage 1: install dependencies
# -----------------------------------------------------------------------------
# IMPORTANT: this stage requires a package-lock.json to exist in the build
# context, because `npm ci` (used below) refuses to run without one. This
# repository was generated without running `npm install` (no network access
# during generation), so before your first `docker build`, run:
#     npm install
# locally once to generate package-lock.json, then commit it. After that,
# `npm ci` here will work normally on every subsequent build.
FROM node:20-alpine AS deps
WORKDIR /app

# Alpine's minimal base is missing a couple of libs Prisma's query engine
# and some native deps expect at install/runtime.
RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json* ./
# Deliberately a full `npm ci`, not `npm ci --omit=dev`: the `prisma` CLI
# package (used by `prisma migrate deploy` in docker/entrypoint.sh and by
# `prisma generate` in the builder stage) lives in devDependencies, and
# `typescript`/`@types/*` are needed for tsx to type-check server.ts at
# startup. Pruning devDependencies here would break the production
# container's migration step and server boot.
RUN npm ci

# -----------------------------------------------------------------------------
# Stage 2: build the Next.js application
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma needs its generated client present before `next build` runs,
# since route handlers import from @prisma/client at build/type-check time.
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: production runtime image
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Run as a non-root user inside the container; reduces blast radius if the
# Node process is ever compromised.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Full node_modules (not a pruned standalone trace) since server.ts needs
# tsx, next, socket.io, and @prisma/client all present at runtime.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY package.json server.ts tsconfig.json next.config.ts ./
COPY src ./src

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Migrations run via the entrypoint script below (not baked into the
# image build), so they execute against whatever DATABASE_URL the
# container is actually started with -- running them at build time would
# require a database to be reachable during `docker build`, which isn't
# guaranteed and couples the image build to a specific environment.
COPY --chown=nextjs:nodejs docker/entrypoint.sh ./docker/entrypoint.sh
RUN chmod +x ./docker/entrypoint.sh

ENTRYPOINT ["./docker/entrypoint.sh"]
CMD ["npm", "start"]
