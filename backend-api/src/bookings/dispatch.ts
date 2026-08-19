import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { sendOperationalAlert } from '../lib/monitoring.js';
import { roadRoute } from '../geo/zones.js';

export const MAX_AUTO_DISPATCH_ATTEMPTS = 3;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export async function rankDriversForBooking(bookingId: string, limit = 5) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return [];

  const pickup =
    booking.pickupLat != null && booking.pickupLng != null
      ? { lat: booking.pickupLat, lng: booking.pickupLng }
      : null;

  if (!pickup && !env.demoMode) {
    return [];
  }

  const drivers = await prisma.driverProfile.findMany({
    where: {
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      online: true,
      OR: [{ activeBookingId: null }, { activeBookingId: bookingId }]
    },
    include: { location: true, documents: true, equipment: true, consumables: true }
  });

  const ranked = (await Promise.all(
    drivers.map(async (driver) => {
      if (!driver.location && !env.demoMode) return null;
      const gpsAgeSeconds = driver.location
        ? Math.round((Date.now() - driver.location.updatedAt.getTime()) / 1000)
        : null;
      if (!env.demoMode && (gpsAgeSeconds == null || gpsAgeSeconds > 120)) return null;
      const criticalDocumentKinds = new Set(['SA_ID', 'DRIVERS_LICENCE', 'VEHICLE_REGISTRATION']);
      const complianceReady = [...criticalDocumentKinds].every((kind) =>
        driver.documents.some(
          (document) =>
            document.kind === kind &&
            document.status === 'APPROVED' &&
            (!document.expiresAt || document.expiresAt > new Date())
        )
      );
      if (!env.demoMode && !complianceReady) return null;
      const equipmentReady = driver.equipment.some((item) => !item.returnedAt && !item.faultNote);
      const stockReady = driver.consumables.every((item) => item.quantity > 0);
      if (!env.demoMode && (!equipmentReady || !stockReady)) return null;
      const origin = driver.location
        ? { lat: driver.location.lat, lng: driver.location.lng }
        : { lat: -26.2041, lng: 28.0473 };
      const route = pickup
        ? await roadRoute(origin, pickup)
        : { distanceKm: 12, etaMinutes: 29 };
      const distanceKm = route.distanceKm;
      const etaMinutes = route.etaMinutes;
      const score = etaMinutes - driver.rating * 0.75;
      return {
        driverId: driver.id,
        driverName: driver.name,
        score,
        distanceKm: Number(distanceKm.toFixed(2)),
        etaMinutes,
        reasons: [
          driver.location ? 'Has live GPS' : 'Demo location fallback',
          gpsAgeSeconds == null ? 'No GPS timestamp' : `GPS ${gpsAgeSeconds}s old`,
          `ETA ~${etaMinutes} min`,
          `Rating ${driver.rating.toFixed(2)}`,
          complianceReady ? 'Compliance ready' : 'Demo compliance fallback',
          equipmentReady && stockReady ? 'Equipment and stock ready' : 'Demo kit fallback'
        ]
      };
    })
  ))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);

  return ranked;
}

export async function autoAssignDriver(
  bookingId: string,
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.driverId) return null;
  if (!env.demoMode && (booking.pickupLat == null || booking.pickupLng == null)) {
    return null;
  }

  const ranked = await rankDriversForBooking(bookingId, 1);
  const best = ranked[0];
  if (!best) return null;

  const reason = `Auto-dispatch best available driver (${best.etaMinutes} min away)`;
  const assign = async (transaction: Prisma.TransactionClient) => {
    const driverClaim = await transaction.driverProfile.updateMany({
      where: {
        id: best.driverId,
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        online: true,
        OR: [{ activeBookingId: null }, { activeBookingId: bookingId }]
      },
      data: { activeBookingId: bookingId }
    });
    if (driverClaim.count !== 1) return null;
    const bookingClaim = await transaction.booking.updateMany({
      where: { id: bookingId, driverId: null, status: booking.status },
      data: {
        driverId: best.driverId,
        status: booking.status === 'PENDING' ? 'CONFIRMED' : booking.status,
        dispatchReason: reason,
        dispatchAttemptCount: { increment: 1 },
        acceptBy: new Date(Date.now() + 30_000)
      }
    });
    if (bookingClaim.count !== 1) throw new Error('Booking was assigned concurrently');
    const updated = await transaction.booking.findUniqueOrThrow({ where: { id: bookingId } });
    await transaction.bookingAssignment.create({
      data: { bookingId, driverId: best.driverId, reason }
    });
    await transaction.bookingStatusHistory.create({
      data: {
        bookingId,
        fromStatus: booking.status,
        toStatus: updated.status,
        actorRole: 'ops_admin',
        reason
      }
    });
    return { booking: updated, driverId: best.driverId, reason };
  };
  return tx
    ? assign(tx)
    : prisma.$transaction(assign, {
        isolationLevel: 'Serializable',
        maxWait: 10_000,
        timeout: 30_000
      });
}

export async function createOrRefreshDispatchIncident(
  bookingId: string,
  reason: string,
  severity: 'medium' | 'high' = 'medium'
) {
  const existing = await prisma.incident.findFirst({
    where: {
      bookingId,
      status: { in: ['OPEN', 'ACKNOWLEDGED', 'SNOOZED'] }
    }
  });
  if (existing) {
    return prisma.incident.update({
      where: { id: existing.id },
      data: { reason, severity, updatedAt: new Date() }
    });
  }
  const incident = await prisma.incident.create({
    data: {
      bookingId,
      reason,
      severity,
      status: 'OPEN'
    }
  });
  await sendOperationalAlert('dispatch_failure', reason, { bookingId, severity }).catch(() => undefined);
  return incident;
}

export function mapIncident(row: {
  id: string;
  bookingId: string | null;
  status: string;
  severity: string;
  reason: string;
  assigneeId: string | null;
  ownerAdminName: string | null;
  acknowledgedAt: Date | null;
  snoozedUntil: Date | null;
  resolvedAt: Date | null;
  lastEscalatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    bookingId: row.bookingId ?? '',
    status: row.status,
    severity: row.severity,
    reason: row.reason,
    ownerAdminId: row.assigneeId,
    ownerAdminName: row.ownerAdminName,
    acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
    snoozeUntil: row.snoozedUntil?.toISOString() ?? null,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    lastEscalatedAt: row.lastEscalatedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
