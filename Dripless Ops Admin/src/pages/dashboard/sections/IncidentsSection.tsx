import type { BookingContract, DispatchIncident, OpsActivityItem } from '@shared/types';
import { formatActivityMessage, formatBookingRef, minutesLabel } from '../formatters';
import { parseDateMs } from '../utils';

type IncidentsSectionProps = {
  incidents: DispatchIncident[];
  bookings: BookingContract[];
  activity: OpsActivityItem[];
  canManageIncidents: boolean;
  incidentQueueView: 'all' | 'mine' | 'unassigned';
  showResolvedIncidents: boolean;
  incidentSnoozeMinutes: number;
  onIncidentQueueViewChange: (value: 'all' | 'mine' | 'unassigned') => void;
  onShowResolvedIncidentsChange: (value: boolean) => void;
  onIncidentSnoozeMinutesChange: (value: number) => void;
  onAssignIncidentToMe: (incidentId: string) => void;
  onAcknowledgeIncident: (incidentId: string) => void;
  onSnoozeIncident: (incidentId: string) => void;
  onResolveIncident: (incidentId: string) => void;
  onEscalateIncident: (incidentId: string) => void;
  onOpenBooking: (bookingId: string) => void;
};

export const IncidentsSection = ({
  incidents,
  bookings,
  activity,
  canManageIncidents,
  incidentQueueView,
  showResolvedIncidents,
  incidentSnoozeMinutes,
  onIncidentQueueViewChange,
  onShowResolvedIncidentsChange,
  onIncidentSnoozeMinutesChange,
  onAssignIncidentToMe,
  onAcknowledgeIncident,
  onSnoozeIncident,
  onResolveIncident,
  onEscalateIncident,
  onOpenBooking
}: IncidentsSectionProps) => {
  const now = Date.now();
  const open = incidents.filter((i) => i.status !== 'RESOLVED');
  const critical = open.filter((i) => i.severity === 'high').length;
  const unowned = open.filter((i) => !i.ownerAdminId).length;

  return (
    <section className="stack" aria-label="Incidents">
      <div className="kpi-grid">
        <div className="kpi-card" style={{ cursor: 'default' }}>
          <span className="kpi-label">Open</span>
          <span className="kpi-value">{open.length}</span>
        </div>
        <div className={`kpi-card ${critical ? 'is-danger' : ''}`} style={{ cursor: 'default' }}>
          <span className="kpi-label">High severity</span>
          <span className="kpi-value">{critical}</span>
        </div>
        <div className={`kpi-card ${unowned ? 'is-warn' : ''}`} style={{ cursor: 'default' }}>
          <span className="kpi-label">Unowned</span>
          <span className="kpi-value">{unowned}</span>
        </div>
      </div>

      <div className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>Incident queue</h2>
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
              Show resolved
            </label>
            <label>
              Snooze (min)
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
        </div>

        {incidents.length === 0 ? (
          <p className="muted">No incidents match this filter.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <caption className="sr-only">Incidents requiring ops ownership</caption>
              <thead>
                <tr>
                  <th scope="col">Severity</th>
                  <th scope="col">Booking</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Owner</th>
                  <th scope="col">Age</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => {
                  const booking = bookings.find((b) => b.id === incident.bookingId);
                  const age = Math.floor((now - parseDateMs(incident.updatedAt)) / 60000);
                  return (
                    <tr key={incident.id}>
                      <td>
                        <span
                          className={
                            incident.severity === 'high' ? 'pill-danger' : 'pill-warn'
                          }>
                          {incident.severity}
                        </span>
                      </td>
                      <td>
                        <strong>
                          {booking ? formatBookingRef(booking) : incident.bookingId}
                        </strong>
                      </td>
                      <td>{incident.reason}</td>
                      <td>{incident.ownerAdminName || 'Unowned'}</td>
                      <td>{minutesLabel(age)}</td>
                      <td>{incident.status}</td>
                      <td>
                        <div className="row">
                          <button
                            type="button"
                            className="secondary"
                            disabled={!canManageIncidents}
                            onClick={() => onAssignIncidentToMe(incident.id)}>
                            Mine
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            disabled={!canManageIncidents}
                            onClick={() => onAcknowledgeIncident(incident.id)}>
                            Ack
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
                            onClick={() => onOpenBooking(incident.bookingId)}>
                            Job
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Related audit trail</h2>
        <ul className="list">
          {activity
            .filter((item) => item.type.startsWith('INCIDENT_'))
            .slice(0, 12)
            .map((item) => (
              <li key={item.id}>
                <strong>{formatActivityMessage(item, { bookings })}</strong>
                <div className="muted">{new Date(item.createdAt).toLocaleString()}</div>
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
};
