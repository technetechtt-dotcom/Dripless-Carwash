import type { BookingContract, OpsActivityItem } from '@shared/types';

type BroadcastType = 'info' | 'warning' | 'success' | 'error';

type SlaAlertItem = {
  booking: BookingContract;
  reason: string;
  severity: 'medium' | 'high';
};

type OverviewSectionProps = {
  broadcastTitle: string;
  broadcastMessage: string;
  broadcastType: BroadcastType;
  targetCustomer: boolean;
  targetDriver: boolean;
  targetOps: boolean;
  canBroadcast: boolean;
  onBroadcastTitleChange: (value: string) => void;
  onBroadcastMessageChange: (value: string) => void;
  onBroadcastTypeChange: (value: BroadcastType) => void;
  onTargetCustomerChange: (value: boolean) => void;
  onTargetDriverChange: (value: boolean) => void;
  onTargetOpsChange: (value: boolean) => void;
  onBroadcast: () => void;
  activityTypeOptions: Array<OpsActivityItem['type'] | 'ALL'>;
  activityTypeFilter: OpsActivityItem['type'] | 'ALL';
  activityQuery: string;
  currentActivity: OpsActivityItem[];
  activityPage: number;
  activityTotalPages: number;
  onActivityTypeFilterChange: (value: OpsActivityItem['type'] | 'ALL') => void;
  onActivityQueryChange: (value: string) => void;
  onPreviousActivityPage: () => void;
  onNextActivityPage: () => void;
  canGoPreviousActivityPage: boolean;
  canGoNextActivityPage: boolean;
  slaAlerts: SlaAlertItem[];
};

export const OverviewSection = ({
  broadcastTitle,
  broadcastMessage,
  broadcastType,
  targetCustomer,
  targetDriver,
  targetOps,
  canBroadcast,
  onBroadcastTitleChange,
  onBroadcastMessageChange,
  onBroadcastTypeChange,
  onTargetCustomerChange,
  onTargetDriverChange,
  onTargetOpsChange,
  onBroadcast,
  activityTypeOptions,
  activityTypeFilter,
  activityQuery,
  currentActivity,
  activityPage,
  activityTotalPages,
  onActivityTypeFilterChange,
  onActivityQueryChange,
  onPreviousActivityPage,
  onNextActivityPage,
  canGoPreviousActivityPage,
  canGoNextActivityPage,
  slaAlerts
}: OverviewSectionProps) => (
  <div className="row" style={{ alignItems: 'start' }}>
    <div className="card stack" style={{ flex: 1 }}>
      <h2 style={{ margin: 0 }}>Broadcast notice</h2>
      <input
        value={broadcastTitle}
        onChange={(event) => onBroadcastTitleChange(event.target.value)}
        placeholder="Broadcast title"
      />
      <textarea
        rows={4}
        value={broadcastMessage}
        onChange={(event) => onBroadcastMessageChange(event.target.value)}
        placeholder="Write announcement"
      />
      <div className="row">
        <label className="row">
          <input
            type="checkbox"
            checked={targetCustomer}
            onChange={(event) => onTargetCustomerChange(event.target.checked)}
            style={{ width: 'auto' }}
          />
          Customers
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={targetDriver}
            onChange={(event) => onTargetDriverChange(event.target.checked)}
            style={{ width: 'auto' }}
          />
          Drivers
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={targetOps}
            onChange={(event) => onTargetOpsChange(event.target.checked)}
            style={{ width: 'auto' }}
          />
          Ops
        </label>
        <select
          value={broadcastType}
          onChange={(event) => onBroadcastTypeChange(event.target.value as BroadcastType)}>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
        </select>
        <button className="warning" onClick={onBroadcast} disabled={!canBroadcast}>
          Broadcast
        </button>
      </div>
    </div>
    <div className="card stack" style={{ flex: 1 }}>
      <h2 style={{ margin: 0 }}>Latest operational activity</h2>
      <div className="row">
        <select
          value={activityTypeFilter}
          onChange={(event) =>
            onActivityTypeFilterChange(event.target.value as OpsActivityItem['type'] | 'ALL')
          }>
          {activityTypeOptions.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <input
          value={activityQuery}
          onChange={(event) => onActivityQueryChange(event.target.value)}
          placeholder="Search by actor, target, message"
        />
      </div>
      {currentActivity.length === 0 ? (
        <p className="muted">No activity entries.</p>
      ) : (
        <ul className="list">
          {currentActivity.map((item) => (
            <li key={item.id}>
              <strong>{item.type}</strong> - {item.message}
              <div className="muted">
                {new Date(item.createdAt).toLocaleString()} by {item.actorRole} ({item.actorId})
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="row">
        <button
          className="secondary"
          onClick={onPreviousActivityPage}
          disabled={!canGoPreviousActivityPage}>
          Previous
        </button>
        <span className="muted">
          Page {activityPage} / {activityTotalPages}
        </span>
        <button className="secondary" onClick={onNextActivityPage} disabled={!canGoNextActivityPage}>
          Next
        </button>
      </div>
      <h3 style={{ margin: '8px 0 0 0' }}>SLA alerts</h3>
      {slaAlerts.length === 0 ? (
        <p className="muted">No SLA breaches detected.</p>
      ) : (
        <ul className="list">
          {slaAlerts.slice(0, 5).map((item) => (
            <li key={item.booking.id} className={item.severity === 'high' ? 'alert-danger-soft' : ''}>
              <strong>{item.booking.id}</strong> - {item.reason}
              <div className="muted">
                {item.booking.serviceName} ({item.booking.status}) -{' '}
                {item.booking.driverId ? `Driver ${item.booking.driverId}` : 'No driver assigned'}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
);
