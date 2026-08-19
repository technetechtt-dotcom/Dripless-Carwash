import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { prisma } from './db/prisma.js';
import { hashPassword } from './auth/password.js';
import { hashToken, issueSessionTokens, rotateRefreshToken } from './auth/tokens.js';

const app = createApp();

describe('MFA assurance, permissions, complaints, and POPIA controls', () => {
  let customerAccess = '';
  let customerId = '';
  let opsAccess = '';
  let opsUserId = '';

  beforeAll(async () => {
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const signup = await request(app).post('/auth/customer/signup').send({
      name: 'Privacy Tester',
      email: `privacy_${suffix}@test.dripless.local`,
      password: 'SecurePass123!'
    });
    customerAccess = signup.body.session.tokens.accessToken;
    customerId = signup.body.profile.id;

    const ops = await prisma.user.create({
      data: {
        email: `restricted_ops_${suffix}@test.dripless.local`,
        passwordHash: await hashPassword('SecureOpsPass123!'),
        role: 'ops_admin',
        emailVerifiedAt: new Date(),
        opsProfile: {
          create: {
            id: `ops_restricted_${suffix}`,
            name: 'Restricted Ops Tester',
            permissions: ['bookings:read', 'incidents:manage']
          }
        }
      }
    });
    opsUserId = ops.id;
    opsAccess = (await issueSessionTokens(ops.id, { authMethod: 'PASSWORD' })).accessToken;
  });

  it('binds MFA assurance to the exact refresh token', async () => {
    const passwordOnly = await issueSessionTokens(opsUserId, { authMethod: 'PASSWORD' });
    const verified = await issueSessionTokens(opsUserId, {
      authMethod: 'TOTP',
      mfaVerified: true
    });

    const passwordRotation = await rotateRefreshToken(passwordOnly.refreshToken);
    const verifiedRotation = await rotateRefreshToken(verified.refreshToken);
    expect(passwordRotation).toBeTruthy();
    expect(verifiedRotation).toBeTruthy();

    const passwordSession = await prisma.session.findUniqueOrThrow({
      where: { accessTokenHash: hashToken(passwordRotation!.tokens.accessToken) }
    });
    const verifiedSession = await prisma.session.findUniqueOrThrow({
      where: { accessTokenHash: hashToken(verifiedRotation!.tokens.accessToken) }
    });
    expect(passwordSession.mfaVerifiedAt).toBeNull();
    expect(verifiedSession.mfaVerifiedAt).not.toBeNull();
    expect(verifiedSession.authMethod).toBe('TOTP');
  });

  it('permits only one winner when a refresh token is rotated concurrently', async () => {
    const tokens = await issueSessionTokens(opsUserId, { authMethod: 'TOTP', mfaVerified: true });
    const results = await Promise.all([
      rotateRefreshToken(tokens.refreshToken),
      rotateRefreshToken(tokens.refreshToken)
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('denies an ops administrator without the required permission', async () => {
    const denied = await request(app)
      .get('/ops/driver-documents')
      .set('Authorization', `Bearer ${opsAccess}`);
    expect(denied.status).toBe(403);
    expect(denied.body.message).toContain('Missing permission');
  });

  it('persists and versions consent withdrawal and queues a data export', async () => {
    const granted = await request(app)
      .post('/privacy/consents')
      .set('Authorization', `Bearer ${customerAccess}`)
      .send({ purpose: 'MARKETING', granted: true, version: '2026-08' });
    const withdrawn = await request(app)
      .post('/privacy/consents')
      .set('Authorization', `Bearer ${customerAccess}`)
      .send({ purpose: 'MARKETING', granted: false, version: '2026-08' });
    expect(granted.status).toBe(201);
    expect(withdrawn.status).toBe(201);

    const consents = await request(app)
      .get('/privacy/consents')
      .set('Authorization', `Bearer ${customerAccess}`);
    expect(consents.body.filter((row: { purpose: string }) => row.purpose === 'MARKETING')).toHaveLength(2);

    const exportRequest = await request(app)
      .post('/privacy/requests')
      .set('Authorization', `Bearer ${customerAccess}`)
      .send({ kind: 'EXPORT' });
    expect(exportRequest.status).toBe(201);
    expect(await prisma.backgroundJob.count({
      where: {
        queue: 'privacy.request',
        payload: { path: ['requestId'], equals: exportRequest.body.id }
      }
    })).toBe(1);
  });

  it('creates, audits, resolves, and notifies on a customer complaint', async () => {
    const created = await request(app)
      .post('/complaints')
      .set('Authorization', `Bearer ${customerAccess}`)
      .send({ category: 'QUALITY', body: 'The exterior finish needs a quality review.' });
    expect(created.status).toBe(201);
    expect(created.body.customerId).toBe(customerId);

    const resolved = await request(app)
      .patch(`/complaints/${created.body.id}`)
      .set('Authorization', `Bearer ${opsAccess}`)
      .send({ status: 'RESOLVED', resolution: 'A complimentary rewash has been approved.' });
    expect(resolved.status).toBe(200);
    expect(resolved.body.status).toBe('RESOLVED');
    expect(await prisma.auditLog.count({
      where: { action: 'COMPLAINT_STATUS_UPDATED', targetId: created.body.id }
    })).toBe(1);
    const customerUserId = (await prisma.customerProfile.findUniqueOrThrow({
      where: { id: customerId }
    })).userId;
    expect(await prisma.backgroundJob.count({
      where: {
        queue: 'notification.push',
        payload: { path: ['userId'], equals: customerUserId }
      }
    })).toBeGreaterThan(0);
  });
});
