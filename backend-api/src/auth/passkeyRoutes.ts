import { Router } from 'express';
import { z } from 'zod';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON
} from '@simplewebauthn/server';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { authRequired, roleRequired } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { getRedis } from '../lib/redis.js';
import { generateOpaqueToken, issueSessionTokens, revokeUserSessions } from './tokens.js';

export const passkeyRouter = Router();
const responseSchema = z.object({ challengeToken: z.string().min(20), response: z.unknown() });
const challengeKey = (kind: 'registration' | 'authentication', token: string) => `webauthn:${kind}:${token}`;

passkeyRouter.post('/registration/options', authRequired, roleRequired(['ops_admin']), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      include: { webAuthnCredentials: true, opsProfile: true }
    });
    if (!user?.opsProfile) throw new HttpError(404, 'Ops account not found');
    const options = await generateRegistrationOptions({
      rpName: 'Dripless Ops',
      rpID: env.WEBAUTHN_RP_ID,
      userName: user.email,
      userDisplayName: user.opsProfile.name,
      userID: Buffer.from(user.id, 'utf8'),
      attestationType: 'none',
      excludeCredentials: user.webAuthnCredentials.map((credential) => ({
        id: credential.credentialId,
        transports: credential.transports as AuthenticatorTransportFuture[]
      })),
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
      supportedAlgorithmIDs: [-7, -257]
    });
    const challengeToken = generateOpaqueToken(32);
    await (await getRedis()).set(
      challengeKey('registration', challengeToken),
      JSON.stringify({ userId: user.id, challenge: options.challenge }),
      'EX',
      300
    );
    res.setHeader('Cache-Control', 'no-store');
    res.json({ options, challengeToken });
  } catch (error) { next(error); }
});

passkeyRouter.post('/registration/verify', authRequired, roleRequired(['ops_admin']), validate(responseSchema), async (req, res, next) => {
  try {
    const redis = await getRedis();
    const key = challengeKey('registration', req.body.challengeToken);
    const raw = await redis.get(key);
    await redis.del(key);
    if (!raw) throw new HttpError(400, 'Passkey challenge expired or was already used');
    const challenge = JSON.parse(raw) as { userId: string; challenge: string };
    if (challenge.userId !== req.auth!.userId) throw new HttpError(403, 'Passkey challenge does not belong to this session');
    const result = await verifyRegistrationResponse({
      response: req.body.response as RegistrationResponseJSON,
      expectedChallenge: challenge.challenge,
      expectedOrigin: env.WEBAUTHN_ORIGIN,
      expectedRPID: env.WEBAUTHN_RP_ID,
      requireUserVerification: true
    });
    if (!result.verified || !result.registrationInfo) throw new HttpError(400, 'Passkey registration could not be verified');
    const credential = result.registrationInfo.credential;
    await prisma.$transaction([
      prisma.webAuthnCredential.create({
        data: {
          userId: req.auth!.userId,
          credentialId: credential.id,
          publicKey: Buffer.from(credential.publicKey).toString('base64'),
          counter: credential.counter,
          transports: credential.transports || []
        }
      }),
      prisma.auditLog.create({
        data: {
          actorId: req.auth!.userId,
          actorRole: 'ops_admin',
          action: 'PASSKEY_REGISTERED',
          targetId: credential.id,
          message: 'Ops administrator registered a phishing-resistant passkey'
        }
      })
    ]);
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      include: { opsProfile: true }
    });
    if (!user?.opsProfile) throw new HttpError(404, 'Ops account not found');
    await revokeUserSessions(user.id);
    const tokens = await issueSessionTokens(user.id, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      authMethod: 'PASSKEY',
      mfaVerified: true
    });
    res.status(201).json({
      verified: true,
      credentialId: credential.id,
      session: {
        tokens,
        payload: {
          userId: user.id,
          role: user.role,
          email: user.email,
          emailVerified: Boolean(user.emailVerifiedAt),
          mustChangePassword: user.mustChangePassword
        }
      },
      profile: { ...user.opsProfile, email: user.email }
    });
  } catch (error) { next(error); }
});

passkeyRouter.post('/authentication/options', authRateLimiter, async (_req, res, next) => {
  try {
    const options = await generateAuthenticationOptions({
      rpID: env.WEBAUTHN_RP_ID,
      allowCredentials: [],
      userVerification: 'required'
    });
    const challengeToken = generateOpaqueToken(32);
    await (await getRedis()).set(
      challengeKey('authentication', challengeToken),
      options.challenge,
      'EX',
      300
    );
    res.setHeader('Cache-Control', 'no-store');
    res.json({ options, challengeToken });
  } catch (error) { next(error); }
});

passkeyRouter.post('/authentication/verify', authRateLimiter, validate(responseSchema), async (req, res, next) => {
  try {
    const redis = await getRedis();
    const key = challengeKey('authentication', req.body.challengeToken);
    const expectedChallenge = await redis.get(key);
    await redis.del(key);
    if (!expectedChallenge) throw new HttpError(400, 'Passkey challenge expired or was already used');
    const response = req.body.response as AuthenticationResponseJSON;
    const stored = await prisma.webAuthnCredential.findUnique({
      where: { credentialId: response.id },
      include: { user: { include: { opsProfile: true } } }
    });
    if (!stored?.user.opsProfile || stored.user.role !== 'ops_admin') throw new HttpError(401, 'Passkey is not recognised');
    const result = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: env.WEBAUTHN_ORIGIN,
      expectedRPID: env.WEBAUTHN_RP_ID,
      requireUserVerification: true,
      credential: {
        id: stored.credentialId,
        publicKey: new Uint8Array(Buffer.from(stored.publicKey, 'base64')),
        counter: stored.counter,
        transports: stored.transports as AuthenticatorTransportFuture[]
      }
    });
    if (!result.verified) throw new HttpError(401, 'Passkey verification failed');
    await prisma.webAuthnCredential.update({
      where: { id: stored.id },
      data: { counter: result.authenticationInfo.newCounter }
    });
    const tokens = await issueSessionTokens(stored.userId, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      deviceLabel: `Passkey · ${req.get('user-agent')?.slice(0, 100) || 'device'}`,
      authMethod: 'PASSKEY',
      mfaVerified: true
    });
    res.json({
      session: {
        tokens,
        payload: {
          userId: stored.user.id,
          role: stored.user.role,
          email: stored.user.email,
          emailVerified: Boolean(stored.user.emailVerifiedAt),
          mustChangePassword: stored.user.mustChangePassword
        }
      },
      profile: { ...stored.user.opsProfile, email: stored.user.email }
    });
  } catch (error) { next(error); }
});

passkeyRouter.get('/', authRequired, roleRequired(['ops_admin']), async (req, res, next) => {
  try {
    const rows = await prisma.webAuthnCredential.findMany({ where: { userId: req.auth!.userId }, orderBy: { createdAt: 'desc' } });
    res.json(rows.map((row) => ({ id: row.id, credentialId: row.credentialId, transports: row.transports, createdAt: row.createdAt })));
  } catch (error) { next(error); }
});

passkeyRouter.delete('/:credentialId', authRequired, roleRequired(['ops_admin']), async (req, res, next) => {
  try {
    const removed = await prisma.webAuthnCredential.deleteMany({ where: { id: String(req.params.credentialId), userId: req.auth!.userId } });
    if (!removed.count) throw new HttpError(404, 'Passkey not found');
    res.status(204).send();
  } catch (error) { next(error); }
});
