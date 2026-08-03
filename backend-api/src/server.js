import express from 'express';
import cors from 'cors';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const PORT = Number(process.env.PORT || 4000);
const DATA_FILE = resolve(process.cwd(), 'data', 'state.json');
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;
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

const app = express();
app.use(cors());
app.use(express.json());

const nowIso = () => new Date().toISOString();
const createId = (prefix) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const ensureDataFile = () => {
  const dir = dirname(DATA_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(DATA_FILE)) {
    const seed = {
      customers: [],
      drivers: [],
      opsAdmins: [
        {
          id: 'ops_admin_001',
          name: 'Operations Admin',
          email: 'admin@driplesswash.com',
          permissions: [
            ...DEFAULT_OPS_PERMISSIONS
          ]
        }
      ],
      bookings: [],
      notifications: [],
      sessions: [],
      activity: [],
      incidents: [],
      specials: []
    };
    writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2), 'utf8');
  }
};

const loadState = () => {
  ensureDataFile();
  try {
    return hydrateState(JSON.parse(readFileSync(DATA_FILE, 'utf8')));
  } catch {
    return hydrateState({
      customers: [],
      drivers: [],
      opsAdmins: [],
      bookings: [],
      notifications: [],
      sessions: [],
      activity: [],
      incidents: [],
      specials: []
    });
  }
};

const saveState = (state) => {
  writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf8');
};

const inferServiceType = (serviceName) => {
  const normalized = String(serviceName || '').toLowerCase();
  if (normalized.includes('ride') || normalized.includes('taxi')) return 'RIDE';
  if (normalized.includes('parcel') || normalized.includes('delivery')) return 'PARCEL';
  if (normalized.includes('wash')) return 'WASH';
  return 'HOME_SERVICE';
};

const toTimestamp = (value) => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const hashString = (input) => {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const textToGeoPoint = (label, seed = 0) => {
  const safeLabel = String(label || '').trim().toLowerCase() || 'unknown location';
  const hash = hashString(`${safeLabel}:${seed}`);
  const latOffset = ((hash % 2000) / 100000) * (hash % 2 === 0 ? 1 : -1);
  const lngOffset =
    (((Math.floor(hash / 2000) % 2000) / 100000) * (hash % 3 === 0 ? -1 : 1));
  return {
    lat: clamp(-26.2041 + latOffset, -89.9, 89.9),
    lng: clamp(28.0473 + lngOffset, -179.9, 179.9)
  };
};

const toRadians = (value) => (value * Math.PI) / 180;

const estimateDistanceKm = (from, to) => {
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);
  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(fromLat) *
      Math.cos(toLat) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return 6371 * arc;
};

const estimateEtaMinutes = (distanceKm, speedKmPerHour = 32) => {
  if (distanceKm <= 0) return 1;
  const hours = distanceKm / Math.max(speedKmPerHour, 5);
  return Math.max(1, Math.round(hours * 60));
};

const isIncidentActive = (status) =>
  status === 'OPEN' || status === 'ACKNOWLEDGED' || status === 'SNOOZED';

const isSpecialApprovedAndActive = (special, role) => {
  if (!special || !special.approved || !special.isActive) return false;
  if (special.audience !== 'all' && special.audience !== role) return false;
  const now = Date.now();
  const startsAt = toTimestamp(special.startsAt);
  const endsAt = toTimestamp(special.endsAt);
  if (startsAt > 0 && now < startsAt) return false;
  if (endsAt > 0 && now > endsAt) return false;
  return true;
};

const isDriverBookable = (driver) =>
  driver &&
  driver.status !== 'SUSPENDED' &&
  driver.verificationStatus === 'VERIFIED';

const countActiveDriverJobs = (state, driverId) =>
  state.bookings.filter(
    (booking) =>
      booking.driverId === driverId &&
      ['PENDING', 'CONFIRMED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(
        booking.status
      )
  ).length;

const headingVector = (from, to) => {
  if (!from || !to) return null;
  return { x: to.lng - from.lng, y: to.lat - from.lat };
};

const cosineSimilarity = (first, second) => {
  if (!first || !second) return -1;
  const firstNorm = Math.hypot(first.x, first.y);
  const secondNorm = Math.hypot(second.x, second.y);
  if (firstNorm === 0 || secondNorm === 0) return -1;
  return (first.x * second.x + first.y * second.y) / (firstNorm * secondNorm);
};

