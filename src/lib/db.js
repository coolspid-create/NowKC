import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Singleton pattern for Prisma in development
let cachedPrisma = null;
export function getDb() {
  if (!cachedPrisma) {
    cachedPrisma = new PrismaClient();
  }
  return cachedPrisma;
}
