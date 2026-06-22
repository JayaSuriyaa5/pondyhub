import { PrismaClient } from "@prisma/client";

// Prevents exhausting database connections in development, where Next.js
// hot-reloads modules and would otherwise instantiate a new PrismaClient
// (and a new connection pool) on every file change.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
