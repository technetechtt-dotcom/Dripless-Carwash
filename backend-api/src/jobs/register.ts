import { registerJob } from '../lib/queue.js';
import { sendEmail, sendPush, sendSms } from '../notifications/service.js';
import { issueInvoiceForPayment } from '../invoices/service.js';
import { reconcilePayments } from '../payments/service.js';
import { prisma } from '../db/prisma.js';
import { logger } from '../lib/logger.js';
import { notifyUser } from '../notifications/service.js';

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
  });
  registerJob('privacy.request', async (payload) => {
    const requestId = String(payload.requestId);
    const kind = String(payload.kind);
    const userId = String(payload.userId);
    if (kind === 'EXPORT') {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { customerProfile: true, driverProfile: true, payments: true }
      });
      await prisma.dataRequest.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
          exportUrl: `data:application/json,${encodeURIComponent(JSON.stringify(user))}`
        }
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { email: `deleted_${userId}@anonymised.dripless.local` }
      });
      await prisma.customerProfile.updateMany({
        where: { userId },
        data: { name: 'Deleted user', phone: null, status: 'SUSPENDED' }
      });
      await prisma.dataRequest.update({
        where: { id: requestId },
        data: { status: 'COMPLETED', processedAt: new Date() }
      });
    }
  });
  registerJob('promo.expire', async () => {
    await prisma.promotion.updateMany({
      where: { endsAt: { lt: new Date() }, isActive: true },
      data: { isActive: false }
    });
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
  });
  registerJob('payout.run', async () => {
    logger.info('scheduled_payout_tick');
  });
}
