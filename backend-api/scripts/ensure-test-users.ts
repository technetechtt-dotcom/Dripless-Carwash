import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/password.js';
import { DEFAULT_OPS_PERMISSIONS } from '../src/auth/permissions.js';

const prisma = new PrismaClient();

const TEST_PASSWORD = 'TestPass123!';

const TEST_USERS = {
  customer: {
    email: 'technetech.tt@gmail.com',
    name: 'Joseph Dinges',
    phone: '+27697040585',
    profileId: 'customer_joseph_dinges'
  },
  driver: {
    email: 'ivanjohnsonijj@gmail.com',
    name: 'Ivan Johnson',
    phone: '+27627539020',
    profileId: 'driver_ivan_johnson',
    vehicle: 'Toyota Corolla',
    plateNumber: 'IJ 9020 GP'
  },
  opsAdmin: {
    email: 'technetech.tt+ops@gmail.com',
    name: 'TechneTech Ops',
    profileId: 'ops_technetech_admin'
  }
} as const;

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('27')) return `+${digits}`;
  if (digits.startsWith('0')) return `+27${digits.slice(1)}`;
  return `+${digits}`;
}

async function ensureDriverCompliance(driverId: string) {
  const reviewer = await prisma.opsAdminProfile.findFirst({ select: { id: true } });
  const reviewerId = reviewer?.id ?? 'ops_demo_001';
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
          storageKey: `test/${driverId}/${kind.toLowerCase()}.pdf`,
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
      data: { driverId, name: 'Field test pressure kit', serial: 'TEST-EQ-IJ-001' }
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

  await prisma.driverLocation.upsert({
    where: { driverId },
    update: { lat: -26.1076, lng: 28.0567, spoofSuspect: false },
    create: {
      driverId,
      lat: -26.1076,
      lng: 28.0567,
      heading: 90,
      speedKph: 0,
      spoofSuspect: false
    }
  });

  await prisma.driverProfile.update({
    where: { id: driverId },
    data: {
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      verificationNote: 'Test account — field validation'
    }
  });
}

async function ensureCustomer() {
  const spec = TEST_USERS.customer;
  const phone = normalizePhone(spec.phone);
  const passwordHash = await hashPassword(TEST_PASSWORD);
  const existing = await prisma.user.findUnique({
    where: { email: spec.email },
    include: { customerProfile: true }
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        mustChangePassword: false,
        failedLoginCount: 0,
        lockedUntil: null
      }
    });
    if (existing.customerProfile) {
      await prisma.customerProfile.update({
        where: { id: existing.customerProfile.id },
        data: { name: spec.name, phone, status: 'ACTIVE' }
      });
    } else {
      await prisma.customerProfile.create({
        data: {
          id: spec.profileId,
          userId: existing.id,
          name: spec.name,
          phone,
          referralCode: `C${Date.now().toString(36).toUpperCase()}`
        }
      });
    }
    return spec.email;
  }

  await prisma.user.create({
    data: {
      email: spec.email,
      passwordHash,
      role: 'customer',
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
      customerProfile: {
        create: {
          id: spec.profileId,
          name: spec.name,
          phone,
          referralCode: `C${Date.now().toString(36).toUpperCase()}`
        }
      }
    }
  });
  return spec.email;
}

async function ensureDriver() {
  const spec = TEST_USERS.driver;
  const phone = normalizePhone(spec.phone);
  const passwordHash = await hashPassword(TEST_PASSWORD);
  const existing = await prisma.user.findUnique({
    where: { email: spec.email },
    include: { driverProfile: true }
  });

  let driverId = spec.profileId;
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        mustChangePassword: false,
        failedLoginCount: 0,
        lockedUntil: null
      }
    });
    if (existing.driverProfile) {
      driverId = existing.driverProfile.id;
      await prisma.driverProfile.update({
        where: { id: driverId },
        data: {
          name: spec.name,
          phone,
          vehicle: spec.vehicle,
          plateNumber: spec.plateNumber
        }
      });
    } else {
      await prisma.driverProfile.create({
        data: {
          id: driverId,
          userId: existing.id,
          name: spec.name,
          phone,
          vehicle: spec.vehicle,
          plateNumber: spec.plateNumber,
          status: 'ACTIVE',
          verificationStatus: 'VERIFIED'
        }
      });
    }
  } else {
    await prisma.user.create({
      data: {
        email: spec.email,
        passwordHash,
        role: 'driver',
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        driverProfile: {
          create: {
            id: driverId,
            name: spec.name,
            phone,
            vehicle: spec.vehicle,
            plateNumber: spec.plateNumber,
            status: 'ACTIVE',
            verificationStatus: 'VERIFIED'
          }
        }
      }
    });
  }

  await ensureDriverCompliance(driverId);
  return spec.email;
}

async function ensureOpsAdmin() {
  const spec = TEST_USERS.opsAdmin;
  const passwordHash = await hashPassword(TEST_PASSWORD);
  const existing = await prisma.user.findUnique({
    where: { email: spec.email },
    include: { opsProfile: true }
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        emailVerifiedAt: new Date(),
        mustChangePassword: false,
        failedLoginCount: 0,
        lockedUntil: null
      }
    });
    if (existing.opsProfile) {
      await prisma.opsAdminProfile.update({
        where: { id: existing.opsProfile.id },
        data: {
          name: spec.name,
          permissions: [...DEFAULT_OPS_PERMISSIONS]
        }
      });
    } else {
      await prisma.opsAdminProfile.create({
        data: {
          id: spec.profileId,
          userId: existing.id,
          name: spec.name,
          permissions: [...DEFAULT_OPS_PERMISSIONS]
        }
      });
    }
    return spec.email;
  }

  await prisma.user.create({
    data: {
      email: spec.email,
      passwordHash,
      role: 'ops_admin',
      emailVerifiedAt: new Date(),
      opsProfile: {
        create: {
          id: spec.profileId,
          name: spec.name,
          permissions: [...DEFAULT_OPS_PERMISSIONS]
        }
      }
    }
  });
  return spec.email;
}

async function main() {
  const customerEmail = await ensureCustomer();
  const driverEmail = await ensureDriver();
  const opsEmail = await ensureOpsAdmin();
  console.log('Test accounts ready.');
  console.log(`  Customer: ${customerEmail} / ${TEST_PASSWORD}`);
  console.log(`  Driver:   ${driverEmail} / ${TEST_PASSWORD}`);
  console.log(`  Ops:      ${opsEmail} / ${TEST_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