const selectDriverForBooking = (state, booking, options = {}) => {
  const excluded = new Set(options.excludedDriverIds || []);
  const pickup =
    booking.pickupCoordinates || textToGeoPoint(booking.pickupLocation, 101);
  const destination =
    booking.destinationCoordinates ||
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
        const driver = state.drivers.find((profile) => profile.id === item.driverId);
        if (!isDriverBookable(driver)) return false;
        if (item.driverId && excluded.has(item.driverId)) return false;
        const existingVector = headingVector(
          item.pickupCoordinates,
          item.destinationCoordinates
        );
        const incomingVector = headingVector(pickup, destination);
        const sameDirection = cosineSimilarity(existingVector, incomingVector) >= 0.8;
        if (!sameDirection) return false;
        const handoffEta = estimateEtaMinutes(
          estimateDistanceKm(item.destinationCoordinates, destination)
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

  const ranked = state.drivers
    .filter((driver) => isDriverBookable(driver) && !excluded.has(driver.id))
    .map((driver) => {
      const activeJobs = countActiveDriverJobs(state, driver.id);
      if (activeJobs > 0 && booking.serviceType !== 'PARCEL') return null;
      const origin =
        driver.lastKnownLocation ?
        { lat: driver.lastKnownLocation.lat, lng: driver.lastKnownLocation.lng } :
        textToGeoPoint(driver.id, 701);
      const distance = estimateDistanceKm(origin, pickup);
      const eta = estimateEtaMinutes(distance);
      const score = eta + activeJobs * 8 - Number(driver.rating || 0) * 0.75;
      return { driverId: driver.id, eta, score };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score);

  if (!ranked[0]) return null;
  return {
    driverId: ranked[0].driverId,
    dispatchReason: `Auto-dispatch best available driver (${ranked[0].eta} min away)`
  };
};

const createOrRefreshAutoDispatchIncident = (state, booking, reason) => {
  const existing = state.incidents.find(
    (incident) => incident.bookingId === booking.id && isIncidentActive(incident.status)
  );
  if (existing) {
    existing.severity = 'high';
    existing.reason = reason;
    existing.updatedAt = nowIso();
    return existing;
  }
  const incident = {
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

const createSession = ({ userId, role, email }) => ({
  tokens: {
    accessToken: `dripless.${role}.${userId}.${Date.now().toString(36)}`,
    refreshToken: `dripless.refresh.${userId}.${Math.random().toString(36).slice(2, 8)}`,
    expiresAt: Date.now() + SESSION_TTL_MS
  },
  payload: { userId, role, email }
});

const addNotification = (state, input) => {
  const notification = {
    id: createId('notif'),
    role: input.role,
    userId: input.userId,
    title: input.title,
    message: input.message,
    type: input.type || 'info',
    read: false,
    createdAt: nowIso()
  };
  state.notifications.unshift(notification);
};

const logActivity = (state, item) => {
  state.activity = state.activity || [];
  state.activity.unshift({
    id: createId('activity'),
    createdAt: nowIso(),
    ...item
  });
};

const hydrateState = (state) => {
  state.activity = state.activity || [];
  state.incidents = state.incidents || [];
  state.specials = state.specials || [];
  state.customers = (state.customers || []).map((customer) => ({
    ...customer,
    status: customer.status || 'ACTIVE',
    createdAt: customer.createdAt || nowIso(),
    updatedAt: customer.updatedAt || nowIso()
  }));
  state.drivers = (state.drivers || []).map((driver) => ({
    ...driver,
    status: driver.status || 'ACTIVE',
    verificationStatus: driver.verificationStatus || 'PENDING',
    activeBookingId:
      driver.activeBookingId === undefined ? null : driver.activeBookingId,
    lastKnownLocation: driver.lastKnownLocation ?? null,
    createdAt: driver.createdAt || nowIso(),
    updatedAt: driver.updatedAt || nowIso()
  }));
  state.bookings = (state.bookings || []).map((booking) => ({
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
  state.opsAdmins = (state.opsAdmins || []).map((admin) => ({
    ...admin,
    permissions: Array.from(
      new Set([...(admin.permissions || []), ...DEFAULT_OPS_PERMISSIONS])
    )
  }));
  state.incidents = state.incidents.map((incident) => ({
    ...incident,
    status: incident.status || 'OPEN',
    ownerAdminId: incident.ownerAdminId ?? null,
    ownerAdminName: incident.ownerAdminName ?? null,
    acknowledgedAt: incident.acknowledgedAt ?? null,
    snoozeUntil: incident.snoozeUntil ?? null,
    resolvedAt: incident.resolvedAt ?? null,
    lastEscalatedAt: incident.lastEscalatedAt ?? null,
    createdAt: incident.createdAt || nowIso(),
    updatedAt: incident.updatedAt || nowIso()
  }));
  state.specials = state.specials.map((special) => ({
    ...special,
    approved: special.approved ?? false,
    approvedByAdminId: special.approvedByAdminId ?? null,
    approvedAt: special.approvedAt ?? null,
    isActive: special.isActive ?? false,
    redemptionCount: special.redemptionCount ?? 0,
    lastRedeemedAt: special.lastRedeemedAt ?? null,
    createdAt: special.createdAt || nowIso(),
    updatedAt: special.updatedAt || nowIso()
  }));
  return state;
};

const unauthorized = (res, message = 'Unauthorized') =>
  res.status(401).json({ message });

const authRequired = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ?
    authHeader.slice(7) :
    '';

  if (!token) return unauthorized(res, 'Missing token');
  const state = loadState();
  const session = state.sessions.find((item) => item.tokens.accessToken === token);
  if (!session) return unauthorized(res, 'Invalid token');
  if (session.tokens.expiresAt <= Date.now()) return unauthorized(res, 'Token expired');

  req.auth = session.payload;
  req.state = state;
  next();
};

const roleRequired = (roles) => (req, res, next) => {
  if (!req.auth || !roles.includes(req.auth.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

const permissionRequired = (permission) => (req, res, next) => {
  if (!req.auth || req.auth.role !== 'ops_admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const admin = req.state.opsAdmins.find((item) => item.id === req.auth.userId);
  if (!admin || !admin.permissions?.includes(permission)) {
    return res.status(403).json({ message: `Missing permission: ${permission}` });
  }
  next();
};

app.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: nowIso() });
});

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'dripless-backend-api',
    health: '/health',
    timestamp: nowIso()
  });
});

// Chrome DevTools probes this path on localhost origins.
// Returning JSON prevents noisy 404/CSP console warnings.
app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => {
  res.json({
    service: 'dripless-backend-api',
    ok: true
  });
});

app.post('/auth/customer/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password || String(password).length < 6) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const state = loadState();
  let profile = state.customers.find((customer) => customer.email === email);
  if (!profile) {
    profile = {
      id: createId('cust'),
      name: 'Alex Johnson',
      email,
      phone: '+1 (555) 123-4567',
      address: '123 Green Street, Eco City',
      walletBalance: 45.5,
      ecoPoints: 1250,
      status: 'ACTIVE',
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    state.customers.unshift(profile);
  }
  if (profile.status === 'SUSPENDED') {
    return res.status(403).json({ message: 'Customer account is suspended' });
  }

  const session = createSession({ userId: profile.id, role: 'customer', email: profile.email });
  state.sessions = state.sessions.filter((item) => item.payload.userId !== profile.id);
  state.sessions.unshift(session);
  saveState(state);
  res.json({ session, profile });
});

app.post('/auth/customer/signup', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password || String(password).length < 6) {
    return res.status(400).json({ message: 'Invalid signup payload' });
  }

  const state = loadState();
  if (state.customers.some((customer) => customer.email === email)) {
    return res.status(409).json({ message: 'Account already exists' });
  }

  const profile = {
    id: createId('cust'),
    name,
    email,
    walletBalance: 0,
    ecoPoints: 0,
    status: 'ACTIVE',
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  state.customers.unshift(profile);

  const session = createSession({ userId: profile.id, role: 'customer', email: profile.email });
  state.sessions = state.sessions.filter((item) => item.payload.userId !== profile.id);
  state.sessions.unshift(session);
  saveState(state);
  res.status(201).json({ session, profile });
});

app.post('/auth/driver/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password || String(password).length < 6) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const state = loadState();
  let profile = state.drivers.find((driver) => driver.email === email);
  if (!profile) {
    profile = {
      id: createId('driver'),
      name: 'Marcus Johnson',
      email,
      vehicle: 'Toyota Camry Hybrid',
      rating: 4.92,
      ecoPoints: 1250,
      memberSince: '2021-03-15',
      avatarUrl: 'https://i.pravatar.cc/150?u=driver',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      activeBookingId: null,
      lastKnownLocation: null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    state.drivers.unshift(profile);
  }
  if (profile.status === 'SUSPENDED') {
    return res.status(403).json({ message: 'Driver account is suspended' });
  }

  const session = createSession({ userId: profile.id, role: 'driver', email: profile.email });
  state.sessions = state.sessions.filter((item) => item.payload.userId !== profile.id);
  state.sessions.unshift(session);
  saveState(state);
  res.json({ session, profile });
});

