/**
 * Locked Sandton pilot configuration.
 * Source of truth for seed + PlatformSetting keys. Do not expand the zone
 * until the closed pilot milestone passes.
 */
export const PILOT_CONFIG = {
  area: {
    name: 'Sandton pilot',
    slug: 'sandton-pilot',
    timezone: 'Africa/Johannesburg',
    operatingFrom: '07:00',
    operatingTo: '18:00',
    /** GeoJSON Polygon rings as [lng, lat] — Sandton CBD / northern suburbs approx */
    polygon: {
      type: 'Polygon' as const,
      coordinates: [
        [
          [28.02, -26.13],
          [28.1, -26.13],
          [28.1, -26.07],
          [28.02, -26.07],
          [28.02, -26.13]
        ]
      ]
    }
  },
  vehicleCategories: ['SEDAN', 'SUV', 'BAKKIE', 'TRUCK'] as const,
  packages: [
    {
      slug: 'express',
      name: 'Express exterior',
      durationMinutes: 35,
      sedanCents: 1599,
      suvCents: 1899,
      bakkieCents: 2099,
      truckCents: 2499,
      waterLitresEstimate: 1.5,
      traditionalLitres: 150
    },
    {
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
  ],
  addOns: [
    { slug: 'mats', name: 'Mat cleaning', priceCents: 350, durationMinutes: 10 },
    { slug: 'upholstery', name: 'Upholstery clean', priceCents: 900, durationMinutes: 20 },
    { slug: 'interior-only', name: 'Interior detail add-on', priceCents: 700, durationMinutes: 15 }
  ],
  surcharges: [{ id: 'rule_heavy_dirt', condition: 'HEAVY_DIRT', amountCents: 500, name: 'Heavy dirt / mud' }],
  cancellation: {
    beforeEnRouteFeeCents: 0,
    afterDispatchFeeCents: 2500,
    afterWashStartedRefundable: false
  },
  driverRequirements: {
    requiredDocuments: ['SA_ID', 'DRIVERS_LICENCE', 'VEHICLE_REGISTRATION'] as const,
    requireProofOfAddress: true,
    requireOnline: true,
    maxGpsAgeSeconds: 120,
    requireApprovedEquipment: true,
    requirePositiveConsumables: true
  },
  payments: {
    provider: 'paystack' as const,
    currency: 'ZAR',
    sandboxOnlyUntilGreen: true
  }
} as const;

export type PilotConfig = typeof PILOT_CONFIG;
