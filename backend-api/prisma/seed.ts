import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/password.js';
import { DEFAULT_OPS_PERMISSIONS } from '../src/auth/permissions.js';

const prisma = new PrismaClient();

async function upsertService(
  slug: string,
  name: string,
  options: Array<{ slug: string; name: string; basePrice: number; ecoPointsAward: number }>,
  active = true
) {
  const service = await prisma.service.upsert({
    where: { slug },
    update: { name, active },
    create: { slug, name, active }
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

async function ensureDemoDriverCompliance(driverId: string, reviewerId: string) {
  const expiresAt = new Date(Date.now() + 365 * 86400000);
  const reviewedAt = new Date();
  for (const kind of ['SA_ID', 'DRIVERS_LICENCE', 'VEHICLE_REGISTRATION'] as const) {
    const existing = await prisma.driverDocument.findFirst({ where: { driverId, kind } });
    if (existing) {
      await prisma.driverDocument.update({
        where: { id: existing.id },
        data: {
          status: 'APPROVED',
          expiresAt,
          reviewedAt,
          reviewedById: reviewerId,
          rejectionReason: null
        }
      });
    } else {
      await prisma.driverDocument.create({
        data: {
          driverId,
          kind,
          storageKey: `demo/${driverId}/${kind.toLowerCase()}.pdf`,
          mimeType: 'application/pdf',
          status: 'APPROVED',
          expiresAt,
          reviewedAt,
          reviewedById: reviewerId
        }
      });
    }
  }

  const equipment = await prisma.driverEquipment.findFirst({
    where: { driverId, returnedAt: null, faultNote: null }
  });
  if (!equipment) {
    await prisma.driverEquipment.create({
      data: {
        driverId,
        name: 'Demo pressure kit',
        serial: 'DEMO-EQ-001'
      }
    });
  }

  for (const item of [
    { sku: 'shampoo', name: 'Eco shampoo', quantity: 10 },
    { sku: 'towels', name: 'Microfiber towels', quantity: 20 }
  ]) {
    await prisma.driverConsumable.upsert({
      where: { driverId_sku: { driverId, sku: item.sku } },
      update: { quantity: item.quantity, name: item.name, threshold: 2 },
      create: { driverId, ...item, threshold: 2 }
    });
  }

  await prisma.driverProfile.update({
    where: { id: driverId },
    data: {
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED'
    }
  });
}

async function main() {
  if (process.env.DEMO_MODE !== 'true') {
    console.log('Skipping seed: DEMO_MODE is not true');
    return;
  }

  await upsertService('car-wash', 'Car Wash', [
    { slug: 'basic', name: 'Basic Wash', basePrice: 1599, ecoPointsAward: 160 },
    { slug: 'premium', name: 'Full Valet', basePrice: 2499, ecoPointsAward: 250 },
    { slug: 'custom', name: 'Detailing Package', basePrice: 3499, ecoPointsAward: 320 }
  ]);
  await upsertService('taxi', 'Eco Taxi', [
    { slug: 'standard', name: 'Standard Ride', basePrice: 1850, ecoPointsAward: 185 }
  ], false);
  await upsertService('delivery', 'Parcel Delivery', [
    { slug: 'standard', name: 'Standard Parcel', basePrice: 1200, ecoPointsAward: 120 }
  ], false);
  await upsertService('window-solar-clean', 'Window & Solar Cleaning', [
    { slug: 'window', name: 'Window Cleaning', basePrice: 3999, ecoPointsAward: 400 },
    { slug: 'solar', name: 'Solar Panel Cleaning', basePrice: 4500, ecoPointsAward: 450 }
  ]);
  await upsertService('home-service', 'Home Service', [
    { slug: 'mattress', name: 'Mattress Clean', basePrice: 5500, ecoPointsAward: 500 },
    { slug: 'couch', name: 'Couch Clean', basePrice: 6500, ecoPointsAward: 550 },
    { slug: 'carpet', name: 'Carpet Clean', basePrice: 7500, ecoPointsAward: 600 }
  ]);

  const demoPassword = await hashPassword('DemoPass123!');

  const customerUser = await prisma.user.upsert({
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
          walletBalance: 5000,
          walletCashBalance: 5000,
          ecoPoints: 200,
          referralCode: 'DEMOCUST',
          popiaConsentAt: new Date(),
          marketingConsentAt: new Date()
        }
      }
    }
  });

  await prisma.walletLedgerEntry.upsert({
    where: { idempotencyKey: 'seed-customer-opening-balance' },
    update: {},
    create: {
      userId: customerUser.id,
      type: 'CREDIT',
      amountCents: 5000,
      balanceAfter: 5000,
      cashBalanceAfter: 5000,
      promoBalanceAfter: 0,
      withdrawable: true,
      idempotencyKey: 'seed-customer-opening-balance',
      note: 'Demo opening balance'
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
          verificationStatus: 'VERIFIED',
          online: true
        }
      }
    }
  });

  await prisma.driverLocation.upsert({
    where: { driverId: 'driver_demo_001' },
    update: { lat: -26.1076, lng: 28.0567, spoofSuspect: false },
    create: {
      driverId: 'driver_demo_001',
      lat: -26.1076,
      lng: 28.0567,
      heading: 90,
      speedKph: 0,
      spoofSuspect: false
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

  await ensureDemoDriverCompliance('driver_demo_001', 'ops_demo_001');

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

  const carWash = await prisma.service.findUnique({ where: { slug: 'car-wash' } });
  if (carWash) {
    await prisma.washPackage.upsert({
      where: { serviceId_slug: { serviceId: carWash.id, slug: 'express' } },
      update: {
        name: 'Express exterior',
        durationMinutes: 35,
        sedanCents: 1599,
        suvCents: 1899,
        bakkieCents: 2099,
        truckCents: 2499,
        waterLitresEstimate: 1.5,
        traditionalLitres: 150,
        active: true
      },
      create: {
        serviceId: carWash.id,
        slug: 'express',
        name: 'Express exterior',
        durationMinutes: 35,
        sedanCents: 1599,
        suvCents: 1899,
        bakkieCents: 2099,
        truckCents: 2499,
        waterLitresEstimate: 1.5,
        traditionalLitres: 150
      }
    });
    await prisma.washPackage.upsert({
      where: { serviceId_slug: { serviceId: carWash.id, slug: 'full-valet' } },
      update: {
        name: 'Full valet',
        durationMinutes: 55,
        sedanCents: 2499,
        suvCents: 2899,
        bakkieCents: 3099,
        truckCents: 3599,
        waterLitresEstimate: 2.0,
        traditionalLitres: 180,
        active: true
      },
      create: {
        serviceId: carWash.id,
        slug: 'full-valet',
        name: 'Full valet',
        durationMinutes: 55,
        sedanCents: 2499,
        suvCents: 2899,
        bakkieCents: 3099,
        truckCents: 3599,
        waterLitresEstimate: 2.0,
        traditionalLitres: 180
      }
    });
    await prisma.serviceAddOn.upsert({
      where: { serviceId_slug: { serviceId: carWash.id, slug: 'mats' } },
      update: { name: 'Mat cleaning', priceCents: 350, durationMinutes: 10, active: true },
      create: {
        serviceId: carWash.id,
        slug: 'mats',
        name: 'Mat cleaning',
        priceCents: 350,
        durationMinutes: 10
      }
    });
    await prisma.serviceAddOn.upsert({
      where: { serviceId_slug: { serviceId: carWash.id, slug: 'upholstery' } },
      update: { name: 'Upholstery clean', priceCents: 900, durationMinutes: 20, active: true },
      create: {
        serviceId: carWash.id,
        slug: 'upholstery',
        name: 'Upholstery clean',
        priceCents: 900,
        durationMinutes: 20
      }
    });
    await prisma.serviceAddOn.upsert({
      where: { serviceId_slug: { serviceId: carWash.id, slug: 'interior-only' } },
      update: { name: 'Interior detail add-on', priceCents: 700, durationMinutes: 15, active: true },
      create: {
        serviceId: carWash.id,
        slug: 'interior-only',
        name: 'Interior detail add-on',
        priceCents: 700,
        durationMinutes: 15
      }
    });
  }

  await prisma.serviceArea.upsert({
    where: { slug: 'sandton-pilot' },
    update: {
      active: true,
      name: 'Sandton pilot',
      operatingFrom: '07:00',
      operatingTo: '18:00',
      weatherHold: false,
      polygonGeoJson: {
        type: 'Polygon',
        coordinates: [[
          [28.02, -26.13],
          [28.1, -26.13],
          [28.1, -26.07],
          [28.02, -26.07],
          [28.02, -26.13]
        ]]
      }
    },
    create: {
      name: 'Sandton pilot',
      slug: 'sandton-pilot',
      operatingFrom: '07:00',
      operatingTo: '18:00',
      polygonGeoJson: {
        type: 'Polygon',
        coordinates: [[
          [28.02, -26.13],
          [28.1, -26.13],
          [28.1, -26.07],
          [28.02, -26.07],
          [28.02, -26.13]
        ]]
      }
    }
  });

  await prisma.platformSetting.upsert({
    where: { key: 'pilot.area.slug' },
    update: { value: 'sandton-pilot' },
    create: { key: 'pilot.area.slug', value: 'sandton-pilot' }
  });
  await prisma.platformSetting.upsert({
    where: { key: 'pilot.cancellation.afterDispatchFeeCents' },
    update: { value: 2500 },
    create: { key: 'pilot.cancellation.afterDispatchFeeCents', value: 2500 }
  });
  await prisma.platformSetting.upsert({
    where: { key: 'pilot.payments.sandboxOnly' },
    update: { value: true },
    create: { key: 'pilot.payments.sandboxOnly', value: true }
  });
  await prisma.platformSetting.upsert({
    where: { key: 'pilot.config' },
    update: {
      value: {
        area: 'sandton-pilot',
        operatingFrom: '07:00',
        operatingTo: '18:00',
        afterDispatchFeeCents: 2500
      }
    },
    create: {
      key: 'pilot.config',
      value: {
        area: 'sandton-pilot',
        operatingFrom: '07:00',
        operatingTo: '18:00',
        afterDispatchFeeCents: 2500
      }
    }
  });

  await prisma.subscriptionPlan.upsert({
    where: { slug: 'monthly-4' },
    update: { active: true },
    create: {
      slug: 'monthly-4',
      name: '4 washes / month',
      monthlyCents: 4999,
      washesIncluded: 4
    }
  });

  await prisma.inventoryItem.upsert({
    where: { sku: 'CHEM-WASH-1L' },
    update: { quantity: 40 },
    create: { sku: 'CHEM-WASH-1L', name: 'Dripless wash concentrate 1L', quantity: 40, threshold: 8, unit: 'bottle' }
  });

  await prisma.pricingRule.upsert({
    where: { id: 'rule_heavy_dirt' },
    update: { active: true },
    create: {
      id: 'rule_heavy_dirt',
      name: 'Heavy dirt / mud surcharge',
      ruleType: 'CONDITION',
      condition: 'HEAVY_DIRT',
      amountCents: 500
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