app.post('/auth/driver/signup', (req, res) => {
  const { name, email, password, vehicle } = req.body || {};
  if (!name || !email || !password || !vehicle || String(password).length < 6) {
    return res.status(400).json({ message: 'Invalid signup payload' });
  }

  const state = loadState();
  if (state.drivers.some((driver) => driver.email === email)) {
    return res.status(409).json({ message: 'Account already exists' });
  }

  const profile = {
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
  state.drivers.unshift(profile);

  const session = createSession({ userId: profile.id, role: 'driver', email: profile.email });
  state.sessions = state.sessions.filter((item) => item.payload.userId !== profile.id);
  state.sessions.unshift(session);
  saveState(state);
  res.status(201).json({ session, profile });
});

app.post('/auth/ops-admin/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password || String(password).length < 8) {
    return res.status(400).json({ message: 'Invalid admin credentials' });
  }

  const state = loadState();
  const profile = state.opsAdmins.find((admin) => admin.email === email);
  if (!profile) return res.status(401).json({ message: 'Invalid admin credentials' });

  const session = createSession({ userId: profile.id, role: 'ops_admin', email: profile.email });
  state.sessions = state.sessions.filter((item) => item.payload.userId !== profile.id);
  state.sessions.unshift(session);
  saveState(state);
  res.json({ session, profile });
});

app.post('/bookings', authRequired, roleRequired(['customer', 'ops_admin']), (req, res) => {
  const state = req.state;
  const input = req.body || {};
  if (!input.customerId || !input.serviceName || !input.optionName) {
    return res.status(400).json({ message: 'Missing booking fields' });
  }

  const booking = {
    id: createId('booking'),
    customerId: input.customerId,
    driverId: input.driverId || undefined,
    serviceType: inferServiceType(input.serviceName),
    serviceName: input.serviceName,
    optionName: input.optionName,
    pickupLocation: input.pickupLocation || 'Unknown pickup',
    pickupCoordinates:
      input.pickupCoordinates &&
      Number.isFinite(Number(input.pickupCoordinates.lat)) &&
      Number.isFinite(Number(input.pickupCoordinates.lng)) ?
      {
        lat: Number(input.pickupCoordinates.lat),
        lng: Number(input.pickupCoordinates.lng)
      } :
      textToGeoPoint(input.pickupLocation || 'Unknown pickup', 201),
    destinationLocation: input.destinationLocation ?? null,
    destinationCoordinates:
      input.destinationCoordinates &&
      Number.isFinite(Number(input.destinationCoordinates.lat)) &&
      Number.isFinite(Number(input.destinationCoordinates.lng)) ?
      {
        lat: Number(input.destinationCoordinates.lat),
        lng: Number(input.destinationCoordinates.lng)
      } :
      input.destinationLocation ?
      textToGeoPoint(input.destinationLocation, 203) :
      null,
    paymentMethod: input.paymentMethod || 'Unknown payment method',
    price: Number(input.price || 0),
    basePrice: Number(input.basePrice || input.price || 0),
    specialDiscountAmount: Number(input.specialDiscountAmount || 0),
    appliedSpecialPromoCode: input.appliedSpecialPromoCode || null,
    ecoPoints: Math.round(Number(input.price || 0) * 10),
    status: 'CONFIRMED',
    pooledWithBookingId: null,
    dispatchAttemptCount: 0,
    customerName: input.customerName,
    customerRating: 4.8,
    distance: '2.4 km',
    duration: '12 min',
    createdAt: nowIso(),
    scheduledAt: `${input.scheduledDate || nowIso()} ${input.scheduledTime || ''}`.trim(),
    updatedAt: nowIso()
  };

  const dispatch = selectDriverForBooking(state, booking);
  if (dispatch) {
    booking.driverId = dispatch.driverId;
    booking.status = 'PENDING';
    booking.pooledWithBookingId = dispatch.pooledWithBookingId || null;
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
    state.drivers = state.drivers.map((driver) =>
      driver.id === booking.driverId ?
      {
        ...driver,
        activeBookingId: booking.id,
        updatedAt: nowIso()
      } :
      driver
    );
  }
  addNotification(state, {
    role: 'customer',
    userId: booking.customerId,
    title: 'Booking confirmed',
    message: `${booking.serviceName} scheduled successfully.`,
    type: 'success'
  });
  if (booking.driverId) {
    addNotification(state, {
      role: 'driver',
      userId: booking.driverId,
      title: 'New customer job request',
      message: booking.pooledWithBookingId ?
        `New pooled parcel assignment for booking ${booking.id}.` :
        `New assignment for booking ${booking.id}.`,
      type: 'info'
    });
  }
  logActivity(state, {
    type: booking.driverId ? 'BOOKING_ASSIGNED' : 'BOOKING_STATUS_UPDATED',
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    targetId: booking.id,
    message: booking.driverId ?
      `Booking auto-assigned to driver ${booking.driverId}.` :
      `Booking created and set to CONFIRMED for ${booking.serviceName}.`
  });
  saveState(state);
  res.status(201).json(booking);
});

app.post('/driver/jobs/incoming', authRequired, roleRequired(['driver', 'ops_admin']), (req, res) => {
  const state = req.state;
  const driverId = req.body?.driverId || req.auth.userId;
  const existingAssigned = state.bookings.find(
    (booking) => booking.driverId === driverId && booking.status === 'PENDING'
  );
  if (existingAssigned) {
    return res.status(200).json(existingAssigned);
  }
  const types = ['RIDE', 'WASH', 'PARCEL'];
  const serviceType = types[Math.floor(Math.random() * types.length)];
  const serviceName =
    serviceType === 'RIDE' ?
    'Dripless Ride' :
    serviceType === 'WASH' ?
    'Dripless Wash' :
    'Dripless Parcel';

  const booking = {
    id: createId('booking'),
    customerId: createId('cust'),
    driverId,
    serviceType,
    serviceName,
    optionName:
      serviceType === 'RIDE' ?
      'Hybrid Vehicle' :
      serviceType === 'WASH' ?
      'Premium Wash' :
      'Standard Delivery',
    pickupLocation: '101 Cyberdyne Systems Way',
    pickupCoordinates: textToGeoPoint('101 Cyberdyne Systems Way', 301),
    destinationLocation: serviceType === 'WASH' ? null : '2029 Future Blvd',
    destinationCoordinates:
      serviceType === 'WASH' ? null : textToGeoPoint('2029 Future Blvd', 303),
    paymentMethod: 'Visa •••• 4242',
    price: 42,
    ecoPoints: 50,
    status: 'PENDING',
    pooledWithBookingId: null,
    customerName: 'Sarah Connor',
    customerRating: 4.8,
    distance: '2.4 km',
    duration: '12 min',
    createdAt: nowIso(),
    scheduledAt: nowIso(),
    updatedAt: nowIso()
  };

  state.bookings.unshift(booking);
  state.drivers = state.drivers.map((driver) =>
    driver.id === driverId ?
    {
      ...driver,
      activeBookingId: booking.id,
      updatedAt: nowIso()
    } :
    driver
  );
  addNotification(state, {
    role: 'driver',
    userId: driverId,
    title: 'New job request',
    message: serviceName,
    type: 'info'
  });
  logActivity(state, {
    type: 'BOOKING_ASSIGNED',
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    targetId: booking.id,
    message: `Incoming job generated for driver ${driverId}.`
  });
  saveState(state);
  res.status(201).json(booking);
});

