import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

/**
 * Prisma client singleton.
 *
 * Prisma 7 requires a driver adapter; we use @prisma/adapter-mariadb with
 * the `mariadb` package to talk to MySQL/MariaDB. In dev (and in Next.js
 * HMR) we cache the client on `globalThis` to avoid exhausting the pool.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // ponytail: pass connection string directly — the adapter's URL parser
  // matches mariadb's own, no need to re-parse.
  const adapter = new PrismaMariaDb(env.DATABASE_URL);
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
