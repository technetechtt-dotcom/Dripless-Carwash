import { useMemo, useState } from 'react';
import type {
  BookingContract,
  BookingStatus,
  DispatchIncident,
  DriverAssignmentRecommendation,
  DriverProfile,
  OpsActivityItem
} from '@shared/types';
import {
  bookingZoneLabel,
  driverLabel,
  formatActivityMessage,
  formatBookingRef,
  formatPersonName,
  minutesLabel
} from '../formatters';
import { DispatchMapPanel } from './DispatchMapPanel';

type DispatchLane = BookingStatus | 'UNASSIGNED' | 'DISPATCH_EXHAUSTED';
const MAX_AUTO_DISPATCH_ATTEMPTS = 3;

type SlaAlertItem = {
  booking: BookingContract;
  reason: string;
  severity: 'medium' | 'high';
  ageMinutes?: number;
};

type SlaHeatmapRow = {
  lane: DispatchLane;
  total: number;
  medium: number;
  high: number;
};

type IncidentAgingBuckets = {
  under10: number;
  tenToThirty: number;
  thirtyToSixty: number;
  overSixty: number;
};

type AgentWorkloadItem = {
  owner: string;
  total: number;
  high: number;
};

type ActionQueueFilter =
  | 'critical'
  | 'unassigned'
  | 'late'
  | 'exhausted'
  | 'starting_soon'
  | 'all';

type DispatchSectionProps = {
  bookings: BookingContract[];
  driverLocations: Array<{
    driverId: string;
    driverName: string;
    activeBookingId?: string | null;
    status: string;
    location: {
      lat: number;
      lng: number;
      heading?: number | null;
      speedKph?: number | null;
      updatedAt: string;
    } | null | undefined;
  }>;
  dispatchLaneFilter: DispatchLane | 'ALL';
  latestExhaustedLabel: string | null;
  lastBulkAcknowledgedAt: string | null;
  exhaustedActionableIncidentCount: number;
  isAcknowledgingExhaustedIncidents: boolean;
  statusOptions: BookingStatus[];
  unassignedSlaMinutes: number;
  staleStatusSlaMinutes: number;
  enableDesktopAlerts: boolean;
  enableSoundAlerts: boolean;
  lastEscalatedAt: string | null;
  slaAlerts: SlaAlertItem[];
  dispatchLanes: Record<DispatchLane, BookingContract[]>;
  incidentsByBooking: Map<string, DispatchIncident>;
  selectedDriverByBooking: Record<string, string>;
  recommendationsByBooking: Record<string, DriverAssignmentRecommendation[]>;
  drivers: DriverProfile[];
  slaHeatmap: SlaHeatmapRow[];
  incidentAgingBuckets: IncidentAgingBuckets;
  agentWorkload: AgentWorkloadItem[];
  incidentQueueView: 'all' | 'mine' | 'unassigned';
  showResolvedIncidents: boolean;
  autoEscalateEnabled: boolean;
  autoEscalateThresholdMinutes: number;
  incidentSnoozeMinutes: number;
  visibleIncidents: DispatchIncident[];
  selectedTimelineBookingId: string | null;
  bookingTimeline: OpsActivityItem[];
  canManageIncidents: boolean;
  canAssignBookings: boolean;
  canBroadcast: boolean;
  onDispatchLaneFilterChange: (value: DispatchLane | 'ALL') => void;
  onUnassignedSlaMinutesChange: (value: number) => void;
  onStaleStatusSlaMinutesChange: (value: number) => void;
  onResetDefaults: () => void;
  onEnableDesktopAlertsChange: (value: boolean) => void;
  onRequestDesktopAlertPermission: () => void;
  onEnableSoundAlertsChange: (value: boolean) => void;
  onEscalateCriticalAlerts: () => void;
  onAcknowledgeExhaustedIncidents: () => void;
  onClearBulkAcknowledgementMarker: () => void;
  onCreateIncident: (bookingId: string, reason: string, severity: 'medium' | 'high') => void;
  onRecommendDrivers: (bookingId: string) => void;
  onSelectedDriverByBookingChange: (bookingId: string, driverId: string) => void;
  onAssignDriver: (bookingId: string, driverId?: string) => void;
  onOpenTimeline: (bookingId: string) => void;
  onIncidentQueueViewChange: (value: 'all' | 'mine' | 'unassigned') => void;
  onShowResolvedIncidentsChange: (value: boolean) => void;
  onAutoEscalateEnabledChange: (value: boolean) => void;
  onAutoEscalateThresholdMinutesChange: (value: number) => void;
  onIncidentSnoozeMinutesChange: (value: number) => void;
  onAssignIncidentToMe: (incidentId: string) => void;
  onAcknowledgeIncident: (incidentId: string) => void;
  onSnoozeIncident: (incidentId: string) => void;
  onResolveIncident: (incidentId: string) => void;
  onEscalateIncident: (incidentId: string) => void;
};

