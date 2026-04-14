/**
 * Prisma Client: las consultas ORM usan parámetros enlazados (mitiga inyección SQL).
 * Si usás `$queryRaw`, interpolá valores solo con `Prisma.sql\`...${valor}\`` (nunca concatenar SQL con entrada de usuario).
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