app.patch('/bookings/:bookingId/status', authRequired, (req, res) => {
  const state = req.state;
  if (req.auth.role === 'ops_admin') {
    const admin = state.opsAdmins.find((item) => item.id === req.auth.userId);
    if (!admin || !admin.permissions?.includes('bookings:update')) {
      return res.status(403).json({ message: 'Missing permission: bookings:update' });
    }
  }
  const { bookingId } = req.params;
  const { status, metadata } = req.body || {};
  const booking = state.bookings.find((item) => item.id === bookingId);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  const isDriverDecline =
    req.auth.role === 'driver' &&
    status === 'CANCELLED' &&
    ['PENDING', 'CONFIRMED'].includes(booking.status);

  if (isDriverDecline) {
    const declinedDriverId = booking.driverId;
    const nextAttempt = (booking.dispatchAttemptCount || 0) + 1;
    const reassignment = selectDriverForBooking(
      state,
      { ...booking, driverId: undefined },
      {
        excludedDriverIds: declinedDriverId ? [declinedDriverId] : []
      }
    );
    const allowReassignment = Boolean(
      reassignment && nextAttempt <= MAX_AUTO_DISPATCH_ATTEMPTS
    );

    booking.driverId = allowReassignment ? reassignment?.driverId : undefined;
    booking.status = allowReassignment ? 'PENDING' : 'CONFIRMED';
    booking.pooledWithBookingId =
      allowReassignment ? reassignment?.pooledWithBookingId || null : null;
    booking.dispatchAttemptCount = nextAttempt;
    booking.updatedAt = nowIso();
    booking.latestAudit = {
      updatedBy: metadata?.actorId || req.auth.userId,
      updatedByRole: req.auth.role,
      reason: allowReassignment ?
        `Driver declined. ${reassignment.dispatchReason}` :
        nextAttempt > MAX_AUTO_DISPATCH_ATTEMPTS ?
          `Auto-dispatch attempts exceeded (${MAX_AUTO_DISPATCH_ATTEMPTS}).` :
          'Driver declined. Awaiting next available driver.',
      source: metadata?.source || 'system',
      at: nowIso()
    };

    state.drivers = state.drivers.map((driver) => {
      if (declinedDriverId && driver.id === declinedDriverId) {
        return { ...driver, activeBookingId: null, updatedAt: nowIso() };
      }
      if (allowReassignment && reassignment?.driverId && driver.id === reassignment.driverId) {
        return { ...driver, activeBookingId: booking.id, updatedAt: nowIso() };
      }
      return driver;
    });

    if (!allowReassignment) {
      createOrRefreshAutoDispatchIncident(
        state,
        booking,
        nextAttempt > MAX_AUTO_DISPATCH_ATTEMPTS ?
          'Max auto-dispatch attempts reached with repeated declines.' :
          'Driver declined and no alternate driver is currently available.'
      );
    }

    if (booking.customerId) {
      addNotification(state, {
        role: 'customer',
        userId: booking.customerId,
        title: allowReassignment ? 'Driver reassigned' : 'Searching for another driver',
        message: allowReassignment ?
          'A different available driver has been assigned.' :
          nextAttempt > MAX_AUTO_DISPATCH_ATTEMPTS ?
            'A driver declined and auto-dispatch attempts are exhausted. Ops team has been alerted.' :
            'A driver declined. We are assigning the next available driver.',
        type: 'info'
      });
    }
    if (allowReassignment && reassignment?.driverId) {
      addNotification(state, {
        role: 'driver',
        userId: reassignment.driverId,
        title: 'New customer job request',
        message: reassignment.pooledWithBookingId ?
          `New pooled parcel assignment for booking ${booking.id}.` :
          `New assignment for booking ${booking.id}.`,
        type: 'info'
      });
    }
    if (!allowReassignment) {
      state.opsAdmins.forEach((admin) => {
        addNotification(state, {
          role: 'ops_admin',
          userId: admin.id,
          title: 'Dispatch escalation required',
          message: `Booking ${booking.id} needs manual dispatch intervention.`,
          type: 'warning'
        });
      });
    }
    logActivity(state, {
      type: allowReassignment ? 'BOOKING_ASSIGNED' : 'BOOKING_STATUS_UPDATED',
      actorId: req.auth.userId,
      actorRole: req.auth.role,
      targetId: booking.id,
      message: allowReassignment ?
        `Driver declined, booking reassigned to ${reassignment.driverId}.` :
        nextAttempt > MAX_AUTO_DISPATCH_ATTEMPTS ?
          'Driver declined, auto-dispatch attempts exhausted.' :
          'Driver declined, booking waiting for reassignment.'
    });
    saveState(state);
    return res.json(booking);
  }

  booking.status = status;
  booking.updatedAt = nowIso();
  booking.latestAudit = {
    updatedBy: metadata?.actorId || req.auth.userId,
    updatedByRole: req.auth.role,
    reason: metadata?.reason,
    source:
      metadata?.source ||
      (req.auth.role === 'ops_admin' ? 'ops_admin_dashboard' : 'system'),
    at: nowIso()
  };

  if (booking.driverId) {
    state.drivers = state.drivers.map((driver) => {
      if (driver.id !== booking.driverId) return driver;
      const clearAssignment = ['COMPLETED', 'CANCELLED'].includes(booking.status);
      return {
        ...driver,
        activeBookingId: clearAssignment ? null : booking.id,
        updatedAt: nowIso()
      };
    });
  }

  if (booking.customerId) {
    addNotification(state, {
      role: 'customer',
      userId: booking.customerId,
      title: 'Booking status updated',
      message: `Booking moved to ${String(status).replace('_', ' ')}.`,
      type: 'info'
    });
  }

  if (booking.driverId && req.auth.role === 'driver') {
    addNotification(state, {
      role: 'driver',
      userId: booking.driverId,
      title: 'Job updated',
      message: `Job status is now ${String(status).replace('_', ' ')}.`,
      type: 'success'
    });
  }

  if (req.auth.role === 'ops_admin') {
    for (const admin of state.opsAdmins) {
      addNotification(state, {
        role: 'ops_admin',
        userId: admin.id,
        title: 'Admin booking action',
        message: `Booking ${booking.id} set to ${String(status).replace('_', ' ')}.`,
        type: 'warning'
      });
    }
  }

  logActivity(state, {
    type: 'BOOKING_STATUS_UPDATED',
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    targetId: booking.id,
    message: `Booking moved to ${booking.status}. ${metadata?.reason || ''}`.trim()
  });

  saveState(state);
  res.json(booking);
});

app.get('/bookings', authRequired, (req, res) => {
  const state = req.state;
  const customerId = req.query.customerId;
  if (!customerId) return res.json(state.bookings);
  res.json(state.bookings.filter((booking) => booking.customerId === customerId));
});

