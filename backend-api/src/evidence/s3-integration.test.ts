/**
 * Real private object-storage smoke test.
 * Runs when EVIDENCE_STORAGE_PROVIDER=s3 and S3_* credentials are present
 * (CI uses ephemeral MinIO; staging/prod use real private buckets).
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
    // Minimal valid JPEG (1×1) so magic-byte validation accepts the payload.
    const jpeg = Buffer.from(
      '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGcP//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z',
      'base64'
    );
    const stored = await storePrivateBuffer({
      scopeId: `ci-evidence-${Date.now()}`,
      kind: 'BEFORE',
      buffer: jpeg,
      mimeType: 'image/jpeg'
    });
    keys.push(stored.key);
    expect(stored.key).toMatch(/^evidence\//);
    expect(stored.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.byteSize).toBeGreaterThan(0);

    const signed = await createSignedDownload(stored.key);
    expect(typeof signed).toBe('string');
    expect(signed).toMatch(/^https?:\/\//);

    expect(createEvidenceKey('booking_x', 'AFTER')).toMatch(/^evidence\/booking_x\/after-/);
  });
});
