import type { BookingContract, OpsAnalytics } from '@shared/types';
import { bookingZoneLabel, formatBookingRef, formatPersonName } from '../formatters';

type ReportsSectionProps = {
  analytics: OpsAnalytics | null;
  analyticsFrom: string;
  analyticsTo: string;
  onAnalyticsFromChange: (value: string) => void;
  onAnalyticsToChange: (value: string) => void;
  onRefreshAnalytics: () => void;
  bookings: BookingContract[];
  onExportBookings: () => void;
};

export const ReportsSection = ({
  analytics,
  analyticsFrom,
  analyticsTo,
  onAnalyticsFromChange,
  onAnalyticsToChange,
  onRefreshAnalytics,
  bookings,
  onExportBookings
}: ReportsSectionProps) => {
  const byService = bookings.reduce<Record<string, { count: number; revenue: number; completed: number }>>(
    (acc, booking) => {
      const key = booking.serviceName || booking.serviceType;
      if (!acc[key]) acc[key] = { count: 0, revenue: 0, completed: 0 };
      acc[key].count += 1;
      if (booking.status === 'COMPLETED') {
        acc[key].revenue += booking.price;
        acc[key].completed += 1;
      }
      return acc;
    },
    {}
  );
  const serviceRows = Object.entries(byService)
    .map(([service, stats]) => ({ service, ...stats }))
    .sort((a, b) => b.count - a.count);

  const byZone = bookings.reduce<Record<string, number>>((acc, booking) => {
    const zone = bookingZoneLabel(booking.pickupLocation);
    acc[zone] = (acc[zone] ?? 0) + 1;
    return acc;
  }, {});
  const zoneRows = Object.entries(byZone)
    .map(([zone, count]) => ({ zone, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const cancelled = bookings.filter((b) => b.status === 'CANCELLED').length;
  const completed = bookings.filter((b) => b.status === 'COMPLETED').length;
  const unassigned = bookings.filter(
    (b) => !b.driverId && !['COMPLETED', 'CANCELLED'].includes(b.status)
  ).length;
  const maxServiceCount = Math.max(1, ...serviceRows.map((r) => r.count));

  return (
    <section className="stack" aria-label="Reports">
      <div className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>Service-level performance</h2>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              Completion, revenue and demand by service and area.
            </p>
          </div>
          <div className="row">
            <label>
              From
              <input
                type="date"
                value={analyticsFrom}
                onChange={(e) => onAnalyticsFromChange(e.target.value)}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={analyticsTo}
                onChange={(e) => onAnalyticsToChange(e.target.value)}
              />
            </label>
            <button type="button" className="secondary" onClick={onRefreshAnalytics}>
              Refresh
            </button>
            <button type="button" className="ghost" onClick={onExportBookings}>
              Export jobs CSV
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
              <span className="kpi-value">{(analytics.completionRate * 100).toFixed(1)}%</span>
            </div>
            <div className="kpi-card" style={{ cursor: 'default' }}>
              <span className="kpi-label">Revenue</span>
              <span className="kpi-value">${analytics.revenue.toFixed(0)}</span>
            </div>
            <div className="kpi-card" style={{ cursor: 'default' }}>
              <span className="kpi-label">Avg job value</span>
              <span className="kpi-value">${analytics.avgBookingValue.toFixed(0)}</span>
            </div>
            <div className="kpi-card" style={{ cursor: 'default' }}>
              <span className="kpi-label">Cancelled</span>
              <span className="kpi-value">{analytics.cancelledBookings}</span>
            </div>
            <div className="kpi-card" style={{ cursor: 'default' }}>
              <span className="kpi-label">Top service</span>
              <span className="kpi-value" style={{ fontSize: 16 }}>
                {analytics.topServiceType}
              </span>
            </div>
          </div>
        ) : (
          <p className="muted">No analytics for this range yet.</p>
        )}
      </div>

      <div className="two-col">
        <div className="card stack">
          <h3 style={{ margin: 0 }}>Demand by service (all loaded jobs)</h3>
          {serviceRows.length === 0 ? (
            <p className="muted">No booking data.</p>
          ) : (
            <ul className="list">
              {serviceRows.map((row) => (
                <li key={row.service}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <strong>{row.service}</strong>
                    <span className="muted">
                      {row.count} jobs · ${row.revenue.toFixed(0)} · {row.completed} done
                    </span>
                  </div>
                  <div
                    className="report-bar"
                    aria-hidden
                    style={{
                      height: 8,
                      borderRadius: 999,
                      background: 'var(--ops-border)',
                      overflow: 'hidden',
                      marginTop: 8
                    }}>
                    <div
                      style={{
                        width: `${Math.round((row.count / maxServiceCount) * 100)}%`,
                        height: '100%',
                        background: 'var(--ops-teal)'
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card stack">
          <h3 style={{ margin: 0 }}>Volume by area</h3>
          {zoneRows.length === 0 ? (
            <p className="muted">No location data.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <caption className="sr-only">Jobs by service area</caption>
                <thead>
                  <tr>
                    <th scope="col">Area</th>
                    <th scope="col">Jobs</th>
                  </tr>
                </thead>
                <tbody>
                  {zoneRows.map((row) => (
                    <tr key={row.zone}>
                      <td>{row.zone}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="row">
            <span className="pill-ok">{completed} completed</span>
            <span className="pill-warn">{unassigned} unassigned</span>
            <span className="pill-danger">{cancelled} cancelled</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Recent completed jobs</h3>
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Recently completed jobs</caption>
            <thead>
              <tr>
                <th scope="col">Booking</th>
                <th scope="col">Customer</th>
                <th scope="col">Service</th>
                <th scope="col">Value</th>
                <th scope="col">When</th>
              </tr>
            </thead>
            <tbody>
              {bookings
                .filter((b) => b.status === 'COMPLETED')
                .slice(0, 12)
                .map((booking) => (
                  <tr key={booking.id}>
                    <td>{formatBookingRef(booking)}</td>
                    <td>{formatPersonName(booking.customerName)}</td>
                    <td>{booking.serviceName}</td>
                    <td>${booking.price.toFixed(2)}</td>
                    <td className="muted">{new Date(booking.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
