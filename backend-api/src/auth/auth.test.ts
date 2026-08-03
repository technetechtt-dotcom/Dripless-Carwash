import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../db/prisma.js';
import { hashPassword } from './password.js';

const app = createApp();

describe('auth security', () => {
  const customerEmail = `cust_${Date.now()}@test.dripless.local`;
  const password = 'SecurePass123!';

  beforeAll(async () => {
    // ensure catalogue exists for booking tests later
    await prisma.service.upsert({
      where: { slug: 'car-wash' },
      update: {},
      create: {
        slug: 'car-wash',
        name: 'Car Wash',
        options: {
          create: [
            {
              slug: 'basic',
              name: 'Basic Wash',
              basePrice: 15.99,
              ecoPointsAward: 160
            }
          ]
        }
      }
    });
  });

  it('signs up and logs in with password verification', async () => {
    const signup = await request(app).post('/auth/customer/signup').send({
      name: 'Test Customer',
      email: customerEmail,
      password
    });
    expect(signup.status).toBe(201);
    expect(signup.body.session.tokens.accessToken).toBeTruthy();

    const login = await request(app).post('/auth/customer/login').send({
      email: customerEmail,
      password
    });
    expect(login.status).toBe(200);
    expect(login.body.session.tokens.refreshToken).toBeTruthy();
  });

  it('rejects incorrect password and does not auto-create on login', async () => {
    const unknown = await request(app).post('/auth/customer/login').send({
      email: `missing_${Date.now()}@test.dripless.local`,
      password: 'Whatever123!'
    });
    expect(unknown.status).toBe(401);

    const bad = await request(app).post('/auth/customer/login').send({
      email: customerEmail,
      password: 'WrongPassword!'
    });
    expect(bad.status).toBe(401);
  });

  it('rotates refresh tokens and rejects revoked refresh', async () => {
    const login = await request(app).post('/auth/customer/login').send({
      email: customerEmail,
      password
    });
    const refreshToken = login.body.session.tokens.refreshToken as string;

    const rotated = await request(app).post('/auth/refresh').send({ refreshToken });
    expect(rotated.status).toBe(200);
    expect(rotated.body.session.tokens.refreshToken).not.toBe(refreshToken);

    const reuse = await request(app).post('/auth/refresh').send({ refreshToken });
    expect(reuse.status).toBe(401);
  });

  it('rejects disallowed CORS origins', async () => {
    const denied = await request(app)
      .get('/health')
      .set('Origin', 'https://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();

    const allowed = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173'
    );
  });

  it('rejects ops login for unknown admin and wrong password', async () => {
    const email = `ops_${Date.now()}@test.dripless.local`;
    await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword('AdminPass123456'),
        role: 'ops_admin',
        emailVerifiedAt: new Date(),
        opsProfile: {
          create: {
            id: `ops_test_${Date.now().toString(36)}`,
            name: 'Ops Tester',
            permissions: ['bookings:read']
          }
        }
      }
    });

    const missing = await request(app).post('/auth/ops-admin/login').send({
      email: 'no-such-admin@test.dripless.local',
      password: 'AdminPass123456'
    });
    expect(missing.status).toBe(401);

    const wrong = await request(app).post('/auth/ops-admin/login').send({
      email,
      password: 'DefinitelyWrong1'
    });
    expect(wrong.status).toBe(401);
  });
});
