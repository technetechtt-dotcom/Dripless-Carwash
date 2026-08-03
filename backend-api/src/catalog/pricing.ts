import { prisma } from '../db/prisma.js';
import { HttpError } from '../middleware/error.js';

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
};

const SERVICE_SCOPE_MAP: Record<string, string> = {
  'car-wash': 'CAR_WASH',
  taxi: 'TAXI',
  delivery: 'DELIVERY',
  'window-solar-clean': 'WINDOW_SOLAR',
  'home-service': 'HOME_SERVICE'
};

export async function resolveServerPrice(input: {
  serviceSlug: string;
  optionSlug: string;
  promoCode?: string | null;
  role: 'customer' | 'driver';
  userId: string;
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
        ? (option.basePrice * promotion.discountValue) / 100
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

  const price = Math.max(0, Number((option.basePrice - discountAmount).toFixed(2)));
  return {
    serviceSlug: service.slug,
    serviceName: service.name,
    optionSlug: option.slug,
    optionName: option.name,
    basePrice: option.basePrice,
    discountAmount: Number(discountAmount.toFixed(2)),
    price,
    ecoPoints: option.ecoPointsAward,
    promoCode
  };
}
