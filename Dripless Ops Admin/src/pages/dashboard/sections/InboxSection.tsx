import type { DispatchIncident, NotificationContract } from '@shared/types';
import { formatBookingRef } from '../formatters';
import type { BookingContract } from '@shared/types';

type InboxSectionProps = {
  notifications: NotificationContract[];
  notificationPage: number;
  notificationTotalPages: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  myIncidents: DispatchIncident[];
  bookings: BookingContract[];
  onOpenIncidentJob: (bookingId: string) => void;
};

export const InboxSection = ({
  notifications,
  notificationPage,
  notificationTotalPages,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
  myIncidents,
  bookings,
  onOpenIncidentJob
}: InboxSectionProps) => (
  <section className="stack" aria-label="Operator inbox">
    <div className="two-col">
      <div className="card stack">
        <h2 style={{ margin: 0 }}>Assigned incidents</h2>
        <p className="muted" style={{ margin: 0 }}>
          Work owned by you or waiting for triage.
        </p>
        {myIncidents.length === 0 ? (
          <p className="muted">No incidents assigned to you right now.</p>
        ) : (
          <ul className="list">
            {myIncidents.map((incident) => {
              const booking = bookings.find((b) => b.id === incident.bookingId);
              return (
                <li key={incident.id} className={incident.severity === 'high' ? 'priority-item is-critical' : ''}>
                  <strong>
                    {incident.severity.toUpperCase()} ·{' '}
                    {booking ? formatBookingRef(booking) : incident.bookingId}
                  </strong>
                  <div>{incident.reason}</div>
                  <div className="muted">
                    {incident.status}
                    {incident.ownerAdminName ? ` · ${incident.ownerAdminName}` : ' · Unowned'}
                  </div>
                  <button type="button" className="secondary" onClick={() => onOpenIncidentJob(incident.bookingId)}>
                    Open related job
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>System alerts & messages</h2>
        {notifications.length === 0 ? (
          <p className="muted">No notifications for this admin profile.</p>
        ) : (
          <ul className="list">
            {notifications.map((item) => (
              <li key={item.id}>
                <strong>{item.title}</strong>
                <div>{item.message}</div>
                <div className="muted">
                  <span
                    className={
                      item.type === 'error' ? 'pill-danger'
                      : item.type === 'warning' ? 'pill-warn'
                      : 'pill-ok'
                    }>
                    {item.type}
                  </span>{' '}
                  · {new Date(item.createdAt).toLocaleString()}
                  {item.read ? '' : ' · unread'}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="row">
          <button type="button" className="secondary" onClick={onPrevious} disabled={!canGoPrevious}>
            Previous
          </button>
          <span className="muted">
            Page {notificationPage} / {notificationTotalPages}
          </span>
          <button type="button" className="secondary" onClick={onNext} disabled={!canGoNext}>
            Next
          </button>
        </div>
      </div>
    </div>
  </section>
);
