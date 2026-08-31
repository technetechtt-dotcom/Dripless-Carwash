import { registerJob } from '../lib/queue.js';
import { sendEmail, sendPush, sendSms } from '../notifications/service.js';
import { issueInvoiceForPayment } from '../invoices/service.js';
import { reconcilePayments, reconcilePaystackSettlements } from '../payments/service.js';
import { prisma } from '../db/prisma.js';
import { logger } from '../lib/logger.js';
import { notifyUser } from '../notifications/service.js';
import { deleteEvidenceObject, storePrivateBuffer } from '../evidence/storage.js';
import { env } from '../config/env.js';
import { enqueue, enqueueUnique } from '../lib/queue.js';
import { autoAssignDriver, createOrRefreshDispatchIncident } from '../bookings/dispatch.js';
import { processDriverPayout } from '../payouts/routes.js';
import { hashPassword } from '../auth/password.js';

const hour = 60 * 60_000;
const day = 24 * hour;

export async function ensureScheduledJobs() {
  const jobs: Array<ReturnType<typeof enqueueUnique>> = [
    ...(env.PAYSTACK_SECRET_KEY
      ? [
          enqueueUnique('payment.reconcile', {}, { runAt: new Date(Date.now() + 60_000) }),
          enqueueUnique('settlement.reconcile', {}, { runAt: new Date(Date.now() + 2 * 60_000) })
        ]
      : []),
    enqueueUnique('promo.expire', {}, { runAt: new Date(Date.now() + 3 * 60_000) }),
    enqueueUnique('documents.expiry', {}, { runAt: new Date(Date.now() + 4 * 60_000) }),
    enqueueUnique('subscriptions.renewal', {}, { runAt: new Date(Date.now() + 5 * 60_000) }),
    enqueueUnique('evidence.retention', {}, { runAt: new Date(Date.now() + 5 * 60_000) }),
    enqueueUnique('location.retention', {}, { runAt: new Date(Date.now() + 6 * 60_000) }),
    enqueueUnique('events.retention', {}, { runAt: new Date(Date.now() + 7 * 60_000) }),
    enqueueUnique('dispatch.offers.expire', {}, { runAt: new Date(Date.now() + 15_000) })
  ];
  for (const job of jobs) {
    await job;
  }
}

