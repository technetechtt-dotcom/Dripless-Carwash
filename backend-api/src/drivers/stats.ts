import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { authRequired, roleRequired } from '../middleware/auth.js';
import { fromCents } from '../money.js';

export const driverStatsRouter = Router();

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

driverStatsRouter.get('/stats/today', authRequired, roleRequired(['driver']), async (req, res, next) => {
  try {
    const driverId = req.auth!.profileId;
    const today = startOfToday();
    const driver = await prisma.driverProfile.findUnique({ where: { id: driverId } });
    if (!driver) {
      res.status(404).json({ message: 'Driver not found' });
      return;
    }

    const [completedToday, activeToday, earningsToday] = await Promise.all([
      prisma.booking.count({
        where: { driverId, status: 'COMPLETED', updatedAt: { gte: today } }
      }),
      prisma.booking.count({
        where: {
          driverId,
          status: { in: ['PENDING', 'CONFIRMED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'] },
          updatedAt: { gte: today }
        }
      }),
      prisma.driverEarning.aggregate({
        where: { driverId, createdAt: { gte: today } },
        _sum: { netCents: true }
      })
    ]);

    let onlineHoursToday = 0;
    if (driver.shiftStartedAt && driver.shiftStartedAt >= today) {
      const end = driver.online ? new Date() : driver.shiftEndedAt ?? new Date();
      onlineHoursToday = Math.max(0, (end.getTime() - driver.shiftStartedAt.getTime()) / 3_600_000);
    }

    res.json({
      jobsCompletedToday: completedToday,
      jobsActiveToday: activeToday,
      jobsToday: completedToday + activeToday,
      onlineHoursToday: Number(onlineHoursToday.toFixed(1)),
      earningsTodayZar: fromCents(earningsToday._sum.netCents ?? 0)
    });
  } catch (error) {
    next(error);
  }
});
