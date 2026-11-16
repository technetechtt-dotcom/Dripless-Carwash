import 'dotenv/config';
import { prisma } from '../db/prisma.js';
import { hashPassword } from './password.js';
import { DEFAULT_OPS_PERMISSIONS } from './permissions.js';
import { env } from '../config/env.js';

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const part = argv[i];
    if (part.startsWith('--') && argv[i + 1]) {
      args[part.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

async function bootstrapAdmin() {
  const args = parseArgs(process.argv.slice(2));
  const email = (args.email || env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = args.password || env.BOOTSTRAP_ADMIN_PASSWORD || '';
  const name = args.name || 'Operations Admin';

  if (!email || !password || password.length < 12) {
    console.error(
      'Usage: npm run bootstrap:admin -- --email admin@example.com --password "StrongPass123!" [--name "Ops Admin"]'
    );
    console.error('Password must be at least 12 characters.');
    process.exit(1);
  }

  const existingAdmins = await prisma.user.count({ where: { role: 'ops_admin' } });
  if (existingAdmins > 0 && !args.force) {
    console.error(
      'An ops admin already exists. Refusing to bootstrap. Pass --force only for recovery.'
    );
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      mustChangePassword: true,
      failedLoginCount: 0,
      lockedUntil: null,
      emailVerifiedAt: new Date()
    },
    create: {
      email,
      passwordHash,
      role: 'ops_admin',
      mustChangePassword: true,
      emailVerifiedAt: new Date(),
      opsProfile: {
        create: {
          id: `ops_${Date.now().toString(36)}`,
          name,
          permissions: [...DEFAULT_OPS_PERMISSIONS]
        }
      }
    },
    include: { opsProfile: true }
  });

  if (!user.opsProfile) {
    await prisma.opsAdminProfile.create({
      data: {
        id: `ops_${Date.now().toString(36)}`,
        userId: user.id,
        name,
        permissions: [...DEFAULT_OPS_PERMISSIONS]
      }
    });
  }

  console.log(`Ops admin ready: ${email}`);
  console.log('mustChangePassword=true — force rotation on first login.');
}

bootstrapAdmin()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
