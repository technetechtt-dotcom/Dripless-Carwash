import { prisma } from '../db/prisma.js';
import { HttpError } from '../middleware/error.js';

const SERVICE_ALIASES: Record<string, string> = {
  wash: 'car-wash',
  wash_service: 'car-wash',
  'car-wash': 'car-wash',
  carwash: 'car-wash',
  'car wash': 'car-wash',
  'carwash service': 'car-wash',
  'car wash service': 'car-wash',
  ride: 'taxi',
  RIDE: 'taxi',
  taxi: 'taxi',
  'eco taxi': 'taxi',
  'eco-taxi': 'taxi',
  parcel: 'delivery',
  PARCEL: 'delivery',
  delivery: 'delivery',
  'parcel delivery': 'delivery',
  'window-solar-clean': 'window-solar-clean',
  'window & solar cleaning': 'window-solar-clean',
  'window and solar cleaning': 'window-solar-clean',
  home_service: 'home-service',
  'home-service': 'home-service',
  HOME_SERVICE: 'home-service',
  home: 'home-service',
  WASH: 'car-wash'
};

const OPTION_ALIASES: Record<string, string> = {
  basic: 'basic',
  'basic wash': 'basic',
  'express wash': 'basic',
  express: 'basic',
  premium: 'premium',
  'premium wash': 'premium',
  'full valet': 'premium',
  valet: 'premium',
  'wash & vacuum': 'premium',
  'wash and vacuum': 'premium',
  custom: 'custom',
  'custom wash': 'custom',
  'detailing package': 'custom',
  detailing: 'custom',
  standard: 'standard',
  'standard ride': 'standard',
  'standard parcel': 'standard',
  window: 'window',
  'window cleaning': 'window',
  solar: 'solar',
  'solar panel cleaning': 'solar',
  mattress: 'mattress',
  'mattress clean': 'mattress',
  couch: 'couch',
  'couch clean': 'couch',
  carpet: 'carpet',
  'carpet clean': 'carpet'
};

export async function resolveCatalogueRef(input: {
  serviceSlug?: string | null;
  optionSlug?: string | null;
  serviceName?: string | null;
  optionName?: string | null;
  serviceType?: string | null;
}): Promise<{ serviceSlug: string; optionSlug: string }> {
  const rawService = (
    input.serviceSlug ||
    input.serviceType ||
    input.serviceName ||
    ''
  )
    .toString()
    .trim()
    .toLowerCase();
  const rawOption = (input.optionSlug || input.optionName || 'standard')
    .toString()
    .trim()
    .toLowerCase();

  let serviceSlug =
    SERVICE_ALIASES[rawService] ||
    rawService.replace(/\s+/g, '-').replace(/_/g, '-');
  let optionSlug =
    OPTION_ALIASES[rawOption] || rawOption.replace(/\s+/g, '-');

  // Fuzzy fallback by name match in DB
  if (!(await prisma.service.findFirst({ where: { slug: serviceSlug, active: true } }))) {
    const byName = await prisma.service.findFirst({
      where: {
        active: true,
        OR: [
          { name: { equals: input.serviceName || rawService, mode: 'insensitive' } },
          { name: { contains: rawService.split(' ')[0] || rawService, mode: 'insensitive' } }
        ]
      }
    });
    if (byName) serviceSlug = byName.slug;
  }

  const service = await prisma.service.findFirst({
    where: { slug: serviceSlug, active: true },
    include: { options: { where: { active: true } } }
  });
  if (!service) {
    throw new HttpError(400, `Unknown service: ${rawService || 'n/a'}`);
  }
  if (!service.options.some((opt) => opt.slug === optionSlug)) {
    const byOptName = service.options.find(
      (opt) => opt.name.toLowerCase() === rawOption || opt.slug === rawOption
    );
    optionSlug = byOptName?.slug || service.options[0]?.slug || optionSlug;
  }

  return { serviceSlug: service.slug, optionSlug };
}

