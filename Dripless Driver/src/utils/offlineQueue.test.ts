import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  enqueueEvidence,
  enqueueLocation,
  flushEvidenceQueue,
  flushLocationQueue,
  listQueuedEvidence,
  listQueuedLocations,
  removeQueuedEvidence,
  removeQueuedLocations
} from './offlineQueue';

const memory = new Map<string, string>();

beforeEach(() => {
  memory.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
    clear: () => memory.clear()
  });
});

describe('offlineQueue', () => {
  it('queues and flushes GPS samples in order', async () => {
    enqueueLocation({
      driverId: 'drv_1',
      lat: -26.1,
      lng: 28.05,
      recordedAt: '2026-08-26T10:00:00.000Z'
    });
    enqueueLocation({
      driverId: 'drv_1',
      lat: -26.11,
      lng: 28.06,
      recordedAt: '2026-08-26T10:00:05.000Z'
    });
    expect(listQueuedLocations()).toHaveLength(2);

    const publish = vi.fn(async () => undefined);
    const result = await flushLocationQueue(publish);
    expect(result.sent).toBe(2);
    expect(result.remaining).toBe(0);
    expect(publish).toHaveBeenCalledTimes(2);
  });

  it('stops flush on first GPS failure so order is preserved', async () => {
    enqueueLocation({
      driverId: 'drv_1',
      lat: 1,
      lng: 1,
      recordedAt: '2026-08-26T10:00:00.000Z'
    });
    enqueueLocation({
      driverId: 'drv_1',
      lat: 2,
      lng: 2,
      recordedAt: '2026-08-26T10:00:05.000Z'
    });
    const publish = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined);
    const result = await flushLocationQueue(publish);
    expect(result.sent).toBe(0);
    expect(listQueuedLocations()).toHaveLength(2);
  });

  it('queues evidence and removes after successful upload', async () => {
    enqueueEvidence({
      bookingId: 'bk_1',
      kind: 'BEFORE',
      dataUrl: 'data:image/png;base64,aaa'
    });
    expect(listQueuedEvidence()).toHaveLength(1);
    const upload = vi.fn(async () => undefined);
    await flushEvidenceQueue(upload);
    expect(listQueuedEvidence()).toHaveLength(0);
    removeQueuedEvidence([]);
    removeQueuedLocations([]);
  });
});
