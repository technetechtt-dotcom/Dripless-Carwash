import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { authRequired } from '../middleware/auth.js';

const TRADITIONAL_LITRES = 150;

export const impactRouter = Router();

impactRouter.get('/summary', authRequired, async (req, res, next) => {
  try {
    const where =
      req.auth!.role === 'customer'
        ? { customerId: req.auth!.profileId, status: 'COMPLETED' as const }
        : req.auth!.role === 'driver'
          ? { driverId: req.auth!.profileId, status: 'COMPLETED' as const }
          : { status: 'COMPLETED' as const };
    const bookings = await prisma.booking.findMany({ where });
    const waterUsed = bookings.reduce((s, b) => s + b.waterLitresUsed, 0);
    const waterSaved = bookings.reduce((s, b) => s + b.waterLitresSaved, 0);
    res.json({
      washes: bookings.length,
      traditionalBaselineLitres: TRADITIONAL_LITRES,
      waterUsedLitres: Number(waterUsed.toFixed(1)),
      waterSavedLitres: Number(waterSaved.toFixed(1)),
      methodology:
        'Each Dripless wash is estimated at 1.5L process water versus a 150L traditional hose wash baseline. Figures are operational estimates, not laboratory measurements.'
    });
  } catch (error) {
    next(error);
  }
});

impactRouter.get('/platform', authRequired, async (_req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({ where: { status: 'COMPLETED' } });
    res.json({
      totalWashes: bookings.length,
      totalWaterSavedLitres: bookings.reduce((s, b) => s + b.waterLitresSaved, 0),
      totalWaterUsedLitres: bookings.reduce((s, b) => s + b.waterLitresUsed, 0)
    });
  } catch (error) {
    next(error);
  }
});