app.patch('/driver/location', authRequired, roleRequired(['driver']), (req, res) => {
  const state = req.state;
  const { driverId, lat, lng, heading, speedKph } = req.body || {};
  const resolvedDriverId = driverId || req.auth.userId;
  if (resolvedDriverId !== req.auth.userId) {
    return res.status(403).json({ message: 'Driver can only update own location' });
  }
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
    return res.status(400).json({ message: 'Invalid coordinates' });
  }
  const driver = state.drivers.find((item) => item.id === resolvedDriverId);
  if (!driver) return res.status(404).json({ message: 'Driver not found' });
  driver.lastKnownLocation = {
    lat: parsedLat,
    lng: parsedLng,
    heading: Number.isFinite(Number(heading)) ? Number(heading) : null,
    speedKph: Number.isFinite(Number(speedKph)) ? Number(speedKph) : null,
    updatedAt: nowIso()
  };
  driver.updatedAt = nowIso();
  saveState(state);
  res.json(driver);
});

app.get('/bookings/:bookingId/tracking', authRequired, (req, res) => {
  const state = req.state;
  const { bookingId } = req.params;
  const booking = state.bookings.find((item) => item.id === bookingId);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (req.auth.role === 'customer' && booking.customerId !== req.auth.userId) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  if (
    req.auth.role === 'driver' &&
    booking.driverId &&
    booking.driverId !== req.auth.userId
  ) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const driver = booking.driverId ?
    state.drivers.find((item) => item.id === booking.driverId) :
    null;
  res.json({
    bookingId: booking.id,
    status: booking.status,
    serviceType: booking.serviceType,
    pickupLocation: booking.pickupLocation,
    destinationLocation: booking.destinationLocation ?? null,
    pickupCoordinates:
      booking.pickupCoordinates ??
      textToGeoPoint(booking.pickupLocation || 'Unknown pickup', 101),
    destinationCoordinates:
      booking.destinationCoordinates ??
      (booking.destinationLocation ?
        textToGeoPoint(booking.destinationLocation, 103) :
        null),
    driverId: booking.driverId,
    driverName: driver?.name,
    driverLocation: driver?.lastKnownLocation ?? null
  });
});

app.get('/ops/dashboard/summary', authRequired, roleRequired(['ops_admin']), (req, res) => {
  const state = req.state;
  res.json({
    totalCustomers: state.customers.length,
    totalDrivers: state.drivers.length,
    activeBookings: state.bookings.filter((booking) =>
      ['CONFIRMED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(booking.status)
    ).length,
    pendingBookings: state.bookings.filter((booking) => booking.status === 'PENDING')
      .length,
    completedBookings: state.bookings.filter((booking) => booking.status === 'COMPLETED')
      .length,
    suspendedCustomers: state.customers.filter((customer) => customer.status === 'SUSPENDED')
      .length,
    suspendedDrivers: state.drivers.filter((driver) => driver.status === 'SUSPENDED')
      .length,
    pendingDriverVerifications: state.drivers.filter(
      (driver) => driver.verificationStatus === 'PENDING'
    ).length,
    unassignedBookings: state.bookings.filter((booking) => !booking.driverId).length
  });
});

app.get('/ops/customers', authRequired, roleRequired(['ops_admin']), permissionRequired('customers:read'), (req, res) => {
  res.json(req.state.customers);
});

app.get('/ops/drivers', authRequired, roleRequired(['ops_admin']), permissionRequired('drivers:read'), (req, res) => {
  res.json(req.state.drivers);
});

app.get('/ops/driver-locations', authRequired, roleRequired(['ops_admin']), permissionRequired('drivers:read'), (req, res) => {
  const rows = req.state.drivers.map((driver) => ({
    driverId: driver.id,
    driverName: driver.name,
    activeBookingId: driver.activeBookingId ?? null,
    status: driver.status,
    location: driver.lastKnownLocation ?? null
  }));
  res.json(rows);
});

app.get('/ops/bookings', authRequired, roleRequired(['ops_admin']), permissionRequired('bookings:read'), (req, res) => {
  res.json(req.state.bookings);
});

app.get('/ops/activity', authRequired, roleRequired(['ops_admin']), permissionRequired('activity:read'), (req, res) => {
  const limit = Number(req.query.limit || 100);
  res.json(req.state.activity.slice(0, Number.isFinite(limit) ? limit : 100));
});

app.get('/ops/incidents', authRequired, roleRequired(['ops_admin']), permissionRequired('incidents:read'), (req, res) => {
  const includeResolved = String(req.query.includeResolved || 'false') === 'true';
  res.json(
    req.state.incidents.filter((incident) =>
      includeResolved ? true : incident.status !== 'RESOLVED'
    )
  );
});

app.post('/ops/incidents', authRequired, roleRequired(['ops_admin']), permissionRequired('incidents:manage'), (req, res) => {
  const state = req.state;
  const { bookingId, severity, reason } = req.body || {};
  if (!bookingId || !reason || !['medium', 'high'].includes(severity)) {
    return res.status(400).json({ message: 'Invalid incident payload' });
  }
  const existing = state.incidents.find(
    (incident) => incident.bookingId === bookingId && isIncidentActive(incident.status)
  );
  if (existing) {
    existing.severity = severity;
    existing.reason = reason;
    existing.updatedAt = nowIso();
    logActivity(state, {
      type: 'INCIDENT_ACKNOWLEDGED',
      actorId: req.auth.userId,
      actorRole: req.auth.role,
      targetId: bookingId,
      message: `Incident refreshed for booking ${bookingId}.`
    });
    saveState(state);
    return res.json(existing);
  }
  const incident = {
    id: createId('incident'),
    bookingId,
    status: 'OPEN',
    severity,
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
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    targetId: bookingId,
    message: `Incident created for booking ${bookingId}: ${reason}`
  });
  saveState(state);
  res.status(201).json(incident);
});

app.patch('/ops/incidents/:incidentId/assign-self', authRequired, roleRequired(['ops_admin']), permissionRequired('incidents:manage'), (req, res) => {
  const state = req.state;
  const { incidentId } = req.params;
  const { adminName } = req.body || {};
  const incident = state.incidents.find((item) => item.id === incidentId);
  if (!incident) return res.status(404).json({ message: 'Incident not found' });
  incident.ownerAdminId = req.auth.userId;
  incident.ownerAdminName = adminName || req.auth.email;
  incident.updatedAt = nowIso();
  logActivity(state, {
    type: 'INCIDENT_ASSIGNED',
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    targetId: incident.bookingId,
    message: `Incident assigned to ${incident.ownerAdminName}.`
  });
  saveState(state);
  res.json(incident);
});