export const DispatchSection = (props: DispatchSectionProps) => {
  const {
    bookings,
    driverLocations,
    dispatchLaneFilter,
    latestExhaustedLabel,
    lastBulkAcknowledgedAt,
    exhaustedActionableIncidentCount,
    isAcknowledgingExhaustedIncidents,
    statusOptions,
    unassignedSlaMinutes,
    staleStatusSlaMinutes,
    enableDesktopAlerts,
    enableSoundAlerts,
    lastEscalatedAt,
    slaAlerts,
    dispatchLanes,
    incidentsByBooking,
    selectedDriverByBooking,
    recommendationsByBooking,
    drivers,
    slaHeatmap,
    incidentAgingBuckets,
    agentWorkload,
    incidentQueueView,
    showResolvedIncidents,
    autoEscalateEnabled,
    autoEscalateThresholdMinutes,
    incidentSnoozeMinutes,
    visibleIncidents,
    selectedTimelineBookingId,
    bookingTimeline,
    canManageIncidents,
    canAssignBookings,
    canBroadcast,
    onDispatchLaneFilterChange,
    onUnassignedSlaMinutesChange,
    onStaleStatusSlaMinutesChange,
    onResetDefaults,
    onEnableDesktopAlertsChange,
    onRequestDesktopAlertPermission,
    onEnableSoundAlertsChange,
    onEscalateCriticalAlerts,
    onAcknowledgeExhaustedIncidents,
    onClearBulkAcknowledgementMarker,
    onCreateIncident,
    onRecommendDrivers,
    onSelectedDriverByBookingChange,
    onAssignDriver,
    onOpenTimeline,
    onIncidentQueueViewChange,
    onShowResolvedIncidentsChange,
    onAutoEscalateEnabledChange,
    onAutoEscalateThresholdMinutesChange,
    onIncidentSnoozeMinutesChange,
    onAssignIncidentToMe,
    onAcknowledgeIncident,
    onSnoozeIncident,
    onResolveIncident,
    onEscalateIncident
  } = props;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'queue' | 'kanban'>('queue');
  const [queueFilter, setQueueFilter] = useState<ActionQueueFilter>('critical');
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [zoneQuery, setZoneQuery] = useState('');

  const alertByBooking = useMemo(() => {
    const map = new Map<string, SlaAlertItem>();
    for (const alert of slaAlerts) map.set(alert.booking.id, alert);
    return map;
  }, [slaAlerts]);

  const actionableBookings = useMemo(() => {
    const now = Date.now();
    return bookings
      .filter((b) => !['COMPLETED', 'CANCELLED'].includes(b.status))
      .filter((b) => {
        if (serviceFilter !== 'ALL' && b.serviceType !== serviceFilter) return false;
        if (zoneQuery.trim()) {
          const hay = `${b.pickupLocation} ${b.destinationLocation ?? ''}`.toLowerCase();
          if (!hay.includes(zoneQuery.trim().toLowerCase())) return false;
        }
        return true;
      })
      .map((booking) => {
        const alert = alertByBooking.get(booking.id);
        const ageMinutes = Math.floor((now - new Date(booking.updatedAt).getTime()) / 60000);
        const scheduledInMin = Math.floor((new Date(booking.scheduledAt).getTime() - now) / 60000);
        const exhausted = (booking.dispatchAttemptCount ?? 0) >= MAX_AUTO_DISPATCH_ATTEMPTS;
        const unassigned = !booking.driverId;
        let priority = 0;
        if (alert?.severity === 'high' || exhausted) priority = 100;
        else if (alert || unassigned) priority = 60;
        else if (scheduledInMin >= 0 && scheduledInMin <= 30) priority = 40;
        else priority = 10;
        return { booking, alert, ageMinutes, scheduledInMin, exhausted, unassigned, priority };
      })
      .sort((a, b) => b.priority - a.priority || b.ageMinutes - a.ageMinutes);
  }, [alertByBooking, bookings, serviceFilter, zoneQuery]);

  const filteredQueue = useMemo(() => {
    if (queueFilter === 'all') return actionableBookings;
    if (queueFilter === 'critical') {
      return actionableBookings.filter(
        (row) => row.alert?.severity === 'high' || row.exhausted || (row.unassigned && row.ageMinutes >= unassignedSlaMinutes)
      );
    }
    if (queueFilter === 'unassigned') return actionableBookings.filter((row) => row.unassigned);
    if (queueFilter === 'late') return actionableBookings.filter((row) => Boolean(row.alert));
    if (queueFilter === 'exhausted') return actionableBookings.filter((row) => row.exhausted);
    if (queueFilter === 'starting_soon') {
      return actionableBookings.filter((row) => row.scheduledInMin >= 0 && row.scheduledInMin <= 30);
    }
    return actionableBookings;
  }, [actionableBookings, queueFilter, unassignedSlaMinutes]);

  const selectedBooking =
    bookings.find((b) => b.id === selectedBookingId) ??
    bookings.find((b) => b.id === selectedTimelineBookingId) ??
    null;
  const selectedRecs = selectedBooking ? recommendationsByBooking[selectedBooking.id] ?? [] : [];
  const selectedAlert = selectedBooking ? alertByBooking.get(selectedBooking.id) : undefined;
  const selectedIncident = selectedBooking ? incidentsByBooking.get(selectedBooking.id) : undefined;

  const services = useMemo(
    () => Array.from(new Set(bookings.map((b) => b.serviceType))).sort(),
    [bookings]
  );

  const openBooking = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    onOpenTimeline(bookingId);
    void onRecommendDrivers(bookingId);
  };

  const counts = {
    critical: actionableBookings.filter(
      (r) => r.alert?.severity === 'high' || r.exhausted || (r.unassigned && r.ageMinutes >= unassignedSlaMinutes)
    ).length,
    unassigned: actionableBookings.filter((r) => r.unassigned).length,
    late: actionableBookings.filter((r) => Boolean(r.alert)).length,
    exhausted: actionableBookings.filter((r) => r.exhausted).length,
    starting_soon: actionableBookings.filter((r) => r.scheduledInMin >= 0 && r.scheduledInMin <= 30)
      .length
  };

  return (
    <section className="stack" aria-label="Dispatch workspace">
      <div className="card">
        <div className="dispatch-toolbar">
          <div className="dispatch-filters">
            <label>
              <span className="sr-only">Area</span>
              <input
                value={zoneQuery}
                onChange={(e) => setZoneQuery(e.target.value)}
                placeholder="Area / zone"
              />
            </label>
            <label>
              <span className="sr-only">Service</span>
              <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
                <option value="ALL">All services</option>
                {services.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Lane filter</span>
              <select
                value={dispatchLaneFilter}
                onChange={(e) => onDispatchLaneFilterChange(e.target.value as DispatchLane | 'ALL')}>
                <option value="ALL">All lanes</option>
                <option value="UNASSIGNED">Unassigned</option>
                <option value="DISPATCH_EXHAUSTED">Exhausted</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <div className="row">
              <button
                type="button"
                className={viewMode === 'queue' ? '' : 'secondary'}
                onClick={() => setViewMode('queue')}>
                Queue
              </button>
              <button
                type="button"
                className={viewMode === 'kanban' ? '' : 'secondary'}
                onClick={() => setViewMode('kanban')}>
                Kanban
              </button>
            </div>
          </div>
          <div className="row">
            {slaAlerts.length > 0 ? (
              <span className="pill-danger" aria-live="polite">
                {slaAlerts.length} SLA
              </span>
            ) : (
              <span className="pill-ok">SLA clear</span>
            )}
            <button type="button" className="ghost" onClick={() => setSettingsOpen((v) => !v)}>
              {settingsOpen ? 'Hide settings' : 'Settings'}
            </button>
            <button
              type="button"
              className="warning"
              onClick={onEscalateCriticalAlerts}
              disabled={!canBroadcast}>
              Escalate critical
            </button>
          </div>
        </div>

        {settingsOpen ? (
          <div className="dispatch-settings" style={{ marginTop: 12 }}>
            <strong>Dispatch settings</strong>
            <p className="muted" style={{ margin: 0 }}>
              Operational preferences — not minute-to-minute queue controls.
            </p>
            <div className="row">
              <label>
                Unassigned SLA (min)
                <input
                  type="number"
                  min={1}
                  value={unassignedSlaMinutes}
                  onChange={(e) =>
                    onUnassignedSlaMinutesChange(Math.max(1, Number(e.target.value) || 1))
                  }
                />
              </label>
              <label>
                Stale status SLA (min)
                <input
                  type="number"
                  min={1}
                  value={staleStatusSlaMinutes}
                  onChange={(e) =>
                    onStaleStatusSlaMinutesChange(Math.max(1, Number(e.target.value) || 1))
                  }
                />
              </label>
              <button type="button" className="secondary" onClick={onResetDefaults}>
                Reset defaults
              </button>
            </div>
            <div className="row">
              <label className="row">
                <input
                  type="checkbox"
                  checked={enableDesktopAlerts}
                  onChange={(e) => onEnableDesktopAlertsChange(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                Desktop alerts
              </label>
              <button type="button" className="secondary" onClick={onRequestDesktopAlertPermission}>
                Grant notification permission
              </button>
              <label className="row">
                <input
                  type="checkbox"
                  checked={enableSoundAlerts}
                  onChange={(e) => onEnableSoundAlertsChange(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                Sound alerts
              </label>
              <label className="row">
                <input
                  type="checkbox"
                  checked={autoEscalateEnabled}
                  onChange={(e) => onAutoEscalateEnabledChange(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                Auto-escalate stale incidents
              </label>
              <label>
                Auto-escalate threshold (min)
                <input
                  type="number"
                  min={1}
                  value={autoEscalateThresholdMinutes}
                  onChange={(e) =>
                    onAutoEscalateThresholdMinutesChange(Math.max(1, Number(e.target.value) || 1))
                  }
                />
              </label>
              <label>
                Snooze minutes
                <input
                  type="number"
                  min={1}
                  value={incidentSnoozeMinutes}
                  onChange={(e) =>
                    onIncidentSnoozeMinutesChange(Math.max(1, Number(e.target.value) || 1))
                  }
                />
              </label>
            </div>
            <div className="row">
              <button
                type="button"
                className="secondary"
                onClick={onAcknowledgeExhaustedIncidents}
                disabled={
                  !canManageIncidents ||
                  exhaustedActionableIncidentCount === 0 ||
                  isAcknowledgingExhaustedIncidents
                }>
                {isAcknowledgingExhaustedIncidents ?
                  'Acknowledging…'
                : `Acknowledge exhausted (${exhaustedActionableIncidentCount})`}
              </button>
              {lastEscalatedAt ? (
                <span className="muted">
                  Last escalated {new Date(lastEscalatedAt).toLocaleTimeString()}
                </span>
              ) : null}
              {latestExhaustedLabel ? (
                <span className="muted">Last exhausted update: {latestExhaustedLabel}</span>
              ) : null}
              {lastBulkAcknowledgedAt ? (
                <>
                  <span className="muted">
                    Last bulk ack: {new Date(lastBulkAcknowledgedAt).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    className="ghost"
                    onClick={onClearBulkAcknowledgementMarker}
                    disabled={!canManageIncidents}>
                    Clear audit marker
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {viewMode === 'queue' ? (
        <div className="three-col-dispatch">
          <div className="card queue-panel stack">
            <h2 style={{ margin: 0 }}>Action queue</h2>
            <div className="row">
              {(
                [
                  ['critical', `Critical (${counts.critical})`],
                  ['unassigned', `Unassigned (${counts.unassigned})`],
                  ['late', `SLA (${counts.late})`],
                  ['exhausted', `Exhausted (${counts.exhausted})`],
                  ['starting_soon', `Soon (${counts.starting_soon})`],
                  ['all', `All (${actionableBookings.length})`]
                ] as Array<[ActionQueueFilter, string]>
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={queueFilter === key ? '' : 'secondary'}
                  onClick={() => setQueueFilter(key)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="action-queue">
              {filteredQueue.length === 0 ? (
                <p className="muted">No jobs in this view.</p>
              ) : (
                filteredQueue.slice(0, 40).map((row) => {
                  const { booking, alert, ageMinutes, unassigned, exhausted } = row;
                  const critical = alert?.severity === 'high' || exhausted;
                  return (
                    <div
                      key={booking.id}
                      role="button"
                      tabIndex={0}
                      className={`job-card ${selectedBookingId === booking.id ? 'is-selected' : ''} ${critical ? 'is-critical' : ''}`}
                      onClick={() => openBooking(booking.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openBooking(booking.id);
                        }
                      }}>
                      <div className="job-card-top">
                        <div>
                          <div className="job-card-title">
                            {booking.serviceName} · {formatBookingRef(booking)}
                          </div>
                          <div className="job-card-meta">
                            <span>
                              {new Date(booking.scheduledAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}{' '}
                              · {bookingZoneLabel(booking.pickupLocation)}
                            </span>
                            <span>
                              {formatPersonName(booking.customerName)} ·{' '}
                              {driverLabel(booking.driverId, drivers)}
                            </span>
                            <span>
                              {unassigned ?
                                `Unassigned for ${minutesLabel(ageMinutes)}`
                              : `Updated ${minutesLabel(ageMinutes)} ago`}
                            </span>
                          </div>
                        </div>
                        <div className="stack" style={{ gap: 4, alignItems: 'end' }}>
                          {critical ? <span className="pill-danger">Critical</span> : null}
                          {alert && !critical ? <span className="pill-warn">Warning</span> : null}
                          <span className="pill">{booking.status}</span>
                        </div>
                      </div>
                      {alert ? <div className="dispatch-alert-text">{alert.reason}</div> : null}
                      <div className="job-card-actions" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => openBooking(booking.id)}>
                          Open
                        </button>
                        {alert && !incidentsByBooking.get(booking.id) ? (
                          <button
                            type="button"
                            className="warning"
                            disabled={!canManageIncidents}
                            onClick={() =>
                              onCreateIncident(booking.id, alert.reason, alert.severity)
                            }>
                            Track incident
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {filteredQueue.length > 40 ? (
              <p className="muted">Showing 40 of {filteredQueue.length} jobs.</p>
            ) : null}
          </div>

          <div className="card stack">
            <h2 style={{ margin: 0 }}>Live map</h2>
            <DispatchMapPanel bookings={bookings} driverLocations={driverLocations} />
            <div className="row">
              <div className="card" style={{ flex: 1, padding: 10 }}>
                <div className="muted">Incident aging &gt; 60m</div>
                <strong style={{ fontSize: 22 }}>{incidentAgingBuckets.overSixty}</strong>
              </div>
              <div className="card" style={{ flex: 1, padding: 10 }}>
                <div className="muted">High agent load</div>
                <strong style={{ fontSize: 14 }}>
                  {agentWorkload[0]?.owner ?? '—'} ({agentWorkload[0]?.high ?? 0} high)
                </strong>
              </div>
            </div>
          </div>

          <div className="card details-panel stack">
            <h2 style={{ margin: 0 }}>Job details</h2>
            {!selectedBooking ? (
              <p className="muted">Select a booking from the action queue.</p>
            ) : (
              <>
                <div>
                  <strong>{formatBookingRef(selectedBooking)}</strong>
                  <div className="muted">{selectedBooking.id}</div>
                  <div>{selectedBooking.serviceName} · {selectedBooking.optionName}</div>
                  <div className="muted">
                    {formatPersonName(selectedBooking.customerName)} ·{' '}
                    {bookingZoneLabel(selectedBooking.pickupLocation)}
                  </div>
                  <div className="muted">{selectedBooking.pickupLocation}</div>
                  <div className="row" style={{ marginTop: 8 }}>
                    <span className="pill">{selectedBooking.status}</span>
                    <span className="pill">
                      {driverLabel(selectedBooking.driverId, drivers)}
                    </span>
                    {selectedAlert ? (
                      <span className="pill-danger">{selectedAlert.reason}</span>
                    ) : null}
                  </div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    Attempts {selectedBooking.dispatchAttemptCount ?? 0}/{MAX_AUTO_DISPATCH_ATTEMPTS}
                    {selectedBooking.pooledWithBookingId ?
                      ` · Pooled ${formatBookingRef({ id: selectedBooking.pooledWithBookingId, createdAt: selectedBooking.createdAt })}`
                    : ''}
                  </div>
                  {selectedBooking.latestAudit?.reason ? (
                    <div className="muted">Audit: {selectedBooking.latestAudit.reason}</div>
                  ) : null}
                </div>

                {selectedIncident ? (
                  <div className="card panel-warning" style={{ padding: 10 }}>
                    <strong>Incident {selectedIncident.status}</strong>
                    <div className="muted">{selectedIncident.reason}</div>
                    <div className="muted">
                      {selectedIncident.ownerAdminName ?
                        `Owner: ${selectedIncident.ownerAdminName}`
                      : 'Unowned'}
                    </div>
                    <div className="row" style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        className="secondary"
                        disabled={!canManageIncidents}
                        onClick={() => onAssignIncidentToMe(selectedIncident.id)}>
                        Assign to me
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        disabled={!canManageIncidents}
                        onClick={() => onAcknowledgeIncident(selectedIncident.id)}>
                        Acknowledge
                      </button>
                      <button
                        type="button"
                        disabled={!canManageIncidents}
                        onClick={() => onResolveIncident(selectedIncident.id)}>
                        Resolve
                      </button>
                    </div>
                  </div>
                ) : null}

                <div>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <strong>Recommended drivers</strong>
                    <button
                      type="button"
                      className="secondary"
                      disabled={!canAssignBookings}
                      onClick={() => onRecommendDrivers(selectedBooking.id)}>
                      Refresh ranking
                    </button>
                  </div>
                  {selectedRecs.length === 0 ? (
                    <p className="muted">Run recommendations to rank nearby drivers.</p>
                  ) : (
                    <div className="stack" style={{ marginTop: 8 }}>
                      {selectedRecs.map((rec, index) => (
                        <div
                          key={rec.driverId}
                          className={`recommend-card ${index === 0 ? 'rank-1' : ''}`}>
                          <div className="row" style={{ justifyContent: 'space-between' }}>
                            <strong>
                              {index + 1}. {formatPersonName(rec.driverName)}
                            </strong>
                            <span>
                              {rec.etaMinutes != null ? `${rec.etaMinutes} min away` : 'ETA n/a'}
                            </span>
                          </div>
                          <div className="muted">
                            Score {rec.score.toFixed(1)}
                            {rec.distanceKm != null ? ` · ${rec.distanceKm.toFixed(1)} km` : ''}
                          </div>
                          <div className="muted">{rec.reasons.slice(0, 2).join(' · ')}</div>
                          <button
                            type="button"
                            disabled={!canAssignBookings}
                            onClick={() => {
                              onSelectedDriverByBookingChange(selectedBooking.id, rec.driverId);
                              onAssignDriver(selectedBooking.id, rec.driverId);
                            }}>
                            Assign {formatPersonName(rec.driverName)}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="row" style={{ marginTop: 10 }}>
                    <select
                      value={selectedDriverByBooking[selectedBooking.id] || ''}
                      onChange={(e) =>
                        onSelectedDriverByBookingChange(selectedBooking.id, e.target.value)
                      }>
                      <option value="">Manual driver pick</option>
                      {drivers
                        .filter((d) => d.status !== 'SUSPENDED')
                        .map((driver) => {
                          const loc = driverLocations.find((l) => l.driverId === driver.id);
                          const busy = Boolean(driver.activeBookingId);
                          return (
                            <option key={driver.id} value={driver.id}>
                              {driver.name}
                              {busy ? ' · working' : ' · free'} · {driver.verificationStatus} · ★
                              {driver.rating.toFixed(1)}
                              {loc?.location ? ' · GPS ok' : ' · no GPS'}
                            </option>
                          );
                        })}
                    </select>
                    <button
                      type="button"
                      disabled={!canAssignBookings}
                      onClick={() => onAssignDriver(selectedBooking.id)}>
                      Assign
                    </button>
                  </div>
                </div>

                <div>
                  <strong>Timeline</strong>
                  {bookingTimeline.length === 0 ? (
                    <p className="muted">No timeline entries yet.</p>
                  ) : (
                    <ul className="list" style={{ marginTop: 8 }}>
                      {bookingTimeline.slice(0, 12).map((event) => (
                        <li key={event.id}>
                          <strong>{formatActivityMessage(event)}</strong>
                          <div className="muted">
                            {new Date(event.createdAt).toLocaleString()}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="dispatch-grid">
          {(dispatchLaneFilter === 'ALL' ?
            (['DISPATCH_EXHAUSTED', 'UNASSIGNED', ...statusOptions] as DispatchLane[])
          : [dispatchLaneFilter]
          ).map((lane) => (
            <div key={lane} className="dispatch-lane">
              <h3 style={{ marginTop: 0 }}>
                {lane} ({dispatchLanes[lane]?.length ?? 0})
              </h3>
              <div className="dispatch-lane-list">
                {(dispatchLanes[lane] ?? []).slice(0, 12).map((booking) => {
                  const alert = alertByBooking.get(booking.id);
                  return (
                    <div
                      key={booking.id}
                      className={`dispatch-card ${alert?.severity === 'high' ? 'dispatch-card-critical' : ''}`}>
                      <strong>
                        {formatBookingRef(booking)} · {booking.serviceName}
                      </strong>
                      <div className="muted">
                        {formatPersonName(booking.customerName)} ·{' '}
                        {bookingZoneLabel(booking.pickupLocation)}
                      </div>
                      <div className="muted">{driverLabel(booking.driverId, drivers)}</div>
                      {alert ? <div className="dispatch-alert-text">{alert.reason}</div> : null}
                      <div className="row">
                        <button type="button" className="secondary" onClick={() => openBooking(booking.id)}>
                          Open
                        </button>
                        <button
                          type="button"
                          disabled={!canAssignBookings}
                          onClick={() => {
                            openBooking(booking.id);
                          }}>
                          Assign flow
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="two-col">
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>Incidents</h3>
            <div className="row">
              <button
                type="button"
                className={incidentQueueView === 'all' ? '' : 'secondary'}
                onClick={() => onIncidentQueueViewChange('all')}>
                All
              </button>
              <button
                type="button"
                className={incidentQueueView === 'mine' ? '' : 'secondary'}
                onClick={() => onIncidentQueueViewChange('mine')}>
                Mine
              </button>
              <button
                type="button"
                className={incidentQueueView === 'unassigned' ? '' : 'secondary'}
                onClick={() => onIncidentQueueViewChange('unassigned')}>
                Unowned
              </button>
              <label className="row">
                <input
                  type="checkbox"
                  checked={showResolvedIncidents}
                  onChange={(e) => onShowResolvedIncidentsChange(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                Resolved
              </label>
            </div>
          </div>
          {visibleIncidents.length === 0 ? (
            <p className="muted">No incidents in this filter.</p>
          ) : (
            <ul className="list" style={{ marginTop: 12 }}>
              {visibleIncidents.slice(0, 10).map((incident) => {
                const booking = bookings.find((b) => b.id === incident.bookingId);
                return (
                  <li key={incident.id}>
                    <strong>
                      {booking ? formatBookingRef(booking) : incident.bookingId} ·{' '}
                      {incident.severity.toUpperCase()}
                    </strong>
                    <div>{incident.reason}</div>
                    <div className="muted">
                      {incident.status}
                      {incident.ownerAdminName ? ` · ${incident.ownerAdminName}` : ' · Unowned'}
                    </div>
                    <div className="row" style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        className="secondary"
                        disabled={!canManageIncidents}
                        onClick={() => onAssignIncidentToMe(incident.id)}>
                        Assign to me
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        disabled={!canManageIncidents}
                        onClick={() => onAcknowledgeIncident(incident.id)}>
                        Acknowledge
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        disabled={!canManageIncidents}
                        onClick={() => onSnoozeIncident(incident.id)}>
                        Snooze
                      </button>
                      <button
                        type="button"
                        disabled={!canManageIncidents}
                        onClick={() => onResolveIncident(incident.id)}>
                        Resolve
                      </button>
                      <button
                        type="button"
                        className="warning"
                        disabled={!canManageIncidents}
                        onClick={() => onEscalateIncident(incident.id)}>
                        Escalate
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => openBooking(incident.bookingId)}>
                        Open job
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>SLA heatmap</h3>
          <div className="table-wrap">
            <table>
              <caption className="sr-only">SLA alerts by dispatch lane</caption>
              <thead>
                <tr>
                  <th scope="col">Lane</th>
                  <th scope="col">Total</th>
                  <th scope="col">Medium</th>
                  <th scope="col">High</th>
                </tr>
              </thead>
              <tbody>
                {slaHeatmap.map((row) => (
                  <tr key={row.lane}>
                    <td>{row.lane}</td>
                    <td>{row.total}</td>
                    <td>{row.medium}</td>
                    <td>
                      <span className={row.high > 0 ? 'pill-danger' : 'pill-ok'}>{row.high}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
