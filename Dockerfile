# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1: deps — install all dependencies (including dev) with pnpm
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 2: build — generate prisma client, run next build (standalone)
# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma client is generated into src/generated/prisma (gitignored)
RUN pnpm exec prisma generate
RUN pnpm build

# ---------------------------------------------------------------------------
# Stage 3: runner — minimal runtime image with standalone output
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner
RUN corepack enable
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user (Next.js standalone convention)
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Standalone output + static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma generated client must be present at runtime (standalone tracing
# excludes generated code outside src). Copy the schema + generated dir.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]

# ---------------------------------------------------------------------------
# Stage 4: migrate — one-shot image with full node_modules + prisma CLI
# Used by docker-compose.prod.yml `migrate` service (prisma migrate deploy)
# ---------------------------------------------------------------------------
FROM node:22-alpine AS migrate
RUN corepack enable
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production

CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]