app.patch('/ops/incidents/:incidentId/acknowledge', authRequired, roleRequired(['ops_admin']), permissionRequired('incidents:manage'), (req, res) => {
  const state = req.state;
  const { incidentId } = req.params;
  const { note } = req.body || {};
  const incident = state.incidents.find((item) => item.id === incidentId);
  if (!incident) return res.status(404).json({ message: 'Incident not found' });
  incident.status = 'ACKNOWLEDGED';
  incident.acknowledgedAt = nowIso();
  incident.updatedAt = nowIso();
  logActivity(state, {
    type: 'INCIDENT_ACKNOWLEDGED',
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    targetId: incident.bookingId,
    message: `Incident acknowledged. ${note || ''}`.trim()
  });
  saveState(state);
  res.json(incident);
});

app.patch('/ops/incidents/:incidentId/snooze', authRequired, roleRequired(['ops_admin']), permissionRequired('incidents:manage'), (req, res) => {
  const state = req.state;
  const { incidentId } = req.params;
  const { snoozeMinutes, note } = req.body || {};
  const minutes = Number(snoozeMinutes || 0);
  if (!Number.isFinite(minutes) || minutes < 1) {
    return res.status(400).json({ message: 'Invalid snooze minutes' });
  }
  const incident = state.incidents.find((item) => item.id === incidentId);
  if (!incident) return res.status(404).json({ message: 'Incident not found' });
  const snoozeUntil = new Date(Date.now() + minutes * 60000).toISOString();
  incident.status = 'SNOOZED';
  incident.snoozeUntil = snoozeUntil;
  incident.updatedAt = nowIso();
  logActivity(state, {
    type: 'INCIDENT_SNOOZED',
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    targetId: incident.bookingId,
    message: `Incident snoozed until ${snoozeUntil}. ${note || ''}`.trim()
  });
  saveState(state);
  res.json(incident);
});

app.patch('/ops/incidents/:incidentId/resolve', authRequired, roleRequired(['ops_admin']), permissionRequired('incidents:manage'), (req, res) => {
  const state = req.state;
  const { incidentId } = req.params;
  const { note } = req.body || {};
  const incident = state.incidents.find((item) => item.id === incidentId);
  if (!incident) return res.status(404).json({ message: 'Incident not found' });
  incident.status = 'RESOLVED';
  incident.resolvedAt = nowIso();
  incident.updatedAt = nowIso();
  logActivity(state, {
    type: 'INCIDENT_RESOLVED',
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    targetId: incident.bookingId,
    message: `Incident resolved. ${note || ''}`.trim()
  });
  saveState(state);
  res.json(incident);
});

app.patch('/ops/incidents/:incidentId/escalate', authRequired, roleRequired(['ops_admin']), permissionRequired('incidents:manage'), (req, res) => {
  const state = req.state;
  const { incidentId } = req.params;
  const { note } = req.body || {};
  const incident = state.incidents.find((item) => item.id === incidentId);
  if (!incident) return res.status(404).json({ message: 'Incident not found' });
  incident.lastEscalatedAt = nowIso();
  incident.updatedAt = nowIso();
  logActivity(state, {
    type: 'INCIDENT_ACKNOWLEDGED',
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    targetId: incident.bookingId,
    message: `Incident escalated. ${note || ''}`.trim()
  });
  saveState(state);
  res.json(incident);
});

