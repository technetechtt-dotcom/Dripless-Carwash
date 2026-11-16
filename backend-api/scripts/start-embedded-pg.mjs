import EmbeddedPostgres from 'embedded-postgres';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databaseDir = path.join(__dirname, '..', 'data', 'embedded-pg');

const pg = new EmbeddedPostgres({
  databaseDir,
  user: 'dripless',
  password: 'dripless',
  port: 5432,
  persistent: true,
  autoRehydrateSymlinks: true
});

await pg.initialise();
await pg.start();

try {
  await pg.createDatabase('dripless');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!/already exists/i.test(message)) throw error;
}

console.log('Embedded Postgres ready on postgresql://dripless:dripless@localhost:5432/dripless');

process.on('SIGINT', async () => {
  await pg.stop();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await pg.stop();
  process.exit(0);
});

// Keep process alive
await new Promise(() => {});
