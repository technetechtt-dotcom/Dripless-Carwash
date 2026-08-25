/**
 * Real private object-storage smoke test.
 * Skips unless EVIDENCE_STORAGE_PROVIDER=s3 and S3_* credentials are present.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { env } from '../config/env.js';
import {
  createEvidenceKey,
  deleteEvidenceObject,
  storePrivateBuffer,
  createSignedDownload
} from './storage.js';

const configured =
  env.EVIDENCE_STORAGE_PROVIDER === 's3' &&
  Boolean(env.S3_BUCKET && env.S3_ACCESS_KEY && env.S3_SECRET_KEY);

describe.skipIf(!configured)('private S3 evidence storage (live)', () => {
  const keys: string[] = [];

  afterAll(async () => {
    for (const key of keys) {
      await deleteEvidenceObject(key).catch(() => undefined);
    }
  });

  it('uploads, verifies object, and issues a signed download URL', async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x01, 0x02, 0x03]);
    const stored = await storePrivateBuffer({
      scopeId: `ci-evidence-${Date.now()}`,
      kind: 'BEFORE',
      buffer: jpeg,
      mimeType: 'image/jpeg'
    });
    keys.push(stored.key);
    expect(stored.key).toMatch(/^evidence\//);
    expect(stored.checksum).toMatch(/^[a-f0-9]{64}$/);

    const signed = await createSignedDownload(stored.key);
    expect(typeof signed).toBe('string');
    expect(signed).toMatch(/^https?:\/\//);

    // Key shape matches createEvidenceKey contract used by upload-url flow.
    expect(createEvidenceKey('booking_x', 'AFTER')).toMatch(/^evidence\/booking_x\/after-/);
  });
});
