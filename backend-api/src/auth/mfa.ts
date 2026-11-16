import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes
} from 'node:crypto';
import { env } from '../config/env.js';

const ALGO = 'aes-256-gcm';

function encKey() {
  const material = env.MFA_ENC_KEY || env.DATABASE_URL.slice(0, 64);
  return createHash('sha256').update(material).digest();
}

export function generateTotpSecret(): string {
  return randomBytes(20).toString('hex');
}

/** Simple TOTP (SHA1, 30s) — 6 digit codes. */
export function verifyTotp(secretHex: string, token: string, window = 1): boolean {
  const secret = Buffer.from(secretHex, 'hex');
  const now = Math.floor(Date.now() / 1000);
  const step = 30;
  const code = String(token).replace(/\s+/g, '');
  for (let w = -window; w <= window; w += 1) {
    const counter = Math.floor(now / step) + w;
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(BigInt(counter));
    const digest = createHmac('sha1', secret).update(buf).digest();
    const offset = digest[digest.length - 1] & 0xf;
    const otp =
      ((digest[offset] & 0xff) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);
    const six = String((otp & 0x7fffffff) % 1_000_000).padStart(6, '0');
    if (six === code) return true;
  }
  return false;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, encKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}.${tag.toString('hex')}.${enc.toString('hex')}`;
}

export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split('.');
  const decipher = createDecipheriv(ALGO, encKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final()
  ]);
  return dec.toString('utf8');
}

export function hashBackupCode(code: string): string {
  return createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

export function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () =>
    randomBytes(4).toString('hex').toUpperCase()
  );
}

export function totpOtpauthUrl(email: string, secretHex: string) {
  const label = encodeURIComponent(`Dripless:${email}`);
  return `otpauth://totp/${label}?secret=${secretHex}&issuer=Dripless&algorithm=SHA1&digits=6&period=30`;
}
