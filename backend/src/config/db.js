import { PrismaClient } from '@prisma/client';

// Singleton Prisma client — avoids exhausting Postgres connections when the
// dev server hot-reloads.
export const prisma = globalThis.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}
