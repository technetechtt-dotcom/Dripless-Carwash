import type { BookingContract, BookingStatus, DispatchIncident, DriverProfile, OpsActivityItem } from '@shared/types';
import { DispatchMapPanel } from './DispatchMapPanel';

type DispatchLane = BookingStatus | 'UNASSIGNED' | 'DISPATCH_EXHAUSTED';
const MAX_AUTO_DISPATCH_ATTEMPTS = 3;

type SlaAlertItem = {
  booking: BookingContract;
  reason: string;
  severity: 'medium' | 'high';
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
  onAssignDriver: (bookingId: string) => void;
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

export const DispatchSection = ({
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
}: DispatchSectionProps) => (
  <div className="card stack">
    <h2 style={{ margin: 0 }}>Live dispatch board</h2>
    <div className="muted">
      {latestExhaustedLabel ?
        `Last exhausted update: ${latestExhaustedLabel}` :
        'No exhausted dispatch events'}
    </div>
    {lastBulkAcknowledgedAt ? (
      <div className="row">
        <span className="muted">
          Last bulk acknowledgement: {new Date(lastBulkAcknowledgedAt).toLocaleString()}
        </span>
        <button
          className="secondary"
          onClick={onClearBulkAcknowledgementMarker}
          disabled={!canManageIncidents}>
          Clear audit marker
        </button>
      </div>
    ) : null}
    <div className="row">
      <select
        value={dispatchLaneFilter}
        onChange={(event) => onDispatchLaneFilterChange(event.target.value as DispatchLane | 'ALL')}>
        <option value="ALL">All lanes</option>
        <option value="UNASSIGNED">UNASSIGNED</option>
        <option value="DISPATCH_EXHAUSTED">DISPATCH_EXHAUSTED</option>
        {statusOptions.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <span className="muted">
        SLA policy: unassigned {unassignedSlaMinutes}+ min, stale status {staleStatusSlaMinutes}+ min
      </span>
    </div>
    <div className="row">
      <label className="row">
        <span className="muted">Unassigned SLA (min)</span>
        <input
          type="number"
          min={1}
          value={unassignedSlaMinutes}
          onChange={(event) => onUnassignedSlaMinutesChange(Math.max(1, Number(event.target.value) || 1))}
        />
      </label>
      <label className="row">
        <span className="muted">Stale status SLA (min)</span>
        <input
          type="number"
          min={1}
          value={staleStatusSlaMinutes}
          onChange={(event) => onStaleStatusSlaMinutesChange(Math.max(1, Number(event.target.value) || 1))}
        />
      </label>
      <button className="secondary" onClick={onResetDefaults}>
        Reset defaults
      </button>
    </div>
    <div className="row">
      <label className="row">
        <input
          type="checkbox"
          checked={enableDesktopAlerts}
          onChange={(event) => onEnableDesktopAlertsChange(event.target.checked)}
          style={{ width: 'auto' }}
        />
        Desktop alerts
      </label>
      <button className="secondary" onClick={onRequestDesktopAlertPermission}>
        Grant notification permission
      </button>
      <label className="row">
        <input
          type="checkbox"
          checked={enableSoundAlerts}
          onChange={(event) => onEnableSoundAlertsChange(event.target.checked)}
          style={{ width: 'auto' }}
        />
        Sound alerts
      </label>
      <button className="warning" onClick={onEscalateCriticalAlerts} disabled={!canBroadcast}>
        Escalate critical alerts
      </button>
      <button
        className="secondary"
        onClick={onAcknowledgeExhaustedIncidents}
        disabled={
          !canManageIncidents ||
          exhaustedActionableIncidentCount === 0 ||
          isAcknowledgingExhaustedIncidents
        }>
        {isAcknowledgingExhaustedIncidents ?
          'Acknowledging exhausted incidents...' :
          `Acknowledge exhausted incidents (${exhaustedActionableIncidentCount})`}
      </button>
      {lastEscalatedAt ? (
        <span className="muted">Last escalated {new Date(lastEscalatedAt).toLocaleTimeString()}</span>
      ) : null}
    </div>

    {slaAlerts.length > 0 ? (
      <div className="card alert-danger-soft">
        <strong>{slaAlerts.length}</strong> SLA alerts currently need attention.
      </div>
    ) : (
      <div className="card alert-success">No active SLA breaches.</div>
    )}

    <DispatchMapPanel bookings={bookings} driverLocations={driverLocations} />

    <div className="dispatch-grid">
      {(dispatchLaneFilter === 'ALL' ?
        (['DISPATCH_EXHAUSTED', 'UNASSIGNED', ...statusOptions] as DispatchLane[]) :
        [dispatchLaneFilter]
      ).map((lane) => (
        <div key={lane} className="dispatch-lane">
          <h3 style={{ marginTop: 0 }}>
            {lane} ({dispatchLanes[lane]?.length ?? 0})
          </h3>
          <div className="dispatch-lane-list">
            {(dispatchLanes[lane] ?? []).slice(0, 8).map((booking) => {
              const alert = slaAlerts.find((item) => item.booking.id === booking.id);
              const incident = incidentsByBooking.get(booking.id);
              return (
                <div
                  key={booking.id}
                  className={`dispatch-card ${alert?.severity === 'high' ? 'dispatch-card-critical' : ''}`}>
                  <strong>{booking.id}</strong>
                  <div className="muted">{booking.serviceName}</div>
                  <div className="muted">{booking.customerName || booking.customerId || 'Unknown customer'}</div>
                  <div className="muted">{booking.driverId ? `Driver ${booking.driverId}` : 'No driver assigned'}</div>
                  <div className="muted">
                    Auto-dispatch attempts: {booking.dispatchAttemptCount ?? 0}/{MAX_AUTO_DISPATCH_ATTEMPTS}
                  </div>
                  {(booking.dispatchAttemptCount ?? 0) >= MAX_AUTO_DISPATCH_ATTEMPTS ? (
                    <div className="dispatch-alert-text">
                      Auto-dispatch limit reached, manual intervention required.
                    </div>
                  ) : null}
                  {booking.pooledWithBookingId ? (
                    <div className="muted">Pooled with {booking.pooledWithBookingId}</div>
                  ) : null}
                  {booking.latestAudit?.reason ? (
                    <div className="muted">Dispatch: {booking.latestAudit.reason}</div>
                  ) : null}
                  {alert ? <div className="dispatch-alert-text">{alert.reason}</div> : null}
                  {incident ? (
                    <div className="muted">
                      Incident {incident.status}
                      {incident.ownerAdminName ? ` - Owner: ${incident.ownerAdminName}` : ''}
                    </div>
                  ) : null}
                  <div className="row">
                    {alert && !incident ? (
                      <button
                        className="warning"
                        onClick={() => onCreateIncident(booking.id, alert.reason, alert.severity)}
                        disabled={!canManageIncidents}>
                        Track Incident
                      </button>
                    ) : null}
                    <button
                      className="secondary"
                      onClick={() => onRecommendDrivers(booking.id)}
                      disabled={!canAssignBookings}>
                      Recommend
                    </button>
                    <select
                      value={selectedDriverByBooking[booking.id] || ''}
                      onChange={(event) =>
                        onSelectedDriverByBookingChange(booking.id, event.target.value)
                      }>
                      <option value="">Driver</option>
                      {drivers
                        .filter((driver) => driver.status !== 'SUSPENDED')
                        .map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.name}
                          </option>
                        ))}
                    </select>
                    <button onClick={() => onAssignDriver(booking.id)} disabled={!canAssignBookings}>
                      Assign
                    </button>
                    <button className="secondary" onClick={() => onOpenTimeline(booking.id)}>
                      Timeline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>

    <div className="row" style={{ alignItems: 'start' }}>
      <div className="card" style={{ flex: 1 }}>
        <h3 style={{ marginTop: 0 }}>SLA heatmap</h3>
        <table>
          <thead>
            <tr>
              <th>Lane</th>
              <th>Total</th>
              <th>Medium alerts</th>
              <th>High alerts</th>
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
      <div className="card" style={{ flex: 1 }}>
        <h3 style={{ marginTop: 0 }}>Incident aging</h3>
        <div className="stack">
          <div className="row">
            <span className="muted">&lt; 10 min</span>
            <strong>{incidentAgingBuckets.under10}</strong>
          </div>
          <div className="row">
            <span className="muted">10 - 30 min</span>
            <strong>{incidentAgingBuckets.tenToThirty}</strong>
          </div>
          <div className="row">
            <span className="muted">30 - 60 min</span>
            <strong>{incidentAgingBuckets.thirtyToSixty}</strong>
          </div>
          <div className="row">
            <span className="muted">&gt; 60 min</span>
            <strong>{incidentAgingBuckets.overSixty}</strong>
          </div>
        </div>
      </div>
      <div className="card" style={{ flex: 1 }}>
        <h3 style={{ marginTop: 0 }}>Agent workload</h3>
        {agentWorkload.length === 0 ? (
          <p className="muted">No active incident ownership yet.</p>
        ) : (
          <ul className="list">
            {agentWorkload.slice(0, 6).map((owner) => (
              <li key={owner.owner}>
                <strong>{owner.owner}</strong>
                <div className="muted">
                  {owner.total} active incident(s), {owner.high} high severity
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>

    <div className="row" style={{ alignItems: 'start' }}>
      <div className="card" style={{ flex: 1 }}>
        <h3 style={{ marginTop: 0 }}>Dispatch incidents</h3>
        <div className="row">
          <button className={incidentQueueView === 'all' ? '' : 'secondary'} onClick={() => onIncidentQueueViewChange('all')}>
            All
          </button>
          <button className={incidentQueueView === 'mine' ? '' : 'secondary'} onClick={() => onIncidentQueueViewChange('mine')}>
            Mine
          </button>
          <button
            className={incidentQueueView === 'unassigned' ? '' : 'secondary'}
            onClick={() => onIncidentQueueViewChange('unassigned')}>
            Unassigned
          </button>
        </div>
        <label className="row">
          <input
            type="checkbox"
            checked={showResolvedIncidents}
            onChange={(event) => onShowResolvedIncidentsChange(event.target.checked)}
            style={{ width: 'auto' }}
          />
          Show resolved
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={autoEscalateEnabled}
            onChange={(event) => onAutoEscalateEnabledChange(event.target.checked)}
            style={{ width: 'auto' }}
          />
          Auto-escalate stale incidents
        </label>
        <label className="row">
          <span className="muted">Auto escalation threshold (min)</span>
          <input
            type="number"
            min={1}
            value={autoEscalateThresholdMinutes}
            onChange={(event) =>
              onAutoEscalateThresholdMinutesChange(Math.max(1, Number(event.target.value) || 1))
            }
          />
        </label>
        <label className="row">
          <span className="muted">Snooze minutes</span>
          <input
            type="number"
            min={1}
            value={incidentSnoozeMinutes}
            onChange={(event) => onIncidentSnoozeMinutesChange(Math.max(1, Number(event.target.value) || 1))}
          />
        </label>
        {visibleIncidents.length === 0 ? (
          <p className="muted">No incidents logged.</p>
        ) : (
          <ul className="list">
            {visibleIncidents.slice(0, 8).map((incident) => (
              <li key={incident.id}>
                <strong>{incident.bookingId}</strong> - {incident.reason}
                <div className="muted">
                  {incident.severity.toUpperCase()} | {incident.status}
                  {incident.ownerAdminName ? ` | Owner ${incident.ownerAdminName}` : ''}
                </div>
                {bookings.find((booking) => booking.id === incident.bookingId) ? (
                  <div className="muted">
                    Attempts: {bookings.find((booking) => booking.id === incident.bookingId)?.dispatchAttemptCount ?? 0}
                    /{MAX_AUTO_DISPATCH_ATTEMPTS}
                  </div>
                ) : null}
                <div className="row">
                  <button
                    className="secondary"
                    onClick={() => onAssignIncidentToMe(incident.id)}
                    disabled={!canManageIncidents}>
                    Assign to me
                  </button>
                  <button
                    className="secondary"
                    onClick={() => onAcknowledgeIncident(incident.id)}
                    disabled={!canManageIncidents}>
                    Acknowledge
                  </button>
                  <button
                    className="secondary"
                    onClick={() => onSnoozeIncident(incident.id)}
                    disabled={!canManageIncidents}>
                    Snooze
                  </button>
                  <button onClick={() => onResolveIncident(incident.id)} disabled={!canManageIncidents}>
                    Resolve
                  </button>
                  <button
                    className="warning"
                    onClick={() => onEscalateIncident(incident.id)}
                    disabled={!canManageIncidents}>
                    Escalate
                  </button>
                  <button className="secondary" onClick={() => onOpenTimeline(incident.bookingId)}>
                    Timeline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="card" style={{ flex: 1 }}>
        <h3 style={{ marginTop: 0 }}>
          Booking timeline {selectedTimelineBookingId ? `(${selectedTimelineBookingId})` : ''}
        </h3>
        {!selectedTimelineBookingId ? (
          <p className="muted">Select any booking card or incident to view timeline.</p>
        ) : bookingTimeline.length === 0 ? (
          <p className="muted">No timeline entries yet for this booking.</p>
        ) : (
          <ul className="list">
            {bookingTimeline.slice(0, 15).map((event) => (
              <li key={event.id}>
                <strong>{event.type}</strong> - {event.message}
                <div className="muted">
                  {new Date(event.createdAt).toLocaleString()} by {event.actorRole} ({event.actorId})
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  </div>
);
