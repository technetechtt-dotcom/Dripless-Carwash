import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/password.js';
import { DEFAULT_OPS_PERMISSIONS } from '../src/auth/permissions.js';

const prisma = new PrismaClient();

async function main() {
  if (process.env.DEMO_MODE !== 'true') {
    console.log('Skipping seed: DEMO_MODE is not true');
    return;
  }

  const services = [
    {
      slug: 'car-wash',
      name: 'Car Wash',
      options: [
        { slug: 'basic', name: 'Basic Wash', basePrice: 15.99, ecoPointsAward: 160 },
        { slug: 'premium', name: 'Premium Wash', basePrice: 24.99, ecoPointsAward: 250 },
        { slug: 'custom', name: 'Custom Wash', basePrice: 34.99, ecoPointsAward: 320 }
      ]
    },
    {
      slug: 'taxi',
      name: 'Eco Taxi',
      options: [{ slug: 'standard', name: 'Standard Ride', basePrice: 18.5, ecoPointsAward: 185 }]
    },
    {
      slug: 'delivery',
      name: 'Parcel Delivery',
      options: [{ slug: 'standard', name: 'Standard Parcel', basePrice: 12, ecoPointsAward: 120 }]
    },
    {
      slug: 'window-solar-clean',
      name: 'Window & Solar Cleaning',
      options: [
        { slug: 'window', name: 'Window Cleaning', basePrice: 39.99, ecoPointsAward: 400 },
        { slug: 'solar', name: 'Solar Panel Cleaning', basePrice: 45, ecoPointsAward: 450 }
      ]
    }
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: { name: service.name, active: true },
      create: {
        slug: service.slug,
        name: service.name,
        active: true,
        options: {
          create: service.options
        }
      }
    });
  }

  // Demo users only in DEMO_MODE — never a production default admin in app source without explicit seed.
  const demoPassword = await hashPassword('DemoPass123!');

  await prisma.user.upsert({
    where: { email: 'customer@demo.dripless.local' },
    update: {},
    create: {
      email: 'customer@demo.dripless.local',
      passwordHash: demoPassword,
      role: 'customer',
      emailVerifiedAt: new Date(),
      customerProfile: {
        create: {
          id: 'customer_demo_001',
          name: 'Demo Customer',
          status: 'ACTIVE',
          walletBalance: 50,
          ecoPoints: 200
        }
      }
    }
  });

  await prisma.user.upsert({
    where: { email: 'driver@demo.dripless.local' },
    update: {},
    create: {
      email: 'driver@demo.dripless.local',
      passwordHash: demoPassword,
      role: 'driver',
      emailVerifiedAt: new Date(),
      driverProfile: {
        create: {
          id: 'driver_demo_001',
          name: 'Demo Driver',
          vehicle: 'Toyota Corolla Hybrid',
          plateNumber: 'DEMO 123',
          status: 'ACTIVE',
          verificationStatus: 'VERIFIED'
        }
      }
    }
  });

  await prisma.user.upsert({
    where: { email: 'ops@demo.dripless.local' },
    update: {},
    create: {
      email: 'ops@demo.dripless.local',
      passwordHash: demoPassword,
      role: 'ops_admin',
      emailVerifiedAt: new Date(),
      mustChangePassword: true,
      opsProfile: {
        create: {
          id: 'ops_demo_001',
          name: 'Demo Ops Admin',
          permissions: [...DEFAULT_OPS_PERMISSIONS]
        }
      }
    }
  });

  console.log('Demo seed complete.');
  console.log('Demo logins (DEMO_MODE only):');
  console.log('  customer@demo.dripless.local / DemoPass123!');
  console.log('  driver@demo.dripless.local / DemoPass123!');
  console.log('  ops@demo.dripless.local / DemoPass123!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
