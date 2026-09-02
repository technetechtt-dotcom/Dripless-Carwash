import { PrismaClient } from '@prisma/client';

const CONNECTION_ERROR_CODES = new Set(['P1001', 'P1002', 'P1017']);

export function isDatabaseConnectionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string };
  if (candidate.code && CONNECTION_ERROR_CODES.has(candidate.code)) return true;
  const message = candidate.message ?? '';
  return (
    message.includes('Server has closed the connection') ||
    message.includes("Can't reach database server") ||
    message.includes('Engine is not yet connected')
  );
}

const client = new PrismaClient();

let connectPromise: Promise<void> | null = null;

async function ensureConnected() {
  if (!connectPromise) {
    connectPromise = (async () => {
      try {
        await client.$connect();
      } catch {
        await client.$disconnect().catch(() => undefined);
        await client.$connect();
      }
    })().finally(() => {
      connectPromise = null;
    });
  }
  await connectPromise;
}

export async function connectDatabase(retries = 5) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await client.$connect();
      return;
    } catch (error) {
      lastError = error;
      if (attempt === retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw lastError;
}

export async function withConnectionRetry<T>(operation: () => Promise<T>, retries = 4): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isDatabaseConnectionError(error) || attempt === retries) throw error;
      await ensureConnected();
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

export { client as prismaClient };
