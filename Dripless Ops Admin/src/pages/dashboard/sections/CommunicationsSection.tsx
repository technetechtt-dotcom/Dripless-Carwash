import type { NotificationContract } from '@shared/types';

type CommunicationsSectionProps = {
  canBroadcast: boolean;
  broadcastTitle: string;
  broadcastMessage: string;
  broadcastType: 'info' | 'warning' | 'success' | 'error';
  targetCustomer: boolean;
  targetDriver: boolean;
  targetOps: boolean;
  onBroadcastTitleChange: (value: string) => void;
  onBroadcastMessageChange: (value: string) => void;
  onBroadcastTypeChange: (value: 'info' | 'warning' | 'success' | 'error') => void;
  onTargetCustomerChange: (value: boolean) => void;
  onTargetDriverChange: (value: boolean) => void;
  onTargetOpsChange: (value: boolean) => void;
  onBroadcast: () => void;
  sentHistory: NotificationContract[];
};

export const CommunicationsSection = ({
  canBroadcast,
  broadcastTitle,
  broadcastMessage,
  broadcastType,
  targetCustomer,
  targetDriver,
  targetOps,
  onBroadcastTitleChange,
  onBroadcastMessageChange,
  onBroadcastTypeChange,
  onTargetCustomerChange,
  onTargetDriverChange,
  onTargetOpsChange,
  onBroadcast,
  sentHistory
}: CommunicationsSectionProps) => (
  <section className="stack" aria-label="Broadcast centre">
    <div className="card stack panel-primary">
      <h2 style={{ margin: 0 }}>New broadcast</h2>
      <p className="muted" style={{ margin: 0 }}>
        Compose customer/driver/ops messages. Delivery tracking is best-effort on demo data.
      </p>
      {!canBroadcast ? (
        <p className="muted">You do not have broadcast permission.</p>
      ) : (
        <>
          <label>
            Title
            <input value={broadcastTitle} onChange={(e) => onBroadcastTitleChange(e.target.value)} />
          </label>
          <label>
            Message
            <textarea
              value={broadcastMessage}
              onChange={(e) => onBroadcastMessageChange(e.target.value)}
              rows={4}
            />
          </label>
          <label>
            Priority / type
            <select
              value={broadcastType}
              onChange={(e) =>
                onBroadcastTypeChange(e.target.value as 'info' | 'warning' | 'success' | 'error')
              }>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="success">Success</option>
              <option value="error">Urgent</option>
            </select>
          </label>
          <fieldset style={{ border: '1px solid var(--ops-border)', borderRadius: 8, padding: 12 }}>
            <legend>Audience</legend>
            <div className="row">
              <label className="row">
                <input
                  type="checkbox"
                  checked={targetCustomer}
                  onChange={(e) => onTargetCustomerChange(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                Customers
              </label>
              <label className="row">
                <input
                  type="checkbox"
                  checked={targetDriver}
                  onChange={(e) => onTargetDriverChange(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                Drivers
              </label>
              <label className="row">
                <input
                  type="checkbox"
                  checked={targetOps}
                  onChange={(e) => onTargetOpsChange(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                Ops admins
              </label>
            </div>
          </fieldset>
          <div>
            <button type="button" onClick={onBroadcast}>
              Send broadcast
            </button>
          </div>
        </>
      )}
    </div>

    <div className="card stack">
      <h2 style={{ margin: 0 }}>Recent ops messages</h2>
      {sentHistory.length === 0 ? (
        <p className="muted">No recent broadcast/message records for this inbox.</p>
      ) : (
        <ul className="list">
          {sentHistory.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong>
              <div>{item.message}</div>
              <div className="muted">
                {item.type} · {new Date(item.createdAt).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  </section>
);
