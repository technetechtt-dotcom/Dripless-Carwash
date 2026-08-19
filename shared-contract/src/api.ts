import {
  clearSession,
  getActiveSession,
  getCustomerProfile,
  getDriverProfile,
  getOpsAdminProfile,
  isAccessTokenFresh,
  saveCustomerProfile,
  saveDriverProfile,
  saveOpsAdminProfile,
  saveSession
} from './session';
import type {
  AccountStatus,
  AdminAudit,
  AppRole,
  AuthSession,
  BookingContract,
  BookingTrackingSnapshot,
  BookingStatus,
  CustomerProfile,
  DispatchIncident,
  DispatchIncidentStatus,
  DriverVerificationStatus,
  DriverProfile,
  NotificationContract,
  NotificationType,
  OpsSpecial,
  SpecialAudience,
  SpecialDiscountType,
  SpecialServiceScope,
  OpsActivityItem,
  OpsAnalytics,
  OpsAdminProfile,
  OpsDashboardSummary,
  DriverAssignmentRecommendation,
  ServiceType
} from './types';
import {
  estimateDistanceKm,
  estimateEtaMinutes,
  interpolateGeoPoint,
  textToGeoPoint
} from './maps';

interface BackendState {
  customerProfiles: CustomerProfile[];
  driverProfiles: DriverProfile[];
  opsAdminProfiles: OpsAdminProfile[];
  bookings: BookingContract[];
  notifications: NotificationContract[];
  activity: OpsActivityItem[];
  incidents: DispatchIncident[];
  specials: OpsSpecial[];
}

const STATE_KEY = 'dripless_mock_backend_state_v1';
const SESSION_TTL_MS = 1000 * 60 * 15;
const REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const API_BASE_URL_STORAGE_KEY = 'dripless_api_base_url';
const MAX_AUTO_DISPATCH_ATTEMPTS = 3;
const DEFAULT_OPS_PERMISSIONS = [
  'customers:read',
  'customers:update',
  'drivers:read',
  'drivers:update',
  'drivers:verify',
  'bookings:read',
  'bookings:update',
  'bookings:assign',
  'activity:read',
  'incidents:read',
  'incidents:manage',
  'notifications:broadcast',
  'specials:manage'
];

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

const createId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const nowIso = () => new Date().toISOString();

const readViteEnv = (key: string): string | undefined => {
  try {
    const meta = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
    return meta.env?.[key];
  } catch {
    return undefined;
  }
};

const useMockApi = (): boolean => readViteEnv('VITE_USE_MOCK_API') === 'true';

const getApiBaseUrl = (): string => {
  const fromEnv = readViteEnv('VITE_API_BASE_URL');
  const fromWindow =
    typeof window !== 'undefined' ?
    (window as unknown as { __DRIPLESS_API_BASE_URL__?: string }).
      __DRIPLESS_API_BASE_URL__ :
    undefined;
  const fromStorage =
    typeof localStorage !== 'undefined' ?
    localStorage.getItem(API_BASE_URL_STORAGE_KEY) || undefined :
    undefined;
  const url = fromWindow || fromStorage || fromEnv || '';
  return url.replace(/\/+$/, '');
};

const hasRemoteApi = () => !useMockApi() && Boolean(getApiBaseUrl());

const requireRemoteOrMock = () => {
  if (useMockApi()) return;
  if (!getApiBaseUrl()) {
    throw new Error(
      'Remote API is required. Set VITE_API_BASE_URL, or VITE_USE_MOCK_API=true for UI-only demos.'
    );
  }
};

const readRemoteError = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { message?: string; error?: string };
    return body.message || body.error || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

let refreshInFlight: Promise<boolean> | null = null;

const rotateRefreshSession = async (): Promise<boolean> => {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const session = getActiveSession();
    if (!session?.tokens.refreshToken) return false;
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) return false;
    try {
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: session.tokens.refreshToken })
      });
      if (!response.ok) {
        clearSession();
        return false;
      }
      const body = (await response.json()) as { session: AuthSession };
      saveSession(body.session);
      return true;
    } catch {
      clearSession();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
};

