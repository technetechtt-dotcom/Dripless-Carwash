import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { enqueue } from '../lib/queue.js';

export async function registerDeviceToken(userId: string, token: string, platform: string) {
  return prisma.deviceToken.upsert({
    where: { userId_token: { userId, token } },
    update: { platform },
    create: { userId, token, platform }
  });
}

export async function sendEmail(to: string, subject: string, text: string) {
  const delivery = await prisma.notificationDelivery.create({
    data: {
      channel: 'email',
      template: subject,
      status: 'queued',
      payload: { to, subject, text }
    }
  });
  if (env.RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to,
          subject,
          text
        })
      });
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: response.ok ? 'sent' : 'failed',
          sentAt: response.ok ? new Date() : null,
          error: response.ok ? null : await response.text()
        }
      });
      return;
    } catch (error) {
      logger.error('email_send_failed', { error: String(error) });
    }
  }
  if (env.demoMode) {
    logger.info('email_demo', { to, subject, text });
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: { status: 'sent', sentAt: new Date() }
    });
  }
}

export async function sendSms(to: string, body: string) {
  const delivery = await prisma.notificationDelivery.create({
    data: {
      channel: 'sms',
      template: 'sms',
      status: 'queued',
      payload: { to, body }
    }
  });
  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM) {
    const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const params = new URLSearchParams({ To: to, From: env.TWILIO_FROM, Body: body });
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      }
    );
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: response.ok ? 'sent' : 'failed',
        sentAt: response.ok ? new Date() : null,
        error: response.ok ? null : await response.text()
      }
    });
    return;
  }
  if (env.demoMode) {
    logger.info('sms_demo', { to, body });
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: { status: 'sent', sentAt: new Date() }
    });
  }
}

export async function sendPush(userId: string, title: string, body: string) {
  const tokens = await prisma.deviceToken.findMany({ where: { userId } });
  const delivery = await prisma.notificationDelivery.create({
    data: {
      userId,
      channel: 'push',
      template: title,
      status: tokens.length ? 'queued' : 'skipped',
      payload: { title, body, tokens: tokens.length }
    }
  });
  if (!tokens.length) return;
  if (env.FCM_SERVER_KEY) {
    await Promise.all(
      tokens.map(async (row) => {
        await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            Authorization: `key=${env.FCM_SERVER_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: row.token,
            notification: { title, body },
            data: { title, body }
          })
        });
      })
    );
  }
  await prisma.notificationDelivery.update({
    where: { id: delivery.id },
    data: { status: 'sent', sentAt: new Date() }
  });
  await prisma.notification.create({
    data: { userId, title, message: body, type: 'info' }
  });
}

export async function notifyUser(input: {
  userId: string;
  title: string;
  message: string;
  email?: string;
  phone?: string;
  template: string;
}) {
  await enqueue('notification.push', {
    userId: input.userId,
    title: input.title,
    message: input.message,
    template: input.template
  });
  if (input.email) {
    await enqueue('email.send', {
      to: input.email,
      subject: input.title,
      text: input.message
    });
  }
  if (input.phone) {
    await enqueue('sms.send', { to: input.phone, body: input.message });
  }
}
