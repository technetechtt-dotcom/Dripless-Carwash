import type {
  BookingContract,
  BookingStatus,
  DriverAssignmentRecommendation,
  DriverProfile
} from '@shared/types';

const MAX_AUTO_DISPATCH_ATTEMPTS = 3;

type BookingsSectionProps = {
  bookingQuery: string;
  bookingStatusFilter: 'ALL' | BookingStatus;
  bulkStatus: BookingStatus;
  statusOptions: BookingStatus[];
  currentBookings: BookingContract[];
  selectedBookings: Record<string, boolean>;
  selectedDriverByBooking: Record<string, string>;
  recommendationsByBooking: Record<string, DriverAssignmentRecommendation[]>;
  drivers: DriverProfile[];
  bookingPage: number;
  bookingTotalPages: number;
  canUpdateBookings: boolean;
  canAssignBookings: boolean;
  onBookingQueryChange: (value: string) => void;
  onBookingStatusFilterChange: (value: 'ALL' | BookingStatus) => void;
  onBulkStatusChange: (value: BookingStatus) => void;
  onExportBookings: () => void;
  onApplyBulkStatus: () => void;
  onToggleBookingSelected: (bookingId: string, checked: boolean) => void;
  onUpdateBookingStatus: (bookingId: string, status: BookingStatus) => void;
  onRecommendDrivers: (bookingId: string) => void;
  onBookingDriverSelectionChange: (bookingId: string, driverId: string) => void;
  onAssignDriver: (bookingId: string) => void;
  onPreviousBookingPage: () => void;
  onNextBookingPage: () => void;
  canGoPreviousBookingPage: boolean;
  canGoNextBookingPage: boolean;
};

export const BookingsSection = ({
  bookingQuery,
  bookingStatusFilter,
  bulkStatus,
  statusOptions,
  currentBookings,
  selectedBookings,
  selectedDriverByBooking,
  recommendationsByBooking,
  drivers,
  bookingPage,
  bookingTotalPages,
  canUpdateBookings,
  canAssignBookings,
  onBookingQueryChange,
  onBookingStatusFilterChange,
  onBulkStatusChange,
  onExportBookings,
  onApplyBulkStatus,
  onToggleBookingSelected,
  onUpdateBookingStatus,
  onRecommendDrivers,
  onBookingDriverSelectionChange,
  onAssignDriver,
  onPreviousBookingPage,
  onNextBookingPage,
  canGoPreviousBookingPage,
  canGoNextBookingPage
}: BookingsSectionProps) => (
  <div className="card stack">
    <h2 style={{ margin: 0 }}>Booking command center</h2>
    <div className="row">
      <input
        value={bookingQuery}
        onChange={(event) => onBookingQueryChange(event.target.value)}
        placeholder="Search booking id, service, customer, driver"
      />
      <select
        value={bookingStatusFilter}
        onChange={(event) => onBookingStatusFilterChange(event.target.value as 'ALL' | BookingStatus)}>
        <option value="ALL">All booking statuses</option>
        {statusOptions.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <button className="secondary" onClick={onExportBookings}>
        Export CSV
      </button>
    </div>
    <div className="row">
      <select value={bulkStatus} onChange={(event) => onBulkStatusChange(event.target.value as BookingStatus)}>
        {statusOptions.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <button onClick={onApplyBulkStatus} disabled={!canUpdateBookings}>
        Apply To Selected
      </button>
    </div>
    <table>
      <thead>
        <tr>
          <th>Select</th>
          <th>ID</th>
          <th>Service</th>
          <th>Customer</th>
          <th>Driver</th>
          <th>Status</th>
          <th>Recommendation</th>
          <th>Assign Driver</th>
        </tr>
      </thead>
      <tbody>
        {currentBookings.map((booking) => (
          <tr key={booking.id}>
            <td>
              <input
                type="checkbox"
                checked={Boolean(selectedBookings[booking.id])}
                onChange={(event) => onToggleBookingSelected(booking.id, event.target.checked)}
                style={{ width: 'auto' }}
              />
            </td>
            <td>{booking.id}</td>
            <td>
              <strong>{booking.serviceName}</strong>
              <div className="muted">{booking.optionName}</div>
              {booking.pooledWithBookingId ? (
                <div className="muted">Pooled with: {booking.pooledWithBookingId}</div>
              ) : null}
              {booking.latestAudit?.reason ? (
                <div className="muted">Dispatch: {booking.latestAudit.reason}</div>
              ) : null}
              <div className="muted">
                Attempts: {booking.dispatchAttemptCount ?? 0}/{MAX_AUTO_DISPATCH_ATTEMPTS}
              </div>
              {booking.appliedSpecialPromoCode ? (
                <div className="muted">
                  Promo: {booking.appliedSpecialPromoCode} (-$
                  {(booking.specialDiscountAmount ?? 0).toFixed(2)})
                </div>
              ) : null}
              <div className="muted">Scheduled: {booking.scheduledAt}</div>
            </td>
            <td>
              {booking.customerName || booking.customerId || 'Unknown'}
              <div className="muted">{booking.customerId}</div>
            </td>
            <td>{booking.driverId || 'Unassigned'}</td>
            <td>
              <select
                value={booking.status}
                onChange={(event) => onUpdateBookingStatus(booking.id, event.target.value as BookingStatus)}
                disabled={!canUpdateBookings}>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <button
                className="secondary"
                onClick={() => onRecommendDrivers(booking.id)}
                disabled={!canAssignBookings}>
                Recommend
              </button>
              {recommendationsByBooking[booking.id]?.[0] ? (
                <div className="muted" style={{ marginTop: 6 }}>
                  Top: {recommendationsByBooking[booking.id][0].driverName} (
                  {recommendationsByBooking[booking.id][0].score})
                  {recommendationsByBooking[booking.id][0].distanceKm !== undefined &&
                  recommendationsByBooking[booking.id][0].etaMinutes !== undefined ? (
                    <div>
                      {recommendationsByBooking[booking.id][0].distanceKm?.toFixed(1)} km away (~
                      {recommendationsByBooking[booking.id][0].etaMinutes} min)
                    </div>
                  ) : null}
                </div>
              ) : null}
            </td>
            <td>
              <div className="row">
                <select
                  value={selectedDriverByBooking[booking.id] || ''}
                  onChange={(event) =>
                    onBookingDriverSelectionChange(booking.id, event.target.value)
                  }>
                  <option value="">Select driver</option>
                  {drivers
                    .filter((driver) => driver.status !== 'SUSPENDED')
                    .map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} ({driver.id})
                      </option>
                    ))}
                </select>
                <button onClick={() => onAssignDriver(booking.id)} disabled={!canAssignBookings}>
                  Assign
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="row">
      <button
        className="secondary"
        onClick={onPreviousBookingPage}
        disabled={!canGoPreviousBookingPage}>
        Previous
      </button>
      <span className="muted">
        Page {bookingPage} / {bookingTotalPages}
      </span>
      <button className="secondary" onClick={onNextBookingPage} disabled={!canGoNextBookingPage}>
        Next
      </button>
    </div>
  </div>
);
