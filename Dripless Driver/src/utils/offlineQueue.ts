/** Lightweight store-and-forward queues (localStorage) for GPS + wash evidence. */

const LOCATION_KEY = 'dripless_driver_offline_locations';
const EVIDENCE_KEY = 'dripless_driver_offline_evidence';
const MAX_LOCATION = 200;
const MAX_EVIDENCE = 40;

export type QueuedLocation = {
  id: string;
  driverId: string;
  lat: number;
  lng: number;
  speedKph?: number | null;
  heading?: number | null;
  accuracyM?: number | null;
  recordedAt: string;
  queuedAt: string;
};

export type QueuedEvidence = {
  id: string;
  bookingId: string;
  kind: 'BEFORE' | 'AFTER' | 'DAMAGE' | 'OTHER';
  dataUrl: string;
  note?: string;
  offlineQueued: true;
  queuedAt: string;
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function enqueueLocation(sample: Omit<QueuedLocation, 'id' | 'queuedAt'>): QueuedLocation {
  const row: QueuedLocation = {
    ...sample,
    id: `loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: new Date().toISOString()
  };
  const rows = readJson<QueuedLocation[]>(LOCATION_KEY, []);
  rows.push(row);
  while (rows.length > MAX_LOCATION) rows.shift();
  writeJson(LOCATION_KEY, rows);
  return row;
}

export function listQueuedLocations(): QueuedLocation[] {
  return readJson<QueuedLocation[]>(LOCATION_KEY, []);
}

export function removeQueuedLocations(ids: string[]) {
  if (!ids.length) return;
  const keep = new Set(ids);
  writeJson(
    LOCATION_KEY,
    listQueuedLocations().filter((row) => !keep.has(row.id))
  );
}

export async function flushLocationQueue(
  publish: (row: QueuedLocation) => Promise<void>
): Promise<{ sent: number; remaining: number }> {
  const rows = listQueuedLocations();
  const sentIds: string[] = [];
  for (const row of rows) {
    try {
      await publish(row);
      sentIds.push(row.id);
    } catch {
      break;
    }
  }
  removeQueuedLocations(sentIds);
  return { sent: sentIds.length, remaining: listQueuedLocations().length };
}

export function enqueueEvidence(item: Omit<QueuedEvidence, 'id' | 'queuedAt' | 'offlineQueued'>): QueuedEvidence {
  const row: QueuedEvidence = {
    ...item,
    id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    offlineQueued: true,
    queuedAt: new Date().toISOString()
  };
  const rows = readJson<QueuedEvidence[]>(EVIDENCE_KEY, []);
  rows.push(row);
  while (rows.length > MAX_EVIDENCE) rows.shift();
  writeJson(EVIDENCE_KEY, rows);
  return row;
}

export function listQueuedEvidence(): QueuedEvidence[] {
  return readJson<QueuedEvidence[]>(EVIDENCE_KEY, []);
}

export function removeQueuedEvidence(ids: string[]) {
  if (!ids.length) return;
  const keep = new Set(ids);
  writeJson(
    EVIDENCE_KEY,
    listQueuedEvidence().filter((row) => !keep.has(row.id))
  );
}

export async function flushEvidenceQueue(
  upload: (row: QueuedEvidence) => Promise<void>
): Promise<{ sent: number; remaining: number }> {
  const rows = listQueuedEvidence();
  const sentIds: string[] = [];
  for (const row of rows) {
    try {
      await upload(row);
      sentIds.push(row.id);
    } catch {
      break;
    }
  }
  removeQueuedEvidence(sentIds);
  return { sent: sentIds.length, remaining: listQueuedEvidence().length };
}
