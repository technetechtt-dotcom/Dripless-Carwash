/**
 * Release engineering — resilience checks not duplicated in golden-path.test.ts.
 * P0 wash/receipt/earnings/finance/refund coverage: cross-platform-golden-path + e2e/staged-wash.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { prisma } from './db/prisma.js';
import { hashPassword } from './auth/password.js';
import { issueSessionTokens } from './auth/tokens.js';

const app = createApp();

describe('release engineering resilience', () => {
  let driverToken = '';

  beforeAll(async () => {
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const driverUser = await prisma.user.create({
      data: {
        email: `release_drv_${suffix}@test.dripless.local`,
        passwordHash: await hashPassword('DriverPass123!'),
        role: 'driver',
        emailVerifiedAt: new Date(),
        driverProfile: {
          create: {
            id: `release_drv_${suffix}`,
            name: 'Release Driver',
            vehicle: 'Toyota Corolla',
            plateNumber: 'GP99REL',
            status: 'ACTIVE',
            verificationStatus: 'VERIFIED',
            online: true
          }
        }
      },
      include: { driverProfile: true }
    });
    driverToken = (await issueSessionTokens(driverUser.id, { authMethod: 'PASSWORD' })).accessToken;
    await prisma.driverLocation.upsert({
      where: { driverId: driverUser.driverProfile!.id },
      update: { lat: -26.1076, lng: 28.0567, updatedAt: new Date() },
      create: { driverId: driverUser.driverProfile!.id, lat: -26.1076, lng: 28.0567 }
    });
  }, 60_000);

  it('P1: stale driver GPS update is ignored', async () => {
    await request(app)
      .patch('/driver/location')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ lat: -26.11, lng: 28.06, accuracyM: 25, recordedAt: new Date().toISOString() });
    const stale = await request(app)
      .patch('/driver/location')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        lat: -26.12,
        lng: 28.07,
        accuracyM: 25,
        recordedAt: new Date(Date.now() - 3600_000).toISOString()
      });
    expect(stale.body.ignored).toBe(true);
  });

  it('P1: health exposes redis and dependency checks', async () => {
    const health = await request(app).get('/health');
    expect(health.status).toBeLessThan(500);
    expect(health.body.checks).toHaveProperty('redis');
    expect(health.body.checks).toHaveProperty('evidenceStorage');
  });

  it('P1: readiness includes database and job stats', async () => {
    const ready = await request(app).get('/ready');
    expect(ready.status).toBe(200);
    expect(ready.body.db).toBe('up');
  });
});
