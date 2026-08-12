import type {
  BookingContract,
  CustomerProfile,
  DriverProfile,
  OpsActivityItem
} from '@shared/types';

/** Short, operator-friendly booking reference. */
export const formatBookingRef = (booking: Pick<BookingContract, 'id' | 'createdAt'>) => {
  const date = (booking.createdAt || '').slice(0, 10).replace(/-/g, '');
  const tail = booking.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '0000';
  return date ? `DRP-${date}-${tail}` : `DRP-${tail}`;
};

export const formatShortId = (id: string, prefix = '') => {
  const tail = id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
  return prefix ? `${prefix}-${tail}` : tail;
};

export const formatPersonName = (name?: string | null, fallback = 'Unknown') => {
  if (!name?.trim()) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

export const formatPhoneMasked = (phone?: string | null) => {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  return `${digits.slice(0, 3)} *** ${digits.slice(-4)}`;
};

export const driverLabel = (
  driverId: string | null | undefined,
  drivers: DriverProfile[]
) => {
  if (!driverId) return 'Unassigned';
  const driver = drivers.find((d) => d.id === driverId);
  if (!driver) return formatShortId(driverId, 'DRV');
  return `${formatPersonName(driver.name)} · ${formatShortId(driver.id, 'DRV')}`;
};

export const customerLabel = (
  customerId: string,
  customers: CustomerProfile[]
) => {
  const customer = customers.find((c) => c.id === customerId);
  if (!customer) return formatShortId(customerId, 'CUS');
  return formatPersonName(customer.name);
};

export const humanizeActivityType = (type: string) =>
  type
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export const formatActivityMessage = (
  item: OpsActivityItem,
  options?: {
    customers?: CustomerProfile[];
    drivers?: DriverProfile[];
    bookings?: BookingContract[];
  }
) => {
  if (item.message?.trim()) {
    // Soften raw ID dumps in messages when possible
    return item.message
      .replace(/\b(customer_|driver_|ops_|booking_)[a-z0-9_]+/gi, (m) =>
        formatShortId(m, m.startsWith('driver') ? 'DRV' : m.startsWith('customer') ? 'CUS' : 'ID')
      );
  }
  const verb = humanizeActivityType(item.type);
  const actor = item.actorId ? formatShortId(item.actorId, 'OPS') : 'System';
  let target = item.targetId;
  if (options?.bookings?.some((b) => b.id === item.targetId)) {
    const b = options.bookings.find((x) => x.id === item.targetId)!;
    target = formatBookingRef(b);
  }
  return `${actor} · ${verb}${target ? ` · ${target}` : ''}`;
};

export const minutesLabel = (minutes: number) => {
  if (minutes < 60) return `${Math.max(0, Math.round(minutes))} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
};

export const bookingZoneLabel = (location?: string | null) => {
  if (!location?.trim()) return 'Unknown area';
  const parts = location.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.slice(-2).join(', ') || location.slice(0, 48);
};
