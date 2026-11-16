import { createApp } from './app.js';
import { assertProductionConfiguration, env } from './config/env.js';
import { connectDatabase, prisma, prismaClient } from './db/prisma.js';
import { hashPassword } from './auth/password.js';
import { DEFAULT_OPS_PERMISSIONS } from './auth/permissions.js';
import { ensureScheduledJobs, registerJobHandlers } from './jobs/register.js';
import { startJobWorker } from './lib/queue.js';
import { logger } from './lib/logger.js';

async function maybeBootstrapFromEnv() {
  const email = env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.BOOTSTRAP_ADMIN_PASSWORD || '';
  if (!email || password.length < 12) return;

  const adminCount = await prisma.user.count({ where: { role: 'ops_admin' } });
  if (adminCount > 0) return;

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'ops_admin',
      mustChangePassword: true,
      emailVerifiedAt: new Date(),
      opsProfile: {
        create: {
          id: `ops_${Date.now().toString(36)}`,
          name: 'Bootstrap Admin',
          permissions: [...DEFAULT_OPS_PERMISSIONS]
        }
      }
    }
  });
  console.log(`Bootstrapped ops admin from env: ${email}`);
}

async function main() {
  assertProductionConfiguration();
  await connectDatabase();
  await maybeBootstrapFromEnv();
  if (env.PROCESS_ROLE === 'all') {
    registerJobHandlers();
    await ensureScheduledJobs();
    startJobWorker();
  }
  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info('api_listening', { port: env.PORT, demoMode: env.demoMode, env: env.NODE_ENV });
  });
}

main().catch(async (error) => {
  console.error(error);
  await prismaClient.$disconnect();
  process.exit(1);
});
