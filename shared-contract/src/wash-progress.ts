import type { BookingStatus, ServiceType } from './types';

export type WashChecklistItemKey =
  | 'exteriorDone'
  | 'interiorDone'
  | 'wheelsDone'
  | 'glassDone'
  | 'matsDone'
  | 'finalInspected';

export type WashChecklistSnapshot = {
  exteriorDone: boolean;
  interiorDone: boolean;
  wheelsDone: boolean;
  glassDone: boolean;
  matsDone: boolean;
  finalInspected: boolean;
  rewashRequested: boolean;
  damageAck: boolean;
  notes?: string | null;
  updatedAt?: string | null;
};

export type ProcessStageId =
  | 'confirmed'
  | 'en_route'
  | 'arrived'
  | 'started'
  | 'before_photos'
  | 'cleaning'
  | 'after_photos'
  | 'pin_verified'
  | 'completed';

export type ProcessStage = {
  id: ProcessStageId;
  label: string;
  description: string;
  done: boolean;
  current: boolean;
};

export type WashProgressSnapshot = {
  applies: boolean;
  serviceType: ServiceType | string;
  serviceSlug: string;
  serviceName: string;
  percentComplete: number;
  checklist: WashChecklistSnapshot | null;
  checklistDone: number;
  checklistTotal: number;
  beforePhotos: number;
  afterPhotos: number;
  pinIssued: boolean;
  pinVerified: boolean;
  stages: ProcessStage[];
  currentStageId: ProcessStageId;
  currentStageLabel: string;
};

const WASH_CHECKLIST_ITEMS: Array<{ key: WashChecklistItemKey; wash: string; home: string }> = [
  { key: 'exteriorDone', wash: 'Exterior cleaned', home: 'Area prepared' },
  { key: 'interiorDone', wash: 'Interior cleaned', home: 'Deep clean underway' },
  { key: 'wheelsDone', wash: 'Wheels detailed', home: 'Surfaces treated' },
  { key: 'glassDone', wash: 'Glass cleaned', home: 'Glass / windows done' },
  { key: 'matsDone', wash: 'Mats cleaned', home: 'Finishing touches' },
  { key: 'finalInspected', wash: 'Final inspection', home: 'Final inspection' }
];

export function isCleaningServiceType(serviceType: ServiceType | string): boolean {
  return serviceType === 'WASH' || serviceType === 'HOME_SERVICE';
}

export function checklistItemLabels(serviceType: ServiceType | string) {
  const home = serviceType === 'HOME_SERVICE';
  return WASH_CHECKLIST_ITEMS.map((item) => ({
    key: item.key,
    label: home ? item.home : item.wash
  }));
}

export function countChecklistDone(checklist: WashChecklistSnapshot | null | undefined) {
  if (!checklist) return 0;
  return WASH_CHECKLIST_ITEMS.reduce(
    (sum, item) => sum + (checklist[item.key] ? 1 : 0),
    0
  );
}

export function buildWashProgress(input: {
  status: BookingStatus | string;
  serviceType: ServiceType | string;
  serviceSlug: string;
  serviceName: string;
  checklist?: WashChecklistSnapshot | null;
  beforePhotos?: number;
  afterPhotos?: number;
  pinIssued?: boolean;
  pinVerified?: boolean;
}): WashProgressSnapshot {
  const applies = isCleaningServiceType(input.serviceType);
  const checklist = input.checklist ?? null;
  const checklistDone = countChecklistDone(checklist);
  const checklistTotal = WASH_CHECKLIST_ITEMS.length;
  const beforePhotos = input.beforePhotos ?? 0;
  const afterPhotos = input.afterPhotos ?? 0;
  const pinIssued = Boolean(input.pinIssued);
  const pinVerified = Boolean(input.pinVerified);
  const status = String(input.status).toUpperCase();

  if (!applies) {
    return {
      applies: false,
      serviceType: input.serviceType,
      serviceSlug: input.serviceSlug,
      serviceName: input.serviceName,
      percentComplete: status === 'COMPLETED' ? 100 : 0,
      checklist: null,
      checklistDone: 0,
      checklistTotal: 0,
      beforePhotos: 0,
      afterPhotos: 0,
      pinIssued: false,
      pinVerified: false,
      stages: [],
      currentStageId: 'confirmed',
      currentStageLabel: statusLabel(status)
    };
  }

  const started = ['IN_PROGRESS', 'COMPLETED'].includes(status);
  const confirmed = !['CANCELLED'].includes(status);
  const beforeDone = beforePhotos > 0;
  const cleaningDone = checklistDone >= checklistTotal;
  const afterDone = afterPhotos > 0;
  const completed = status === 'COMPLETED';

  const stageDefs: Array<{ id: ProcessStageId; label: string; description: string; done: boolean }> = [
    {
      id: 'confirmed',
      label: 'Confirmed',
      description: 'Booking accepted and waiting for the operator',
      done: confirmed && status !== 'PENDING'
    },
    {
      id: 'en_route',
      label: 'On the way',
      description: 'Operator is travelling to your location',
      done: ['ARRIVED', 'IN_PROGRESS', 'COMPLETED'].includes(status)
    },
    {
      id: 'arrived',
      label: 'Arrived',
      description: 'Operator has arrived at your location',
      done: ['IN_PROGRESS', 'COMPLETED'].includes(status)
    },
    {
      id: 'started',
      label: 'Work started',
      description: 'Cleaning has begun',
      done: started
    },
    {
      id: 'before_photos',
      label: 'Before photos',
      description: 'Condition photos captured before cleaning',
      done: beforeDone
    },
    {
      id: 'cleaning',
      label: 'Cleaning checklist',
      description: `${checklistDone}/${checklistTotal} tasks complete`,
      done: cleaningDone
    },
    {
      id: 'after_photos',
      label: 'After photos',
      description: 'Finished-condition photos captured',
      done: afterDone
    },
    {
      id: 'pin_verified',
      label: 'Completion PIN',
      description: pinVerified
        ? 'PIN verified'
        : pinIssued
          ? 'Waiting for operator to verify PIN'
          : 'Customer PIN unlocks completion',
      done: pinVerified
    },
    {
      id: 'completed',
      label: 'Completed',
      description: 'Service finished',
      done: completed
    }
  ];

  let currentIndex = stageDefs.findIndex((stage) => !stage.done);
  if (completed) currentIndex = stageDefs.length - 1;
  if (currentIndex < 0) currentIndex = stageDefs.length - 1;

  const stages: ProcessStage[] = stageDefs.map((stage, index) => ({
    ...stage,
    current: index === currentIndex && !completed ? true : completed && index === stageDefs.length - 1
  }));

  const weightedDone =
    Number(stageDefs[0].done) +
    Number(stageDefs[1].done) +
    Number(stageDefs[2].done) +
    Number(stageDefs[3].done) +
    Number(beforeDone) +
    checklistDone / checklistTotal +
    Number(afterDone) +
    Number(pinVerified) +
    Number(completed);
  const percentComplete = Math.min(100, Math.round((weightedDone / 9) * 100));

  return {
    applies: true,
    serviceType: input.serviceType,
    serviceSlug: input.serviceSlug,
    serviceName: input.serviceName,
    percentComplete: completed ? 100 : percentComplete,
    checklist,
    checklistDone,
    checklistTotal,
    beforePhotos,
    afterPhotos,
    pinIssued,
    pinVerified,
    stages,
    currentStageId: stages[currentIndex]?.id ?? 'confirmed',
    currentStageLabel: stages[currentIndex]?.label ?? statusLabel(status)
  };
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ').toLowerCase().replace(/^./, (value) => value.toUpperCase());
}
