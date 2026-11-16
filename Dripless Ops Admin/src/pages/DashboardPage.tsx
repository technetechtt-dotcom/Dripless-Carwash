import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { adminApi, notificationApi, subscribePlatformEvents, trackingApi } from '@shared/api';
import { isBookingLifecycleEvent } from '@shared/events';
import { useNavigate, useParams } from 'react-router-dom';
import type {
  AccountStatus,
  BookingContract,
  BookingStatus,
  CustomerProfile,
  DispatchIncident,
  DriverAssignmentRecommendation,
  DriverProfile,
  DriverVerificationStatus,
  NotificationContract,
  OpsSpecial,
  SpecialAudience,
  SpecialDiscountType,
  SpecialServiceScope,
  OpsActivityItem,
  OpsAnalytics,
  OpsDashboardSummary
} from '@shared/types';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { OpsShell, type NavBadgeMap } from '../components/OpsShell';
import {
  dashboardTabs,
  getDashboardTabPath,
  getTabMeta,
  presetLabel,
  presetLandingTab,
  tabRequiresAnyPermission,
  type DashboardTab,
  type OpsPreset
} from './dashboard/navigation';
import {
  activityTypeOptions,
  accountStatusOptions,
  DEFAULT_STALE_STATUS_SLA_MINUTES,
  DEFAULT_UNASSIGNED_SLA_MINUTES,
  statusOptions,
  verificationStatusOptions
} from './dashboard/constants';
import {
  daysAgoIso,
  downloadCsv,
  paginate,
  pageCount,
  parseDateMs,
  playAlertSound,
  toCsv,
  toEndOfDayIso,
  toInputDate,
  toStartOfDayIso
} from './dashboard/utils';
import { formatBookingRef } from './dashboard/formatters';
import { OverviewSection, type AttentionItem } from './dashboard/sections/OverviewSection';
import { CustomersSection } from './dashboard/sections/CustomersSection';
import { DriversSection } from './dashboard/sections/DriversSection';
import { BookingsSection } from './dashboard/sections/BookingsSection';
import { DispatchSection } from './dashboard/sections/DispatchSection';
import { SpecialsSection } from './dashboard/sections/SpecialsSection';
import { IncidentsSection } from './dashboard/sections/IncidentsSection';
import { InboxSection } from './dashboard/sections/InboxSection';
import { CommunicationsSection } from './dashboard/sections/CommunicationsSection';
import { AuditSection } from './dashboard/sections/AuditSection';
import { ReportsSection } from './dashboard/sections/ReportsSection';
import { FinanceSection } from './dashboard/sections/FinanceSection';
type DispatchLane = BookingStatus | 'UNASSIGNED' | 'DISPATCH_EXHAUSTED';
type SlaAlertItem = {
  booking: BookingContract;
  ageMinutes: number;
  reason: string;
  severity: 'medium' | 'high';
};
const MAX_AUTO_DISPATCH_ATTEMPTS = 3;

type DashboardPageProps = {
  tabOverride?: DashboardTab;
};

