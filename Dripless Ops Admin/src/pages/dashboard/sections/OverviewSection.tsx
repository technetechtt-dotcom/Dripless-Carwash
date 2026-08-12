import type {
  BookingContract,
  NotificationContract,
  OpsActivityItem,
  OpsAnalytics
} from '@shared/types';
import {
  bookingZoneLabel,
  formatActivityMessage,
  formatBookingRef,
  formatPersonName
} from '../formatters';
import type { DashboardTab } from '../navigation';
import { DispatchMapPanel } from './DispatchMapPanel';

export type AttentionItem = {
  id: string;
  severity: 'critical' | 'warning';
  title: string;
  detail: string;
  actionLabel?: string;
  onAction?: () => void;
};

type OverviewSectionProps = {
  analytics: OpsAnalytics | null;
  kpis: Array<{
    key: string;
    label: string;
    value: number | string;
    tone?: 'default' | 'warn' | 'danger';
    onClick?: () => void;
  }>;
  attention: AttentionItem[];
  activity: OpsActivityItem[];
  notifications: NotificationContract[];
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
  openIncidentCount: number;
  liveMode: boolean;
  canBroadcast: boolean;
  analyticsFrom: string;
  analyticsTo: string;
  onAnalyticsFromChange: (value: string) => void;
  onAnalyticsToChange: (value: string) => void;
  onRefreshAnalytics: () => void;
  onNavigate: (tab: DashboardTab) => void;
  // compact broadcast
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
};