const requestApi = async <T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    token?: string;
    retryOnAuth?: boolean;
  } = {}
): Promise<T> => {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error('Remote API base URL is not configured');
  }

  const headers: Record<string, string> = {
    Accept: 'application/json'
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });

  if (
    response.status === 401 &&
    options.retryOnAuth !== false &&
    path !== '/auth/refresh' &&
    !path.startsWith('/auth/')
  ) {
    const rotated = await rotateRefreshSession();
    if (rotated) {
      const nextToken = getActiveSession()?.tokens.accessToken;
      return requestApi<T>(path, {
        ...options,
        token: nextToken ?? options.token,
        retryOnAuth: false
      });
    }
  }

  if (!response.ok) {
    throw new Error(await readRemoteError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

const getBearerToken = (): string | undefined => {
  const session = getActiveSession();
  if (!session) return undefined;
  if (!isAccessTokenFresh()) {
    // Fire-and-forget rotation; callers that hit 401 will retry via requestApi
    void rotateRefreshSession();
  }
  return getActiveSession()?.tokens.accessToken ?? session.tokens.accessToken;
};

const downloadApiFile = async (path: string, filename: string, retried = false) => {
  const baseUrl = getApiBaseUrl();
  const token = getBearerToken();
  if (!baseUrl || !token) throw new Error('An authenticated remote API session is required');
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (response.status === 401 && !retried && (await rotateRefreshSession())) {
    return downloadApiFile(path, filename, true);
  }
  if (!response.ok) throw new Error(await readRemoteError(response));
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

export const apiRuntimeConfig = {
  getApiBaseUrl,
  setApiBaseUrl: (url: string) => {
    const normalized = url.replace(/\/+$/, '');
    localStorage.setItem(API_BASE_URL_STORAGE_KEY, normalized);
  },
  clearApiBaseUrl: () => {
    localStorage.removeItem(API_BASE_URL_STORAGE_KEY);
  },
  isRemoteEnabled: hasRemoteApi,
  isMockEnabled: useMockApi
};

const defaultState = (): BackendState => ({
  customerProfiles: [],
  driverProfiles: [],
  opsAdminProfiles: [],
  bookings: [],
  notifications: [],
  activity: [],
  incidents: [],
  specials: []
});

const ensureDefaultOpsAdmin = (state: BackendState): BackendState => {
  if (state.opsAdminProfiles.length > 0) {
    state.opsAdminProfiles = state.opsAdminProfiles.map((profile) => ({
      ...profile,
      permissions: Array.from(
        new Set([...(profile.permissions ?? []), ...DEFAULT_OPS_PERMISSIONS])
      )
    }));
    return state;
  }

  // Mock-only demo admin — never a production seed email.
  const admin: OpsAdminProfile = {
    id: 'ops_admin_demo_001',
    name: 'Operations Admin',
    email: 'ops@demo.dripless.local',
    permissions: DEFAULT_OPS_PERMISSIONS
  };

  state.opsAdminProfiles.push(admin);
  return state;
};

const loadState = (): BackendState => {
  const raw = localStorage.getItem(STATE_KEY);
  if (!raw) {
    const seeded = ensureDefaultOpsAdmin(defaultState());
    saveState(seeded);
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<BackendState>;
    const state: BackendState = {
      customerProfiles: parsed.customerProfiles ?? [],
      driverProfiles: parsed.driverProfiles ?? [],
      opsAdminProfiles: parsed.opsAdminProfiles ?? [],
      bookings: parsed.bookings ?? [],
      notifications: parsed.notifications ?? [],
      activity: parsed.activity ?? [],
      incidents: parsed.incidents ?? [],
      specials: parsed.specials ?? []
    };
    state.customerProfiles = state.customerProfiles.map((profile) => ({
      ...profile,
      status: profile.status ?? 'ACTIVE',
      createdAt: profile.createdAt ?? nowIso(),
      updatedAt: profile.updatedAt ?? nowIso()
    }));
    state.driverProfiles = state.driverProfiles.map((profile) => ({
      ...profile,
      status: profile.status ?? 'ACTIVE',
      verificationStatus: profile.verificationStatus ?? 'PENDING',
      activeBookingId: profile.activeBookingId ?? null,
      lastKnownLocation: profile.lastKnownLocation ?? null,
      createdAt: profile.createdAt ?? nowIso(),
      updatedAt: profile.updatedAt ?? nowIso()
    }));
    state.bookings = state.bookings.map((booking) => ({
      ...booking,
      pickupCoordinates:
        booking.pickupCoordinates ??
        (booking.pickupLocation ? textToGeoPoint(booking.pickupLocation, 101) : null),
      destinationCoordinates:
        booking.destinationCoordinates ??
        (booking.destinationLocation ?
          textToGeoPoint(booking.destinationLocation, 103) :
          null),
      pooledWithBookingId: booking.pooledWithBookingId ?? null,
      dispatchAttemptCount: booking.dispatchAttemptCount ?? 0
    }));
    state.incidents = state.incidents.map((incident) => ({
      ...incident,
      status: incident.status ?? 'OPEN',
      ownerAdminId: incident.ownerAdminId ?? null,
      ownerAdminName: incident.ownerAdminName ?? null,
      acknowledgedAt: incident.acknowledgedAt ?? null,
      snoozeUntil: incident.snoozeUntil ?? null,
      resolvedAt: incident.resolvedAt ?? null,
      lastEscalatedAt: incident.lastEscalatedAt ?? null,
      createdAt: incident.createdAt ?? nowIso(),
      updatedAt: incident.updatedAt ?? nowIso()
    }));
    state.specials = state.specials.map((special) => ({
      ...special,
      approved: special.approved ?? false,
      approvedByAdminId: special.approvedByAdminId ?? null,
      approvedAt: special.approvedAt ?? null,
      isActive: special.isActive ?? false,
      redemptionCount: special.redemptionCount ?? 0,
      lastRedeemedAt: special.lastRedeemedAt ?? null,
      createdAt: special.createdAt ?? nowIso(),
      updatedAt: special.updatedAt ?? nowIso()
    }));
    return ensureDefaultOpsAdmin(state);
  } catch {
    localStorage.removeItem(STATE_KEY);
    const seeded = ensureDefaultOpsAdmin(defaultState());
    saveState(seeded);
    return seeded;
  }
};

const saveState = (state: BackendState) => {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
};

const randomToken = (bytes = 32): string => {
  const arr = new Uint8Array(bytes);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i += 1) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
};

const createSession = (
  userId: string,
  role: AppRole,
  email: string
): AuthSession => ({
  tokens: {
    accessToken: randomToken(32),
    refreshToken: randomToken(32),
    expiresAt: Date.now() + SESSION_TTL_MS,
    refreshExpiresAt: Date.now() + REFRESH_TTL_MS
  },
  payload: {
    userId,
    role,
    email,
    emailVerified: true,
    mustChangePassword: false
  }
});

const notifyRoleUser = (
  role: AppRole,
  userId: string,
  title: string,
  message: string,
  type: NotificationType = 'info'
) => {
  const state = loadState();
  const notification: NotificationContract = {
    id: createId('notif'),
    role,
    userId,
    title,
    message,
    type,
    read: false,
    createdAt: nowIso()
  };
  state.notifications.unshift(notification);
  saveState(state);
};

const logActivity = (
  state: BackendState,
  item: Omit<OpsActivityItem, 'id' | 'createdAt'>
) => {
  state.activity.unshift({
    ...item,
    id: createId('activity'),
    createdAt: nowIso()
  });
};

const inferServiceType = (serviceName: string): ServiceType => {
  const normalized = serviceName.toLowerCase();
  if (normalized.includes('ride') || normalized.includes('taxi')) return 'RIDE';
  if (normalized.includes('parcel') || normalized.includes('delivery')) return 'PARCEL';
  if (normalized.includes('wash')) return 'WASH';
  return 'HOME_SERVICE';
};

const toTimestamp = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const isIncidentActive = (status: DispatchIncidentStatus) =>
  status === 'OPEN' || status === 'ACKNOWLEDGED' || status === 'SNOOZED';

const isSpecialApprovedAndActive = (special: OpsSpecial, role: AppRole) => {
  if (!special.approved || !special.isActive) return false;
  if (special.audience !== 'all' && special.audience !== role) return false;
  const now = Date.now();
  const startsAt = toTimestamp(special.startsAt);
  const endsAt = toTimestamp(special.endsAt);
  if (startsAt > 0 && now < startsAt) return false;
  if (endsAt > 0 && now > endsAt) return false;
  return true;
};

const isDriverBookable = (driver: DriverProfile) =>
  driver.status !== 'SUSPENDED' && driver.verificationStatus === 'VERIFIED';

const countActiveDriverJobs = (state: BackendState, driverId: string) =>
  state.bookings.filter(
    (booking) =>
      booking.driverId === driverId &&
      ['PENDING', 'CONFIRMED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(
        booking.status
      )
  ).length;

const estimateMinutesBetween = (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
) => estimateEtaMinutes(estimateDistanceKm(from, to));

const headingVector = (
  from?: { lat: number; lng: number } | null,
  to?: { lat: number; lng: number } | null
) => {
  if (!from || !to) return null;
  return {
    x: to.lng - from.lng,
    y: to.lat - from.lat
  };
};

const cosineSimilarity = (
  first: { x: number; y: number } | null,
  second: { x: number; y: number } | null
) => {
  if (!first || !second) return -1;
  const firstNorm = Math.hypot(first.x, first.y);
  const secondNorm = Math.hypot(second.x, second.y);
  if (firstNorm === 0 || secondNorm === 0) return -1;
  return (first.x * second.x + first.y * second.y) / (firstNorm * secondNorm);
};

const createOrRefreshAutoDispatchIncident = (
  state: BackendState,
  booking: BookingContract,
  reason: string
) => {
  const existing = state.incidents.find(
    (incident) => incident.bookingId === booking.id && isIncidentActive(incident.status)
  );
  if (existing) {
    existing.reason = reason;
    existing.severity = 'high';
    existing.updatedAt = nowIso();
    return existing;
  }
  const incident: DispatchIncident = {
    id: createId('incident'),
    bookingId: booking.id,
    status: 'OPEN',
    severity: 'high',
    reason,
    ownerAdminId: null,
    ownerAdminName: null,
    acknowledgedAt: null,
    snoozeUntil: null,
    resolvedAt: null,
    lastEscalatedAt: null,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  state.incidents.unshift(incident);
  logActivity(state, {
    type: 'INCIDENT_CREATED',
    actorId: 'system',
    actorRole: 'ops_admin',
    targetId: booking.id,
    message: `Auto-dispatch escalation incident created for booking ${booking.id}.`
  });
  return incident;
};

const selectDriverForBooking = (
  state: BackendState,
  booking: BookingContract,
  options?: {
    excludedDriverIds?: string[];
  }
): {
  driverId: string;
  pooledWithBookingId?: string;
  dispatchReason: string;
} | null => {
  const excluded = new Set(options?.excludedDriverIds ?? []);
  const pickup =
    booking.pickupCoordinates ?? textToGeoPoint(booking.pickupLocation, 101);
  const destination =
    booking.destinationCoordinates ??
    (booking.destinationLocation ?
      textToGeoPoint(booking.destinationLocation, 103) :
      null);

  if (booking.serviceType === 'PARCEL' && destination) {
    const candidate = state.bookings
      .filter(
        (item) =>
          item.id !== booking.id &&
          item.serviceType === 'PARCEL' &&
          item.driverId &&
          ['PENDING', 'CONFIRMED', 'EN_ROUTE'].includes(item.status) &&
          item.pickupCoordinates &&
          item.destinationCoordinates
      )
      .find((item) => {
        const driver = state.driverProfiles.find((profile) => profile.id === item.driverId);
        if (!driver || !isDriverBookable(driver)) return false;
        if (item.driverId && excluded.has(item.driverId)) return false;
        const existingVector = headingVector(
          item.pickupCoordinates ?? null,
          item.destinationCoordinates ?? null
        );
        const incomingVector = headingVector(pickup, destination);
        const similarDirection = cosineSimilarity(existingVector, incomingVector) >= 0.8;
        if (!similarDirection) return false;
        const handoffEta = estimateMinutesBetween(
          item.destinationCoordinates as { lat: number; lng: number },
          destination
        );
        return handoffEta <= 10;
      });

    if (candidate?.driverId) {
      return {
        driverId: candidate.driverId,
        pooledWithBookingId: candidate.id,
        dispatchReason: 'Auto-dispatch parcel pooling (<=10 min impact)'
      };
    }
  }

  const ranked = state.driverProfiles
    .filter((driver) => isDriverBookable(driver) && !excluded.has(driver.id))
    .map((driver) => {
      const activeJobs = countActiveDriverJobs(state, driver.id);
      if (activeJobs > 0 && booking.serviceType !== 'PARCEL') {
        return null;
      }
      const origin =
        driver.lastKnownLocation ?
        { lat: driver.lastKnownLocation.lat, lng: driver.lastKnownLocation.lng } :
        textToGeoPoint(driver.id, 701);
      const distance = estimateDistanceKm(origin, pickup);
      const eta = estimateEtaMinutes(distance);
      const score = eta + activeJobs * 8 - driver.rating * 0.75;
      return {
        driverId: driver.id,
        eta,
        score
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => a.score - b.score);

  if (!ranked[0]) return null;
  return {
    driverId: ranked[0].driverId,
    dispatchReason: `Auto-dispatch best available driver (${ranked[0].eta} min away)`
  };
};

export const authApi = {
  async loginCustomer(email: string, password: string): Promise<CustomerProfile> {
    requireRemoteOrMock();
    if (hasRemoteApi()) {
      const remote = await requestApi<{
        session: AuthSession;
        profile: CustomerProfile;
      }>('/auth/customer/login', {
        method: 'POST',
        body: { email, password },
        retryOnAuth: false
      });
      saveSession(remote.session);
      saveCustomerProfile(remote.profile);
      return remote.profile;
    }

    await delay();
    if (password.length < 6) {
      throw new Error('Invalid credentials');
    }

    const state = loadState();
    const existing = state.customerProfiles.find((profile) => profile.email === email);
    if (!existing) {
      throw new Error('Invalid credentials');
    }

    const session = createSession(existing.id, 'customer', existing.email);
    saveSession(session);
    saveCustomerProfile(existing);
    return existing;
  },

  async signupCustomer(
    name: string,
    email: string,
    password: string
  ): Promise<CustomerProfile> {
    requireRemoteOrMock();
    if (hasRemoteApi()) {
      const remote = await requestApi<{
        session: AuthSession;
        profile: CustomerProfile;
      }>('/auth/customer/signup', {
        method: 'POST',
        body: { name, email, password },
        retryOnAuth: false
      });
      saveSession(remote.session);
      saveCustomerProfile(remote.profile);
      return remote.profile;
    }

    await delay();
    if (password.length < 6) throw new Error('Password is too short');
    const state = loadState();
    const duplicate = state.customerProfiles.find((profile) => profile.email === email);
    if (duplicate) throw new Error('Account already exists');

    const profile: CustomerProfile = {
      id: createId('cust'),
      name,
      email,
      walletBalance: 0,
      ecoPoints: 0,
      status: 'ACTIVE',
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    state.customerProfiles.unshift(profile);
    saveState(state);

    const session = createSession(profile.id, 'customer', profile.email);
    saveSession(session);
    saveCustomerProfile(profile);
    return profile;
  },

  async loginDriver(email: string, password: string): Promise<DriverProfile> {
    requireRemoteOrMock();
    if (hasRemoteApi()) {
      const remote = await requestApi<{
        session: AuthSession;
        profile: DriverProfile;
      }>('/auth/driver/login', {
        method: 'POST',
        body: { email, password },
        retryOnAuth: false
      });
      saveSession(remote.session);
      saveDriverProfile(remote.profile);
      return remote.profile;
    }

    await delay();
    if (password.length < 6) {
      throw new Error('Invalid credentials');
    }

    const state = loadState();
    const existing = state.driverProfiles.find((profile) => profile.email === email);
    if (!existing) {
      throw new Error('Invalid credentials');
    }

    const session = createSession(existing.id, 'driver', existing.email);
    saveSession(session);
    saveDriverProfile(existing);
    return existing;
  },

  async signupDriver(
    name: string,
    email: string,
    password: string,
    vehicle: string
  ): Promise<DriverProfile> {
    requireRemoteOrMock();
    if (hasRemoteApi()) {
      const remote = await requestApi<{
        session: AuthSession;
        profile: DriverProfile;
      }>('/auth/driver/signup', {
        method: 'POST',
        body: { name, email, password, vehicle },
        retryOnAuth: false
      });
      saveSession(remote.session);
      saveDriverProfile(remote.profile);
      return remote.profile;
    }

    await delay();
    if (password.length < 6) throw new Error('Password is too short');
    const state = loadState();
    const duplicate = state.driverProfiles.find((profile) => profile.email === email);
    if (duplicate) throw new Error('Account already exists');

    const profile: DriverProfile = {
      id: createId('driver'),
      name,
      email,
      vehicle,
      rating: 5,
      ecoPoints: 0,
      memberSince: new Date().toISOString().split('T')[0],
      status: 'PENDING_REVIEW',
      verificationStatus: 'PENDING',
      activeBookingId: null,
      lastKnownLocation: null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    state.driverProfiles.unshift(profile);
    saveState(state);

    const session = createSession(profile.id, 'driver', profile.email);
    saveSession(session);
    saveDriverProfile(profile);
    return profile;
  },

  getCurrentCustomerProfile(): CustomerProfile | null {
    const session = getActiveSession();
    if (!session || session.payload.role !== 'customer') return null;
    return getCustomerProfile();
  },

  getCurrentDriverProfile(): DriverProfile | null {
    const session = getActiveSession();
    if (!session || session.payload.role !== 'driver') return null;
    return getDriverProfile();
  },

  async loginOpsAdmin(email: string, password: string): Promise<OpsAdminProfile> {
    requireRemoteOrMock();
    if (hasRemoteApi()) {
      const remote = await requestApi<{
        session?: AuthSession;
        profile?: OpsAdminProfile;
        mfaRequired?: boolean;
        mfaToken?: string;
        mustEnableMfa?: boolean;
      }>('/auth/ops-admin/login', {
        method: 'POST',
        body: { email, password },
        retryOnAuth: false
      });
      if (remote.mfaRequired && remote.mfaToken) {
        const error = new Error('MFA_REQUIRED');
        (error as Error & { mfaToken: string }).mfaToken = remote.mfaToken;
        throw error;
      }
      if (!remote.session || !remote.profile) {
        throw new Error('Login failed');
      }
      const profile = {
        ...remote.profile,
        mfaEnrollmentRequired: Boolean(remote.mustEnableMfa)
      };
      saveSession(remote.session);
      saveOpsAdminProfile(profile);
      return profile;
    }

    await delay();
    const state = loadState();
    const admin = state.opsAdminProfiles.find((profile) => profile.email === email);
    if (!admin || password.length < 8) {
      throw new Error('Invalid admin credentials');
    }

    const session = createSession(admin.id, 'ops_admin', admin.email);
    saveSession(session);
    saveOpsAdminProfile(admin);
    return admin;
  },

  async completeOpsMfa(mfaToken: string, token: string): Promise<OpsAdminProfile> {
    const remote = await requestApi<{
      session: AuthSession;
      profile: OpsAdminProfile;
    }>('/auth/mfa/challenge', {
      method: 'POST',
      body: { mfaToken, token },
      retryOnAuth: false
    });
    saveSession(remote.session);
    saveOpsAdminProfile(remote.profile);
    return remote.profile;
  },

  getCurrentOpsAdminProfile(): OpsAdminProfile | null {
    const session = getActiveSession();
    if (!session || session.payload.role !== 'ops_admin') return null;
    return getOpsAdminProfile();
  },

  async refreshSession(): Promise<boolean> {
    if (!hasRemoteApi()) return Boolean(getActiveSession());
    return rotateRefreshSession();
  },

  async logout() {
    if (hasRemoteApi()) {
      const token = getBearerToken();
      try {
        await requestApi<void>('/auth/logout', {
          method: 'POST',
          token,
          retryOnAuth: false
        });
      } catch {
        // Always clear local session even if remote revoke fails.
      }
    }
    clearSession();
  }
};

export const bookingApi = {
  async createBooking(input: {
    customerId: string;
    customerName?: string;
    serviceName: string;
    optionName: string;
    pickupLocation: string;
    pickupCoordinates?: {
      lat: number;
      lng: number;
    } | null;
    destinationLocation?: string | null;
    destinationCoordinates?: {
      lat: number;
      lng: number;
    } | null;
    paymentMethod: string;
    price: number;
    basePrice?: number;
    specialDiscountAmount?: number;
    appliedSpecialPromoCode?: string | null;
    scheduledDate: string;
    scheduledTime: string;
  }): Promise<BookingContract> {
    if (hasRemoteApi()) {
      return requestApi<BookingContract>('/bookings', {
        method: 'POST',
        token: getBearerToken(),
        body: input
      });
    }

    await delay(350);
    const state = loadState();
    const booking: BookingContract = {
      id: createId('booking'),
      customerId: input.customerId,
      serviceType: inferServiceType(input.serviceName),
      serviceName: input.serviceName,
      optionName: input.optionName,
      pickupLocation: input.pickupLocation,
      pickupCoordinates:
        input.pickupCoordinates ??
        textToGeoPoint(input.pickupLocation, 201),
      destinationLocation: input.destinationLocation ?? null,
      destinationCoordinates:
        input.destinationCoordinates ??
        (input.destinationLocation ?
          textToGeoPoint(input.destinationLocation, 203) :
          null),
      paymentMethod: input.paymentMethod,
      price: input.price,
      basePrice: input.basePrice ?? input.price,
      specialDiscountAmount: input.specialDiscountAmount ?? 0,
      appliedSpecialPromoCode: input.appliedSpecialPromoCode ?? null,
      ecoPoints: Math.round(input.price * 10),
      status: 'CONFIRMED',
      pooledWithBookingId: null,
      dispatchAttemptCount: 0,
      customerName: input.customerName,
      customerRating: 4.8,
      distance: '2.4 km',
      duration: '12 min',
      createdAt: nowIso(),
      scheduledAt: `${input.scheduledDate} ${input.scheduledTime}`,
      updatedAt: nowIso()
    };

    const dispatch = selectDriverForBooking(state, booking);
    if (dispatch) {
      booking.driverId = dispatch.driverId;
      booking.status = 'PENDING';
      booking.pooledWithBookingId = dispatch.pooledWithBookingId ?? null;
      booking.dispatchAttemptCount = 1;
      booking.latestAudit = {
        updatedBy: 'system',
        updatedByRole: 'ops_admin',
        reason: dispatch.dispatchReason,
        source: 'system',
        at: nowIso()
      };
    } else {
      createOrRefreshAutoDispatchIncident(
        state,
        booking,
        'No available verified driver for auto-dispatch.'
      );
    }

    state.bookings.unshift(booking);
    if (booking.driverId) {
      state.driverProfiles = state.driverProfiles.map((profile) =>
        profile.id === booking.driverId ?
        {
          ...profile,
          activeBookingId: booking.id,
          updatedAt: nowIso()
        } :
        profile
      );
    }
    logActivity(state, {
      type: booking.driverId ? 'BOOKING_ASSIGNED' : 'BOOKING_STATUS_UPDATED',
      actorId: input.customerId,
      actorRole: 'customer',
      targetId: booking.id,
      message: booking.driverId ?
        `Booking auto-assigned to driver ${booking.driverId}.` :
        `Booking created in CONFIRMED state for ${booking.serviceName}.`
    });
    saveState(state);

    notifyRoleUser(
      'customer',
      input.customerId,
      'Booking confirmed',
      `${input.serviceName} scheduled successfully.`,
      'success'
    );
    if (booking.driverId) {
      notifyRoleUser(
        'driver',
        booking.driverId,
        'New customer job request',
        booking.pooledWithBookingId ?
          `New pooled parcel assignment for booking ${booking.id}.` :
          `New assignment for booking ${booking.id}.`,
        'info'
      );
    }

    return booking;
  },

  async createIncomingDriverJob(driverId: string): Promise<BookingContract | null> {
    if (hasRemoteApi()) {
      return requestApi<BookingContract | null>('/driver/jobs/incoming', {
        method: 'POST',
        token: getBearerToken(),
        body: { driverId }
      });
    }

    await delay(250);
    const state = loadState();
    const existingAssigned = state.bookings.find(
      (booking) => booking.driverId === driverId && booking.status === 'PENDING'
    );
    if (existingAssigned) {
      return existingAssigned;
    }
    const types: ServiceType[] = ['RIDE', 'WASH', 'PARCEL'];
    const serviceType = types[Math.floor(Math.random() * types.length)];
    const serviceName =
      serviceType === 'RIDE'
        ? 'Dripless Ride'
        : serviceType === 'WASH'
          ? 'Dripless Wash'
          : 'Dripless Parcel';

    const booking: BookingContract = {
      id: createId('booking'),
      customerId: createId('cust'),
      driverId,
      serviceType,
      serviceName,
      optionName:
        serviceType === 'RIDE'
          ? 'Hybrid Vehicle'
          : serviceType === 'WASH'
            ? 'Premium Wash'
            : 'Standard Delivery',
      pickupLocation: '101 Cyberdyne Systems Way',
      pickupCoordinates: textToGeoPoint('101 Cyberdyne Systems Way', 301),
      destinationLocation: serviceType === 'WASH' ? null : '2029 Future Blvd',
      destinationCoordinates:
        serviceType === 'WASH' ? null : textToGeoPoint('2029 Future Blvd', 303),
      paymentMethod: 'paystack',
      price: 42,
      ecoPoints: 50,
      status: 'PENDING',
      customerName: 'Sarah Connor',
      customerRating: 4.8,
      distance: '2.4 km',
      duration: '12 min',
      createdAt: nowIso(),
      scheduledAt: nowIso(),
      updatedAt: nowIso()
    };

    state.bookings.unshift(booking);
    saveState(state);
    notifyRoleUser('driver', driverId, 'New job request', serviceName, 'info');
    return booking;
  },

  async updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
    actorRole: AppRole,
    metadata?: {
      actorId?: string;
      reason?: string;
      source?: AdminAudit['source'];
    }
  ): Promise<BookingContract | null> {
    if (hasRemoteApi()) {
      return requestApi<BookingContract | null>(`/bookings/${bookingId}/status`, {
        method: 'PATCH',
        token: getBearerToken(),
        body: { status, actorRole, metadata }
      });
    }

    await delay(200);
    const state = loadState();
    const bookingIndex = state.bookings.findIndex((booking) => booking.id === bookingId);
    if (bookingIndex < 0) return null;
    const currentBooking = state.bookings[bookingIndex];
    const isDriverDecline =
      actorRole === 'driver' &&
      status === 'CANCELLED' &&
      ['PENDING', 'CONFIRMED'].includes(currentBooking.status);

    if (isDriverDecline) {
      const declinedDriverId = currentBooking.driverId;
      const nextAttempt = (currentBooking.dispatchAttemptCount ?? 0) + 1;
      const reassignment = selectDriverForBooking(
        state,
        { ...currentBooking, driverId: undefined },
        {
          excludedDriverIds: declinedDriverId ? [declinedDriverId] : []
        }
      );
      const allowReassignment = Boolean(
        reassignment && nextAttempt <= MAX_AUTO_DISPATCH_ATTEMPTS
      );
      const reassignedBooking: BookingContract = {
        ...currentBooking,
        driverId: allowReassignment ? reassignment?.driverId : undefined,
        status: allowReassignment ? 'PENDING' : 'CONFIRMED',
        pooledWithBookingId: allowReassignment ? reassignment?.pooledWithBookingId ?? null : null,
        dispatchAttemptCount: nextAttempt,
        updatedAt: nowIso(),
        latestAudit: {
          updatedBy: metadata?.actorId ?? declinedDriverId ?? 'system',
          updatedByRole: actorRole,
          reason: allowReassignment ?
            `Driver declined. ${reassignment?.dispatchReason ?? 'Reassigned to available driver.'}` :
            nextAttempt > MAX_AUTO_DISPATCH_ATTEMPTS ?
              `Auto-dispatch attempts exceeded (${MAX_AUTO_DISPATCH_ATTEMPTS}).` :
              'Driver declined. Awaiting next available driver.',
          source: metadata?.source ?? 'system',
          at: nowIso()
        }
      };
      state.bookings[bookingIndex] = reassignedBooking;

      state.driverProfiles = state.driverProfiles.map((profile) => {
        if (declinedDriverId && profile.id === declinedDriverId) {
          return { ...profile, activeBookingId: null, updatedAt: nowIso() };
        }
        if (allowReassignment && reassignment?.driverId && profile.id === reassignment.driverId) {
          return { ...profile, activeBookingId: reassignedBooking.id, updatedAt: nowIso() };
        }
        return profile;
      });

      if (!allowReassignment) {
        createOrRefreshAutoDispatchIncident(
          state,
          reassignedBooking,
          nextAttempt > MAX_AUTO_DISPATCH_ATTEMPTS ?
            'Max auto-dispatch attempts reached with repeated declines.' :
            'Driver declined and no alternate driver is currently available.'
        );
      }

      logActivity(state, {
        type: allowReassignment ? 'BOOKING_ASSIGNED' : 'BOOKING_STATUS_UPDATED',
        actorId: metadata?.actorId ?? declinedDriverId ?? 'system',
        actorRole,
        targetId: reassignedBooking.id,
        message: allowReassignment ?
          `Driver declined, booking reassigned to ${reassignment?.driverId ?? 'another driver'}.` :
          nextAttempt > MAX_AUTO_DISPATCH_ATTEMPTS ?
            'Driver declined, auto-dispatch attempts exhausted.' :
            'Driver declined, booking waiting for reassignment.'
      });
      if (reassignedBooking.customerId) {
        notifyRoleUser(
          'customer',
          reassignedBooking.customerId,
          allowReassignment ? 'Driver reassigned' : 'Searching for another driver',
          allowReassignment ?
            `Your booking has been reassigned to another available driver.` :
            nextAttempt > MAX_AUTO_DISPATCH_ATTEMPTS ?
              'A driver declined and auto-dispatch attempts are exhausted. Ops team has been alerted.' :
              'A driver declined. We are assigning the next available driver.',
          'info'
        );
      }
      if (allowReassignment && reassignment?.driverId) {
        notifyRoleUser(
          'driver',
          reassignment.driverId,
          'New customer job request',
          reassignment.pooledWithBookingId ?
            `New pooled parcel assignment for booking ${reassignedBooking.id}.` :
            `New assignment for booking ${reassignedBooking.id}.`,
          'info'
        );
      }
      if (!allowReassignment) {
        for (const admin of state.opsAdminProfiles) {
          state.notifications.unshift({
            id: createId('notif'),
            role: 'ops_admin',
            userId: admin.id,
            title: 'Dispatch escalation required',
            message: `Booking ${reassignedBooking.id} needs manual dispatch intervention.`,
            type: 'warning',
            read: false,
            createdAt: nowIso()
          });
        }
      }
      saveState(state);
      return reassignedBooking;
    }

    const updatedBooking: BookingContract = {
      ...currentBooking,
      status,
      updatedAt: nowIso(),
      latestAudit: {
        updatedBy: metadata?.actorId ?? 'system',
        updatedByRole: actorRole,
        reason: metadata?.reason,
        source:
          metadata?.source ??
          (actorRole === 'ops_admin' ? 'ops_admin_dashboard' : 'system'),
        at: nowIso()
      }
    };
    state.bookings[bookingIndex] = updatedBooking;
    if (updatedBooking.driverId) {
      state.driverProfiles = state.driverProfiles.map((profile) => {
        if (profile.id !== updatedBooking.driverId) return profile;
        const shouldClear =
          updatedBooking.status === 'COMPLETED' ||
          updatedBooking.status === 'CANCELLED';
        return {
          ...profile,
          activeBookingId: shouldClear ? null : updatedBooking.id,
          updatedAt: nowIso()
        };
      });
    }

    logActivity(state, {
      type: 'BOOKING_STATUS_UPDATED',
      actorId: metadata?.actorId ?? 'system',
      actorRole,
      targetId: updatedBooking.id,
      message: `Booking moved to ${status}. ${metadata?.reason ?? ''}`.trim()
    });
    saveState(state);

    if (updatedBooking.customerId) {
      notifyRoleUser(
        'customer',
        updatedBooking.customerId,
        'Booking status updated',
        `Booking moved to ${status.replace('_', ' ')}.`,
        'info'
      );
    }

    if (actorRole === 'driver' && updatedBooking.driverId) {
      notifyRoleUser(
        'driver',
        updatedBooking.driverId,
        'Job updated',
        `Job status is now ${status.replace('_', ' ')}.`,
        'success'
      );
    }

    if (actorRole === 'ops_admin') {
      const watchers = state.opsAdminProfiles;
      for (const admin of watchers) {
        notifyRoleUser(
          'ops_admin',
          admin.id,
          'Admin booking action',
          `Booking ${updatedBooking.id} set to ${status.replace('_', ' ')}.`,
          'warning'
        );
      }
    }

    return updatedBooking;
  },

  async listBookingsForCustomer(customerId: string): Promise<BookingContract[]> {
    if (hasRemoteApi()) {
      return requestApi<BookingContract[]>(
        `/bookings?customerId=${encodeURIComponent(customerId)}`,
        {
          token: getBearerToken()
        }
      );
    }

    await delay(100);
    const state = loadState();
    return state.bookings.filter((booking) => booking.customerId === customerId);
  },

  async cancellationPolicy(bookingId: string) {
    if (hasRemoteApi()) {
      return requestApi<{ refundable: boolean; feeCents: number; summary: string }>(
        `/bookings/${encodeURIComponent(bookingId)}/policy`,
        { token: getBearerToken() }
      );
    }
    await delay(80);
    const booking = loadState().bookings.find((item) => item.id === bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.status === 'PENDING' || booking.status === 'CONFIRMED') {
      return { refundable: true, feeCents: 0, summary: 'Free cancellation before the operator is en route.' };
    }
    if (booking.status === 'EN_ROUTE' || booking.status === 'ARRIVED') {
      return { refundable: true, feeCents: 2500, summary: 'R25.00 cancellation fee after dispatch.' };
    }
    return { refundable: false, feeCents: 0, summary: 'This booking is no longer refundable.' };
  },

  async cancelBooking(bookingId: string, reason?: string): Promise<BookingContract> {
    if (hasRemoteApi()) {
      return requestApi<BookingContract>(`/bookings/${encodeURIComponent(bookingId)}/cancel`, {
        method: 'POST',
        token: getBearerToken(),
        body: { reason }
      });
    }
    const updated = await this.updateBookingStatus(bookingId, 'CANCELLED', 'customer', {
      reason: reason || 'Customer cancellation',
      source: 'customer_app'
    });
    if (!updated) throw new Error('Booking not found');
    return updated;
  },

  async rescheduleBooking(bookingId: string, scheduledAt: string): Promise<BookingContract> {
    if (hasRemoteApi()) {
      return requestApi<BookingContract>(`/bookings/${encodeURIComponent(bookingId)}/reschedule`, {
        method: 'POST',
        token: getBearerToken(),
        body: { scheduledAt }
      });
    }
    await delay(100);
    const state = loadState();
    const index = state.bookings.findIndex((item) => item.id === bookingId);
    if (index < 0) throw new Error('Booking not found');
    state.bookings[index] = {
      ...state.bookings[index],
      scheduledAt,
      status: 'PENDING',
      driverId: undefined,
      updatedAt: nowIso()
    };
    saveState(state);
    return state.bookings[index];
  }
};

export const trackingApi = {
  async updateDriverLocation(input: {
    driverId: string;
    lat: number;
    lng: number;
    heading?: number | null;
    speedKph?: number | null;
    accuracyM?: number | null;
    recordedAt?: string;
  }): Promise<DriverProfile | null> {
    if (hasRemoteApi()) {
      return requestApi<DriverProfile | null>('/driver/location', {
        method: 'PATCH',
        token: getBearerToken(),
        body: input
      });
    }
    await delay(80);
    const state = loadState();
    const profile = state.driverProfiles.find((item) => item.id === input.driverId);
    if (!profile) return null;
    profile.lastKnownLocation = {
      lat: input.lat,
      lng: input.lng,
      heading: input.heading ?? null,
      speedKph: input.speedKph ?? null,
      updatedAt: nowIso()
    };
    profile.updatedAt = nowIso();
    saveState(state);
    return profile;
  },

  async getBookingTracking(bookingId: string): Promise<BookingTrackingSnapshot | null> {
    if (hasRemoteApi()) {
      return requestApi<BookingTrackingSnapshot | null>(
        `/bookings/${encodeURIComponent(bookingId)}/tracking`,
        { token: getBearerToken() }
      );
    }
    await delay(80);
    const state = loadState();
    const booking = state.bookings.find((item) => item.id === bookingId);
    if (!booking) return null;
    const driver = booking.driverId ?
      state.driverProfiles.find((item) => item.id === booking.driverId) :
      null;
    return {
      bookingId: booking.id,
      status: booking.status,
      serviceType: booking.serviceType,
      pickupLocation: booking.pickupLocation,
      destinationLocation: booking.destinationLocation ?? null,
      pickupCoordinates:
        booking.pickupCoordinates ?? textToGeoPoint(booking.pickupLocation, 101),
      destinationCoordinates:
        booking.destinationCoordinates ??
        (booking.destinationLocation ?
          textToGeoPoint(booking.destinationLocation, 103) :
          null),
      driverId: booking.driverId,
      driverName: driver?.name,
      driverPhone: driver?.phone ?? null,
      driverVehicle: driver?.vehicle ?? null,
      driverPlateNumber: driver?.plateNumber ?? null,
      driverRating: driver?.rating ?? null,
      driverAvatarUrl: driver?.avatarUrl ?? null,
      driverCompletedJobs: state.bookings.filter(
        (item) => item.driverId === driver?.id && item.status === 'COMPLETED'
      ).length,
      driverLocation: driver?.lastKnownLocation ?? null
    };
  },

  async listDriverLocations(): Promise<
    Array<{
      driverId: string;
      driverName: string;
      activeBookingId?: string | null;
      status: AccountStatus;
      location: DriverProfile['lastKnownLocation'];
    }>
  > {
    if (hasRemoteApi()) {
      return requestApi<
        Array<{
          driverId: string;
          driverName: string;
          activeBookingId?: string | null;
          status: AccountStatus;
          location: DriverProfile['lastKnownLocation'];
        }>
      >('/ops/driver-locations', { token: getBearerToken() });
    }
    await delay(80);
    const state = loadState();
    return state.driverProfiles.map((driver) => ({
      driverId: driver.id,
      driverName: driver.name,
      activeBookingId: driver.activeBookingId ?? null,
      status: driver.status,
      location: driver.lastKnownLocation ?? null
    }));
  },

  estimateLocationAlongBooking(booking: BookingContract, progress: number) {
    const pickup = booking.pickupCoordinates ?? textToGeoPoint(booking.pickupLocation, 101);
    const destination =
      booking.destinationCoordinates ??
      (booking.destinationLocation ?
        textToGeoPoint(booking.destinationLocation, 103) :
        pickup);
    return interpolateGeoPoint(pickup, destination, progress);
  }
};

export const adminApi = {
  async getDashboardSummary(): Promise<OpsDashboardSummary> {
    if (hasRemoteApi()) {
      const remote = await requestApi<Partial<OpsDashboardSummary>>('/ops/dashboard/summary', {
        token: getBearerToken()
      });
      return {
        totalCustomers: remote.totalCustomers ?? 0,
        totalDrivers: remote.totalDrivers ?? 0,
        activeBookings: remote.activeBookings ?? 0,
        pendingBookings: remote.pendingBookings ?? 0,
        completedBookings: remote.completedBookings ?? 0,
        suspendedCustomers: remote.suspendedCustomers ?? 0,
        suspendedDrivers: remote.suspendedDrivers ?? 0,
        pendingDriverVerifications: remote.pendingDriverVerifications ?? 0,
        unassignedBookings: remote.unassignedBookings ?? 0
      };
    }

    await delay(120);
    const state = loadState();
    return {
      totalCustomers: state.customerProfiles.length,
      totalDrivers: state.driverProfiles.length,
      activeBookings: state.bookings.filter((booking) =>
        ['CONFIRMED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(booking.status)
      ).length,
      pendingBookings: state.bookings.filter((booking) => booking.status === 'PENDING')
        .length,
      completedBookings: state.bookings.filter(
        (booking) => booking.status === 'COMPLETED'
      ).length,
      suspendedCustomers: state.customerProfiles.filter(
        (profile) => profile.status === 'SUSPENDED'
      ).length,
      suspendedDrivers: state.driverProfiles.filter(
        (profile) => profile.status === 'SUSPENDED'
      ).length,
      pendingDriverVerifications: state.driverProfiles.filter(
        (profile) => profile.verificationStatus === 'PENDING'
      ).length,
      unassignedBookings: state.bookings.filter((booking) => !booking.driverId).length
    };
  },

  async listCustomers(): Promise<CustomerProfile[]> {
    if (hasRemoteApi()) {
      return requestApi<CustomerProfile[]>('/ops/customers', {
        token: getBearerToken()
      });
    }

    await delay(120);
    const state = loadState();
    return [...state.customerProfiles];
  },

  async listDrivers(): Promise<DriverProfile[]> {
    if (hasRemoteApi()) {
      return requestApi<DriverProfile[]>('/ops/drivers', {
        token: getBearerToken()
      });
    }

    await delay(120);
    const state = loadState();
    return [...state.driverProfiles];
  },

  async listBookings(): Promise<BookingContract[]> {
    if (hasRemoteApi()) {
      return requestApi<BookingContract[]>('/ops/bookings', {
        token: getBearerToken()
      });
    }

    await delay(120);
    const state = loadState();
    return [...state.bookings];
  },

  async listActivity(limit = 100): Promise<OpsActivityItem[]> {
    if (hasRemoteApi()) {
      return requestApi<OpsActivityItem[]>(
        `/ops/activity?limit=${encodeURIComponent(String(limit))}`,
        {
          token: getBearerToken()
        }
      );
    }

    await delay(120);
    const state = loadState();
    return state.activity.slice(0, limit);
  },

  async listIncidents(includeResolved = false): Promise<DispatchIncident[]> {
    if (hasRemoteApi()) {
      return requestApi<DispatchIncident[]>(
        `/ops/incidents?includeResolved=${encodeURIComponent(String(includeResolved))}`,
        { token: getBearerToken() }
      );
    }
    await delay(120);
    const state = loadState();
    return state.incidents.filter((incident) =>
      includeResolved ? true : incident.status !== 'RESOLVED'
    );
  },

  async createIncidentFromAlert(input: {
    bookingId: string;
    severity: 'medium' | 'high';
    reason: string;
    actorId: string;
  }): Promise<DispatchIncident> {
    if (hasRemoteApi()) {
      return requestApi<DispatchIncident>('/ops/incidents', {
        method: 'POST',
        token: getBearerToken(),
        body: input
      });
    }
    await delay(120);
    const state = loadState();
    const now = nowIso();
    const existing = state.incidents.find(
      (incident) =>
        incident.bookingId === input.bookingId && isIncidentActive(incident.status)
    );
    if (existing) {
      existing.severity = input.severity;
      existing.reason = input.reason;
      existing.updatedAt = now;
      logActivity(state, {
        type: 'INCIDENT_ACKNOWLEDGED',
        actorId: input.actorId,
        actorRole: 'ops_admin',
        targetId: existing.bookingId,
        message: `Incident refreshed for booking ${existing.bookingId}.`
      });
      saveState(state);
      return existing;
    }
    const incident: DispatchIncident = {
      id: createId('incident'),
      bookingId: input.bookingId,
      status: 'OPEN',
      severity: input.severity,
      reason: input.reason,
      ownerAdminId: null,
      ownerAdminName: null,
      acknowledgedAt: null,
      snoozeUntil: null,
      resolvedAt: null,
      lastEscalatedAt: null,
      createdAt: now,
      updatedAt: now
    };
    state.incidents.unshift(incident);
    logActivity(state, {
      type: 'INCIDENT_CREATED',
      actorId: input.actorId,
      actorRole: 'ops_admin',
      targetId: input.bookingId,
      message: `Incident created for booking ${input.bookingId}: ${input.reason}`
    });
    saveState(state);
    return incident;
  },

  async assignIncidentToSelf(input: {
    incidentId: string;
    adminId: string;
    adminName: string;
  }): Promise<DispatchIncident | null> {
    if (hasRemoteApi()) {
      return requestApi<DispatchIncident | null>(
        `/ops/incidents/${encodeURIComponent(input.incidentId)}/assign-self`,
        {
          method: 'PATCH',
          token: getBearerToken(),
          body: input
        }
      );
    }
    await delay(120);
    const state = loadState();
    const incident = state.incidents.find((item) => item.id === input.incidentId);
    if (!incident) return null;
    incident.ownerAdminId = input.adminId;
    incident.ownerAdminName = input.adminName;
    incident.updatedAt = nowIso();
    logActivity(state, {
      type: 'INCIDENT_ASSIGNED',
      actorId: input.adminId,
      actorRole: 'ops_admin',
      targetId: incident.bookingId,
      message: `Incident assigned to ${input.adminName}.`
    });
    saveState(state);
    return incident;
  },

  async acknowledgeIncident(input: {
    incidentId: string;
    actorId: string;
    note?: string;
  }): Promise<DispatchIncident | null> {
    if (hasRemoteApi()) {
      return requestApi<DispatchIncident | null>(
        `/ops/incidents/${encodeURIComponent(input.incidentId)}/acknowledge`,
        {
          method: 'PATCH',
          token: getBearerToken(),
          body: input
        }
      );
    }
    await delay(120);
    const state = loadState();
    const incident = state.incidents.find((item) => item.id === input.incidentId);
    if (!incident) return null;
    incident.status = 'ACKNOWLEDGED';
    incident.acknowledgedAt = nowIso();
    incident.updatedAt = nowIso();
    logActivity(state, {
      type: 'INCIDENT_ACKNOWLEDGED',
      actorId: input.actorId,
      actorRole: 'ops_admin',
      targetId: incident.bookingId,
      message: `Incident acknowledged. ${input.note ?? ''}`.trim()
    });
    saveState(state);
    return incident;
  },

  async snoozeIncident(input: {
    incidentId: string;
    actorId: string;
    snoozeMinutes: number;
    note?: string;
  }): Promise<DispatchIncident | null> {
    if (hasRemoteApi()) {
      return requestApi<DispatchIncident | null>(
        `/ops/incidents/${encodeURIComponent(input.incidentId)}/snooze`,
        {
          method: 'PATCH',
          token: getBearerToken(),
          body: input
        }
      );
    }
    await delay(120);
    const state = loadState();
    const incident = state.incidents.find((item) => item.id === input.incidentId);
    if (!incident) return null;
    const snoozeUntil = new Date(Date.now() + input.snoozeMinutes * 60000).toISOString();
    incident.status = 'SNOOZED';
    incident.snoozeUntil = snoozeUntil;
    incident.updatedAt = nowIso();
    logActivity(state, {
      type: 'INCIDENT_SNOOZED',
      actorId: input.actorId,
      actorRole: 'ops_admin',
      targetId: incident.bookingId,
      message: `Incident snoozed until ${snoozeUntil}. ${input.note ?? ''}`.trim()
    });
    saveState(state);
    return incident;
  },

  async resolveIncident(input: {
    incidentId: string;
    actorId: string;
    note?: string;
  }): Promise<DispatchIncident | null> {
    if (hasRemoteApi()) {
      return requestApi<DispatchIncident | null>(
        `/ops/incidents/${encodeURIComponent(input.incidentId)}/resolve`,
        {
          method: 'PATCH',
          token: getBearerToken(),
          body: input
        }
      );
    }
    await delay(120);
    const state = loadState();
    const incident = state.incidents.find((item) => item.id === input.incidentId);
    if (!incident) return null;
    incident.status = 'RESOLVED';
    incident.resolvedAt = nowIso();
    incident.updatedAt = nowIso();
    logActivity(state, {
      type: 'INCIDENT_RESOLVED',
      actorId: input.actorId,
      actorRole: 'ops_admin',
      targetId: incident.bookingId,
      message: `Incident resolved. ${input.note ?? ''}`.trim()
    });
    saveState(state);
    return incident;
  },

  async escalateIncident(input: {
    incidentId: string;
    actorId: string;
    actorName?: string;
    note?: string;
  }): Promise<DispatchIncident | null> {
    if (hasRemoteApi()) {
      return requestApi<DispatchIncident | null>(
        `/ops/incidents/${encodeURIComponent(input.incidentId)}/escalate`,
        {
          method: 'PATCH',
          token: getBearerToken(),
          body: input
        }
      );
    }
    await delay(120);
    const state = loadState();
    const incident = state.incidents.find((item) => item.id === input.incidentId);
    if (!incident) return null;
    incident.lastEscalatedAt = nowIso();
    incident.updatedAt = nowIso();
    logActivity(state, {
      type: 'INCIDENT_ACKNOWLEDGED',
      actorId: input.actorId,
      actorRole: 'ops_admin',
      targetId: incident.bookingId,
      message: `Incident escalated. ${input.note ?? ''}`.trim()
    });
    saveState(state);
    return incident;
  },

  async getBookingTimeline(bookingId: string): Promise<OpsActivityItem[]> {
    if (hasRemoteApi()) {
      return requestApi<OpsActivityItem[]>(
        `/ops/bookings/${encodeURIComponent(bookingId)}/timeline`,
        { token: getBearerToken() }
      );
    }
    await delay(100);
    const state = loadState();
    return state.activity
      .filter((item) => item.targetId === bookingId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getAnalytics(from: string, to: string): Promise<OpsAnalytics> {
    if (hasRemoteApi()) {
      return requestApi<OpsAnalytics>(
        `/ops/analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { token: getBearerToken() }
      );
    }

    await delay(120);
    const state = loadState();
    const fromTs = toTimestamp(from);
    const toTs = toTimestamp(to);
    const inRange = state.bookings.filter((booking) => {
      const ts = toTimestamp(booking.createdAt || booking.updatedAt);
      return ts >= fromTs && ts <= toTs;
    });
    const completed = inRange.filter((item) => item.status === 'COMPLETED');
    const cancelled = inRange.filter((item) => item.status === 'CANCELLED');
    const revenue = completed.reduce((sum, item) => sum + item.price, 0);
    const avgBookingValue = inRange.length > 0 ? revenue / inRange.length : 0;
    const serviceCount: Record<string, number> = {};
    for (const booking of inRange) {
      serviceCount[booking.serviceType] = (serviceCount[booking.serviceType] ?? 0) + 1;
    }
    const topServiceType =
      (Object.entries(serviceCount).sort((a, b) => b[1] - a[1])[0]?.[0] as
        | ServiceType
        | undefined) ?? 'NONE';
    return {
      from,
      to,
      totalBookings: inRange.length,
      completedBookings: completed.length,
      cancelledBookings: cancelled.length,
      completionRate: inRange.length > 0 ? completed.length / inRange.length : 0,
      avgBookingValue,
      revenue,
      topServiceType
    };
  },

  async getDriverRecommendations(
    bookingId: string,
    limit = 3
  ): Promise<DriverAssignmentRecommendation[]> {
    if (hasRemoteApi()) {
      return requestApi<DriverAssignmentRecommendation[]>(
        `/ops/bookings/${encodeURIComponent(bookingId)}/recommendations?limit=${encodeURIComponent(
          String(limit)
        )}`,
        { token: getBearerToken() }
      );
    }

    await delay(100);
    const state = loadState();
    const booking = state.bookings.find((item) => item.id === bookingId);
    if (!booking) return [];
    const pickupPoint =
      booking.pickupCoordinates ?? textToGeoPoint(booking.pickupLocation, 101);
    return state.driverProfiles
      .filter((driver) => driver.status !== 'SUSPENDED')
      .map((driver) => {
        const reasons: string[] = [];
        let score = 0;
        if (driver.verificationStatus === 'VERIFIED') {
          score += 35;
          reasons.push('Driver is verified');
        }
        if (!driver.activeBookingId) {
          score += 30;
          reasons.push('Driver currently available');
        } else {
          score -= 15;
          reasons.push('Driver currently assigned');
        }
        const activeLoad = state.bookings.filter(
          (item) =>
            item.driverId === driver.id &&
            ['PENDING', 'CONFIRMED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(
              item.status
            )
        ).length;
        score += Math.min(driver.rating * 8, 40);
        reasons.push(`Strong rating (${driver.rating.toFixed(2)})`);
        if (activeLoad === 0) {
          score += 12;
          reasons.push('No active workload');
        } else {
          score -= Math.min(activeLoad * 8, 24);
          reasons.push(`Current workload: ${activeLoad} active job(s)`);
        }
        if (booking.driverId && booking.driverId === driver.id) {
          score += 10;
          reasons.push('Already linked to this booking');
        }
        if (driver.lastKnownLocation) {
          const distanceKm = estimateDistanceKm(
            { lat: driver.lastKnownLocation.lat, lng: driver.lastKnownLocation.lng },
            pickupPoint
          );
          const etaMinutes = estimateEtaMinutes(distanceKm);
          const proximityBonus = Math.max(0, 24 - distanceKm * 4);
          score += proximityBonus;
          reasons.push(`${distanceKm.toFixed(1)} km away (~${etaMinutes} min to pickup)`);
          return {
            driverId: driver.id,
            driverName: driver.name,
            score: Math.round(score),
            distanceKm: Number(distanceKm.toFixed(2)),
            etaMinutes,
            reasons
          };
        }
        reasons.push('Live location unavailable');
        return {
          driverId: driver.id,
          driverName: driver.name,
          score: Math.round(score),
          reasons
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  },

  async updateBookingStatusAsAdmin(input: {
    bookingId: string;
    status: BookingStatus;
    adminId: string;
    reason?: string;
  }): Promise<BookingContract | null> {
    return bookingApi.updateBookingStatus(input.bookingId, input.status, 'ops_admin', {
      actorId: input.adminId,
      reason: input.reason,
      source: 'ops_admin_dashboard'
    });
  },

  async bulkUpdateBookingStatus(input: {
    bookingIds: string[];
    status: BookingStatus;
    adminId: string;
    reason?: string;
  }): Promise<BookingContract[]> {
    const updated: BookingContract[] = [];
    for (const bookingId of input.bookingIds) {
      const booking = await this.updateBookingStatusAsAdmin({
        bookingId,
        status: input.status,
        adminId: input.adminId,
        reason: input.reason
      });
      if (booking) updated.push(booking);
    }
    return updated;
  },

  async broadcastNotification(input: {
    title: string;
    message: string;
    targetRoles: AppRole[];
    type?: NotificationType;
  }): Promise<void> {
    if (hasRemoteApi()) {
      await requestApi<void>('/ops/notifications/broadcast', {
        method: 'POST',
        token: getBearerToken(),
        body: input
      });
      return;
    }

    await delay(120);
    const state = loadState();
    const type = input.type ?? 'info';

    if (input.targetRoles.includes('customer')) {
      for (const profile of state.customerProfiles) {
        state.notifications.unshift({
          id: createId('notif'),
          role: 'customer',
          userId: profile.id,
          title: input.title,
          message: input.message,
          type,
          read: false,
          createdAt: nowIso()
        });
      }
    }

    if (input.targetRoles.includes('driver')) {
      for (const profile of state.driverProfiles) {
        state.notifications.unshift({
          id: createId('notif'),
          role: 'driver',
          userId: profile.id,
          title: input.title,
          message: input.message,
          type,
          read: false,
          createdAt: nowIso()
        });
      }
    }

    if (input.targetRoles.includes('ops_admin')) {
      for (const profile of state.opsAdminProfiles) {
        state.notifications.unshift({
          id: createId('notif'),
          role: 'ops_admin',
          userId: profile.id,
          title: input.title,
          message: input.message,
          type,
          read: false,
          createdAt: nowIso()
        });
      }
    }
    logActivity(state, {
      type: 'BROADCAST_SENT',
      actorId: 'ops_admin_001',
      actorRole: 'ops_admin',
      targetId: input.targetRoles.join(','),
      message: `Broadcast sent to ${input.targetRoles.join(', ')}: ${input.title}`
    });
    saveState(state);
  },

  async listSpecials(): Promise<OpsSpecial[]> {
    if (hasRemoteApi()) {
      return requestApi<OpsSpecial[]>('/ops/specials', {
        token: getBearerToken()
      });
    }
    await delay(120);
    const state = loadState();
    return [...state.specials].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async createSpecial(input: {
    title: string;
    description: string;
    promoCode: string;
    audience: SpecialAudience;
    serviceScope: SpecialServiceScope;
    discountType: SpecialDiscountType;
    discountValue: number;
    startsAt: string;
    endsAt: string;
    termsAndConditions: string;
    actorId: string;
    actorName?: string;
  }): Promise<OpsSpecial> {
    if (hasRemoteApi()) {
      return requestApi<OpsSpecial>('/ops/specials', {
        method: 'POST',
        token: getBearerToken(),
        body: input
      });
    }
    await delay(120);
    const state = loadState();
    const special: OpsSpecial = {
      id: createId('special'),
      title: input.title,
      description: input.description,
      promoCode: input.promoCode.trim().toUpperCase(),
      audience: input.audience,
      serviceScope: input.serviceScope,
      discountType: input.discountType,
      discountValue: input.discountValue,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      termsAndConditions: input.termsAndConditions,
      approved: false,
      approvedByAdminId: null,
      approvedAt: null,
      isActive: false,
      redemptionCount: 0,
      lastRedeemedAt: null,
      createdByAdminId: input.actorId,
      createdByAdminName: input.actorName,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    state.specials.unshift(special);
    logActivity(state, {
      type: 'SPECIAL_CREATED',
      actorId: input.actorId,
      actorRole: 'ops_admin',
      targetId: special.id,
      message: `Special created: ${special.title}`
    });
    saveState(state);
    return special;
  },

  async approveSpecial(input: {
    specialId: string;
    actorId: string;
  }): Promise<OpsSpecial | null> {
    if (hasRemoteApi()) {
      return requestApi<OpsSpecial | null>(
        `/ops/specials/${encodeURIComponent(input.specialId)}/approve`,
        {
          method: 'PATCH',
          token: getBearerToken(),
          body: input
        }
      );
    }
    await delay(120);
    const state = loadState();
    const special = state.specials.find((item) => item.id === input.specialId);
    if (!special) return null;
    special.approved = true;
    special.approvedByAdminId = input.actorId;
    special.approvedAt = nowIso();
    special.updatedAt = nowIso();
    logActivity(state, {
      type: 'SPECIAL_APPROVED',
      actorId: input.actorId,
      actorRole: 'ops_admin',
      targetId: special.id,
      message: `Special approved: ${special.title}`
    });
    saveState(state);
    return special;
  },

  async setSpecialActivation(input: {
    specialId: string;
    actorId: string;
    isActive: boolean;
  }): Promise<OpsSpecial | null> {
    if (hasRemoteApi()) {
      return requestApi<OpsSpecial | null>(
        `/ops/specials/${encodeURIComponent(input.specialId)}/activation`,
        {
          method: 'PATCH',
          token: getBearerToken(),
          body: input
        }
      );
    }
    await delay(120);
    const state = loadState();
    const special = state.specials.find((item) => item.id === input.specialId);
    if (!special) return null;
    if (input.isActive && !special.approved) {
      throw new Error('Special must be approved before activation');
    }
    special.isActive = input.isActive;
    special.updatedAt = nowIso();
    if (input.isActive) {
      const notifyAudience = (role: AppRole, userId: string) => {
        state.notifications.unshift({
          id: createId('notif'),
          role,
          userId,
          title: 'New special is live',
          message: `${special.title} (${special.promoCode}) is now active.`,
          type: 'info',
          read: false,
          createdAt: nowIso()
        });
      };
      if (special.audience === 'customer' || special.audience === 'all') {
        for (const profile of state.customerProfiles) {
          notifyAudience('customer', profile.id);
        }
      }
      if (special.audience === 'driver' || special.audience === 'all') {
        for (const profile of state.driverProfiles) {
          notifyAudience('driver', profile.id);
        }
      }
    }
    logActivity(state, {
      type: input.isActive ? 'SPECIAL_ACTIVATED' : 'SPECIAL_DEACTIVATED',
      actorId: input.actorId,
      actorRole: 'ops_admin',
      targetId: special.id,
      message: `${input.isActive ? 'Activated' : 'Deactivated'} special: ${special.title}`
    });
    saveState(state);
    return special;
  },

  async updateSpecial(input: {
    specialId: string;
    title: string;
    description: string;
    promoCode: string;
    audience: SpecialAudience;
    serviceScope: SpecialServiceScope;
    discountType: SpecialDiscountType;
    discountValue: number;
    startsAt: string;
    endsAt: string;
    termsAndConditions: string;
    actorId: string;
  }): Promise<OpsSpecial | null> {
    if (hasRemoteApi()) {
      return requestApi<OpsSpecial | null>(
        `/ops/specials/${encodeURIComponent(input.specialId)}`,
        {
          method: 'PATCH',
          token: getBearerToken(),
          body: input
        }
      );
    }
    await delay(120);
    const state = loadState();
    const special = state.specials.find((item) => item.id === input.specialId);
    if (!special) return null;
    special.title = input.title;
    special.description = input.description;
    special.promoCode = input.promoCode.trim().toUpperCase();
    special.audience = input.audience;
    special.serviceScope = input.serviceScope;
    special.discountType = input.discountType;
    special.discountValue = input.discountValue;
    special.startsAt = input.startsAt;
    special.endsAt = input.endsAt;
    special.termsAndConditions = input.termsAndConditions;
    special.updatedAt = nowIso();
    logActivity(state, {
      type: 'SPECIAL_UPDATED',
      actorId: input.actorId,
      actorRole: 'ops_admin',
      targetId: special.id,
      message: `Special updated: ${special.title}`
    });
    saveState(state);
    return special;
  },

  async deleteSpecial(input: {
    specialId: string;
    actorId: string;
  }): Promise<boolean> {
    if (hasRemoteApi()) {
      await requestApi<void>(`/ops/specials/${encodeURIComponent(input.specialId)}`, {
        method: 'DELETE',
        token: getBearerToken()
      });
      return true;
    }
    await delay(120);
    const state = loadState();
    const special = state.specials.find((item) => item.id === input.specialId);
    if (!special) return false;
    state.specials = state.specials.filter((item) => item.id !== input.specialId);
    logActivity(state, {
      type: 'SPECIAL_DELETED',
      actorId: input.actorId,
      actorRole: 'ops_admin',
      targetId: input.specialId,
      message: `Special deleted: ${special.title}`
    });
    saveState(state);
    return true;
  },

  async updateCustomerStatus(input: {
    customerId: string;
    status: AccountStatus;
    actorId: string;
    reason?: string;
  }): Promise<CustomerProfile | null> {
    if (hasRemoteApi()) {
      return requestApi<CustomerProfile | null>(
        `/ops/customers/${encodeURIComponent(input.customerId)}/status`,
        {
          method: 'PATCH',
          token: getBearerToken(),
          body: input
        }
      );
    }

    await delay(120);
    const state = loadState();
    const customer = state.customerProfiles.find(
      (profile) => profile.id === input.customerId
    );
    if (!customer) return null;
    customer.status = input.status;
    customer.updatedAt = nowIso();
    logActivity(state, {
      type: 'CUSTOMER_STATUS_UPDATED',
      actorId: input.actorId,
      actorRole: 'ops_admin',
      targetId: customer.id,
      message: `Customer status changed to ${input.status}. ${input.reason ?? ''}`.trim()
    });
    saveState(state);
    return customer;
  },

  async updateDriverStatus(input: {
    driverId: string;
    status: AccountStatus;
    actorId: string;
    reason?: string;
  }): Promise<DriverProfile | null> {
    if (hasRemoteApi()) {
      return requestApi<DriverProfile | null>(
        `/ops/drivers/${encodeURIComponent(input.driverId)}/status`,
        {
          method: 'PATCH',
          token: getBearerToken(),
          body: input
        }
      );
    }

    await delay(120);
    const state = loadState();
    const driver = state.driverProfiles.find((profile) => profile.id === input.driverId);
    if (!driver) return null;
    driver.status = input.status;
    driver.updatedAt = nowIso();
    logActivity(state, {
      type: 'DRIVER_STATUS_UPDATED',
      actorId: input.actorId,
      actorRole: 'ops_admin',
      targetId: driver.id,
      message: `Driver status changed to ${input.status}. ${input.reason ?? ''}`.trim()
    });
    saveState(state);
    return driver;
  },

  async updateDriverVerification(input: {
    driverId: string;
    verificationStatus: DriverVerificationStatus;
    actorId: string;
    reason?: string;
  }): Promise<DriverProfile | null> {
    if (hasRemoteApi()) {
      return requestApi<DriverProfile | null>(
        `/ops/drivers/${encodeURIComponent(input.driverId)}/verification`,
        {
          method: 'PATCH',
          token: getBearerToken(),
          body: input
        }
      );
    }

    await delay(120);
    const state = loadState();
    const driver = state.driverProfiles.find((profile) => profile.id === input.driverId);
    if (!driver) return null;
    driver.verificationStatus = input.verificationStatus;
    driver.updatedAt = nowIso();
    logActivity(state, {
      type: 'DRIVER_VERIFICATION_UPDATED',
      actorId: input.actorId,
      actorRole: 'ops_admin',
      targetId: driver.id,
      message:
        `Driver verification changed to ${input.verificationStatus}. ${
          input.reason ?? ''
        }`.trim()
    });
    saveState(state);
    return driver;
  },

  async assignBookingDriver(input: {
    bookingId: string;
    driverId: string;
    actorId: string;
    reason?: string;
  }): Promise<BookingContract | null> {
    if (hasRemoteApi()) {
      return requestApi<BookingContract | null>(
        `/ops/bookings/${encodeURIComponent(input.bookingId)}/assign-driver`,
        {
          method: 'PATCH',
          token: getBearerToken(),
          body: input
        }
      );
    }

    await delay(120);
    const state = loadState();
    const booking = state.bookings.find((item) => item.id === input.bookingId);
    if (!booking) return null;
    booking.driverId = input.driverId;
    booking.updatedAt = nowIso();
    booking.latestAudit = {
      updatedBy: input.actorId,
      updatedByRole: 'ops_admin',
      reason: input.reason,
      source: 'ops_admin_dashboard',
      at: nowIso()
    };
    state.driverProfiles = state.driverProfiles.map((profile) =>
      profile.id === input.driverId ?
      {
        ...profile,
        activeBookingId: booking.id,
        updatedAt: nowIso()
      } :
      profile
    );
    logActivity(state, {
      type: 'BOOKING_ASSIGNED',
      actorId: input.actorId,
      actorRole: 'ops_admin',
      targetId: booking.id,
      message: `Assigned booking to driver ${input.driverId}. ${input.reason ?? ''}`.trim()
    });
    saveState(state);
    return booking;
  }
};

export const notificationApi = {
  async listNotifications(role: AppRole, userId: string) {
    if (hasRemoteApi()) {
      return requestApi<NotificationContract[]>(
        `/notifications?role=${encodeURIComponent(role)}&userId=${encodeURIComponent(userId)}`,
        {
          token: getBearerToken()
        }
      );
    }

    await delay(100);
    const state = loadState();
    return state.notifications.filter(
      (notification) => notification.role === role && notification.userId === userId
    );
  },

  async createNotification(input: {
    role: AppRole;
    userId: string;
    title: string;
    message: string;
    type?: NotificationType;
  }) {
    if (hasRemoteApi()) {
      // Production notifications are emitted by trusted server-side state changes.
      return;
    }

    await delay(100);
    notifyRoleUser(
      input.role,
      input.userId,
      input.title,
      input.message,
      input.type ?? 'info'
    );
  },
  markRead: (notificationId: string) => requestApi<void>(`/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'PATCH', token: getBearerToken() }),
  markAllRead: () => requestApi<void>('/notifications/read-all', { method: 'POST', token: getBearerToken() }),
  remove: (notificationId: string) => requestApi<void>(`/notifications/${encodeURIComponent(notificationId)}`, { method: 'DELETE', token: getBearerToken() }),
  preferences: () => requestApi<{ pushEnabled: boolean; emailEnabled: boolean; smsEnabled: boolean; marketing: boolean }>('/notifications/preferences', { token: getBearerToken() }),
  updatePreferences: (body: Record<string, boolean>) => requestApi<Record<string, unknown>>('/notifications/preferences', { method: 'PATCH', token: getBearerToken(), body })
};

export const specialsApi = {
  async listVisibleSpecials(role: 'customer' | 'driver'): Promise<OpsSpecial[]> {
    if (hasRemoteApi()) {
      return requestApi<OpsSpecial[]>(
        `/specials?role=${encodeURIComponent(role)}`,
        {
          token: getBearerToken()
        }
      );
    }
    await delay(100);
    const state = loadState();
    return state.specials
      .filter((special) => isSpecialApprovedAndActive(special, role))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async redeemSpecial(input: {
    role: 'customer' | 'driver';
    userId: string;
    promoCode: string;
  }): Promise<OpsSpecial> {
    if (hasRemoteApi()) {
      return requestApi<OpsSpecial>('/specials/redeem', {
        method: 'POST',
        token: getBearerToken(),
        body: input
      });
    }
    await delay(100);
    const state = loadState();
    const normalizedCode = input.promoCode.trim().toUpperCase();
    const special = state.specials.find(
      (item) =>
        item.promoCode === normalizedCode &&
        isSpecialApprovedAndActive(item, input.role)
    );
    if (!special) {
      throw new Error('Special code not found or not active');
    }
    special.redemptionCount = (special.redemptionCount ?? 0) + 1;
    special.lastRedeemedAt = nowIso();
    special.updatedAt = nowIso();
    logActivity(state, {
      type: 'SPECIAL_REDEEMED',
      actorId: input.userId,
      actorRole: input.role,
      targetId: special.id,
      message: `Special redeemed: ${special.promoCode}`
    });
    saveState(state);
    return special;
  }
};

export const paymentsApi = {
  async createIntent(bookingId: string, provider?: string) {
    return requestApi<{
      paymentId: string;
      checkoutUrl: string | null;
      amountZar: number;
      status: string;
      provider: string;
    }>('/payments/intent', {
      method: 'POST',
      token: getBearerToken(),
      body: { bookingId, provider, idempotencyKey: `booking_${bookingId}` }
    });
  },
  async wallet() {
    return requestApi<{
      walletBalance: number;
      withdrawableBalance: number;
      promotionalBalance: number;
      currency: 'ZAR';
      transactions: Array<{
        id: string;
        amountZar: number;
        type: string;
        reference: string | null;
        note: string | null;
        createdAt: string;
      }>;
    }>('/wallet', { token: getBearerToken() });
  },
  async list() {
    return requestApi<Array<{
      paymentId: string;
      bookingId: string | null;
      provider: string;
      status: string;
      amountZar: number;
      currency: string;
      externalRef: string | null;
      createdAt: string;
    }>>('/payments', { token: getBearerToken() });
  }
};

export const catalogApi = {
  async services() {
    return requestApi<unknown[]>('/catalog/services', { token: getBearerToken() });
  }
};

export const accountApi = {
  async requestPasswordReset(email: string) {
    requireRemoteOrMock();
    if (!hasRemoteApi()) return { message: 'Demo reset request accepted' };
    return requestApi<{ message: string }>('/auth/password-reset/request', {
      method: 'POST',
      body: { email },
      retryOnAuth: false
    });
  },
  async confirmPasswordReset(token: string, password: string) {
    return requestApi<{ message: string }>('/auth/password-reset/confirm', {
      method: 'POST',
      body: { token, password },
      retryOnAuth: false
    });
  },
  async verifyEmail(token: string) {
    return requestApi<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      body: { token },
      retryOnAuth: false
    });
  },
  async requestPhoneVerification(phone: string) {
    return requestApi<{ message: string; demoCode?: string }>('/auth/phone/request', {
      method: 'POST',
      token: getBearerToken(),
      body: { phone }
    });
  },
  async verifyPhone(phone: string, code: string) {
    return requestApi<{ message: string }>('/auth/phone/verify', {
      method: 'POST',
      token: getBearerToken(),
      body: { phone, code }
    });
  },
  async sessions() {
    return requestApi<Array<{
      id: string;
      deviceLabel: string | null;
      ipAddress: string | null;
      createdAt: string;
      expiresAt: string;
      current: boolean;
    }>>('/auth/sessions', { token: getBearerToken() });
  },
  async revokeSession(sessionId: string) {
    return requestApi<void>(`/auth/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
      token: getBearerToken()
    });
  },
  async logoutAll() {
    await requestApi<void>('/auth/logout-all', { method: 'POST', token: getBearerToken() });
    clearSession();
  }
};

export const passkeyApi = {
  authenticationOptions: () =>
    requestApi<{ options: unknown; challengeToken: string }>('/auth/passkeys/authentication/options', {
      method: 'POST', retryOnAuth: false
    }),
  async verifyAuthentication(challengeToken: string, response: unknown) {
    const result = await requestApi<{ session: AuthSession; profile: OpsAdminProfile }>('/auth/passkeys/authentication/verify', {
      method: 'POST', body: { challengeToken, response }, retryOnAuth: false
    });
    saveSession(result.session);
    saveOpsAdminProfile(result.profile);
    return result.profile;
  },
  registrationOptions: () =>
    requestApi<{ options: unknown; challengeToken: string }>('/auth/passkeys/registration/options', {
      method: 'POST', token: getBearerToken()
    }),
  async verifyRegistration(challengeToken: string, response: unknown) {
    const result = await requestApi<{
      verified: boolean;
      credentialId: string;
      session: AuthSession;
      profile: OpsAdminProfile;
    }>('/auth/passkeys/registration/verify', {
      method: 'POST', token: getBearerToken(), body: { challengeToken, response }
    });
    saveSession(result.session);
    saveOpsAdminProfile({ ...result.profile, mfaEnrollmentRequired: false });
    return { ...result, profile: { ...result.profile, mfaEnrollmentRequired: false } };
  },
  list: () => requestApi<Array<{ id: string; credentialId: string; transports: string[]; createdAt: string }>>('/auth/passkeys', { token: getBearerToken() }),
  remove: (id: string) => requestApi<void>(`/auth/passkeys/${encodeURIComponent(id)}`, { method: 'DELETE', token: getBearerToken() })
};

export const mfaApi = {
  beginSetup: () =>
    requestApi<{ status: string; otpauthUrl: string; secret: string; message: string }>('/auth/mfa/setup', {
      method: 'POST', token: getBearerToken()
    }),
  async verifySetup(token: string) {
    const result = await requestApi<{
      enabled: boolean;
      backupCodes: string[];
      session: AuthSession;
      profile: OpsAdminProfile;
    }>('/auth/mfa/verify', {
      method: 'POST', token: getBearerToken(), body: { token }
    });
    const profile = { ...result.profile, mfaEnrollmentRequired: false };
    saveSession(result.session);
    saveOpsAdminProfile(profile);
    return { ...result, profile };
  }
};

export const complaintApi = {
  create: (body: {
    bookingId?: string;
    category: 'QUALITY' | 'DAMAGE' | 'LATENESS' | 'CONDUCT' | 'BILLING' | 'REWASH' | 'OTHER';
    body: string;
  }) => requestApi<Record<string, unknown>>('/complaints', {
    method: 'POST', token: getBearerToken(), body
  }),
  list: () => requestApi<Array<Record<string, unknown>>>('/complaints', { token: getBearerToken() }),
  update: (complaintId: string, body: { status: 'IN_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'REJECTED'; resolution?: string }) =>
    requestApi<Record<string, unknown>>(`/complaints/${encodeURIComponent(complaintId)}`, {
      method: 'PATCH', token: getBearerToken(), body
    })
};

export const customerAccountApi = {
  profile: () => requestApi<Record<string, unknown>>('/customers/me', { token: getBearerToken() }),
  updateProfile: (body: { name?: string; phone?: string }) =>
    requestApi<Record<string, unknown>>('/customers/me', { method: 'PATCH', token: getBearerToken(), body }),
  vehicles: () => requestApi<Array<Record<string, unknown>>>('/customers/me/vehicles', { token: getBearerToken() }),
  createVehicle: (body: Record<string, unknown>) =>
    requestApi<Record<string, unknown>>('/customers/me/vehicles', { method: 'POST', token: getBearerToken(), body }),
  updateVehicle: (id: string, body: Record<string, unknown>) =>
    requestApi<Record<string, unknown>>(`/customers/me/vehicles/${encodeURIComponent(id)}`, { method: 'PATCH', token: getBearerToken(), body }),
  deleteVehicle: (id: string) =>
    requestApi<void>(`/customers/me/vehicles/${encodeURIComponent(id)}`, { method: 'DELETE', token: getBearerToken() }),
  addresses: () => requestApi<Array<Record<string, unknown>>>('/customers/me/addresses', { token: getBearerToken() }),
  createAddress: (body: Record<string, unknown>) =>
    requestApi<Record<string, unknown>>('/customers/me/addresses', { method: 'POST', token: getBearerToken(), body }),
  updateAddress: (id: string, body: Record<string, unknown>) =>
    requestApi<Record<string, unknown>>(`/customers/me/addresses/${encodeURIComponent(id)}`, { method: 'PATCH', token: getBearerToken(), body }),
  deleteAddress: (id: string) =>
    requestApi<void>(`/customers/me/addresses/${encodeURIComponent(id)}`, { method: 'DELETE', token: getBearerToken() })
};

export const driverOperationsApi = {
  setOnline: (online: boolean) =>
    requestApi<{ online: boolean }>('/driver/online', { method: 'POST', token: getBearerToken(), body: { online } }),
  documents: () => requestApi<Array<Record<string, unknown>>>('/driver/documents', { token: getBearerToken() }),
  uploadDocument: (body: { kind: string; dataUrl: string; expiresAt?: string }) =>
    requestApi<Record<string, unknown>>('/driver/documents', { method: 'POST', token: getBearerToken(), body }),
  downloadDocument: (documentId: string, kind: string) =>
    downloadApiFile(`/driver/documents/${encodeURIComponent(documentId)}/download`, `${kind.toLowerCase()}.document`),
  availability: () => requestApi<Array<Record<string, unknown>>>('/driver/availability', { token: getBearerToken() }),
  updateAvailability: (slots: Array<Record<string, unknown>>) =>
    requestApi<Array<Record<string, unknown>>>('/driver/availability', { method: 'PUT', token: getBearerToken(), body: { slots } }),
  payoutSummary: () => requestApi<Record<string, unknown>>('/payouts/me', { token: getBearerToken() }),
  payoutAccount: () => requestApi<Record<string, unknown> | null>('/payouts/account', { token: getBearerToken() }),
  updatePayoutAccount: (body: { bankCode: string; accountNumber: string; accountName: string }) =>
    requestApi<Record<string, unknown>>('/payouts/account', { method: 'PUT', token: getBearerToken(), body }),
  acceptJob: (bookingId: string) =>
    requestApi<BookingContract>(`/driver/jobs/${encodeURIComponent(bookingId)}/accept`, { method: 'POST', token: getBearerToken() }),
  declineJob: (bookingId: string, reason: string) =>
    requestApi<BookingContract | null>(`/driver/jobs/${encodeURIComponent(bookingId)}/decline`, { method: 'POST', token: getBearerToken(), body: { reason } }),
  emergency: (body: Record<string, unknown>) =>
    requestApi<{ incidentId: string; status: string }>('/driver/emergency', { method: 'POST', token: getBearerToken(), body })
};

export const bookingProofApi = {
  evidence: (bookingId: string) =>
    requestApi<Array<Record<string, unknown>>>(`/bookings/${encodeURIComponent(bookingId)}/evidence`, { token: getBearerToken() }),
  uploadEvidence: (bookingId: string, body: Record<string, unknown>) =>
    requestApi<Record<string, unknown>>(`/bookings/${encodeURIComponent(bookingId)}/evidence`, { method: 'POST', token: getBearerToken(), body }),
  issueCompletionPin: (bookingId: string) =>
    requestApi<{ pin: string; expiresWhen: string }>(`/bookings/${encodeURIComponent(bookingId)}/completion-pin`, { method: 'POST', token: getBearerToken() }),
  verifyCompletionPin: (bookingId: string, pin: string) =>
    requestApi<{ verified: boolean }>(`/bookings/${encodeURIComponent(bookingId)}/completion-pin/verify`, { method: 'POST', token: getBearerToken(), body: { pin } }),
  checklist: (bookingId: string) =>
    requestApi<Record<string, unknown> | null>(`/bookings/${encodeURIComponent(bookingId)}/checklist`, { token: getBearerToken() }),
  updateChecklist: (bookingId: string, body: Record<string, unknown>) =>
    requestApi<Record<string, unknown>>(`/bookings/${encodeURIComponent(bookingId)}/checklist`, { method: 'PATCH', token: getBearerToken(), body }),
  messages: (bookingId: string) =>
    requestApi<Array<Record<string, unknown>>>(`/bookings/${encodeURIComponent(bookingId)}/messages`, { token: getBearerToken() }),
  sendMessage: (bookingId: string, body: string) =>
    requestApi<Record<string, unknown>>(`/bookings/${encodeURIComponent(bookingId)}/messages`, { method: 'POST', token: getBearerToken(), body: { body } }),
  rate: (bookingId: string, stars: number, comment?: string) =>
    requestApi<Record<string, unknown>>(`/bookings/${encodeURIComponent(bookingId)}/rating`, { method: 'POST', token: getBearerToken(), body: { stars, comment } })
};

export const geoApi = {
  autocomplete: (query: string) =>
    requestApi<Array<{ id: string; label: string; lat: number | null; lng: number | null }>>(`/geo/autocomplete?q=${encodeURIComponent(query)}`, { token: getBearerToken() }),
  availability: (lat: number, lng: number, scheduledAt?: string) =>
    requestApi<{ available: boolean; area: Record<string, unknown> }>('/geo/availability', { method: 'POST', token: getBearerToken(), body: { lat, lng, scheduledAt } }),
  route: (from: { lat: number; lng: number }, to: { lat: number; lng: number }) =>
    requestApi<{ distanceKm: number; etaMinutes: number }>('/geo/route', { method: 'POST', token: getBearerToken(), body: { from, to } })
};

export const privacyApi = {
  requests: () => requestApi<Array<Record<string, unknown>>>('/privacy/requests', { token: getBearerToken() }),
  createRequest: (kind: 'EXPORT' | 'DELETE') =>
    requestApi<Record<string, unknown>>('/privacy/requests', { method: 'POST', token: getBearerToken(), body: { kind } }),
  consents: () => requestApi<Array<Record<string, unknown>>>('/privacy/consents', { token: getBearerToken() }),
  setConsent: (purpose: string, granted: boolean, version: string) =>
    requestApi<Record<string, unknown>>('/privacy/consents', { method: 'POST', token: getBearerToken(), body: { purpose, granted, version } }),
  downloadExport: (requestId: string) =>
    downloadApiFile(`/privacy/requests/${encodeURIComponent(requestId)}/download`, 'dripless-data-export.json')
};

export const invoicesApi = {
  list: () => requestApi<Array<Record<string, unknown>>>('/invoices', { token: getBearerToken() }),
  download: (invoiceId: string, number: string) =>
    downloadApiFile(`/invoices/${encodeURIComponent(invoiceId)}/download`, `${number}.pdf`)
};

export function subscribePlatformEvents(
  onEvent: (event: { id: string; type: string; at: string; payload: Record<string, unknown> }) => void,
  onState?: (state: 'connected' | 'reconnecting' | 'stopped') => void
) {
  const controller = new AbortController();
  let stopped = false;
  let lastEventId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('dripless_last_event_id') || '' : '';
  const run = async () => {
    let backoff = 1000;
    while (!stopped) {
      try {
        const baseUrl = getApiBaseUrl();
        const token = getBearerToken();
        if (!baseUrl || !token) return;
        const response = await fetch(`${baseUrl}/events/stream`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
            ...(lastEventId ? { 'Last-Event-ID': lastEventId } : {})
          },
          signal: controller.signal
        });
        if (!response.ok || !response.body) throw new Error(`Event stream failed (${response.status})`);
        onState?.('connected');
        backoff = 1000;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!stopped) {
          const chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });
          let boundary = buffer.indexOf('\n\n');
          while (boundary >= 0) {
            const frame = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const id = frame.match(/^id:\s*(.+)$/m)?.[1]?.trim();
            const data = frame.match(/^data:\s*(.+)$/m)?.[1];
            if (id && data) {
              const event = JSON.parse(data) as { id: string; type: string; at: string; payload: Record<string, unknown> };
              lastEventId = id;
              sessionStorage.setItem('dripless_last_event_id', id);
              onEvent(event);
            }
            boundary = buffer.indexOf('\n\n');
          }
        }
      } catch (error) {
        if (stopped || (error instanceof DOMException && error.name === 'AbortError')) break;
      }
      onState?.('reconnecting');
      await delay(backoff);
      backoff = Math.min(30_000, backoff * 2);
    }
  };
  void run();
  return () => {
    stopped = true;
    controller.abort();
    onState?.('stopped');
  };
}