export function registerJobHandlers() {
  registerJob('email.send', async (payload) => {
    await sendEmail(String(payload.to), String(payload.subject), String(payload.text));
  });
  registerJob('sms.send', async (payload) => {
    await sendSms(String(payload.to), String(payload.body));
  });
  registerJob('notification.push', async (payload) => {
    await sendPush(String(payload.userId), String(payload.title), String(payload.message));
  });
  registerJob('invoice.issue', async (payload) => {
    await issueInvoiceForPayment(String(payload.paymentId));
  });
  registerJob('payments.webhook', async () => {
    /* processed inline; queue retains audit copy */
  });
  registerJob('payment.retry', async (payload) => {
    logger.info('payment_retry_due', { paymentId: payload.paymentId });
  });
  registerJob('payment.reconcile', async () => {
    await reconcilePayments();
    await enqueue('payment.reconcile', {}, { runAt: new Date(Date.now() + day) });
  });
  registerJob('settlement.reconcile', async () => {
    await reconcilePaystackSettlements();
    await enqueue('settlement.reconcile', {}, { runAt: new Date(Date.now() + day) });
  });
  registerJob('privacy.request', async (payload) => {
    const requestId = String(payload.requestId);
    const kind = String(payload.kind);
    const userId = String(payload.userId);
    if (kind === 'EXPORT') {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          customerProfile: { include: { vehicles: true, addresses: true, bookings: { include: { evidence: true, ratings: true, complaints: true } } } },
          driverProfile: { include: { documents: true, training: true, earnings: true, payouts: true, locationHistory: true } },
          payments: { include: { refunds: true, chargebacks: true, invoices: true } },
          walletEntries: true,
          consents: true,
          sessions: true,
          notificationDeliveries: true,
          subscriptions: true,
          ecoLedger: true
        }
      });
      const artifact = await storePrivateBuffer({
        scopeId: requestId,
        kind: 'popia-export.json',
        buffer: Buffer.from(JSON.stringify({ exportedAt: new Date().toISOString(), user }, null, 2)),
        mimeType: 'application/json'
      });
      await prisma.dataRequest.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
          exportUrl: artifact.key
        }
      });
    } else {
      const passwordHash = await hashPassword(`deleted-${userId}-${Date.now()}`);
      const customer = await prisma.customerProfile.findUnique({ where: { userId } });
      const driver = await prisma.driverProfile.findUnique({ where: { userId } });
      await prisma.$transaction(async (tx) => {
        await tx.session.deleteMany({ where: { userId } });
        await tx.refreshToken.deleteMany({ where: { userId } });
        await tx.deviceToken.deleteMany({ where: { userId } });
        await tx.notificationPreference.deleteMany({ where: { userId } });
        await tx.phoneOtp.deleteMany({ where: { userId } });
        if (customer) {
          await tx.savedAddress.deleteMany({ where: { customerId: customer.id } });
          await tx.vehicle.updateMany({
            where: { customerId: customer.id },
            data: { label: 'Deleted vehicle', make: null, model: null, plate: null, colour: null }
          });
          await tx.bookingEvidence.updateMany({
            where: { booking: { customerId: customer.id }, deletedAt: null },
            data: { expiresAt: new Date() }
          });
          await tx.customerProfile.update({
            where: { id: customer.id },
            data: {
              name: 'Deleted user',
              phone: null,
              status: 'SUSPENDED',
              marketingConsentAt: null,
              popiaConsentAt: null
            }
          });
        }
        if (driver) {
          await tx.driverLocationHistory.deleteMany({ where: { driverId: driver.id } });
          await tx.driverLocation.deleteMany({ where: { driverId: driver.id } });
          await tx.driverDocument.updateMany({
            where: { driverId: driver.id },
            data: {
              status: 'EXPIRED',
              expiresAt: new Date(Date.now() + env.DRIVER_DOCUMENT_RETENTION_DAYS * day)
            }
          });
          await tx.driverProfile.update({
            where: { id: driver.id },
            data: {
              name: 'Deleted driver',
              phone: null,
              plateNumber: null,
              avatarUrl: null,
              online: false,
              status: 'SUSPENDED',
              verificationStatus: 'EXPIRED'
            }
          });
        }
        await tx.user.update({
          where: { id: userId },
          data: {
            email: `deleted_${userId}@anonymised.dripless.local`,
            passwordHash,
            emailVerifiedAt: null,
            phoneVerifiedAt: null,
            mfaEnabled: false,
            mfaSecretEnc: null,
            mfaBackupCodesHash: []
          }
        });
        await tx.dataRequest.update({
          where: { id: requestId },
          data: { status: 'COMPLETED', processedAt: new Date() }
        });
      });
    }
  });
  registerJob('promo.expire', async () => {
    await prisma.promotion.updateMany({
      where: { endsAt: { lt: new Date() }, isActive: true },
      data: { isActive: false }
    });
    await enqueue('promo.expire', {}, { runAt: new Date(Date.now() + hour) });
  });
  registerJob('subscriptions.renewal', async () => {
    const due = await prisma.subscription.findMany({
      where: { status: 'ACTIVE', currentPeriodEnd: { lte: new Date() } },
      include: { user: true, plan: true },
      take: 100
    });
    for (const subscription of due) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'PAST_DUE' }
      });
      await notifyUser({
        userId: subscription.userId,
        email: subscription.user.email,
        title: 'Subscription renewal needs attention',
        message: `${subscription.plan.name} could not renew automatically. Update payment and retry.`,
        template: 'subscription.renewal_failed'
      });
    }
    await enqueue('subscriptions.renewal', {}, { runAt: new Date(Date.now() + day) });
  });
  registerJob('documents.expiry', async () => {
    const soon = new Date(Date.now() + 14 * 86400000);
    const docs = await prisma.driverDocument.findMany({
      where: { expiresAt: { lte: soon }, status: 'APPROVED' },
      include: { driver: { include: { user: true } } }
    });
    for (const doc of docs) {
      await notifyUser({
        userId: doc.driver.userId,
        title: 'Document expiring',
        message: `${doc.kind} expires soon. Please re-upload.`,
        email: doc.driver.user.email,
        template: 'driver.document_expiry'
      });
    }
    const expired = await prisma.driverDocument.findMany({
      where: { expiresAt: { lt: new Date() }, status: { not: 'EXPIRED' } }
    });
    for (const doc of expired) {
      await prisma.$transaction(async (tx) => {
        await tx.driverDocument.update({ where: { id: doc.id }, data: { status: 'EXPIRED' } });
        if (['SA_ID', 'DRIVERS_LICENCE', 'VEHICLE_REGISTRATION'].includes(doc.kind)) {
          await tx.driverProfile.update({
            where: { id: doc.driverId },
            data: { verificationStatus: 'EXPIRED', status: 'SUSPENDED', online: false }
          });
        }
      });
    }
    await enqueue('documents.expiry', {}, { runAt: new Date(Date.now() + day) });
  });
  registerJob('evidence.retention', async () => {
    const expired = await prisma.bookingEvidence.findMany({
      where: { expiresAt: { lte: new Date() }, deletedAt: null, storageKey: { not: null } },
      take: 100
    });
    for (const item of expired) {
      await deleteEvidenceObject(item.storageKey!).catch((error) =>
        logger.error('evidence_retention_delete_failed', { evidenceId: item.id, error: String(error) })
      );
      await prisma.bookingEvidence.update({
        where: { id: item.id },
        data: { deletedAt: new Date(), uploadStatus: 'DELETED', urlOrData: 'deleted' }
      });
    }
    await enqueue('evidence.retention', {}, { runAt: new Date(Date.now() + day) });
  });
  registerJob('location.retention', async () => {
    const before = new Date(Date.now() - env.GPS_RETENTION_DAYS * day);
    const deleted = await prisma.driverLocationHistory.deleteMany({ where: { createdAt: { lt: before } } });
    logger.info('gps_retention_complete', { deleted: deleted.count, before: before.toISOString() });
    await enqueue('location.retention', {}, { runAt: new Date(Date.now() + day) });
  });
  registerJob('events.retention', async () => {
    const deleted = await prisma.realtimeEvent.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - day) } }
    });
    logger.info('realtime_event_retention_complete', { deleted: deleted.count });
    await enqueue('events.retention', {}, { runAt: new Date(Date.now() + day) });
  });
  registerJob('dispatch.offers.expire', async () => {
    const expired = await prisma.booking.findMany({
      where: {
        acceptBy: { lte: new Date() },
        driverId: { not: null },
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      take: 50
    });
    for (const booking of expired) {
      const changed = await prisma.$transaction(async (tx) => {
        const released = await tx.booking.updateMany({
          where: { id: booking.id, driverId: booking.driverId, acceptBy: booking.acceptBy },
          data: {
            driverId: null,
            status: 'PENDING',
            acceptBy: null,
            dispatchReason: 'Driver offer expired',
            dispatchAttemptCount: { increment: 1 }
          }
        });
        if (released.count !== 1) return false;
        if (booking.driverId) {
          await tx.driverProfile.updateMany({
            where: { id: booking.driverId, activeBookingId: booking.id },
            data: { activeBookingId: null }
          });
        }
        await tx.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            fromStatus: booking.status,
            toStatus: 'PENDING',
            actorRole: 'ops_admin',
            reason: 'Driver offer expired without response'
          }
        });
        return true;
      });
      if (!changed) continue;
      const reassigned = await autoAssignDriver(booking.id);
      if (!reassigned) {
        await createOrRefreshDispatchIncident(booking.id, 'No driver available after offer expiry', 'high');
      }
    }
    await enqueue('dispatch.offers.expire', {}, { runAt: new Date(Date.now() + 15_000) });
  });
  registerJob('payout.run', async () => {
    logger.info('scheduled_payout_tick');
  });
  registerJob('payout.process', async (payload) => {
    await processDriverPayout(String(payload.payoutId));
  });
}
