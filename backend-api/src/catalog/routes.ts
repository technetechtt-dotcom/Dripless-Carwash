import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { fromCents } from '../money.js';

export const catalogRouter = Router();

catalogRouter.get('/services', async (_req, res, next) => {
  try {
    const services = await prisma.service.findMany({
      where: { active: true },
      include: {
        options: { where: { active: true } },
        addOns: { where: { active: true } },
        packages: { where: { active: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json(
      services.map((service) => ({
        id: service.id,
        slug: service.slug,
        name: service.name,
        description: service.description,
        options: service.options.map((opt) => ({
          ...opt,
          basePriceZar: fromCents(opt.basePrice),
          basePriceCents: opt.basePrice
        })),
        addOns: service.addOns.map((addOn) => ({
          ...addOn,
          priceZar: fromCents(addOn.priceCents)
        })),
        packages: service.packages.map((pkg) => ({
          ...pkg,
          sedanZar: fromCents(pkg.sedanCents),
          suvZar: fromCents(pkg.suvCents),
          bakkieZar: fromCents(pkg.bakkieCents),
          truckZar: fromCents(pkg.truckCents)
        }))
      }))
    );
  } catch (error) {
    next(error);
  }
});

catalogRouter.get('/areas', async (_req, res, next) => {
  try {
    const areas = await prisma.serviceArea.findMany({
      where: { active: true },
      orderBy: { name: 'asc' }
    });
    res.json(areas);
  } catch (error) {
    next(error);
  }
});