export const DashboardPage = ({ tabOverride }: DashboardPageProps) => {
  const { admin, logout } = useOpsAuth();
  const navigate = useNavigate();
  const { tab } = useParams<{ tab: string }>();
  const [summary, setSummary] = useState<OpsDashboardSummary | null>(null);
  const [analytics, setAnalytics] = useState<OpsAnalytics | null>(null);
  const [analyticsFrom, setAnalyticsFrom] = useState(toInputDate(daysAgoIso(7)));
  const [analyticsTo, setAnalyticsTo] = useState(toInputDate(new Date().toISOString()));
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [driverLocations, setDriverLocations] = useState<
    Array<{
      driverId: string;
      driverName: string;
      activeBookingId?: string | null;
      status: AccountStatus;
      location: DriverProfile['lastKnownLocation'];
    }>
  >([]);
  const [bookings, setBookings] = useState<BookingContract[]>([]);
  const [incidents, setIncidents] = useState<DispatchIncident[]>([]);
  const [specials, setSpecials] = useState<OpsSpecial[]>([]);
  const [activity, setActivity] = useState<OpsActivityItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationContract[]>([]);
  const [bookingTimeline, setBookingTimeline] = useState<OpsActivityItem[]>([]);
  const [selectedTimelineBookingId, setSelectedTimelineBookingId] = useState<string | null>(null);
  const [recommendationsByBooking, setRecommendationsByBooking] = useState<
    Record<string, DriverAssignmentRecommendation[]>
  >({});
  const [activeTab, setActiveTab] = useState<DashboardTab>(
    () => tabOverride ?? 'overview'
  );
  const [preset, setPreset] = useState<OpsPreset>('super_admin');
  const [broadcastTitle, setBroadcastTitle] = useState('Ops announcement');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'success' | 'error'>(
    'warning'
  );
  const [targetCustomer, setTargetCustomer] = useState(true);
  const [targetDriver, setTargetDriver] = useState(true);
  const [targetOps, setTargetOps] = useState(false);
  const [specialTitle, setSpecialTitle] = useState('');
  const [specialDescription, setSpecialDescription] = useState('');
  const [specialPromoCode, setSpecialPromoCode] = useState('');
  const [specialAudience, setSpecialAudience] = useState<SpecialAudience>('customer');
  const [specialScope, setSpecialScope] = useState<SpecialServiceScope>('ALL');
  const [specialDiscountType, setSpecialDiscountType] = useState<SpecialDiscountType>('PERCENT');
  const [specialDiscountValue, setSpecialDiscountValue] = useState(10);
  const [specialStartsAt, setSpecialStartsAt] = useState('');
  const [specialEndsAt, setSpecialEndsAt] = useState('');
  const [specialTerms, setSpecialTerms] = useState('');
  const [editingSpecialId, setEditingSpecialId] = useState<string | null>(null);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerStatusFilter, setCustomerStatusFilter] = useState<'ALL' | AccountStatus>('ALL');
  const [driverQuery, setDriverQuery] = useState('');
  const [driverStatusFilter, setDriverStatusFilter] = useState<'ALL' | AccountStatus>('ALL');
  const [driverVerificationFilter, setDriverVerificationFilter] = useState<
    'ALL' | DriverVerificationStatus
  >('ALL');
  const [bookingQuery, setBookingQuery] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'ALL' | BookingStatus>('ALL');
  const [activityTypeFilter, setActivityTypeFilter] = useState<
    OpsActivityItem['type'] | 'ALL'
  >('ALL');
  const [activityQuery, setActivityQuery] = useState('');
  const [selectedDriverByBooking, setSelectedDriverByBooking] = useState<Record<string, string>>(
    {}
  );
  const [selectedBookings, setSelectedBookings] = useState<Record<string, boolean>>({});
  const [bulkStatus, setBulkStatus] = useState<BookingStatus>('CONFIRMED');
  const [customerPage, setCustomerPage] = useState(1);
  const [driverPage, setDriverPage] = useState(1);
  const [bookingPage, setBookingPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const [notificationPage, setNotificationPage] = useState(1);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [dispatchLaneFilter, setDispatchLaneFilter] = useState<DispatchLane | 'ALL'>('ALL');
  const [incidentQueueView, setIncidentQueueView] = useState<'all' | 'mine' | 'unassigned'>(
    'all'
  );
  const [showResolvedIncidents, setShowResolvedIncidents] = useState(false);
  const [incidentSnoozeMinutes, setIncidentSnoozeMinutes] = useState(20);
  const [autoEscalateEnabled, setAutoEscalateEnabled] = useState(false);
  const [autoEscalateThresholdMinutes, setAutoEscalateThresholdMinutes] = useState(20);
  const [isAcknowledgingExhaustedIncidents, setIsAcknowledgingExhaustedIncidents] =
    useState(false);
  const [lastBulkAcknowledgedAt, setLastBulkAcknowledgedAt] = useState<string | null>(null);
  const [unassignedSlaMinutes, setUnassignedSlaMinutes] = useState(
    DEFAULT_UNASSIGNED_SLA_MINUTES
  );
  const [staleStatusSlaMinutes, setStaleStatusSlaMinutes] = useState(
    DEFAULT_STALE_STATUS_SLA_MINUTES
  );
  const [enableDesktopAlerts, setEnableDesktopAlerts] = useState(false);
  const [enableSoundAlerts, setEnableSoundAlerts] = useState(false);
  const [lastEscalatedAt, setLastEscalatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [contextBookingId, setContextBookingId] = useState<string | null>(null);
  const lastAlertSignatureRef = useRef<string>('');
  const hasLoadedRef = useRef(false);

  const activeTabMeta = useMemo(() => getTabMeta(activeTab), [activeTab]);

  const navigateToTab = useCallback(
    (nextTab: DashboardTab) => {
      setActiveTab(nextTab);
      navigate(getDashboardTabPath(nextTab));
    },
    [navigate]
  );

  const hasPermission = useCallback(
    (permission: string) => Boolean(admin?.permissions?.includes(permission)),
    [admin?.permissions]
  );

  const canViewCustomers = hasPermission('customers:read');
  const canViewDrivers = hasPermission('drivers:read');
  const canViewBookings = hasPermission('bookings:read');
  const canViewIncidents = hasPermission('incidents:read');
  const canManageIncidents = hasPermission('incidents:manage');
  const canManageSpecials = hasPermission('specials:manage');

  const canAccessActiveTab = useMemo(() => {
    const meta = getTabMeta(activeTab);
    return tabRequiresAnyPermission(meta, admin?.permissions ?? []);
  }, [activeTab, admin?.permissions]);

  const loadAnalytics = useCallback(async () => {
    if (!admin || !hasPermission('activity:read')) return;
    try {
      const analyticsData = await adminApi.getAnalytics(
        toStartOfDayIso(analyticsFrom),
        toEndOfDayIso(analyticsTo)
      );
      setAnalytics(analyticsData);
    } catch {
      setAnalytics(null);
    }
  }, [admin, analyticsFrom, analyticsTo, hasPermission]);

  const loadDashboard = useCallback(async () => {
    if (!admin) return;
    if (!hasLoadedRef.current) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError('');
    try {
      const [
        summaryData,
        customersData,
        driversData,
        bookingsData,
        driverLocationData,
        incidentsData,
        specialsData,
        activityData,
        notificationsData
      ] =
        await Promise.all([
          adminApi.getDashboardSummary(),
          canViewCustomers ? adminApi.listCustomers() : Promise.resolve([]),
          canViewDrivers ? adminApi.listDrivers() : Promise.resolve([]),
          canViewBookings ? adminApi.listBookings() : Promise.resolve([]),
          canViewDrivers ? trackingApi.listDriverLocations() : Promise.resolve([]),
          canViewIncidents ?
          adminApi.listIncidents(showResolvedIncidents) :
          Promise.resolve([]),
          canManageSpecials ? adminApi.listSpecials() : Promise.resolve([]),
          hasPermission('activity:read') ? adminApi.listActivity(200) : Promise.resolve([]),
          notificationApi.listNotifications('ops_admin', admin.id)
        ]);
      setSummary(summaryData);
      setCustomers(customersData);
      setDrivers(driversData);
      setBookings(bookingsData);
      setDriverLocations(driverLocationData);
      setIncidents(incidentsData);
      setSpecials(specialsData);
      setActivity(activityData);
      setNotifications(notificationsData);
      setLastSyncedAt(new Date().toISOString());
      hasLoadedRef.current = true;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [
    admin,
    canViewBookings,
    canViewCustomers,
    canViewDrivers,
    canViewIncidents,
    canManageSpecials,
    hasPermission,
    showResolvedIncidents
  ]);

  const refreshLocations = useCallback(async () => {
    if (!admin || !canViewDrivers) return;
    try {
      const rows = await trackingApi.listDriverLocations();
      setDriverLocations(rows);
      setLastSyncedAt(new Date().toISOString());
    } catch {
      /* keep last known locations */
    }
  }, [admin, canViewDrivers]);

  const refreshBookings = useCallback(async () => {
    if (!admin || !canViewBookings) return;
    try {
      const [bookingsData, summaryData] = await Promise.all([
        adminApi.listBookings(),
        adminApi.getDashboardSummary()
      ]);
      setBookings(bookingsData);
      setSummary(summaryData);
      setLastSyncedAt(new Date().toISOString());
    } catch {
      /* keep last known bookings */
    }
  }, [admin, canViewBookings]);

  const refreshIncidents = useCallback(async () => {
    if (!admin || !canViewIncidents) return;
    try {
      const incidentsData = await adminApi.listIncidents(showResolvedIncidents);
      setIncidents(incidentsData);
      setLastSyncedAt(new Date().toISOString());
    } catch {
      /* keep last known incidents */
    }
  }, [admin, canViewIncidents, showResolvedIncidents]);

  const refreshNotifications = useCallback(async () => {
    if (!admin) return;
    try {
      const notificationsData = await notificationApi.listNotifications('ops_admin', admin.id);
      setNotifications(notificationsData);
      setLastSyncedAt(new Date().toISOString());
    } catch {
      /* keep last known notifications */
    }
  }, [admin]);

  const refreshDrivers = useCallback(async () => {
    if (!admin || !canViewDrivers) return;
    try {
      const [driversData, locations] = await Promise.all([
        adminApi.listDrivers(),
        trackingApi.listDriverLocations()
      ]);
      setDrivers(driversData);
      setDriverLocations(locations);
      setLastSyncedAt(new Date().toISOString());
    } catch {
      /* keep last known drivers */
    }
  }, [admin, canViewDrivers]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // Realtime primary: targeted section refreshes instead of full multi-GET reloads.
  useEffect(() => {
    if (!admin) return;
    let debounceTimer: number | undefined;
    const pending = new Set<
      'locations' | 'bookings' | 'incidents' | 'notifications' | 'drivers' | 'full'
    >();

    const flush = () => {
      debounceTimer = undefined;
      if (pending.has('full')) {
        pending.clear();
        void loadDashboard();
        return;
      }
      const tasks: Array<Promise<void>> = [];
      if (pending.has('bookings')) tasks.push(refreshBookings());
      if (pending.has('incidents')) tasks.push(refreshIncidents());
      if (pending.has('notifications')) tasks.push(refreshNotifications());
      if (pending.has('drivers')) tasks.push(refreshDrivers());
      else if (pending.has('locations')) tasks.push(refreshLocations());
      pending.clear();
      void Promise.all(tasks);
    };

    const schedule = (
      section: 'locations' | 'bookings' | 'incidents' | 'notifications' | 'drivers' | 'full'
    ) => {
      pending.add(section);
      if (debounceTimer != null) window.clearTimeout(debounceTimer);
      const delayMs = section === 'locations' ? 1800 : 800;
      debounceTimer = window.setTimeout(flush, delayMs);
    };

    const stop = subscribePlatformEvents((event) => {
      if (event.type === 'driver.location') {
        schedule('locations');
        return;
      }
      if (isBookingLifecycleEvent(event.type) || event.type === 'payment.status') {
        schedule('bookings');
        return;
      }
      if (event.type === 'ops.incident') {
        schedule('incidents');
        return;
      }
      if (event.type === 'notification.created') {
        schedule('notifications');
        return;
      }
      if (event.type === 'booking.message') {
        // Messages show in booking detail; refresh bookings lightly for unread indicators.
        schedule('bookings');
      }
    });
    return () => {
      stop();
      if (debounceTimer != null) window.clearTimeout(debounceTimer);
    };
  }, [
    admin,
    loadDashboard,
    refreshBookings,
    refreshDrivers,
    refreshIncidents,
    refreshLocations,
    refreshNotifications
  ]);

  useEffect(() => {
    if (!isLiveMode) return;
    const timer = window.setInterval(() => {
      void loadDashboard();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [isLiveMode, loadDashboard]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    if (!admin) return;
    const storageKey = `dripless_ops_filters_${admin.id}`;
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<{
        preset: OpsPreset;
        customerQuery: string;
        customerStatusFilter: 'ALL' | AccountStatus;
        driverQuery: string;
        driverStatusFilter: 'ALL' | AccountStatus;
        driverVerificationFilter: 'ALL' | DriverVerificationStatus;
        bookingQuery: string;
        bookingStatusFilter: 'ALL' | BookingStatus;
        activityTypeFilter: OpsActivityItem['type'] | 'ALL';
        activityQuery: string;
        isLiveMode: boolean;
        dispatchLaneFilter: DispatchLane | 'ALL';
        unassignedSlaMinutes: number;
        staleStatusSlaMinutes: number;
        enableDesktopAlerts: boolean;
        enableSoundAlerts: boolean;
        showResolvedIncidents: boolean;
        incidentSnoozeMinutes: number;
        incidentQueueView: 'all' | 'mine' | 'unassigned';
        autoEscalateEnabled: boolean;
        autoEscalateThresholdMinutes: number;
        lastBulkAcknowledgedAt: string | null;
      }>;
      if (parsed.preset) setPreset(parsed.preset);
      if (parsed.customerQuery !== undefined) setCustomerQuery(parsed.customerQuery);
      if (parsed.customerStatusFilter) setCustomerStatusFilter(parsed.customerStatusFilter);
      if (parsed.driverQuery !== undefined) setDriverQuery(parsed.driverQuery);
      if (parsed.driverStatusFilter) setDriverStatusFilter(parsed.driverStatusFilter);
      if (parsed.driverVerificationFilter) {
        setDriverVerificationFilter(parsed.driverVerificationFilter);
      }
      if (parsed.bookingQuery !== undefined) setBookingQuery(parsed.bookingQuery);
      if (parsed.bookingStatusFilter) setBookingStatusFilter(parsed.bookingStatusFilter);
      if (parsed.activityTypeFilter) setActivityTypeFilter(parsed.activityTypeFilter);
      if (parsed.activityQuery !== undefined) setActivityQuery(parsed.activityQuery);
      if (parsed.isLiveMode !== undefined) setIsLiveMode(parsed.isLiveMode);
      if (parsed.dispatchLaneFilter) setDispatchLaneFilter(parsed.dispatchLaneFilter);
      if (parsed.unassignedSlaMinutes) {
        setUnassignedSlaMinutes(Math.max(1, parsed.unassignedSlaMinutes));
      }
      if (parsed.staleStatusSlaMinutes) {
        setStaleStatusSlaMinutes(Math.max(1, parsed.staleStatusSlaMinutes));
      }
      if (parsed.enableDesktopAlerts !== undefined) {
        setEnableDesktopAlerts(parsed.enableDesktopAlerts);
      }
      if (parsed.enableSoundAlerts !== undefined) {
        setEnableSoundAlerts(parsed.enableSoundAlerts);
      }
      if (parsed.showResolvedIncidents !== undefined) {
        setShowResolvedIncidents(parsed.showResolvedIncidents);
      }
      if (parsed.incidentSnoozeMinutes !== undefined) {
        setIncidentSnoozeMinutes(Math.max(1, parsed.incidentSnoozeMinutes));
      }
      if (parsed.incidentQueueView) setIncidentQueueView(parsed.incidentQueueView);
      if (parsed.autoEscalateEnabled !== undefined) {
        setAutoEscalateEnabled(parsed.autoEscalateEnabled);
      }
      if (parsed.autoEscalateThresholdMinutes !== undefined) {
        setAutoEscalateThresholdMinutes(Math.max(1, parsed.autoEscalateThresholdMinutes));
      }
      if (parsed.lastBulkAcknowledgedAt !== undefined) {
        setLastBulkAcknowledgedAt(parsed.lastBulkAcknowledgedAt);
      }
    } catch {
      // ignore invalid saved state
    }
  }, [admin]);

  useEffect(() => {
    const nextTab = tabOverride ?? tab;
    if (!nextTab) return;
    const isValid = dashboardTabs.some((dashboardTab) => dashboardTab.key === nextTab);
    if (!isValid) {
      navigate(getDashboardTabPath('overview'), { replace: true });
      return;
    }
    if (nextTab !== activeTab) {
      setActiveTab(nextTab as DashboardTab);
    }
  }, [activeTab, navigate, tab, tabOverride]);

  useEffect(() => {
    if (!admin) return;
    const storageKey = `dripless_ops_filters_${admin.id}`;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        preset,
        customerQuery,
        customerStatusFilter,
        driverQuery,
        driverStatusFilter,
        driverVerificationFilter,
        bookingQuery,
        bookingStatusFilter,
        activityTypeFilter,
        activityQuery,
        isLiveMode,
        dispatchLaneFilter,
        unassignedSlaMinutes,
        staleStatusSlaMinutes,
        enableDesktopAlerts,
        enableSoundAlerts,
        showResolvedIncidents,
        incidentSnoozeMinutes,
        incidentQueueView,
        autoEscalateEnabled,
        autoEscalateThresholdMinutes,
        lastBulkAcknowledgedAt
      })
    );
  }, [
    admin,
    preset,
    customerQuery,
    customerStatusFilter,
    driverQuery,
    driverStatusFilter,
    driverVerificationFilter,
    bookingQuery,
    bookingStatusFilter,
    activityTypeFilter,
    activityQuery,
    isLiveMode,
    dispatchLaneFilter,
    unassignedSlaMinutes,
    staleStatusSlaMinutes,
    enableDesktopAlerts,
    enableSoundAlerts,
    showResolvedIncidents,
    incidentSnoozeMinutes,
    incidentQueueView,
    autoEscalateEnabled,
    autoEscalateThresholdMinutes,
    lastBulkAcknowledgedAt
  ]);

  const sortedBookings = useMemo(
    () => [...bookings].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [bookings]
  );

  const filteredCustomers = useMemo(
    () =>
      customers.filter((customer) => {
        if (customerStatusFilter !== 'ALL' && customer.status !== customerStatusFilter) {
          return false;
        }
        const needle = customerQuery.trim().toLowerCase();
        if (!needle) return true;
        return [customer.name, customer.email, customer.id].join(' ').toLowerCase().includes(needle);
      }),
    [customers, customerQuery, customerStatusFilter]
  );

  const filteredDrivers = useMemo(
    () =>
      drivers.filter((driver) => {
        if (driverStatusFilter !== 'ALL' && driver.status !== driverStatusFilter) return false;
        if (
          driverVerificationFilter !== 'ALL' &&
          driver.verificationStatus !== driverVerificationFilter
        ) {
          return false;
        }
        const needle = driverQuery.trim().toLowerCase();
        if (!needle) return true;
        return [driver.name, driver.email, driver.id, driver.vehicle]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      }),
    [drivers, driverQuery, driverStatusFilter, driverVerificationFilter]
  );

  const filteredBookings = useMemo(
    () =>
      sortedBookings.filter((booking) => {
        if (bookingStatusFilter !== 'ALL' && booking.status !== bookingStatusFilter) return false;
        const needle = bookingQuery.trim().toLowerCase();
        if (!needle) return true;
        if (needle === 'unassigned') {
          return !booking.driverId && !['COMPLETED', 'CANCELLED'].includes(booking.status);
        }
        if (needle === 'late jobs' || needle === 'late') {
          const ageMinutes = Math.floor((Date.now() - parseDateMs(booking.updatedAt)) / 60000);
          return (
            !['COMPLETED', 'CANCELLED'].includes(booking.status) &&
            ageMinutes >= unassignedSlaMinutes
          );
        }
        return [
          booking.id,
          formatBookingRef(booking),
          booking.customerName ?? '',
          booking.customerId ?? '',
          booking.driverId ?? '',
          booking.serviceName,
          booking.optionName,
          booking.pickupLocation
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      }),
    [sortedBookings, bookingStatusFilter, bookingQuery, unassignedSlaMinutes]
  );

  const filteredActivity = useMemo(
    () =>
      activity.filter((item) => {
        if (activityTypeFilter !== 'ALL' && item.type !== activityTypeFilter) return false;
        const needle = activityQuery.trim().toLowerCase();
        if (!needle) return true;
        return [item.type, item.message, item.targetId, item.actorId, item.actorRole]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      }),
    [activity, activityTypeFilter, activityQuery]
  );

  const slaAlerts = useMemo<SlaAlertItem[]>(() => {
    const now = Date.now();
    return sortedBookings
      .map((booking) => {
        const incident = incidents.find(
          (item) =>
            item.bookingId === booking.id &&
            item.status === 'SNOOZED' &&
            parseDateMs(item.snoozeUntil ?? undefined) > now
        );
        if (incident) return null;
        const ageMinutes = Math.floor((now - parseDateMs(booking.updatedAt)) / 60000);
        const needsAssignment =
          !booking.driverId &&
          ['PENDING', 'CONFIRMED', 'EN_ROUTE', 'ARRIVED'].includes(booking.status) &&
          ageMinutes >= unassignedSlaMinutes;
        const staleInExecution =
          ['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(booking.status) &&
          ageMinutes >= staleStatusSlaMinutes;
        if (!needsAssignment && !staleInExecution) return null;
        const severity: 'medium' | 'high' =
          ageMinutes >= staleStatusSlaMinutes * 2 ? 'high' : 'medium';
        return {
          booking,
          ageMinutes,
          severity,
          reason: needsAssignment
            ? `Unassigned for ${ageMinutes} min`
            : `No status change for ${ageMinutes} min`
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => b.ageMinutes - a.ageMinutes);
  }, [incidents, sortedBookings, staleStatusSlaMinutes, unassignedSlaMinutes]);

  const dispatchLanes = useMemo(() => {
    const lanes: Record<DispatchLane, BookingContract[]> = {
      DISPATCH_EXHAUSTED: [],
      UNASSIGNED: [],
      PENDING: [],
      CONFIRMED: [],
      EN_ROUTE: [],
      ARRIVED: [],
      IN_PROGRESS: [],
      COMPLETED: [],
      CANCELLED: []
    };
    for (const booking of sortedBookings) {
      if ((booking.dispatchAttemptCount ?? 0) >= MAX_AUTO_DISPATCH_ATTEMPTS) {
        lanes.DISPATCH_EXHAUSTED.push(booking);
      }
      if (!booking.driverId && booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED') {
        lanes.UNASSIGNED.push(booking);
      }
      lanes[booking.status].push(booking);
    }
    return lanes;
  }, [sortedBookings]);

  const incidentsByBooking = useMemo(() => {
    const map = new Map<string, DispatchIncident>();
    for (const incident of incidents) {
      if (!map.has(incident.bookingId)) {
        map.set(incident.bookingId, incident);
      }
    }
    return map;
  }, [incidents]);

  const sortedIncidents = useMemo(
    () => [...incidents].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [incidents]
  );

  const visibleIncidents = useMemo(() => {
    return sortedIncidents.filter((incident) => {
      if (!showResolvedIncidents && incident.status === 'RESOLVED') return false;
      if (incidentQueueView === 'mine') return incident.ownerAdminId === admin?.id;
      if (incidentQueueView === 'unassigned') return !incident.ownerAdminId;
      return true;
    });
  }, [admin?.id, incidentQueueView, showResolvedIncidents, sortedIncidents]);

  const activeIncidents = useMemo(
    () => incidents.filter((incident) => incident.status !== 'RESOLVED'),
    [incidents]
  );

  const incidentAgingBuckets = useMemo(() => {
    const now = Date.now();
    const buckets = {
      under10: 0,
      tenToThirty: 0,
      thirtyToSixty: 0,
      overSixty: 0
    };
    for (const incident of activeIncidents) {
      const minutes = Math.floor((now - parseDateMs(incident.updatedAt)) / 60000);
      if (minutes < 10) buckets.under10 += 1;
      else if (minutes < 30) buckets.tenToThirty += 1;
      else if (minutes < 60) buckets.thirtyToSixty += 1;
      else buckets.overSixty += 1;
    }
    return buckets;
  }, [activeIncidents]);

  const agentWorkload = useMemo(() => {
    const workload: Record<string, { owner: string; total: number; high: number }> = {};
    for (const incident of activeIncidents) {
      const owner = incident.ownerAdminName ?? 'Unassigned';
      if (!workload[owner]) {
        workload[owner] = { owner, total: 0, high: 0 };
      }
      workload[owner].total += 1;
      if (incident.severity === 'high') workload[owner].high += 1;
    }
    return Object.values(workload).sort((a, b) => {
      if (b.high !== a.high) return b.high - a.high;
      return b.total - a.total;
    });
  }, [activeIncidents]);

  const slaHeatmap = useMemo(() => {
    const lanes: DispatchLane[] = ['DISPATCH_EXHAUSTED', 'UNASSIGNED', ...statusOptions];
    return lanes.map((lane) => {
      const source = dispatchLanes[lane];
      const alerts = source
        .map((booking) => slaAlerts.find((alert) => alert.booking.id === booking.id))
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
      const high = alerts.filter((alert) => alert.severity === 'high').length;
      const medium = alerts.length - high;
      return {
        lane,
        total: source.length,
        high,
        medium
      };
    });
  }, [dispatchLanes, slaAlerts]);

  const exhaustedDispatchCount = dispatchLanes.DISPATCH_EXHAUSTED.length;
  const exhaustedActionableIncidentCount = useMemo(() => {
    const exhaustedBookingIds = new Set(dispatchLanes.DISPATCH_EXHAUSTED.map((booking) => booking.id));
    return incidents.filter(
      (incident) =>
        exhaustedBookingIds.has(incident.bookingId) &&
        (incident.status === 'OPEN' || incident.status === 'SNOOZED')
    ).length;
  }, [dispatchLanes.DISPATCH_EXHAUSTED, incidents]);
  const latestExhaustedUpdateAt =
    dispatchLanes.DISPATCH_EXHAUSTED.length > 0 ?
      dispatchLanes.DISPATCH_EXHAUSTED.reduce(
        (latest, booking) =>
          booking.updatedAt.localeCompare(latest) > 0 ? booking.updatedAt : latest,
        dispatchLanes.DISPATCH_EXHAUSTED[0].updatedAt
      ) :
      null;
  const latestExhaustedLabel = latestExhaustedUpdateAt ?
    new Date(latestExhaustedUpdateAt).toLocaleString() :
    null;
  const openIncidentCount = useMemo(
    () => incidents.filter((incident) => incident.status !== 'RESOLVED').length,
    [incidents]
  );
  const criticalSlaCount = useMemo(
    () => slaAlerts.filter((item) => item.severity === 'high').length,
    [slaAlerts]
  );
  const unassignedCount = dispatchLanes.UNASSIGNED.length;
  const navBadges = useMemo<NavBadgeMap>(() => {
    const dispatchCount = exhaustedDispatchCount + criticalSlaCount + unassignedCount;
    return {
      dispatch: {
        count: dispatchCount,
        tone: dispatchCount >= 3 ? 'danger' : 'warning'
      },
      incidents: {
        count: openIncidentCount,
        tone: openIncidentCount >= 3 ? 'danger' : 'warning'
      },
      inbox: {
        count: notifications.filter((item) => !item.read).length || notifications.length,
        tone: 'warning'
      },
      unassigned: {
        count: unassignedCount,
        tone: unassignedCount > 0 ? 'warning' : 'warning'
      },
      critical: {
        count: criticalSlaCount + exhaustedDispatchCount,
        tone: 'danger'
      }
    };
  }, [
    criticalSlaCount,
    exhaustedDispatchCount,
    notifications,
    openIncidentCount,
    unassignedCount
  ]);

  useEffect(() => {
    if (!isLiveMode) return;
    const critical = slaAlerts.filter((item) => item.severity === 'high');
    if (critical.length === 0) return;
    const signature = critical.map((item) => item.booking.id).join('|');
    if (signature === lastAlertSignatureRef.current) return;
    lastAlertSignatureRef.current = signature;

    if (enableDesktopAlerts && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('Dripless Dispatch Alert', {
        body: `${critical.length} critical SLA alert(s) need immediate attention.`
      });
    }
    if (enableSoundAlerts) {
      playAlertSound();
    }
  }, [enableDesktopAlerts, enableSoundAlerts, isLiveMode, slaAlerts]);

  useEffect(() => {
    if (!isLiveMode || !autoEscalateEnabled || !admin || !canManageIncidents) return;
    const now = Date.now();
    const dueIncident = visibleIncidents.find((incident) => {
      if (incident.status === 'RESOLVED' || incident.status === 'SNOOZED') return false;
      const ageMinutes = Math.floor((now - parseDateMs(incident.updatedAt)) / 60000);
      if (ageMinutes < autoEscalateThresholdMinutes) return false;
      const lastEscMinutes = incident.lastEscalatedAt ?
        Math.floor((now - parseDateMs(incident.lastEscalatedAt)) / 60000) :
        Number.POSITIVE_INFINITY;
      return lastEscMinutes >= autoEscalateThresholdMinutes;
    });
    if (!dueIncident) return;
    void adminApi
      .escalateIncident({
        incidentId: dueIncident.id,
        actorId: admin.id,
        actorName: admin.name,
        note: 'Auto escalation from live dispatch monitor'
      })
      .then(async () => {
        setLastEscalatedAt(new Date().toISOString());
        await loadDashboard();
      });
  }, [
    admin,
    autoEscalateEnabled,
    autoEscalateThresholdMinutes,
    canManageIncidents,
    isLiveMode,
    loadDashboard,
    visibleIncidents
  ]);

  useEffect(() => setCustomerPage(1), [customerQuery, customerStatusFilter]);
  useEffect(() => setDriverPage(1), [driverQuery, driverStatusFilter, driverVerificationFilter]);
  useEffect(() => setBookingPage(1), [bookingQuery, bookingStatusFilter]);
  useEffect(() => setActivityPage(1), [activityTypeFilter, activityQuery]);

  const currentCustomers = useMemo(
    () => paginate(filteredCustomers, customerPage),
    [filteredCustomers, customerPage]
  );
  const currentDrivers = useMemo(
    () => paginate(filteredDrivers, driverPage),
    [filteredDrivers, driverPage]
  );
  const currentBookings = useMemo(
    () => paginate(filteredBookings, bookingPage),
    [filteredBookings, bookingPage]
  );
  const currentActivity = useMemo(
    () => paginate(filteredActivity, activityPage),
    [filteredActivity, activityPage]
  );
  const currentNotifications = useMemo(
    () => paginate(notifications, notificationPage),
    [notifications, notificationPage]
  );

  const applyPreset = (nextPreset: OpsPreset) => {
    setPreset(nextPreset);
    if (nextPreset === 'dispatcher') {
      setIsLiveMode(true);
      setDispatchLaneFilter('UNASSIGNED');
      setEnableSoundAlerts(true);
      setIncidentQueueView('all');
    } else if (nextPreset === 'support') {
      setIsLiveMode(true);
      setIncidentQueueView('mine');
      setBookingStatusFilter('ALL');
      setCustomerStatusFilter('ALL');
    } else if (nextPreset === 'compliance') {
      setIsLiveMode(false);
      setDriverVerificationFilter('PENDING');
      setDriverStatusFilter('ALL');
    } else {
      setIsLiveMode(true);
      setDispatchLaneFilter('ALL');
      setIncidentQueueView('all');
      setDriverVerificationFilter('ALL');
      setBookingStatusFilter('ALL');
    }
    navigateToTab(presetLandingTab[nextPreset]);
    setFeedback(
      `Workspace: ${presetLabel[nextPreset]}. Layout and shortcuts updated — your permissions are unchanged.`
    );
  };

  const runGlobalSearch = () => {
    const needle = globalSearch.trim().toLowerCase();
    if (!needle) return;

    if (needle === 'unassigned' || needle === 'late jobs') {
      setDispatchLaneFilter(needle === 'unassigned' ? 'UNASSIGNED' : 'ALL');
      if (needle === 'late jobs') setBookingStatusFilter('ALL');
      navigateToTab('dispatch');
      setFeedback(
        needle === 'unassigned' ? 'Showing unassigned dispatch lane.' : 'Opened dispatch for late jobs review.'
      );
      return;
    }

    const bookingHit = sortedBookings.find((booking) => {
      const ref = formatBookingRef(booking).toLowerCase();
      return (
        booking.id.toLowerCase().includes(needle) ||
        ref.includes(needle) ||
        (booking.customerName ?? '').toLowerCase().includes(needle) ||
        (booking.customerId ?? '').toLowerCase().includes(needle) ||
        (booking.driverId ?? '').toLowerCase().includes(needle) ||
        booking.pickupLocation.toLowerCase().includes(needle)
      );
    });
    if (bookingHit) {
      setBookingQuery(bookingHit.id);
      setContextBookingId(bookingHit.id);
      navigateToTab('bookings');
      setFeedback(`Opened job ${formatBookingRef(bookingHit)}.`);
      return;
    }

    const customerHit = customers.find((customer) =>
      [customer.name, customer.email, customer.phone ?? '', customer.id]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
    if (customerHit) {
      setCustomerQuery(customerHit.name || customerHit.email);
      navigateToTab('customers');
      setFeedback(`Opened customer ${customerHit.name}.`);
      return;
    }

    const driverHit = drivers.find((driver) =>
      [driver.name, driver.email, driver.vehicle, driver.id].join(' ').toLowerCase().includes(needle)
    );
    if (driverHit) {
      setDriverQuery(driverHit.name || driverHit.vehicle);
      navigateToTab('drivers');
      setFeedback(`Opened driver ${driverHit.name}.`);
      return;
    }

    const incidentHit = incidents.find((incident) =>
      [incident.id, incident.bookingId, incident.reason].join(' ').toLowerCase().includes(needle)
    );
    if (incidentHit) {
      navigateToTab('incidents');
      setFeedback(`Found incident for booking ${incidentHit.bookingId}.`);
      return;
    }

    setFeedback('No matching booking, customer, driver, or incident.');
  };

  const updateBooking = async (bookingId: string, status: BookingStatus, reason?: string) => {
    if (!admin || !hasPermission('bookings:update')) return;
    await adminApi.updateBookingStatusAsAdmin({
      bookingId,
      status,
      adminId: admin.id,
      reason: reason?.trim() || 'Ops dashboard manual update'
    });
    setFeedback(`Booking ${formatBookingRef({ id: bookingId, createdAt: '' })} moved to ${status}.`);
    await loadDashboard();
  };

  const applyBulkStatus = async (reason: string) => {
    if (!admin || !hasPermission('bookings:update')) return;
    const bookingIds = Object.entries(selectedBookings)
      .filter(([, selected]) => selected)
      .map(([bookingId]) => bookingId);
    if (bookingIds.length === 0) return;
    await adminApi.bulkUpdateBookingStatus({
      bookingIds,
      status: bulkStatus,
      adminId: admin.id,
      reason: reason.trim() || 'Bulk booking status update'
    });
    setSelectedBookings({});
    setFeedback(`Updated ${bookingIds.length} bookings to ${bulkStatus}.`);
    await loadDashboard();
  };

  const recommendDrivers = async (bookingId: string) => {
    if (!hasPermission('bookings:assign')) return;
    const items = await adminApi.getDriverRecommendations(bookingId, 3);
    setRecommendationsByBooking((prev) => ({ ...prev, [bookingId]: items }));
    if (items[0]) {
      setSelectedDriverByBooking((prev) => ({ ...prev, [bookingId]: items[0].driverId }));
    }
  };

  const updateCustomerStatus = async (
    customerId: string,
    status: AccountStatus,
    reason?: string
  ) => {
    if (!admin || !hasPermission('customers:update')) return;
    await adminApi.updateCustomerStatus({
      customerId,
      status,
      actorId: admin.id,
      reason: reason?.trim() || 'Managed from ops dashboard'
    });
    setFeedback(`Customer status changed to ${status}.`);
    await loadDashboard();
  };

  const updateDriverStatus = async (
    driverId: string,
    status: AccountStatus,
    reason?: string
  ) => {
    if (!admin || !hasPermission('drivers:update')) return;
    await adminApi.updateDriverStatus({
      driverId,
      status,
      actorId: admin.id,
      reason: reason?.trim() || 'Managed from ops dashboard'
    });
    setFeedback(`Driver status changed to ${status}.`);
    await loadDashboard();
  };

  const updateDriverVerification = async (
    driverId: string,
    verificationStatus: DriverVerificationStatus,
    reason?: string
  ) => {
    if (!admin || !hasPermission('drivers:verify')) return;
    await adminApi.updateDriverVerification({
      driverId,
      verificationStatus,
      actorId: admin.id,
      reason: reason?.trim() || 'Document review from ops dashboard'
    });
    setFeedback(`Driver verification set to ${verificationStatus}.`);
    await loadDashboard();
  };

  const assignDriver = async (bookingId: string, driverIdOverride?: string) => {
    if (!admin || !hasPermission('bookings:assign')) return;
    const selectedDriver = driverIdOverride || selectedDriverByBooking[bookingId];
    if (!selectedDriver) return;
    if (driverIdOverride) {
      setSelectedDriverByBooking((prev) => ({ ...prev, [bookingId]: driverIdOverride }));
    }
    await adminApi.assignBookingDriver({
      bookingId,
      driverId: selectedDriver,
      actorId: admin.id,
      reason: 'Live assignment from ops dashboard'
    });
    setFeedback(`Assigned ${formatBookingRef({ id: bookingId, createdAt: '' })} successfully.`);
    await loadDashboard();
  };

  const broadcast = async () => {
    if (!hasPermission('notifications:broadcast')) return;
    const targetRoles: ('customer' | 'driver' | 'ops_admin')[] = [];
    if (targetCustomer) targetRoles.push('customer');
    if (targetDriver) targetRoles.push('driver');
    if (targetOps) targetRoles.push('ops_admin');
    if (!broadcastMessage.trim() || targetRoles.length === 0) return;
    await adminApi.broadcastNotification({
      title: broadcastTitle.trim() || 'Ops announcement',
      message: broadcastMessage,
      targetRoles,
      type: broadcastType
    });
    setFeedback(`Broadcast sent to ${targetRoles.join(', ')}.`);
    setBroadcastMessage('');
    await loadDashboard();
  };

  const resetSpecialForm = () => {
    setEditingSpecialId(null);
    setSpecialTitle('');
    setSpecialDescription('');
    setSpecialPromoCode('');
    setSpecialAudience('customer');
    setSpecialScope('ALL');
    setSpecialDiscountType('PERCENT');
    setSpecialDiscountValue(10);
    setSpecialStartsAt('');
    setSpecialEndsAt('');
    setSpecialTerms('');
  };

  const loadSpecialForEdit = (special: OpsSpecial) => {
    setEditingSpecialId(special.id);
    setSpecialTitle(special.title);
    setSpecialDescription(special.description);
    setSpecialPromoCode(special.promoCode);
    setSpecialAudience(special.audience);
    setSpecialScope(special.serviceScope);
    setSpecialDiscountType(special.discountType);
    setSpecialDiscountValue(special.discountValue);
    setSpecialStartsAt(new Date(special.startsAt).toISOString().slice(0, 16));
    setSpecialEndsAt(new Date(special.endsAt).toISOString().slice(0, 16));
    setSpecialTerms(special.termsAndConditions);
  };

  const createSpecial = async () => {
    if (!admin || !canManageSpecials) return;
    if (
      !specialTitle.trim() ||
      !specialDescription.trim() ||
      !specialPromoCode.trim() ||
      !specialStartsAt ||
      !specialEndsAt ||
      !specialTerms.trim()
    ) {
      setError('Please complete all special campaign fields.');
      return;
    }
    if (new Date(specialStartsAt).getTime() >= new Date(specialEndsAt).getTime()) {
      setError('Special end time must be after start time.');
      return;
    }
    if (editingSpecialId) {
      await adminApi.updateSpecial({
        specialId: editingSpecialId,
        title: specialTitle.trim(),
        description: specialDescription.trim(),
        promoCode: specialPromoCode.trim().toUpperCase(),
        audience: specialAudience,
        serviceScope: specialScope,
        discountType: specialDiscountType,
        discountValue: specialDiscountValue,
        startsAt: new Date(specialStartsAt).toISOString(),
        endsAt: new Date(specialEndsAt).toISOString(),
        termsAndConditions: specialTerms.trim(),
        actorId: admin.id
      });
      setFeedback('Special updated.');
    } else {
      await adminApi.createSpecial({
        title: specialTitle.trim(),
        description: specialDescription.trim(),
        promoCode: specialPromoCode.trim().toUpperCase(),
        audience: specialAudience,
        serviceScope: specialScope,
        discountType: specialDiscountType,
        discountValue: specialDiscountValue,
        startsAt: new Date(specialStartsAt).toISOString(),
        endsAt: new Date(specialEndsAt).toISOString(),
        termsAndConditions: specialTerms.trim(),
        actorId: admin.id,
        actorName: admin.name
      });
      setFeedback('Special saved as draft. Approve and activate to publish.');
    }
    resetSpecialForm();
    setError('');
    await loadDashboard();
  };

  const approveSpecial = async (specialId: string) => {
    if (!admin || !canManageSpecials) return;
    await adminApi.approveSpecial({
      specialId,
      actorId: admin.id
    });
    setFeedback(`Special ${specialId} approved.`);
    await loadDashboard();
  };

  const setSpecialActivation = async (specialId: string, isActive: boolean) => {
    if (!admin || !canManageSpecials) return;
    await adminApi.setSpecialActivation({
      specialId,
      actorId: admin.id,
      isActive
    });
    setFeedback(`Special ${specialId} ${isActive ? 'activated' : 'deactivated'}.`);
    await loadDashboard();
  };

  const deleteSpecial = async (specialId: string) => {
    if (!admin || !canManageSpecials) return;
    await adminApi.deleteSpecial({
      specialId,
      actorId: admin.id
    });
    if (editingSpecialId === specialId) {
      resetSpecialForm();
    }
    setFeedback(`Special ${specialId} deleted.`);
    await loadDashboard();
  };

  const requestDesktopAlertPermission = async () => {
    if (typeof Notification === 'undefined') {
      setFeedback('Desktop notifications are not supported in this browser.');
      return;
    }
    const permission =
      Notification.permission === 'default' ?
      await Notification.requestPermission() :
      Notification.permission;
    if (permission === 'granted') {
      setEnableDesktopAlerts(true);
      setFeedback('Desktop alerts enabled.');
      return;
    }
    setEnableDesktopAlerts(false);
    setFeedback('Desktop alert permission denied.');
  };

  const escalateCriticalAlerts = async () => {
    if (!hasPermission('notifications:broadcast')) return;
    const critical = slaAlerts.filter((item) => item.severity === 'high');
    if (critical.length === 0) {
      setFeedback('No critical SLA alerts to escalate.');
      return;
    }
    const incidents = critical
      .slice(0, 5)
      .map((item) => `${item.booking.id} (${item.reason})`)
      .join('; ');
    await adminApi.broadcastNotification({
      title: 'Critical Dispatch Escalation',
      message: `Immediate intervention required: ${incidents}`,
      targetRoles: ['ops_admin'],
      type: 'error'
    });
    setLastEscalatedAt(new Date().toISOString());
    setFeedback(`Escalated ${critical.length} critical SLA alerts to ops admins.`);
    await loadDashboard();
  };

  const createIncident = async (bookingId: string, reason: string, severity: 'medium' | 'high') => {
    if (!admin || !canManageIncidents) return;
    await adminApi.createIncidentFromAlert({
      bookingId,
      reason,
      severity,
      actorId: admin.id
    });
    setFeedback(`Incident tracked for booking ${bookingId}.`);
    await loadDashboard();
  };

  const assignIncidentToMe = async (incidentId: string) => {
    if (!admin || !canManageIncidents) return;
    await adminApi.assignIncidentToSelf({
      incidentId,
      adminId: admin.id,
      adminName: admin.name
    });
    setFeedback('Incident assigned to you.');
    await loadDashboard();
  };

  const acknowledgeIncidentAction = async (incidentId: string) => {
    if (!admin || !canManageIncidents) return;
    await adminApi.acknowledgeIncident({
      incidentId,
      actorId: admin.id,
      note: 'Acknowledged from dispatch board'
    });
    setFeedback('Incident acknowledged.');
    await loadDashboard();
  };

  const acknowledgeExhaustedIncidentsAction = async () => {
    if (!admin || !canManageIncidents || isAcknowledgingExhaustedIncidents) return;
    const exhaustedBookingIds = new Set(dispatchLanes.DISPATCH_EXHAUSTED.map((booking) => booking.id));
    const incidentsToAcknowledge = incidents.filter(
      (incident) =>
        exhaustedBookingIds.has(incident.bookingId) &&
        (incident.status === 'OPEN' || incident.status === 'SNOOZED')
    );
    if (incidentsToAcknowledge.length === 0) {
      setFeedback('No exhausted incidents require acknowledgement.');
      return;
    }
    const shouldProceed = window.confirm(
      `Acknowledge ${incidentsToAcknowledge.length} exhausted incident(s)?`
    );
    if (!shouldProceed) return;
    setIsAcknowledgingExhaustedIncidents(true);
    try {
      await Promise.all(
        incidentsToAcknowledge.map((incident) =>
          adminApi.acknowledgeIncident({
            incidentId: incident.id,
            actorId: admin.id,
            note: 'Bulk acknowledged from exhausted dispatch action'
          })
        )
      );
      setLastBulkAcknowledgedAt(new Date().toISOString());
      setFeedback(`Acknowledged ${incidentsToAcknowledge.length} exhausted incident(s).`);
      await loadDashboard();
    } finally {
      setIsAcknowledgingExhaustedIncidents(false);
    }
  };

  const clearBulkAcknowledgementMarker = () => {
    if (!canManageIncidents) return;
    setLastBulkAcknowledgedAt(null);
    setFeedback('Bulk acknowledgement audit marker cleared.');
  };

  const snoozeIncidentAction = async (incidentId: string) => {
    if (!admin || !canManageIncidents) return;
    await adminApi.snoozeIncident({
      incidentId,
      actorId: admin.id,
      snoozeMinutes: incidentSnoozeMinutes,
      note: 'Snoozed from dispatch board'
    });
    setFeedback(`Incident snoozed for ${incidentSnoozeMinutes} minutes.`);
    await loadDashboard();
  };

  const resolveIncidentAction = async (incidentId: string) => {
    if (!admin || !canManageIncidents) return;
    await adminApi.resolveIncident({
      incidentId,
      actorId: admin.id,
      note: 'Resolved by ops'
    });
    setFeedback('Incident resolved.');
    await loadDashboard();
  };

  const escalateIncidentAction = async (incidentId: string) => {
    if (!admin || !canManageIncidents) return;
    await adminApi.escalateIncident({
      incidentId,
      actorId: admin.id,
      actorName: admin.name,
      note: 'Manual escalation from dispatch incident queue'
    });
    setLastEscalatedAt(new Date().toISOString());
    setFeedback('Incident escalated to on-call ops.');
    await loadDashboard();
  };

  const openTimeline = async (bookingId: string) => {
    setSelectedTimelineBookingId(bookingId);
    const timeline = await adminApi.getBookingTimeline(bookingId);
    setBookingTimeline(timeline);
  };

  const openDispatchExhaustedLane = () => {
    setDispatchLaneFilter('DISPATCH_EXHAUSTED');
    navigateToTab('dispatch');
  };

  const exportCustomers = () =>
    downloadCsv(
      'ops-customers.csv',
      toCsv(
        ['id', 'name', 'email', 'status', 'walletBalance', 'ecoPoints', 'createdAt'],
        filteredCustomers.map((item) => [
          item.id,
          item.name,
          item.email,
          item.status,
          String(item.walletBalance),
          String(item.ecoPoints),
          item.createdAt
        ])
      )
    );

  const exportDrivers = () =>
    downloadCsv(
      'ops-drivers.csv',
      toCsv(
        ['id', 'name', 'email', 'status', 'verificationStatus', 'vehicle', 'activeBookingId'],
        filteredDrivers.map((item) => [
          item.id,
          item.name,
          item.email,
          item.status,
          item.verificationStatus,
          item.vehicle,
          item.activeBookingId ?? ''
        ])
      )
    );

  const exportBookings = () =>
    downloadCsv(
      'ops-bookings.csv',
      toCsv(
        [
          'id',
          'serviceName',
          'status',
          'customerId',
          'driverId',
          'price',
          'basePrice',
          'specialDiscountAmount',
          'appliedSpecialPromoCode',
          'scheduledAt',
          'updatedAt'
        ],
        filteredBookings.map((item) => [
          item.id,
          item.serviceName,
          item.status,
          item.customerId ?? '',
          item.driverId ?? '',
          String(item.price),
          String(item.basePrice ?? item.price),
          String(item.specialDiscountAmount ?? 0),
          item.appliedSpecialPromoCode ?? '',
          item.scheduledAt,
          item.updatedAt
        ])
      )
    );

  const exportSpecials = () =>
    downloadCsv(
      'ops-specials.csv',
      toCsv(
        [
          'id',
          'title',
          'promoCode',
          'audience',
          'serviceScope',
          'discountType',
          'discountValue',
          'approved',
          'isActive',
          'redemptionCount',
          'startsAt',
          'endsAt',
          'lastRedeemedAt',
          'updatedAt'
        ],
        specials.map((special) => [
          special.id,
          special.title,
          special.promoCode,
          special.audience,
          special.serviceScope,
          special.discountType,
          String(special.discountValue),
          String(special.approved),
          String(special.isActive),
          String(special.redemptionCount ?? 0),
          special.startsAt,
          special.endsAt,
          special.lastRedeemedAt ?? '',
          special.updatedAt
        ])
      )
    );

  const specialRedemptionsInRange = useMemo(() => {
    const fromTs = parseDateMs(toStartOfDayIso(analyticsFrom));
    const toTs = parseDateMs(toEndOfDayIso(analyticsTo));
    return activity.filter((item) => {
      if (item.type !== 'SPECIAL_REDEEMED') return false;
      const ts = parseDateMs(item.createdAt);
      return ts >= fromTs && ts <= toTs;
    });
  }, [activity, analyticsFrom, analyticsTo]);

  const specialsById = useMemo(
    () =>
      specials.reduce<Record<string, (typeof specials)[number]>>((acc, special) => {
        acc[special.id] = special;
        return acc;
      }, {}),
    [specials]
  );

  const topSpecialsByRange = useMemo(() => {
    const counts = specialRedemptionsInRange.reduce<Record<string, number>>((acc, item) => {
      acc[item.targetId] = (acc[item.targetId] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([specialId, count]) => ({
        specialId,
        title: specialsById[specialId]?.title ?? specialId,
        promoCode: specialsById[specialId]?.promoCode ?? 'N/A',
        count
      }))
      .sort((a, b) => b.count - a.count);
  }, [specialRedemptionsInRange, specialsById]);

  const audienceBreakdownInRange = useMemo(() => {
    const counts = specialRedemptionsInRange.reduce<Record<string, number>>((acc, item) => {
      const audience = specialsById[item.targetId]?.audience ?? 'unknown';
      acc[audience] = (acc[audience] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([audience, count]) => ({ audience, count }))
      .sort((a, b) => b.count - a.count);
  }, [specialRedemptionsInRange, specialsById]);

  const serviceScopeBreakdownInRange = useMemo(() => {
    const counts = specialRedemptionsInRange.reduce<Record<string, number>>((acc, item) => {
      const serviceScope = specialsById[item.targetId]?.serviceScope ?? 'unknown';
      acc[serviceScope] = (acc[serviceScope] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([serviceScope, count]) => ({ serviceScope, count }))
      .sort((a, b) => b.count - a.count);
  }, [specialRedemptionsInRange, specialsById]);

  const exportSpecialRedemptions = () =>
    downloadCsv(
      'ops-special-redemptions.csv',
      toCsv(
        [
          'timestamp',
          'specialId',
          'title',
          'promoCode',
          'audience',
          'serviceScope',
          'actorRole',
          'actorId'
        ],
        specialRedemptionsInRange.map((item) => [
          item.createdAt,
          item.targetId,
          specialsById[item.targetId]?.title ?? item.targetId,
          specialsById[item.targetId]?.promoCode ?? '',
          specialsById[item.targetId]?.audience ?? '',
          specialsById[item.targetId]?.serviceScope ?? '',
          item.actorRole,
          item.actorId
        ])
      )
    );

  const attentionItems = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];
    const oldUnassigned = dispatchLanes.UNASSIGNED.filter((booking) => {
      const age = Math.floor((Date.now() - parseDateMs(booking.updatedAt)) / 60000);
      return age >= unassignedSlaMinutes;
    });
    if (oldUnassigned.length > 0) {
      items.push({
        id: 'unassigned-stale',
        severity: 'critical',
        title: `${oldUnassigned.length} unassigned job(s) older than ${unassignedSlaMinutes} min`,
        detail: oldUnassigned
          .slice(0, 3)
          .map((b) => formatBookingRef(b))
          .join(', '),
        actionLabel: 'Open dispatch',
        onAction: () => {
          setDispatchLaneFilter('UNASSIGNED');
          navigateToTab('dispatch');
        }
      });
    }
    if (exhaustedDispatchCount > 0) {
      items.push({
        id: 'exhausted',
        severity: 'critical',
        title: `${exhaustedDispatchCount} dispatch-exhausted job(s)`,
        detail: latestExhaustedLabel ? `Last update ${latestExhaustedLabel}` : 'Manual assignment required',
        actionLabel: 'Open exhausted lane',
        onAction: openDispatchExhaustedLane
      });
    }
    const unownedHigh = incidents.filter(
      (incident) =>
        incident.status !== 'RESOLVED' && incident.severity === 'high' && !incident.ownerAdminId
    );
    if (unownedHigh.length > 0) {
      items.push({
        id: 'unowned-incidents',
        severity: 'critical',
        title: `${unownedHigh.length} high-priority incident(s) unowned`,
        detail: 'Assign an operator before SLA ages further',
        actionLabel: 'Open incidents',
        onAction: () => navigateToTab('incidents')
      });
    }
    if (criticalSlaCount > 0) {
      items.push({
        id: 'sla-high',
        severity: 'warning',
        title: `${criticalSlaCount} high SLA breach(es)`,
        detail: slaAlerts
          .filter((a) => a.severity === 'high')
          .slice(0, 3)
          .map((a) => `${formatBookingRef(a.booking)} · ${a.reason}`)
          .join('; '),
        actionLabel: 'Review SLA',
        onAction: () => navigateToTab('dispatch')
      });
    }
    const startingSoon = sortedBookings.filter((booking) => {
      if (['COMPLETED', 'CANCELLED'].includes(booking.status)) return false;
      const mins = Math.floor((parseDateMs(booking.scheduledAt) - Date.now()) / 60000);
      return mins >= 0 && mins <= 30;
    });
    if (startingSoon.length > 0) {
      items.push({
        id: 'starting-soon',
        severity: 'warning',
        title: `${startingSoon.length} job(s) scheduled in the next 30 minutes`,
        detail: startingSoon
          .slice(0, 3)
          .map((b) => formatBookingRef(b))
          .join(', '),
        actionLabel: 'Open jobs',
        onAction: () => navigateToTab('bookings')
      });
    }
    if ((summary?.pendingDriverVerifications ?? 0) > 0) {
      items.push({
        id: 'driver-verify',
        severity: 'warning',
        title: `${summary!.pendingDriverVerifications} driver verification(s) pending`,
        detail: 'Compliance queue needs review',
        actionLabel: 'Open drivers',
        onAction: () => navigateToTab('drivers')
      });
    }
    return items;
  }, [
    criticalSlaCount,
    dispatchLanes.UNASSIGNED,
    exhaustedDispatchCount,
    incidents,
    latestExhaustedLabel,
    navigateToTab,
    openDispatchExhaustedLane,
    slaAlerts,
    sortedBookings,
    summary,
    unassignedSlaMinutes
  ]);

  const commandKpis = useMemo(() => {
    if (!summary) return [];
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const jobsToday = sortedBookings.filter(
      (b) => parseDateMs(b.createdAt) >= startOfDay.getTime() || parseDateMs(b.scheduledAt) >= startOfDay.getTime()
    ).length;
    const availableDrivers = drivers.filter(
      (d) =>
        d.status === 'ACTIVE' &&
        d.verificationStatus === 'VERIFIED' &&
        !d.activeBookingId
    ).length;
    const openIncidents = incidents.filter((i) => i.status !== 'RESOLVED').length;
    return [
      {
        key: 'jobsToday',
        label: 'Jobs today',
        value: jobsToday,
        onClick: () => navigateToTab('bookings')
      },
      {
        key: 'active',
        label: 'Active jobs',
        value: summary.activeBookings,
        onClick: () => {
          setBookingStatusFilter('IN_PROGRESS');
          navigateToTab('bookings');
        }
      },
      {
        key: 'unassigned',
        label: 'Unassigned',
        value: summary.unassignedBookings,
        tone: summary.unassignedBookings > 0 ? ('warn' as const) : ('default' as const),
        onClick: () => {
          setDispatchLaneFilter('UNASSIGNED');
          navigateToTab('dispatch');
        }
      },
      {
        key: 'sla',
        label: 'SLA breaches',
        value: slaAlerts.length,
        tone: criticalSlaCount > 0 ? ('danger' as const) : slaAlerts.length > 0 ? ('warn' as const) : ('default' as const),
        onClick: () => navigateToTab('dispatch')
      },
      {
        key: 'drivers',
        label: 'Drivers available',
        value: availableDrivers,
        onClick: () => navigateToTab('drivers')
      },
      {
        key: 'completed',
        label: 'Completed',
        value: summary.completedBookings,
        onClick: () => {
          setBookingStatusFilter('COMPLETED');
          navigateToTab('bookings');
        }
      },
      {
        key: 'incidents',
        label: 'Open incidents',
        value: openIncidents,
        tone: openIncidents > 0 ? ('warn' as const) : ('default' as const),
        onClick: () => navigateToTab('incidents')
      },
      {
        key: 'exhausted',
        label: 'Dispatch exhausted',
        value: exhaustedDispatchCount,
        tone: exhaustedDispatchCount > 0 ? ('danger' as const) : ('default' as const),
        onClick: openDispatchExhaustedLane
      },
      {
        key: 'verify',
        label: 'Verifications',
        value: summary.pendingDriverVerifications,
        tone: summary.pendingDriverVerifications > 0 ? ('warn' as const) : ('default' as const),
        onClick: () => navigateToTab('drivers')
      }
    ];
  }, [
    criticalSlaCount,
    drivers,
    exhaustedDispatchCount,
    incidents,
    navigateToTab,
    openDispatchExhaustedLane,
    slaAlerts.length,
    sortedBookings,
    summary
  ]);

  const breadcrumbs = useMemo(() => {
    const crumbs = ['Dripless Ops', activeTabMeta.label];
    if (contextBookingId) {
      const booking = bookings.find((b) => b.id === contextBookingId);
      crumbs.push(booking ? formatBookingRef(booking) : contextBookingId);
    }
    return crumbs;
  }, [activeTabMeta.label, bookings, contextBookingId]);

  if (isLoading || !summary) {
    return (
      <div className="container">
        <div className="card">Loading operations dashboard…</div>
      </div>
    );
  }

  const myIncidents = sortedIncidents.filter(
    (incident) =>
      incident.status !== 'RESOLVED' &&
      (incident.ownerAdminId === admin?.id || !incident.ownerAdminId)
  );

  return (
    <OpsShell
      activeTab={activeTab}
      permissions={admin?.permissions ?? []}
      badges={navBadges}
      adminEmail={admin?.email ?? ''}
      adminName={admin?.name}
      preset={preset}
      liveMode={isLiveMode}
      onLiveModeChange={setIsLiveMode}
      onLogout={logout}
      onPresetSelect={applyPreset}
      globalSearch={globalSearch}
      onGlobalSearchChange={setGlobalSearch}
      onGlobalSearchSubmit={runGlobalSearch}
      onRefresh={() => void loadDashboard()}
      breadcrumbs={breadcrumbs}
      feedback={feedback}
      error={error}
      lastSyncedAt={lastSyncedAt}
      isRefreshing={isRefreshing}>
      {!canAccessActiveTab ? (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Access restricted</h2>
          <p className="muted">
            Your permissions do not include {activeTabMeta.label}. Contact a supervisor if you need
            access.
          </p>
          <button type="button" onClick={() => navigateToTab('overview')}>
            Go to Command Centre
          </button>
        </div>
      ) : null}

      {canAccessActiveTab && activeTab === 'overview' ? (
        <OverviewSection
          analytics={analytics}
          kpis={commandKpis}
          attention={attentionItems}
          activity={activity}
          notifications={notifications}
          bookings={sortedBookings}
          driverLocations={driverLocations}
          openIncidentCount={openIncidentCount}
          liveMode={isLiveMode}
          canBroadcast={hasPermission('notifications:broadcast')}
          analyticsFrom={analyticsFrom}
          analyticsTo={analyticsTo}
          onAnalyticsFromChange={setAnalyticsFrom}
          onAnalyticsToChange={setAnalyticsTo}
          onRefreshAnalytics={() => void loadAnalytics()}
          onNavigate={navigateToTab}
          broadcastTitle={broadcastTitle}
          broadcastMessage={broadcastMessage}
          broadcastType={broadcastType}
          targetCustomer={targetCustomer}
          targetDriver={targetDriver}
          targetOps={targetOps}
          onBroadcastTitleChange={setBroadcastTitle}
          onBroadcastMessageChange={setBroadcastMessage}
          onBroadcastTypeChange={setBroadcastType}
          onTargetCustomerChange={setTargetCustomer}
          onTargetDriverChange={setTargetDriver}
          onTargetOpsChange={setTargetOps}
          onBroadcast={() => {
            void broadcast();
          }}
        />
      ) : null}

      {canAccessActiveTab && activeTab === 'specials' ? (
        <SpecialsSection
          specials={specials}
          canManageSpecials={canManageSpecials}
          specialTitle={specialTitle}
          specialDescription={specialDescription}
          specialPromoCode={specialPromoCode}
          specialAudience={specialAudience}
          specialScope={specialScope}
          specialDiscountType={specialDiscountType}
          specialDiscountValue={specialDiscountValue}
          specialStartsAt={specialStartsAt}
          specialEndsAt={specialEndsAt}
          specialTerms={specialTerms}
          onSpecialTitleChange={setSpecialTitle}
          onSpecialDescriptionChange={setSpecialDescription}
          onSpecialPromoCodeChange={(value) => setSpecialPromoCode(value.toUpperCase())}
          onSpecialAudienceChange={setSpecialAudience}
          onSpecialScopeChange={setSpecialScope}
          onSpecialDiscountTypeChange={setSpecialDiscountType}
          onSpecialDiscountValueChange={setSpecialDiscountValue}
          onSpecialStartsAtChange={setSpecialStartsAt}
          onSpecialEndsAtChange={setSpecialEndsAt}
          onSpecialTermsChange={setSpecialTerms}
          editingSpecialId={editingSpecialId}
          onCreateSpecial={() => {
            void createSpecial();
          }}
          onExportSpecials={exportSpecials}
          onExportSpecialRedemptions={exportSpecialRedemptions}
          onCancelEdit={resetSpecialForm}
          onApproveSpecial={(specialId) => {
            void approveSpecial(specialId);
          }}
          onSetActivation={(specialId, isActive) => {
            void setSpecialActivation(specialId, isActive);
          }}
          onLoadSpecialForEdit={loadSpecialForEdit}
          onDeleteSpecial={(specialId) => {
            void deleteSpecial(specialId);
          }}
          specialsRedemptionsInRange={specialRedemptionsInRange.length}
          topSpecialsByRange={topSpecialsByRange}
          audienceBreakdownInRange={audienceBreakdownInRange}
          serviceScopeBreakdownInRange={serviceScopeBreakdownInRange}
        />
      ) : null}

      {canAccessActiveTab && activeTab === 'customers' ? (
        <CustomersSection
          customerQuery={customerQuery}
          customerStatusFilter={customerStatusFilter}
          accountStatusOptions={accountStatusOptions}
          currentCustomers={currentCustomers}
          bookings={sortedBookings}
          customerPage={customerPage}
          customerTotalPages={pageCount(filteredCustomers)}
          canUpdateCustomers={hasPermission('customers:update')}
          onCustomerQueryChange={setCustomerQuery}
          onCustomerStatusFilterChange={setCustomerStatusFilter}
          onExportCustomers={exportCustomers}
          onUpdateCustomerStatus={(customerId, status, reason) => {
            void updateCustomerStatus(customerId, status, reason);
          }}
          onPreviousCustomerPage={() => setCustomerPage((prev) => Math.max(1, prev - 1))}
          onNextCustomerPage={() =>
            setCustomerPage((prev) => Math.min(pageCount(filteredCustomers), prev + 1))
          }
          canGoPreviousCustomerPage={customerPage > 1}
          canGoNextCustomerPage={customerPage < pageCount(filteredCustomers)}
        />
      ) : null}

      {canAccessActiveTab && activeTab === 'drivers' ? (
        <DriversSection
          driverQuery={driverQuery}
          driverStatusFilter={driverStatusFilter}
          driverVerificationFilter={driverVerificationFilter}
          accountStatusOptions={accountStatusOptions}
          verificationStatusOptions={verificationStatusOptions}
          currentDrivers={currentDrivers}
          allDrivers={drivers}
          bookings={sortedBookings}
          driverLocations={driverLocations}
          driverPage={driverPage}
          driverTotalPages={pageCount(filteredDrivers)}
          canUpdateDrivers={hasPermission('drivers:update')}
          canVerifyDrivers={hasPermission('drivers:verify')}
          onDriverQueryChange={setDriverQuery}
          onDriverStatusFilterChange={setDriverStatusFilter}
          onDriverVerificationFilterChange={setDriverVerificationFilter}
          onExportDrivers={exportDrivers}
          onUpdateDriverStatus={(driverId, status, reason) => {
            void updateDriverStatus(driverId, status, reason);
          }}
          onUpdateDriverVerification={(driverId, status, reason) => {
            void updateDriverVerification(driverId, status, reason);
          }}
          onPreviousDriverPage={() => setDriverPage((prev) => Math.max(1, prev - 1))}
          onNextDriverPage={() =>
            setDriverPage((prev) => Math.min(pageCount(filteredDrivers), prev + 1))
          }
          canGoPreviousDriverPage={driverPage > 1}
          canGoNextDriverPage={driverPage < pageCount(filteredDrivers)}
        />
      ) : null}

      {canAccessActiveTab && activeTab === 'bookings' ? (
        <BookingsSection
          bookingQuery={bookingQuery}
          bookingStatusFilter={bookingStatusFilter}
          bulkStatus={bulkStatus}
          statusOptions={statusOptions}
          currentBookings={currentBookings}
          allBookings={sortedBookings}
          selectedBookings={selectedBookings}
          selectedDriverByBooking={selectedDriverByBooking}
          recommendationsByBooking={recommendationsByBooking}
          drivers={drivers}
          bookingPage={bookingPage}
          bookingTotalPages={pageCount(filteredBookings)}
          canUpdateBookings={hasPermission('bookings:update')}
          canAssignBookings={hasPermission('bookings:assign')}
          onBookingQueryChange={setBookingQuery}
          onBookingStatusFilterChange={setBookingStatusFilter}
          onBulkStatusChange={setBulkStatus}
          onExportBookings={exportBookings}
          onApplyBulkStatus={(reason) => {
            void applyBulkStatus(reason);
          }}
          onToggleBookingSelected={(bookingId, checked) => {
            setSelectedBookings((prev) => ({ ...prev, [bookingId]: checked }));
          }}
          onUpdateBookingStatus={(bookingId, status, reason) => {
            void updateBooking(bookingId, status, reason);
          }}
          onRecommendDrivers={(bookingId) => {
            void recommendDrivers(bookingId);
          }}
          onBookingDriverSelectionChange={(bookingId, driverId) => {
            setSelectedDriverByBooking((prev) => ({ ...prev, [bookingId]: driverId }));
          }}
          onAssignDriver={(bookingId, driverId) => {
            void assignDriver(bookingId, driverId);
          }}
          onPreviousBookingPage={() => setBookingPage((prev) => Math.max(1, prev - 1))}
          onNextBookingPage={() =>
            setBookingPage((prev) => Math.min(pageCount(filteredBookings), prev + 1))
          }
          canGoPreviousBookingPage={bookingPage > 1}
          canGoNextBookingPage={bookingPage < pageCount(filteredBookings)}
        />
      ) : null}

      {canAccessActiveTab && activeTab === 'dispatch' ? (
        <DispatchSection
          bookings={sortedBookings}
          driverLocations={driverLocations}
          dispatchLaneFilter={dispatchLaneFilter}
          latestExhaustedLabel={latestExhaustedLabel}
          lastBulkAcknowledgedAt={lastBulkAcknowledgedAt}
          exhaustedActionableIncidentCount={exhaustedActionableIncidentCount}
          isAcknowledgingExhaustedIncidents={isAcknowledgingExhaustedIncidents}
          statusOptions={statusOptions}
          unassignedSlaMinutes={unassignedSlaMinutes}
          staleStatusSlaMinutes={staleStatusSlaMinutes}
          enableDesktopAlerts={enableDesktopAlerts}
          enableSoundAlerts={enableSoundAlerts}
          lastEscalatedAt={lastEscalatedAt}
          slaAlerts={slaAlerts}
          dispatchLanes={dispatchLanes}
          incidentsByBooking={incidentsByBooking}
          selectedDriverByBooking={selectedDriverByBooking}
          recommendationsByBooking={recommendationsByBooking}
          drivers={drivers}
          slaHeatmap={slaHeatmap}
          incidentAgingBuckets={incidentAgingBuckets}
          agentWorkload={agentWorkload}
          incidentQueueView={incidentQueueView}
          showResolvedIncidents={showResolvedIncidents}
          autoEscalateEnabled={autoEscalateEnabled}
          autoEscalateThresholdMinutes={autoEscalateThresholdMinutes}
          incidentSnoozeMinutes={incidentSnoozeMinutes}
          visibleIncidents={visibleIncidents}
          selectedTimelineBookingId={selectedTimelineBookingId}
          bookingTimeline={bookingTimeline}
          canManageIncidents={canManageIncidents}
          canAssignBookings={hasPermission('bookings:assign')}
          canBroadcast={hasPermission('notifications:broadcast')}
          onDispatchLaneFilterChange={setDispatchLaneFilter}
          onUnassignedSlaMinutesChange={setUnassignedSlaMinutes}
          onStaleStatusSlaMinutesChange={setStaleStatusSlaMinutes}
          onResetDefaults={() => {
            setUnassignedSlaMinutes(DEFAULT_UNASSIGNED_SLA_MINUTES);
            setStaleStatusSlaMinutes(DEFAULT_STALE_STATUS_SLA_MINUTES);
          }}
          onEnableDesktopAlertsChange={setEnableDesktopAlerts}
          onRequestDesktopAlertPermission={() => {
            void requestDesktopAlertPermission();
          }}
          onEnableSoundAlertsChange={setEnableSoundAlerts}
          onEscalateCriticalAlerts={() => {
            void escalateCriticalAlerts();
          }}
          onAcknowledgeExhaustedIncidents={() => {
            void acknowledgeExhaustedIncidentsAction();
          }}
          onClearBulkAcknowledgementMarker={clearBulkAcknowledgementMarker}
          onCreateIncident={(bookingId, reason, severity) => {
            void createIncident(bookingId, reason, severity);
          }}
          onRecommendDrivers={(bookingId) => {
            void recommendDrivers(bookingId);
          }}
          onSelectedDriverByBookingChange={(bookingId, driverId) => {
            setSelectedDriverByBooking((prev) => ({ ...prev, [bookingId]: driverId }));
          }}
          onAssignDriver={(bookingId, driverId) => {
            void assignDriver(bookingId, driverId);
          }}
          onOpenTimeline={(bookingId) => {
            setContextBookingId(bookingId);
            void openTimeline(bookingId);
          }}
          onIncidentQueueViewChange={setIncidentQueueView}
          onShowResolvedIncidentsChange={setShowResolvedIncidents}
          onAutoEscalateEnabledChange={setAutoEscalateEnabled}
          onAutoEscalateThresholdMinutesChange={setAutoEscalateThresholdMinutes}
          onIncidentSnoozeMinutesChange={setIncidentSnoozeMinutes}
          onAssignIncidentToMe={(incidentId) => {
            void assignIncidentToMe(incidentId);
          }}
          onAcknowledgeIncident={(incidentId) => {
            void acknowledgeIncidentAction(incidentId);
          }}
          onSnoozeIncident={(incidentId) => {
            void snoozeIncidentAction(incidentId);
          }}
          onResolveIncident={(incidentId) => {
            void resolveIncidentAction(incidentId);
          }}
          onEscalateIncident={(incidentId) => {
            void escalateIncidentAction(incidentId);
          }}
        />
      ) : null}

      {canAccessActiveTab && activeTab === 'incidents' ? (
        <IncidentsSection
          incidents={visibleIncidents}
          bookings={sortedBookings}
          activity={activity}
          canManageIncidents={canManageIncidents}
          incidentQueueView={incidentQueueView}
          showResolvedIncidents={showResolvedIncidents}
          incidentSnoozeMinutes={incidentSnoozeMinutes}
          onIncidentQueueViewChange={setIncidentQueueView}
          onShowResolvedIncidentsChange={setShowResolvedIncidents}
          onIncidentSnoozeMinutesChange={setIncidentSnoozeMinutes}
          onAssignIncidentToMe={(incidentId) => {
            void assignIncidentToMe(incidentId);
          }}
          onAcknowledgeIncident={(incidentId) => {
            void acknowledgeIncidentAction(incidentId);
          }}
          onSnoozeIncident={(incidentId) => {
            void snoozeIncidentAction(incidentId);
          }}
          onResolveIncident={(incidentId) => {
            void resolveIncidentAction(incidentId);
          }}
          onEscalateIncident={(incidentId) => {
            void escalateIncidentAction(incidentId);
          }}
          onOpenBooking={(bookingId) => {
            setBookingQuery(bookingId);
            setContextBookingId(bookingId);
            navigateToTab('bookings');
          }}
        />
      ) : null}

      {canAccessActiveTab && activeTab === 'inbox' ? (
        <InboxSection
          notifications={currentNotifications}
          notificationPage={notificationPage}
          notificationTotalPages={pageCount(notifications)}
          canGoPrevious={notificationPage > 1}
          canGoNext={notificationPage < pageCount(notifications)}
          onPrevious={() => setNotificationPage((prev) => Math.max(1, prev - 1))}
          onNext={() =>
            setNotificationPage((prev) => Math.min(pageCount(notifications), prev + 1))
          }
          myIncidents={myIncidents}
          bookings={sortedBookings}
          onOpenIncidentJob={(bookingId) => {
            setBookingQuery(bookingId);
            setContextBookingId(bookingId);
            navigateToTab('bookings');
          }}
        />
      ) : null}

      {canAccessActiveTab && activeTab === 'communications' ? (
        <CommunicationsSection
          canBroadcast={hasPermission('notifications:broadcast')}
          broadcastTitle={broadcastTitle}
          broadcastMessage={broadcastMessage}
          broadcastType={broadcastType}
          targetCustomer={targetCustomer}
          targetDriver={targetDriver}
          targetOps={targetOps}
          onBroadcastTitleChange={setBroadcastTitle}
          onBroadcastMessageChange={setBroadcastMessage}
          onBroadcastTypeChange={setBroadcastType}
          onTargetCustomerChange={setTargetCustomer}
          onTargetDriverChange={setTargetDriver}
          onTargetOpsChange={setTargetOps}
          onBroadcast={() => {
            void broadcast();
          }}
          sentHistory={notifications.slice(0, 20)}
        />
      ) : null}

      {canAccessActiveTab && activeTab === 'audit' ? (
        <AuditSection
          activity={currentActivity}
          activityTypeFilter={activityTypeFilter}
          activityQuery={activityQuery}
          activityTypeOptions={activityTypeOptions}
          activityPage={activityPage}
          activityTotalPages={pageCount(filteredActivity)}
          canGoPrevious={activityPage > 1}
          canGoNext={activityPage < pageCount(filteredActivity)}
          customers={customers}
          drivers={drivers}
          bookings={sortedBookings}
          onTypeFilterChange={setActivityTypeFilter}
          onQueryChange={setActivityQuery}
          onPrevious={() => setActivityPage((prev) => Math.max(1, prev - 1))}
          onNext={() =>
            setActivityPage((prev) => Math.min(pageCount(filteredActivity), prev + 1))
          }
        />
      ) : null}

      {canAccessActiveTab && activeTab === 'finance' ? (
        <FinanceSection analytics={analytics} bookings={sortedBookings} />
      ) : null}

      {canAccessActiveTab && activeTab === 'reports' ? (
        <ReportsSection
          analytics={analytics}
          analyticsFrom={analyticsFrom}
          analyticsTo={analyticsTo}
          onAnalyticsFromChange={setAnalyticsFrom}
          onAnalyticsToChange={setAnalyticsTo}
          onRefreshAnalytics={() => void loadAnalytics()}
          bookings={sortedBookings}
          onExportBookings={exportBookings}
        />
      ) : null}
    </OpsShell>
  );
};
