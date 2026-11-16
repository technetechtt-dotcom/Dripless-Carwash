import type {
  AuthSession,
  CustomerProfile,
  DriverProfile,
  OpsAdminProfile
} from './types';

const ACCESS_TOKEN_KEY = 'dripless_access_token';
const REFRESH_TOKEN_KEY = 'dripless_refresh_token';
const EXPIRES_AT_KEY = 'dripless_expires_at';
const REFRESH_EXPIRES_AT_KEY = 'dripless_refresh_expires_at';
const SESSION_PAYLOAD_KEY = 'dripless_session_payload';
const CUSTOMER_PROFILE_KEY = 'dripless_customer_profile';
const DRIVER_PROFILE_KEY = 'dripless_driver_profile';
const OPS_ADMIN_PROFILE_KEY = 'dripless_ops_admin_profile';

const readNumber = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const saveSession = (session: AuthSession) => {
  const expiresAt = typeof session.tokens.expiresAt === 'number'
    ? session.tokens.expiresAt
    : Date.parse(String(session.tokens.expiresAt));
  const refreshExpiresAt = session.tokens.refreshExpiresAt == null
    ? null
    : typeof session.tokens.refreshExpiresAt === 'number'
      ? session.tokens.refreshExpiresAt
      : Date.parse(String(session.tokens.refreshExpiresAt));
  if (!Number.isFinite(expiresAt)) throw new Error('Server returned an invalid session expiry');
  sessionStorage.setItem(ACCESS_TOKEN_KEY, session.tokens.accessToken);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, session.tokens.refreshToken);
  sessionStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
  if (refreshExpiresAt && Number.isFinite(refreshExpiresAt)) {
    sessionStorage.setItem(REFRESH_EXPIRES_AT_KEY, String(refreshExpiresAt));
  } else {
    sessionStorage.removeItem(REFRESH_EXPIRES_AT_KEY);
  }
  sessionStorage.setItem(SESSION_PAYLOAD_KEY, JSON.stringify(session.payload));
};

export const getActiveSession = (): AuthSession | null => {
  const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
  const expiresAt = readNumber(sessionStorage.getItem(EXPIRES_AT_KEY));
  const refreshExpiresAt = readNumber(sessionStorage.getItem(REFRESH_EXPIRES_AT_KEY));
  const payloadRaw = sessionStorage.getItem(SESSION_PAYLOAD_KEY);

  if (!accessToken || !refreshToken || !expiresAt || !payloadRaw) {
    return null;
  }

  try {
    const payload = JSON.parse(payloadRaw) as AuthSession['payload'];
    return {
      tokens: { accessToken, refreshToken, expiresAt, refreshExpiresAt: refreshExpiresAt ?? undefined },
      payload
    };
  } catch {
    clearSession();
    return null;
  }
};

export const isSessionValid = (): boolean => {
  const session = getActiveSession();
  if (!session) return false;
  const refreshExpiresAt = session.tokens.refreshExpiresAt;
  if (refreshExpiresAt != null) {
    return Number(refreshExpiresAt) > Date.now();
  }
  // Fallback: access token still valid, or refresh token present for rotation
  return Boolean(session.tokens.refreshToken);
};

export const isAccessTokenFresh = (): boolean => {
  const session = getActiveSession();
  return Boolean(session && Number(session.tokens.expiresAt) > Date.now() + 30_000);
};

export const clearSession = () => {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(EXPIRES_AT_KEY);
  sessionStorage.removeItem(REFRESH_EXPIRES_AT_KEY);
  sessionStorage.removeItem(SESSION_PAYLOAD_KEY);
  sessionStorage.removeItem(CUSTOMER_PROFILE_KEY);
  sessionStorage.removeItem(DRIVER_PROFILE_KEY);
  sessionStorage.removeItem(OPS_ADMIN_PROFILE_KEY);
};

export const saveCustomerProfile = (profile: CustomerProfile) => {
  sessionStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(profile));
};

export const getCustomerProfile = (): CustomerProfile | null => {
  const raw = sessionStorage.getItem(CUSTOMER_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CustomerProfile;
  } catch {
    sessionStorage.removeItem(CUSTOMER_PROFILE_KEY);
    return null;
  }
};

export const saveDriverProfile = (profile: DriverProfile) => {
  sessionStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify(profile));
};

export const getDriverProfile = (): DriverProfile | null => {
  const raw = sessionStorage.getItem(DRIVER_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DriverProfile;
  } catch {
    sessionStorage.removeItem(DRIVER_PROFILE_KEY);
    return null;
  }
};

export const saveOpsAdminProfile = (profile: OpsAdminProfile) => {
  sessionStorage.setItem(OPS_ADMIN_PROFILE_KEY, JSON.stringify(profile));
};

export const getOpsAdminProfile = (): OpsAdminProfile | null => {
  const raw = sessionStorage.getItem(OPS_ADMIN_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OpsAdminProfile;
  } catch {
    sessionStorage.removeItem(OPS_ADMIN_PROFILE_KEY);
    return null;
  }
};
