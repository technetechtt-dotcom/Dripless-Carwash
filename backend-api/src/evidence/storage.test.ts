import { describe, expect, it } from 'vitest';
import { validateEvidenceBuffer, validateEvidenceMetadata } from './storage.js';

describe('private evidence validation', () => {
  it('accepts valid image magic bytes and returns a SHA-256 checksum', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43]);
    const result = validateEvidenceBuffer(jpeg, 'image/jpeg');
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects MIME spoofing, unsupported files, bad checksums, and oversized uploads', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(() => validateEvidenceBuffer(png, 'image/jpeg')).toThrow('does not match');
    expect(() => validateEvidenceMetadata({ mimeType: 'text/html', byteSize: 20 })).toThrow('Unsupported');
    expect(() => validateEvidenceMetadata({ mimeType: 'image/jpeg', byteSize: 20, checksum: 'bad' })).toThrow('SHA-256');
    expect(() => validateEvidenceMetadata({ mimeType: 'image/jpeg', byteSize: 100_000_000 })).toThrow('limit');
  });
});
