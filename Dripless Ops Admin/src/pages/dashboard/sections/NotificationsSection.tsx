import type { NotificationContract, OpsActivityItem } from '@shared/types';

type NotificationsSectionProps = {
  currentNotifications: NotificationContract[];
  notificationPage: number;
  notificationTotalPages: number;
  canGoPreviousNotificationPage: boolean;
  canGoNextNotificationPage: boolean;
  onPreviousNotificationPage: () => void;
  onNextNotificationPage: () => void;
  currentActivity: OpsActivityItem[];
};

export const NotificationsSection = ({
  currentNotifications,
  notificationPage,
  notificationTotalPages,
  canGoPreviousNotificationPage,
  canGoNextNotificationPage,
  onPreviousNotificationPage,
  onNextNotificationPage,
  currentActivity
}: NotificationsSectionProps) => (
  <div className="row" style={{ alignItems: 'start' }}>
    <div className="card" style={{ flex: 1 }}>
      <h2 style={{ marginTop: 0 }}>Ops notifications</h2>
      {currentNotifications.length === 0 ? (
        <p className="muted">No notifications for this admin profile.</p>
      ) : (
        <ul className="list">
          {currentNotifications.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong> - {item.message}
              <div className="muted">
                {item.type.toUpperCase()} - {new Date(item.createdAt).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="row">
        <button
          className="secondary"
          onClick={onPreviousNotificationPage}
          disabled={!canGoPreviousNotificationPage}>
          Previous
        </button>
        <span className="muted">
          Page {notificationPage} / {notificationTotalPages}
        </span>
        <button className="secondary" onClick={onNextNotificationPage} disabled={!canGoNextNotificationPage}>
          Next
        </button>
      </div>
    </div>
    <div className="card" style={{ flex: 1 }}>
      <h2 style={{ marginTop: 0 }}>Recent activity log</h2>
      {currentActivity.length === 0 ? (
        <p className="muted">No activity entries available.</p>
      ) : (
        <ul className="list">
          {currentActivity.map((item) => (
            <li key={item.id}>
              <strong>{item.type}</strong> - {item.message}
              <div className="muted">
                Target {item.targetId} - {new Date(item.createdAt).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
);
