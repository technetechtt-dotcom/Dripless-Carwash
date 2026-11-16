import { assertProductionConfiguration, env } from './config/env.js';
import { prisma } from './db/prisma.js';
import { ensureScheduledJobs, registerJobHandlers } from './jobs/register.js';
import { startJobWorker } from './lib/queue.js';
import { logger } from './lib/logger.js';

async function main() {
  assertProductionConfiguration();
  if (env.isProduction && env.PROCESS_ROLE !== 'worker') {
    throw new Error('Worker process requires PROCESS_ROLE=worker in production');
  }
  registerJobHandlers();
  await ensureScheduledJobs();
  startJobWorker();
  logger.info('job_worker_started', { env: env.NODE_ENV });
}

main().catch(async (error) => {
  logger.error('job_worker_start_failed', { error: String(error) });
  await prisma.$disconnect();
  process.exit(1);
});
