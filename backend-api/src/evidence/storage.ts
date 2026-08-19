import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/error.js';

export const ALLOWED_EVIDENCE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
]);

let s3Client: S3Client | null = null;

function getS3Client() {
  if (s3Client) return s3Client;
  if (!env.S3_BUCKET || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY) {
    throw new HttpError(503, 'Private object storage is not configured');
  }
  s3Client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT || undefined,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY
    }
  });
  return s3Client;
}

function parseDataUrl(dataUrl: string): { declaredMime: string; buffer: Buffer } {
  const match = /^data:([^;,]+);base64,([a-zA-Z0-9+/=\r\n]+)$/.exec(dataUrl);
  if (!match) throw new HttpError(400, 'Evidence must be a base64 data URL');
  return { declaredMime: match[1].toLowerCase(), buffer: Buffer.from(match[2], 'base64') };
}

function detectedMime(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return 'application/pdf';
  }
  return null;
}

export function validateEvidenceMetadata(input: {
  mimeType: string;
  byteSize: number;
  checksum?: string;
}) {
  const mimeType = input.mimeType.toLowerCase();
  if (!ALLOWED_EVIDENCE_MIME.has(mimeType)) {
    throw new HttpError(400, `Unsupported file type: ${mimeType}`);
  }
  if (!Number.isInteger(input.byteSize) || input.byteSize <= 0) {
    throw new HttpError(400, 'File size must be a positive integer');
  }
  if (input.byteSize > env.EVIDENCE_MAX_BYTES) {
    throw new HttpError(413, `File exceeds ${env.EVIDENCE_MAX_BYTES} byte limit`);
  }
  if (input.checksum && !/^[a-f0-9]{64}$/i.test(input.checksum)) {
    throw new HttpError(400, 'Checksum must be a SHA-256 hex digest');
  }
}

export function validateEvidenceBuffer(buffer: Buffer, declaredMime: string) {
  validateEvidenceMetadata({ mimeType: declaredMime, byteSize: buffer.length });
  const actual = detectedMime(buffer);
  if (!actual || actual !== declaredMime.toLowerCase()) {
    throw new HttpError(400, 'File content does not match the declared MIME type');
  }
  return {
    mimeType: actual,
    byteSize: buffer.length,
    checksum: createHash('sha256').update(buffer).digest('hex')
  };
}

async function normalizeEvidenceImage(buffer: Buffer, mimeType: string) {
  if (!mimeType.startsWith('image/')) return buffer;
  const pipeline = sharp(buffer, { failOn: 'warning' })
    .rotate()
    .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true });
  if (mimeType === 'image/jpeg') return pipeline.jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  if (mimeType === 'image/png') return pipeline.png({ compressionLevel: 9, palette: true }).toBuffer();
  return pipeline.webp({ quality: 84, effort: 5 }).toBuffer();
}

async function scanForMalware(buffer: Buffer, mimeType: string) {
  if (!env.MALWARE_SCAN_URL) {
    if (env.isProduction) throw new HttpError(503, 'Malware scanner is not configured');
    return;
  }
  let response: Response;
  try {
    response = await fetch(env.MALWARE_SCAN_URL, {
      method: 'POST',
      headers: { 'Content-Type': mimeType },
      body: new Uint8Array(buffer)
    });
  } catch {
    throw new HttpError(503, 'Malware scanner is unavailable');
  }
  const result = (await response.json().catch(() => ({}))) as { clean?: boolean; threat?: string };
  if (!response.ok || result.clean !== true) {
    throw new HttpError(400, result.threat ? `Unsafe upload: ${result.threat}` : 'Upload failed malware scan');
  }
}

export function createEvidenceKey(scopeId: string, kind: string) {
  const safeKind = kind.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  return `evidence/${scopeId}/${safeKind}-${randomBytes(16).toString('hex')}`;
}

function localPath(key: string) {
  return join(env.EVIDENCE_STORAGE_DIR, key.replace(/\//g, '_'));
}

export async function storeEvidenceObject(input: {
  bookingId: string;
  kind: string;
  dataUrl: string;
}): Promise<{ key: string; mimeType: string; byteSize: number; checksum: string; url: string }> {
  const parsed = parseDataUrl(input.dataUrl);
  const original = validateEvidenceBuffer(parsed.buffer, parsed.declaredMime);
  await scanForMalware(parsed.buffer, original.mimeType);
  const optimize = ['BEFORE', 'AFTER', 'DAMAGE'].includes(input.kind.toUpperCase());
  const buffer = optimize
    ? await normalizeEvidenceImage(parsed.buffer, original.mimeType)
    : parsed.buffer;
  const metadata = validateEvidenceBuffer(buffer, original.mimeType);
  const key = createEvidenceKey(input.bookingId, input.kind);

  if (env.EVIDENCE_STORAGE_PROVIDER === 's3') {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: metadata.mimeType,
        ContentLength: metadata.byteSize,
        Metadata: { 'sha256-hex': metadata.checksum },
        ServerSideEncryption: 'AES256'
      })
    );
    return { key, ...metadata, url: `private://${key}` };
  }

  if (env.isProduction) throw new HttpError(503, 'Local evidence storage is disabled in production');
  mkdirSync(env.EVIDENCE_STORAGE_DIR, { recursive: true });
  writeFileSync(localPath(key), buffer);
  return { key, ...metadata, url: `private://${key}` };
}

