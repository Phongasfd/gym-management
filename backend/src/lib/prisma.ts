import { PrismaClient } from '@prisma/client';

// One client (and one connection pool) per process.
export const prisma = new PrismaClient();

export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
