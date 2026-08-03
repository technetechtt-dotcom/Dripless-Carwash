import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/password.js';
import { DEFAULT_OPS_PERMISSIONS } from '../src/auth/permissions.js';

const prisma = new PrismaClient();

async function upsertService(
  slug: string,
  name: string,
  options: Array<{ slug: string; name: string; basePrice: number; ecoPointsAward: number }>
) {
  const service = await prisma.service.upsert({
    where: { slug },
    update: { name, active: true },
    create: { slug, name, active: true }
  });
  for (const option of options) {
    await prisma.serviceOption.upsert({
      where: { serviceId_slug: { serviceId: service.id, slug: option.slug } },
      update: {
        name: option.name,
        basePrice: option.basePrice,
        ecoPointsAward: option.ecoPointsAward,
        active: true
      },
      create: {
        serviceId: service.id,
        slug: option.slug,
        name: option.name,
        basePrice: option.basePrice,
        ecoPointsAward: option.ecoPointsAward
      }
    });
  }
}

async function main() {
  if (process.env.DEMO_MODE !== 'true') {
    console.log('Skipping seed: DEMO_MODE is not true');
    return;
  }

  await upsertService('car-wash', 'Car Wash', [
    { slug: 'basic', name: 'Basic Wash', basePrice: 15.99, ecoPointsAward: 160 },
    { slug: 'premium', name: 'Full Valet', basePrice: 24.99, ecoPointsAward: 250 },
    { slug: 'custom', name: 'Detailing Package', basePrice: 34.99, ecoPointsAward: 320 }
  ]);
  await upsertService('taxi', 'Eco Taxi', [
    { slug: 'standard', name: 'Standard Ride', basePrice: 18.5, ecoPointsAward: 185 }
  ]);
  await upsertService('delivery', 'Parcel Delivery', [
    { slug: 'standard', name: 'Standard Parcel', basePrice: 12, ecoPointsAward: 120 }
  ]);
  await upsertService('window-solar-clean', 'Window & Solar Cleaning', [
    { slug: 'window', name: 'Window Cleaning', basePrice: 39.99, ecoPointsAward: 400 },
    { slug: 'solar', name: 'Solar Panel Cleaning', basePrice: 45, ecoPointsAward: 450 }
  ]);
  await upsertService('home-service', 'Home Service', [
    { slug: 'mattress', name: 'Mattress Clean', basePrice: 55, ecoPointsAward: 500 },
    { slug: 'couch', name: 'Couch Clean', basePrice: 65, ecoPointsAward: 550 },
    { slug: 'carpet', name: 'Carpet Clean', basePrice: 75, ecoPointsAward: 600 }
  ]);

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

  await prisma.driverLocation.upsert({
    where: { driverId: 'driver_demo_001' },
    update: { lat: -26.1076, lng: 28.0567 },
    create: {
      driverId: 'driver_demo_001',
      lat: -26.1076,
      lng: 28.0567,
      heading: 90,
      speedKph: 0
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
      mustChangePassword: false,
      opsProfile: {
        create: {
          id: 'ops_demo_001',
          name: 'Demo Ops Admin',
          permissions: [...DEFAULT_OPS_PERMISSIONS]
        }
      }
    }
  });

  await prisma.promotion.upsert({
    where: { promoCode: 'ECO10' },
    update: {
      approved: true,
      isActive: true,
      startsAt: new Date(Date.now() - 86400000),
      endsAt: new Date(Date.now() + 30 * 86400000)
    },
    create: {
      title: 'Eco Welcome 10%',
      description: 'Demo promo for car washes',
      promoCode: 'ECO10',
      audience: 'both',
      serviceScope: 'CAR_WASH',
      discountType: 'PERCENT',
      discountValue: 10,
      startsAt: new Date(Date.now() - 86400000),
      endsAt: new Date(Date.now() + 30 * 86400000),
      terms: 'Demo only',
      approved: true,
      isActive: true,
      approvedByAdminId: 'ops_demo_001',
      approvedAt: new Date()
    }
  });

  console.log('Demo seed complete.');
  console.log('Demo logins (DEMO_MODE only):');
  console.log('  customer@demo.dripless.local / DemoPass123!');
  console.log('  driver@demo.dripless.local / DemoPass123!');
  console.log('  ops@demo.dripless.local / DemoPass123!');
  console.log('  promo: ECO10');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