app.get('/ops/analytics', authRequired, roleRequired(['ops_admin']), permissionRequired('activity:read'), (req, res) => {
  const state = req.state;
  const from = String(req.query.from || new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString());
  const to = String(req.query.to || nowIso());
  const fromTs = toTimestamp(from);
  const toTs = toTimestamp(to);
  const inRange = state.bookings.filter((booking) => {
    const ts = toTimestamp(booking.createdAt || booking.updatedAt);
    return ts >= fromTs && ts <= toTs;
  });
  const completed = inRange.filter((item) => item.status === 'COMPLETED');
  const cancelled = inRange.filter((item) => item.status === 'CANCELLED');
  const revenue = completed.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const avgBookingValue = inRange.length > 0 ? revenue / inRange.length : 0;
  const serviceCount = {};
  for (const booking of inRange) {
    serviceCount[booking.serviceType] = (serviceCount[booking.serviceType] || 0) + 1;
  }
  const topServiceType = Object.entries(serviceCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'NONE';
  res.json({
    from,
    to,
    totalBookings: inRange.length,
    completedBookings: completed.length,
    cancelledBookings: cancelled.length,
    completionRate: inRange.length > 0 ? completed.length / inRange.length : 0,
    avgBookingValue,
    revenue,
    topServiceType
  });
});

app.patch('/ops/customers/:customerId/status', authRequired, roleRequired(['ops_admin']), permissionRequired('customers:update'), (req, res) => {
  const state = req.state;
  const { customerId } = req.params;
  const { status, reason } = req.body || {};
  const customer = state.customers.find((profile) => profile.id === customerId);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  if (!['ACTIVE', 'SUSPENDED', 'PENDING_REVIEW'].includes(status)) {
    return res.status(400).json({ message: 'Invalid customer status' });
  }
  customer.status = status;
  customer.updatedAt = nowIso();
  logActivity(state, {
    type: 'CUSTOMER_STATUS_UPDATED',
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    targetId: customer.id,
    message: `Customer status changed to ${status}. ${reason || ''}`.trim()
  });
  saveState(state);
  res.json(customer);
});

app.patch('/ops/drivers/:driverId/status', authRequired, roleRequired(['ops_admin']), permissionRequired('drivers:update'), (req, res) => {
  const state = req.state;
  const { driverId } = req.params;
  const { status, reason } = req.body || {};
  const driver = state.drivers.find((profile) => profile.id === driverId);
  if (!driver) return res.status(404).json({ message: 'Driver not found' });
  if (!['ACTIVE', 'SUSPENDED', 'PENDING_REVIEW'].includes(status)) {
    return res.status(400).json({ message: 'Invalid driver status' });
  }
  driver.status = status;
  driver.updatedAt = nowIso();
  logActivity(state, {
    type: 'DRIVER_STATUS_UPDATED',
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    targetId: driver.id,
    message: `Driver status changed to ${status}. ${reason || ''}`.trim()
  });
  saveState(state);
  res.json(driver);
});

app.patch('/ops/drivers/:driverId/verification', authRequired, roleRequired(['ops_admin']), permissionRequired('drivers:verify'), (req, res) => {
  const state = req.state;
  const { driverId } = req.params;
  const { verificationStatus, reason } = req.body || {};
  const driver = state.drivers.find((profile) => profile.id === driverId);
  if (!driver) return res.status(404).json({ message: 'Driver not found' });
  if (!['VERIFIED', 'PENDING', 'REJECTED', 'EXPIRED'].includes(verificationStatus)) {
    return res.status(400).json({ message: 'Invalid verification status' });
  }
  driver.verificationStatus = verificationStatus;
  driver.updatedAt = nowIso();
  logActivity(state, {
    type: 'DRIVER_VERIFICATION_UPDATED',
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    targetId: driver.id,
    message: `Driver verification changed to ${verificationStatus}. ${reason || ''}`.trim()
  });
  saveState(state);
  res.json(driver);
});

app.patch('/ops/bookings/:bookingId/assign-driver', authRequired, roleRequired(['ops_admin']), permissionRequired('bookings:assign'), (req, res) => {
  const state = req.state;
  const { bookingId } = req.params;
  const { driverId, reason } = req.body || {};
  const booking = state.bookings.find((item) => item.id === bookingId);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  const driver = state.drivers.find((profile) => profile.id === driverId);
  if (!driver) return res.status(404).json({ message: 'Driver not found' });
  if (driver.status === 'SUSPENDED') {
    return res.status(400).json({ message: 'Cannot assign suspended driver' });
  }
  booking.driverId = driverId;
  booking.updatedAt = nowIso();
  booking.latestAudit = {
    updatedBy: req.auth.userId,
    updatedByRole: req.auth.role,
    reason,
    source: 'ops_admin_dashboard',
    at: nowIso()
  };
  state.drivers = state.drivers.map((profile) =>
    profile.id === driverId ?
    {
      ...profile,
      activeBookingId: booking.id,
      updatedAt: nowIso()
    } :
    profile
  );
  addNotification(state, {
    role: 'driver',
    userId: driverId,
    title: 'New assignment',
    message: `You have been assigned booking ${booking.id}.`,
    type: 'info'
  });
  logActivity(state, {
    type: 'BOOKING_ASSIGNED',
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    targetId: booking.id,
    message: `Booking assigned to ${driverId}. ${reason || ''}`.trim()
  });
  saveState(state);
  res.json(booking);
});

app.get('/ops/bookings/:bookingId/recommendations', authRequired, roleRequired(['ops_admin']), permissionRequired('bookings:assign'), (req, res) => {
  const state = req.state;
  const { bookingId } = req.params;
  const limit = Number(req.query.limit || 3);
  const booking = state.bookings.find((item) => item.id === bookingId);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  const pickupPoint =
    booking.pickupCoordinates ?? textToGeoPoint(booking.pickupLocation, 101);
  const recommendations = state.drivers
    .filter((driver) => driver.status !== 'SUSPENDED')
    .map((driver) => {
      const reasons = [];
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
      const activeLoad = state.bookings.filter((item) =>
        item.driverId === driver.id &&
        ['PENDING', 'CONFIRMED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(item.status)
      ).length;
      score += Math.min(Number(driver.rating || 0) * 8, 40);
      reasons.push(`Strong rating (${Number(driver.rating || 0).toFixed(2)})`);
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
      let distanceKm;
      let etaMinutes;
      if (driver.lastKnownLocation) {
        distanceKm = estimateDistanceKm(
          { lat: driver.lastKnownLocation.lat, lng: driver.lastKnownLocation.lng },
          pickupPoint
        );
        etaMinutes = estimateEtaMinutes(distanceKm);
        const proximityBonus = Math.max(0, 24 - distanceKm * 4);
        score += proximityBonus;
        reasons.push(`${distanceKm.toFixed(1)} km away (~${etaMinutes} min to pickup)`);
      } else {
        reasons.push('Live location unavailable');
      }
      return {
        driverId: driver.id,
        driverName: driver.name,
        score: Math.round(score),
        distanceKm:
          distanceKm === undefined ? undefined : Number(distanceKm.toFixed(2)),
        etaMinutes,
        reasons
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Number.isFinite(limit) ? limit : 3);
  res.json(recommendations);
});

app.get('/ops/bookings/:bookingId/timeline', authRequired, roleRequired(['ops_admin']), permissionRequired('activity:read'), (req, res) => {
  const { bookingId } = req.params;
  const timeline = req.state.activity
    .filter((item) => item.targetId === bookingId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(timeline);
});

app.post('/ops/notifications/broadcast', authRequired, roleRequired(['ops_admin']), permissionRequired('notifications:broadcast'), (req, res) => {
  const state = req.state;
  const { title, message, targetRoles, type } = req.body || {};
  if (!title || !message || !Array.isArray(targetRoles)) {
    return res.status(400).json({ message: 'Invalid broadcast payload' });
  }

  if (targetRoles.includes('customer')) {
    for (const customer of state.customers) {
      addNotification(state, {
        role: 'customer',
        userId: customer.id,
        title,
        message,
        type
      });
    }
  }

  if (targetRoles.includes('driver')) {
    for (const driver of state.drivers) {
      addNotification(state, {
        role: 'driver',
        userId: driver.id,
        title,
        message,
        type
      });
    }
  }

  if (targetRoles.includes('ops_admin')) {
    for (const admin of state.opsAdmins) {
      addNotification(state, {
        role: 'ops_admin',
        userId: admin.id,
        title,
        message,
        type
      });
    }
  }

  logActivity(state, {
    type: 'BROADCAST_SENT',
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    targetId: targetRoles.join(','),
    message: `Broadcast sent to ${targetRoles.join(', ')}: ${title}`
  });

  saveState(state);
  res.status(204).send();
});

app.get('/ops/specials', authRequired, roleRequired(['ops_admin']), permissionRequired('specials:manage'), (req, res) => {
  const items = [...(req.state.specials || [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  res.json(items);
});

app.post('/ops/specials', authRequired, roleRequired(['ops_admin']), permissionRequired('specials:manage'), (req, res) => {
  const state = req.state;
  const {
    title,
    description,
    promoCode,
    audience,
    serviceScope,
    discountType,
    discountValue,
    startsAt,
    endsAt,
    termsAndConditions,
    actorName
  } = req.body || {};
  if (!title || !description || !promoCode || !startsAt || !endsAt || !termsAndConditions) {
    return res.status(400).json({ message: 'Missing special fields' });
  }
  if (!['customer', 'driver', 'all'].includes(audience)) {
    return res.status(400).json({ message: 'Invalid audience' });
  }
  if (!['PERCENT', 'FIXED'].includes(discountType)) {
    return res.status(400).json({ message: 'Invalid discount type' });
  }
  const safeValue = Number(discountValue);
  if (!Number.isFinite(safeValue) || safeValue <= 0) {
    return res.status(400).json({ message: 'Invalid discount value' });
  }
  const special = {
    id: createId('special'),
    title: String(title).trim(),
    description: String(description).trim(),
    promoCode: String(promoCode).trim().toUpperCase(),
    audience,
    serviceScope: serviceScope || 'ALL',
    discountType,
    discountValue: safeValue,
    startsAt,
    endsAt,
    termsAndConditions: String(termsAndConditions).trim(),
    approved: false,
    approvedByAdminId: null,
    approvedAt: null,
    isActive: false,
    redemptionCount: 0,
    lastRedeemedAt: null,
    createdByAdminId: req.auth.userId,
    createdByAdminName: actorName || req.auth.email,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  state.specials.unshift(special);
  logActivity(state, {
    type: 'SPECIAL_CREATED',
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    targetId: special.id,
    message: `Special created: ${special.title}`
  });
  saveState(state);
  res.status(201).json(special);
});

app.patch('/ops/specials/:specialId/approve', authRequired, roleRequired(['ops_admin']), permissionRequired('specials:manage'), (req, res) => {
  const state = req.state;
  const special = state.specials.find((item) => item.id === req.params.specialId);
  if (!special) return res.status(404).json({ message: 'Special not found' });
  special.approved = true;
  special.approvedByAdminId = req.auth.userId;
  special.approvedAt = nowIso();
  special.updatedAt = nowIso();
  logActivity(state, {
    type: 'SPECIAL_APPROVED',
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    targetId: special.id,
    message: `Special approved: ${special.title}`
  });
  saveState(state);
  res.json(special);
});

app.patch('/ops/specials/:specialId/activation', authRequired, roleRequired(['ops_admin']), permissionRequired('specials:manage'), (req, res) => {
  const state = req.state;
  const special = state.specials.find((item) => item.id === req.params.specialId);
  if (!special) return res.status(404).json({ message: 'Special not found' });
  const isActive = Boolean(req.body?.isActive);
  if (isActive && !special.approved) {
    return res.status(400).json({ message: 'Special must be approved before activation' });
  }
  special.isActive = isActive;
  special.updatedAt = nowIso();
  if (isActive) {
    const notifyAudience = (role, userId) => {
      addNotification(state, {
        role,
        userId,
        title: 'New special is live',
        message: `${special.title} (${special.promoCode}) is now active.`,
        type: 'info'
      });
    };
    if (special.audience === 'customer' || special.audience === 'all') {
      for (const customer of state.customers) {
        notifyAudience('customer', customer.id);
      }
    }
    if (special.audience === 'driver' || special.audience === 'all') {
      for (const driver of state.drivers) {
        notifyAudience('driver', driver.id);
      }
    }
  }
  logActivity(state, {
    type: isActive ? 'SPECIAL_ACTIVATED' : 'SPECIAL_DEACTIVATED',
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    targetId: special.id,
    message: `${isActive ? 'Activated' : 'Deactivated'} special: ${special.title}`
  });
  saveState(state);
  res.json(special);
});

app.patch('/ops/specials/:specialId', authRequired, roleRequired(['ops_admin']), permissionRequired('specials:manage'), (req, res) => {
  const state = req.state;
  const special = state.specials.find((item) => item.id === req.params.specialId);
  if (!special) return res.status(404).json({ message: 'Special not found' });
  const {
    title,
    description,
    promoCode,
    audience,
    serviceScope,
    discountType,
    discountValue,
    startsAt,
    endsAt,
    termsAndConditions
  } = req.body || {};
  if (!title || !description || !promoCode || !startsAt || !endsAt || !termsAndConditions) {
    return res.status(400).json({ message: 'Missing special fields' });
  }
  if (!['customer', 'driver', 'all'].includes(audience)) {
    return res.status(400).json({ message: 'Invalid audience' });
  }
  if (!['PERCENT', 'FIXED'].includes(discountType)) {
    return res.status(400).json({ message: 'Invalid discount type' });
  }
  const safeValue = Number(discountValue);
  if (!Number.isFinite(safeValue) || safeValue <= 0) {
    return res.status(400).json({ message: 'Invalid discount value' });
  }
  special.title = String(title).trim();
  special.description = String(description).trim();
  special.promoCode = String(promoCode).trim().toUpperCase();
  special.audience = audience;
  special.serviceScope = serviceScope || 'ALL';
  special.discountType = discountType;
  special.discountValue = safeValue;
  special.startsAt = startsAt;
  special.endsAt = endsAt;
  special.termsAndConditions = String(termsAndConditions).trim();
  special.updatedAt = nowIso();
  logActivity(state, {
    type: 'SPECIAL_UPDATED',
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    targetId: special.id,
    message: `Special updated: ${special.title}`
  });
  saveState(state);
  res.json(special);
});

app.delete('/ops/specials/:specialId', authRequired, roleRequired(['ops_admin']), permissionRequired('specials:manage'), (req, res) => {
  const state = req.state;
  const special = state.specials.find((item) => item.id === req.params.specialId);
  if (!special) return res.status(404).json({ message: 'Special not found' });
  state.specials = state.specials.filter((item) => item.id !== req.params.specialId);
  logActivity(state, {
    type: 'SPECIAL_DELETED',
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    targetId: req.params.specialId,
    message: `Special deleted: ${special.title}`
  });
  saveState(state);
  res.status(204).send();
});

app.get('/specials', authRequired, roleRequired(['customer', 'driver', 'ops_admin']), (req, res) => {
  const requestRole =
    req.auth.role === 'ops_admin' ?
    String(req.query.role || 'customer') :
    req.auth.role;
  if (!['customer', 'driver'].includes(requestRole)) {
    return res.status(400).json({ message: 'Invalid role for specials visibility' });
  }
  const items = (req.state.specials || [])
    .filter((item) => isSpecialApprovedAndActive(item, requestRole))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  res.json(items);
});

app.post('/specials/redeem', authRequired, roleRequired(['customer', 'driver']), (req, res) => {
  const state = req.state;
  const role = req.auth.role;
  const promoCode = String(req.body?.promoCode || '').trim().toUpperCase();
  if (!promoCode) {
    return res.status(400).json({ message: 'Promo code is required' });
  }
  const special = (state.specials || []).find(
    (item) => item.promoCode === promoCode && isSpecialApprovedAndActive(item, role)
  );
  if (!special) {
    return res.status(404).json({ message: 'Special code not found or not active' });
  }
  special.redemptionCount = Number(special.redemptionCount || 0) + 1;
  special.lastRedeemedAt = nowIso();
  special.updatedAt = nowIso();
  logActivity(state, {
    type: 'SPECIAL_REDEEMED',
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    targetId: special.id,
    message: `Special redeemed: ${special.promoCode}`
  });
  saveState(state);
  res.json(special);
});

app.get('/notifications', authRequired, (req, res) => {
  const state = req.state;
  const role = req.query.role;
  const userId = req.query.userId;
  if (!role || !userId) return res.json([]);

  // Normal users can only read their own notifications; ops can read all.
  if (req.auth.role !== 'ops_admin') {
    if (req.auth.role !== role || req.auth.userId !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  }

  res.json(
    state.notifications.filter(
      (notification) => notification.role === role && notification.userId === userId
    )
  );
});

app.post('/notifications', authRequired, (req, res) => {
  const state = req.state;
  const { role, userId, title, message, type } = req.body || {};
  if (!role || !userId || !title || !message) {
    return res.status(400).json({ message: 'Invalid notification payload' });
  }
  addNotification(state, { role, userId, title, message, type });
  saveState(state);
  res.status(204).send();
});

app.listen(PORT, () => {
  ensureDataFile();
  console.log(`Dripless backend API running on port ${PORT}`);
});
