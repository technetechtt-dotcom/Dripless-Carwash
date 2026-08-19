import { createSign } from 'node:crypto';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { enqueue } from '../lib/queue.js';

type FcmServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
  token_uri?: string;
};

let fcmTokenCache: { token: string; expiresAt: number } | null = null;

const base64Url = (value: string | Buffer) => Buffer.from(value).toString('base64url');

function parseServiceAccount(): FcmServiceAccount | null {
  if (!env.FCM_SERVICE_ACCOUNT_JSON) return null;
  try {
    const raw = env.FCM_SERVICE_ACCOUNT_JSON.trim().startsWith('{')
      ? env.FCM_SERVICE_ACCOUNT_JSON
      : Buffer.from(env.FCM_SERVICE_ACCOUNT_JSON, 'base64').toString('utf8');
    const account = JSON.parse(raw) as FcmServiceAccount;
    if (!account.client_email || !account.private_key || !account.project_id) return null;
    return account;
  } catch {
    throw new Error('FCM_SERVICE_ACCOUNT_JSON is invalid');
  }
}

async function getFcmAccessToken(account: FcmServiceAccount) {
  if (fcmTokenCache && fcmTokenCache.expiresAt > Date.now() + 60_000) return fcmTokenCache.token;
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: account.token_uri || 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    })
  );
  const unsigned = `${header}.${claims}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer.sign(account.private_key).toString('base64url')}`;
  const response = await fetch(account.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  const body = (await response.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !body.access_token) {
    throw new Error(body.error_description || 'FCM OAuth token request failed');
  }
  fcmTokenCache = {
    token: body.access_token,
    expiresAt: Date.now() + Number(body.expires_in || 3600) * 1000
  };
  return body.access_token;
}

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
      status: 'sending',
      attempts: 1,
      payload: { to, subject, text }
    }
  });
  try {
    if (env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, text })
      });
      if (!response.ok) throw new Error((await response.text()).slice(0, 1000));
    } else if (env.demoMode) {
      logger.info('email_demo', { to, subject });
    } else {
      throw new Error('Email provider is not configured');
    }
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: { status: 'sent', sentAt: new Date(), error: null }
    });
  } catch (error) {
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: { status: 'failed', error: String(error).slice(0, 1000) }
    });
    throw error;
  }
}

export async function sendSms(to: string, body: string) {
  const delivery = await prisma.notificationDelivery.create({
    data: {
      channel: 'sms',
      template: 'sms',
      status: 'sending',
      attempts: 1,
      payload: { to, body }
    }
  });
  try {
    if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM) {
      const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
      const params = new URLSearchParams({ To: to, From: env.TWILIO_FROM, Body: body });
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params
        }
      );
      if (!response.ok) throw new Error((await response.text()).slice(0, 1000));
    } else if (env.demoMode) {
      logger.info('sms_demo', { to });
    } else {
      throw new Error('SMS provider is not configured');
    }
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: { status: 'sent', sentAt: new Date(), error: null }
    });
  } catch (error) {
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: { status: 'failed', error: String(error).slice(0, 1000) }
    });
    throw error;
  }
}

async function sendFcmMessage(token: string, title: string, body: string) {
  const account = parseServiceAccount();
  if (account) {
    const accessToken = await getFcmAccessToken(account);
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            data: { title, body },
            android: { priority: 'high' },
            apns: { headers: { 'apns-priority': '10' }, payload: { aps: { sound: 'default' } } }
          }
        })
      }
    );
    if (!response.ok) throw new Error((await response.text()).slice(0, 1000));
    return;
  }
  if (env.FCM_SERVER_KEY) {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: { Authorization: `key=${env.FCM_SERVER_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: token, notification: { title, body }, data: { title, body } })
    });
    if (!response.ok) throw new Error((await response.text()).slice(0, 1000));
    return;
  }
  if (!env.demoMode) throw new Error('Push provider is not configured');
}

export async function sendPush(userId: string, title: string, body: string) {
  const [tokens, preferences] = await Promise.all([
    prisma.deviceToken.findMany({ where: { userId } }),
    prisma.notificationPreference.findUnique({ where: { userId } })
  ]);
  await prisma.notification.create({ data: { userId, title, message: body, type: 'info' } });
  const enabledTokens = preferences?.pushEnabled === false ? [] : tokens;
  const delivery = await prisma.notificationDelivery.create({
    data: {
      userId,
      channel: 'push',
      template: title,
      status: enabledTokens.length ? 'sending' : 'skipped',
      attempts: enabledTokens.length ? 1 : 0,
      payload: { title, body, tokens: enabledTokens.length }
    }
  });
  if (!enabledTokens.length) return;
  const results = await Promise.allSettled(
    enabledTokens.map((row) => sendFcmMessage(row.token, title, body))
  );
  const failures = results.filter((result) => result.status === 'rejected');
  if (failures.length) {
    const message = failures
      .map((result) => (result.status === 'rejected' ? String(result.reason) : ''))
      .join('; ')
      .slice(0, 1000);
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: { status: 'failed', error: message }
    });
    throw new Error(`Push failed for ${failures.length}/${enabledTokens.length} devices: ${message}`);
  }
  await prisma.notificationDelivery.update({
    where: { id: delivery.id },
    data: { status: 'sent', sentAt: new Date(), error: null }
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
  const preferences = await prisma.notificationPreference.findUnique({ where: { userId: input.userId } });
  if (preferences?.pushEnabled !== false) {
    await enqueue('notification.push', {
      userId: input.userId,
      title: input.title,
      message: input.message,
      template: input.template
    });
  } else {
    await prisma.notification.create({
      data: { userId: input.userId, title: input.title, message: input.message, type: 'info' }
    });
  }
  if (input.email && preferences?.emailEnabled !== false) {
    await enqueue('email.send', { to: input.email, subject: input.title, text: input.message });
  }
  if (input.phone && preferences?.smsEnabled === true) {
    await enqueue('sms.send', { to: input.phone, body: input.message });
  }
}
