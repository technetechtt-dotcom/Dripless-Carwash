import { PrismaClient } from '@prisma/client';

const CONNECTION_ERROR_CODES = new Set(['P1001', 'P1002', 'P1017']);

export function isDatabaseConnectionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string };
  if (candidate.code && CONNECTION_ERROR_CODES.has(candidate.code)) return true;
  const message = candidate.message ?? '';
  return (
    message.includes('Server has closed the connection') ||
    message.includes("Can't reach database server")
  );
}

const client = new PrismaClient();

async function reconnectDatabase() {
  await client.$disconnect().catch(() => undefined);
  await client.$connect();
}

export async function withConnectionRetry<T>(operation: () => Promise<T>, retries = 4): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isDatabaseConnectionError(error) || attempt === retries) throw error;
      await reconnectDatabase();
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw lastError;
}

export const prisma = client.$extends({
  query: {
    $allOperations({ args, query }) {
      return withConnectionRetry(() => query(args));
    }
  }
}) as unknown as PrismaClient;