export const OverviewSection = ({
  analytics,
  kpis,
  attention,
  activity,
  notifications,
  bookings,
  driverLocations,
  openIncidentCount,
  liveMode,
  canBroadcast,
  analyticsFrom,
  analyticsTo,
  onAnalyticsFromChange,
  onAnalyticsToChange,
  onRefreshAnalytics,
  onNavigate,
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
  onBroadcast
}: OverviewSectionProps) => {
  const critical = attention.filter((item) => item.severity === 'critical');
  const warning = attention.filter((item) => item.severity === 'warning');
  const activeBookings = bookings.filter((b) => !['COMPLETED', 'CANCELLED'].includes(b.status));

  return (
    <section className="stack" aria-label="Command centre">
      <div className="kpi-grid" role="list">
        {kpis.map((kpi) => (
          <button
            key={kpi.key}
            type="button"
            className={`kpi-card ${kpi.tone === 'danger' ? 'is-danger' : ''} ${kpi.tone === 'warn' ? 'is-warn' : ''}`}
            onClick={kpi.onClick}
            role="listitem">
            <span className="kpi-label">{kpi.label}</span>
            <span className="kpi-value">{kpi.value}</span>
          </button>
        ))}
      </div>

      <div className="two-col">
        <div className="card panel-primary">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0 }}>Priority queue</h2>
              <p className="muted" style={{ margin: '4px 0 0' }}>
                What needs attention now{liveMode ? ' · live' : ''}
              </p>
            </div>
            <button type="button" className="ghost" onClick={() => onNavigate('dispatch')}>
              Open dispatch
            </button>
          </div>
          <div className="stack" style={{ marginTop: 12 }}>
            {critical.length === 0 && warning.length === 0 ? (
              <p className="muted">Operations look healthy — no critical items right now.</p>
            ) : null}
            {critical.length > 0 ? (
              <>
                <strong style={{ color: 'var(--ops-red)' }}>Critical</strong>
                {critical.map((item) => (
                  <div key={item.id} className="priority-item is-critical">
                    <strong>{item.title}</strong>
                    <span className="muted">{item.detail}</span>
                    {item.onAction ? (
                      <div>
                        <button type="button" className="danger" onClick={item.onAction}>
                          {item.actionLabel || 'Open'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </>
            ) : null}
            {warning.length > 0 ? (
              <>
                <strong style={{ color: 'var(--ops-amber)' }}>Warning</strong>
                {warning.map((item) => (
                  <div key={item.id} className="priority-item is-warning">
                    <strong>{item.title}</strong>
                    <span className="muted">{item.detail}</span>
                    {item.onAction ? (
                      <div>
                        <button type="button" className="warning" onClick={item.onAction}>
                          {item.actionLabel || 'Review'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </>
            ) : null}
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Live operations map</h2>
          <p className="muted">Drivers and active jobs</p>
          <DispatchMapPanel bookings={activeBookings} driverLocations={driverLocations} />
          <div className="row" style={{ marginTop: 10 }}>
            <span className="pill">{driverLocations.length} drivers tracked</span>
            <span className="pill">{openIncidentCount} open incidents</span>
          </div>
        </div>
      </div>

      <div className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>Operational performance</h2>
          <div className="row">
            <label>
              <span className="sr-only">From date</span>
              <input
                type="date"
                value={analyticsFrom}
                onChange={(e) => onAnalyticsFromChange(e.target.value)}
              />
            </label>
            <label>
              <span className="sr-only">To date</span>
              <input
                type="date"
                value={analyticsTo}
                onChange={(e) => onAnalyticsToChange(e.target.value)}
              />
            </label>
            <button type="button" className="secondary" onClick={onRefreshAnalytics}>
              Refresh
            </button>
          </div>
        </div>
        {analytics ? (
          <div className="kpi-grid">
            <div className="kpi-card" style={{ cursor: 'default' }}>
              <span className="kpi-label">Jobs in range</span>
              <span className="kpi-value">{analytics.totalBookings}</span>
            </div>
            <div className="kpi-card" style={{ cursor: 'default' }}>
              <span className="kpi-label">Completion rate</span>
              <span className="kpi-value">{(analytics.completionRate * 100).toFixed(0)}%</span>
            </div>
            <div className="kpi-card" style={{ cursor: 'default' }}>
              <span className="kpi-label">Revenue</span>
              <span className="kpi-value">${analytics.revenue.toFixed(0)}</span>
            </div>
            <div className="kpi-card" style={{ cursor: 'default' }}>
              <span className="kpi-label">Cancelled</span>
              <span className="kpi-value">{analytics.cancelledBookings}</span>
            </div>
          </div>
        ) : (
          <p className="muted">No analytics available for the selected range.</p>
        )}
      </div>

      <div className="two-col">
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0 }}>Recent activity</h2>
            <button type="button" className="ghost" onClick={() => onNavigate('audit')}>
              Audit log
            </button>
          </div>
          <ul className="list" style={{ marginTop: 12 }}>
            {activity.slice(0, 8).map((item) => (
              <li key={item.id}>
                <strong>{formatActivityMessage(item, { bookings })}</strong>
                <div className="muted">{new Date(item.createdAt).toLocaleString()}</div>
              </li>
            ))}
            {activity.length === 0 ? <li className="muted">No recent activity.</li> : null}
          </ul>
        </div>

        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0 }}>Inbox snapshot</h2>
            <button type="button" className="ghost" onClick={() => onNavigate('inbox')}>
              Open inbox
            </button>
          </div>
          <ul className="list" style={{ marginTop: 12 }}>
            {notifications.slice(0, 6).map((item) => (
              <li key={item.id}>
                <strong>{item.title}</strong>
                <div className="muted">
                  {item.type} · {new Date(item.createdAt).toLocaleString()}
                </div>
                <div>{item.message}</div>
              </li>
            ))}
            {notifications.length === 0 ? <li className="muted">No inbox messages yet.</li> : null}
          </ul>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Active jobs</h2>
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Active bookings</caption>
            <thead>
              <tr>
                <th scope="col">Booking</th>
                <th scope="col">Customer</th>
                <th scope="col">Area</th>
                <th scope="col">Status</th>
                <th scope="col">When</th>
              </tr>
            </thead>
            <tbody>
              {activeBookings.slice(0, 8).map((booking) => (
                <tr key={booking.id}>
                  <td>
                    <strong>{formatBookingRef(booking)}</strong>
                    <div className="muted">{booking.serviceName}</div>
                  </td>
                  <td>{formatPersonName(booking.customerName)}</td>
                  <td className="muted">{bookingZoneLabel(booking.pickupLocation)}</td>
                  <td>
                    <span
                      className={
                        booking.status === 'CANCELLED' ?
                          'pill-danger'
                        : booking.status === 'PENDING' ?
                          'pill-warn'
                        : 'pill-ok'
                      }>
                      {booking.status}
                    </span>
                  </td>
                  <td className="muted">{new Date(booking.scheduledAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <button type="button" className="secondary" onClick={() => onNavigate('bookings')}>
            Open jobs
          </button>
        </div>
      </div>

      {canBroadcast ? (
        <details className="card">
          <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
            Quick broadcast (prefer Communications)
          </summary>
          <div className="stack" style={{ marginTop: 12 }}>
            <label>
              Title
              <input value={broadcastTitle} onChange={(e) => onBroadcastTitleChange(e.target.value)} />
            </label>
            <label>
              Message
              <textarea
                value={broadcastMessage}
                onChange={(e) => onBroadcastMessageChange(e.target.value)}
                rows={3}
              />
            </label>
            <label>
              Type
              <select
                value={broadcastType}
                onChange={(e) =>
                  onBroadcastTypeChange(e.target.value as 'info' | 'warning' | 'success' | 'error')
                }>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
              </select>
            </label>
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
                Ops
              </label>
            </div>
            <div className="row">
              <button type="button" onClick={onBroadcast}>
                Send broadcast
              </button>
              <button type="button" className="ghost" onClick={() => onNavigate('communications')}>
                Broadcast centre
              </button>
            </div>
          </div>
        </details>
      ) : null}
    </section>
  );
};
