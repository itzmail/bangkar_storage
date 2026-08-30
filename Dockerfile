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

# Build-time env for Prisma generate + Next build (env.ts validates all on
# load). Dummy values only — runtime gets real values from compose.
ARG DATABASE_URL=mysql://build:build@localhost:3306/build
ARG S3_ENDPOINT=http://localhost:9000
ARG S3_ACCESS_KEY_ID=build
ARG S3_SECRET_ACCESS_KEY=build
ARG S3_BUCKET=bangkar-files
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG AUTH_SECRET=build-build-build-build-build
ENV DATABASE_URL=$DATABASE_URL \
    S3_ENDPOINT=$S3_ENDPOINT \
    S3_ACCESS_KEY_ID=$S3_ACCESS_KEY_ID \
    S3_SECRET_ACCESS_KEY=$S3_SECRET_ACCESS_KEY \
    S3_BUCKET=$S3_BUCKET \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    AUTH_SECRET=$AUTH_SECRET

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
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/src/generated/prisma ./src/generated/prisma

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
