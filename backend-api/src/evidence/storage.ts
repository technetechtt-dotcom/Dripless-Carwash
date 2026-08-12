import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/error.js';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']);
const MAX_BYTES = 8 * 1024 * 1024;

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (match) {
    return { mime: match[1], buffer: Buffer.from(match[2], 'base64') };
  }
  return { mime: 'text/plain', buffer: Buffer.from(dataUrl, 'utf8') };
}

export async function storeEvidenceObject(input: {
  bookingId: string;
  kind: string;
  dataUrl: string;
}): Promise<{ key: string; mimeType: string; byteSize: number; checksum: string; url: string }> {
  const parsed = parseDataUrl(input.dataUrl);
  if (!ALLOWED_MIME.has(parsed.mime)) {
    throw new HttpError(400, `Unsupported file type: ${parsed.mime}`);
  }
  if (parsed.buffer.length > MAX_BYTES) {
    throw new HttpError(400, 'File exceeds 8MB limit');
  }
  const checksum = createHash('sha256').update(parsed.buffer).digest('hex');
  const key = `evidence/${input.bookingId}/${input.kind}-${randomBytes(6).toString('hex')}`;

  if (env.S3_BUCKET && env.S3_ACCESS_KEY && env.S3_SECRET_KEY) {
    const url = await putS3(key, parsed.buffer, parsed.mime);
    return { key, mimeType: parsed.mime, byteSize: parsed.buffer.length, checksum, url };
  }

  mkdirSync(env.EVIDENCE_STORAGE_DIR, { recursive: true });
  const filename = key.replace(/\//g, '_');
  const full = join(env.EVIDENCE_STORAGE_DIR, filename);
  writeFileSync(full, parsed.buffer);
  return {
    key,
    mimeType: parsed.mime,
    byteSize: parsed.buffer.length,
    checksum,
    url: full
  };
}

async function putS3(key: string, body: Buffer, mime: string): Promise<string> {
  const endpoint = env.S3_ENDPOINT || `https://${env.S3_BUCKET}.s3.amazonaws.com`;
  const url = `${endpoint.replace(/\/$/, '')}/${key}`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': mime,
      Authorization: `AWS ${env.S3_ACCESS_KEY}:${env.S3_SECRET_KEY}`,
      'x-amz-date': amzDate,
      'x-amz-acl': 'private'
    },
    body: new Uint8Array(body)
  });
  if (!response.ok) {
    throw new HttpError(502, 'Object storage upload failed');
  }
  return url;
}

export function signedDownloadPath(key: string): string {
  if (env.S3_BUCKET) {
    return `/files/signed?key=${encodeURIComponent(key)}`;
  }
  return join(env.EVIDENCE_STORAGE_DIR, key.replace(/\//g, '_'));
}

export function readLocalObject(key: string): Buffer | null {
  const full = join(env.EVIDENCE_STORAGE_DIR, key.replace(/\//g, '_'));
  if (!existsSync(full)) return null;
  return readFileSync(full);
}