export async function storePrivateBuffer(input: {
  scopeId: string;
  kind: string;
  buffer: Buffer;
  mimeType: string;
}) {
  const metadata = input.mimeType === 'application/json'
    ? (() => {
        if (input.buffer.length <= 0 || input.buffer.length > env.EVIDENCE_MAX_BYTES) {
          throw new HttpError(413, 'Private artifact exceeds size limit');
        }
        try {
          JSON.parse(input.buffer.toString('utf8'));
        } catch {
          throw new HttpError(400, 'Invalid JSON artifact');
        }
        return {
          mimeType: 'application/json',
          byteSize: input.buffer.length,
          checksum: createHash('sha256').update(input.buffer).digest('hex')
        };
      })()
    : validateEvidenceBuffer(input.buffer, input.mimeType);
  await scanForMalware(input.buffer, metadata.mimeType);
  const key = createEvidenceKey(input.scopeId, input.kind);
  if (env.EVIDENCE_STORAGE_PROVIDER === 's3') {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: input.buffer,
        ContentType: metadata.mimeType,
        ContentLength: metadata.byteSize,
        Metadata: { 'sha256-hex': metadata.checksum },
        ServerSideEncryption: 'AES256'
      })
    );
  } else {
    if (env.isProduction) throw new HttpError(503, 'Local private storage is disabled in production');
    mkdirSync(env.EVIDENCE_STORAGE_DIR, { recursive: true });
    writeFileSync(localPath(key), input.buffer);
  }
  return { key, ...metadata };
}

export async function createSignedUpload(input: {
  key: string;
  mimeType: string;
  byteSize: number;
  checksum: string;
}) {
  validateEvidenceMetadata(input);
  if (env.EVIDENCE_STORAGE_PROVIDER !== 's3') {
    throw new HttpError(503, 'Signed uploads require S3-compatible storage');
  }
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: input.key,
    ContentType: input.mimeType,
    ContentLength: input.byteSize,
    Metadata: { 'sha256-hex': input.checksum },
    ServerSideEncryption: 'AES256'
  });
  return getSignedUrl(getS3Client(), command, { expiresIn: 10 * 60 });
}

export async function verifySignedUpload(input: {
  key: string;
  mimeType: string;
  byteSize: number;
  checksum: string;
}) {
  if (env.EVIDENCE_STORAGE_PROVIDER !== 's3') {
    throw new HttpError(503, 'Signed uploads require S3-compatible storage');
  }
  const head = await getS3Client().send(
    new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: input.key })
  );
  const actualChecksum = head.Metadata?.['sha256-hex'];
  if (
    head.ContentLength !== input.byteSize ||
    head.ContentType?.toLowerCase() !== input.mimeType.toLowerCase() ||
    actualChecksum?.toLowerCase() !== input.checksum.toLowerCase()
  ) {
    await deleteEvidenceObject(input.key).catch(() => undefined);
    throw new HttpError(400, 'Uploaded object metadata does not match the signed request');
  }
  const object = await getS3Client().send(
    new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: input.key })
  );
  if (!object.Body) throw new HttpError(400, 'Uploaded object is empty');
  const buffer = Buffer.from(await object.Body.transformToByteArray());
  const detected = validateEvidenceBuffer(buffer, input.mimeType);
  if (detected.checksum.toLowerCase() !== input.checksum.toLowerCase()) {
    await deleteEvidenceObject(input.key).catch(() => undefined);
    throw new HttpError(400, 'Uploaded object checksum mismatch');
  }
  await scanForMalware(buffer, input.mimeType);
  const normalized = await normalizeEvidenceImage(buffer, input.mimeType);
  const metadata = validateEvidenceBuffer(normalized, input.mimeType);
  if (metadata.checksum !== detected.checksum) {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: input.key,
        Body: normalized,
        ContentType: metadata.mimeType,
        ContentLength: metadata.byteSize,
        Metadata: { 'sha256-hex': metadata.checksum },
        ServerSideEncryption: 'AES256'
      })
    );
  }
  return metadata;
}

export async function createSignedDownload(key: string) {
  if (env.EVIDENCE_STORAGE_PROVIDER !== 's3') return null;
  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
    { expiresIn: 5 * 60 }
  );
}

export async function deleteEvidenceObject(key: string) {
  if (env.EVIDENCE_STORAGE_PROVIDER === 's3') {
    await getS3Client().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
    return;
  }
  const path = localPath(key);
  if (existsSync(path)) unlinkSync(path);
}

export function readLocalObject(key: string): Buffer | null {
  if (env.EVIDENCE_STORAGE_PROVIDER !== 'local') return null;
  const full = localPath(key);
  if (!existsSync(full)) return null;
  return readFileSync(full);
}
