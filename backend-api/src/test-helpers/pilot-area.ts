import { prisma } from '../db/prisma.js';
import { PILOT_CONFIG } from '../config/pilot.js';

/** Seed pilot zone with 24h hours so CI passes regardless of UTC run time. */
export async function seedTestServiceArea() {
  return prisma.serviceArea.upsert({
    where: { slug: PILOT_CONFIG.area.slug },
    update: {
      active: true,
      operatingFrom: '00:00',
      operatingTo: '23:59',
      weatherHold: false,
      polygonGeoJson: PILOT_CONFIG.area.polygon
    },
    create: {
      name: PILOT_CONFIG.area.name,
      slug: PILOT_CONFIG.area.slug,
      active: true,
      operatingFrom: '00:00',
      operatingTo: '23:59',
      polygonGeoJson: PILOT_CONFIG.area.polygon
    }
  });
}

export async function seedTestCarWashService() {
  return prisma.service.upsert({
    where: { slug: 'car-wash' },
    update: { active: true },
    create: {
      slug: 'car-wash',
      name: 'Car Wash',
      options: {
        create: [{ slug: 'basic', name: 'Basic Wash', basePrice: 1599, ecoPointsAward: 160 }]
      }
    }
  });
}

export function tomorrowNoonIso() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

export function defaultBookingPayload(overrides: Record<string, unknown> = {}) {
  return {
    serviceSlug: 'car-wash',
    optionSlug: 'basic',
    pickupLocation: 'Sandton City Mall',
    pickupCoordinates: { lat: -26.1076, lng: 28.0567 },
    scheduledAt: tomorrowNoonIso(),
    vehicleSize: 'SEDAN',
    ...overrides
  };
}