export type PriceResolution = {
  serviceSlug: string;
  serviceName: string;
  optionSlug: string;
  optionName: string;
  basePrice: number;
  discountAmount: number;
  price: number;
  ecoPoints: number;
  promoCode: string | null;
  surchargeCents?: number;
};

const SERVICE_SCOPE_MAP: Record<string, string> = {
  'car-wash': 'CAR_WASH',
  taxi: 'TAXI',
  delivery: 'DELIVERY',
  'window-solar-clean': 'WINDOW_SOLAR',
  'home-service': 'HOME_SERVICE'
};

const SIZE_MULTIPLIER: Record<string, number> = {
  ALL: 1,
  STANDARD: 1,
  SEDAN: 1,
  SUV: 1.2,
  BAKKIE: 1.25,
  TRUCK: 1.4
};

export async function resolveServerPrice(input: {
  serviceSlug: string;
  optionSlug: string;
  promoCode?: string | null;
  role: 'customer' | 'driver';
  userId: string;
  vehicleSize?: string | null;
  addOnSlugs?: string[];
  condition?: string | null;
}): Promise<PriceResolution> {
  const service = await prisma.service.findFirst({
    where: { slug: input.serviceSlug, active: true },
    include: {
      options: {
        where: { slug: input.optionSlug, active: true }
      }
    }
  });
  const option = service?.options[0];
  if (!service || !option) {
    throw new HttpError(400, 'Unknown service or option');
  }

  let discountAmount = 0;
  let promoCode: string | null = null;
  const normalizedPromo = input.promoCode?.trim().toUpperCase() || null;

  if (normalizedPromo) {
    const now = new Date();
    const promotion = await prisma.promotion.findFirst({
      where: {
        promoCode: normalizedPromo,
        approved: true,
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now }
      }
    });
    if (!promotion) {
      throw new HttpError(400, 'Promo code is invalid or inactive');
    }
    const audienceOk =
      promotion.audience === 'both' ||
      promotion.audience === input.role;
    const scopeOk =
      promotion.serviceScope === 'ALL' ||
      promotion.serviceScope === SERVICE_SCOPE_MAP[service.slug];
    if (!audienceOk || !scopeOk) {
      throw new HttpError(400, 'Promo code not applicable');
    }
    discountAmount =
      promotion.discountType === 'PERCENT'
        ? Math.round((option.basePrice * promotion.discountValue) / 100)
        : promotion.discountValue;
    discountAmount = Math.max(0, Math.min(option.basePrice, discountAmount));
    promoCode = promotion.promoCode;

    await prisma.promotionRedemption.create({
      data: {
        promotionId: promotion.id,
        userId: input.userId,
        role: input.role
      }
    });
    await prisma.promotion.update({
      where: { id: promotion.id },
      data: {
        redemptionCount: { increment: 1 },
        lastRedeemedAt: now
      }
    });
  }

  const sizeMult = SIZE_MULTIPLIER[(input.vehicleSize || 'STANDARD').toUpperCase()] ?? 1;
  let addOnCents = 0;
  if (input.addOnSlugs?.length) {
    const addOns = await prisma.serviceAddOn.findMany({
      where: { serviceId: service.id, slug: { in: input.addOnSlugs }, active: true }
    });
    addOnCents = addOns.reduce((sum, row) => sum + row.priceCents, 0);
  }
  let surcharge = 0;
  if (input.condition) {
    const rule = await prisma.pricingRule.findFirst({
      where: { active: true, condition: input.condition }
    });
    if (rule) surcharge = rule.amountCents;
  }
  const sized = Math.round(option.basePrice * sizeMult);
  const price = Math.max(0, sized + addOnCents + surcharge - discountAmount);
  return {
    serviceSlug: service.slug,
    serviceName: service.name,
    optionSlug: option.slug,
    optionName: option.name,
    basePrice: sized,
    discountAmount,
    price,
    ecoPoints: option.ecoPointsAward,
    promoCode,
    surchargeCents: surcharge
  };
}
