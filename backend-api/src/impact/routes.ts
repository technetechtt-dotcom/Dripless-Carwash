import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { authRequired } from '../middleware/auth.js';
import {
  computeEcoStreakDays,
  estimateCo2KgSaved,
  estimatePlasticKgReduced,
  estimateProjectedCo2KgYear
} from './calculations.js';

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
    const bookings = await prisma.booking.findMany({
      where,
      select: { waterLitresUsed: true, waterLitresSaved: true, updatedAt: true, ecoPoints: true }
    });
    const waterUsed = bookings.reduce((s, b) => s + b.waterLitresUsed, 0);
    const waterSaved = bookings.reduce((s, b) => s + b.waterLitresSaved, 0);
    const completedDates = bookings.map((b) => b.updatedAt);
    const co2KgSaved = estimateCo2KgSaved(waterSaved);
    const plasticKgReduced = estimatePlasticKgReduced(bookings.length);
    const ecoStreakDays = computeEcoStreakDays(completedDates);
    const projectedCo2KgYear = estimateProjectedCo2KgYear(completedDates, co2KgSaved);
    const ecoPoints =
      req.auth!.role === 'customer'
        ? (
            await prisma.customerProfile.findUnique({
              where: { id: req.auth!.profileId },
              select: { ecoPoints: true }
            })
          )?.ecoPoints ?? 0
        : (
            await prisma.driverProfile.findUnique({
              where: { id: req.auth!.profileId },
              select: { ecoPoints: true }
            })
          )?.ecoPoints ?? 0;

    res.json({
      washes: bookings.length,
      traditionalBaselineLitres: TRADITIONAL_LITRES,
      waterUsedLitres: Number(waterUsed.toFixed(1)),
      waterSavedLitres: Number(waterSaved.toFixed(1)),
      co2KgSaved,
      plasticKgReduced,
      projectedCo2KgYear,
      ecoStreakDays,
      ecoPoints,
      methodology:
        'Each Dripless wash is estimated at 1.5L process water versus a 150L traditional hose wash baseline. CO₂ and plastic figures are operational estimates derived from water saved and completed service counts.'
    });
  } catch (error) {
    next(error);
  }
});

impactRouter.get('/trends', authRequired, async (req, res, next) => {
  try {
    const where =
      req.auth!.role === 'customer'
        ? { customerId: req.auth!.profileId, status: 'COMPLETED' as const }
        : req.auth!.role === 'driver'
          ? { driverId: req.auth!.profileId, status: 'COMPLETED' as const }
          : { status: 'COMPLETED' as const };
    const since = new Date();
    since.setMonth(since.getMonth() - 5);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);
    const bookings = await prisma.booking.findMany({
      where: { ...where, updatedAt: { gte: since } },
      select: { waterLitresSaved: true, updatedAt: true }
    });
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const buckets = new Map<string, { waterSaved: number; washes: number }>();
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      buckets.set(key, { waterSaved: 0, washes: 0 });
    }
    for (const booking of bookings) {
      const d = booking.updatedAt;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.waterSaved += booking.waterLitresSaved;
      bucket.washes += 1;
    }
    const months = [...buckets.entries()].map(([key, value]) => {
      const month = Number(key.split('-')[1]);
      return {
        name: monthLabels[month] ?? key,
        co2: estimateCo2KgSaved(value.waterSaved),
        waterSavedLitres: Number(value.waterSaved.toFixed(1)),
        washes: value.washes
      };
    });
    res.json({ months });
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
