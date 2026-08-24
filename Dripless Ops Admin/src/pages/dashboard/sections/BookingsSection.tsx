import { useMemo, useState } from 'react';
import type {
  BookingContract,
  BookingStatus,
  DriverAssignmentRecommendation,
  DriverProfile
} from '@shared/types';
import {
  bookingZoneLabel,
  driverLabel,
  formatBookingRef,
  formatMoneyZar,
  formatPersonName
} from '../formatters';

const MAX_AUTO_DISPATCH_ATTEMPTS = 3;

const FORWARD_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['EN_ROUTE', 'CANCELLED'],
  EN_ROUTE: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
};

type BookingsSectionProps = {
  bookingQuery: string;
  bookingStatusFilter: 'ALL' | BookingStatus;
  bulkStatus: BookingStatus;
  statusOptions: BookingStatus[];
  currentBookings: BookingContract[];
  allBookings: BookingContract[];
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
  onApplyBulkStatus: (reason: string) => void;
  onToggleBookingSelected: (bookingId: string, checked: boolean) => void;
  onUpdateBookingStatus: (bookingId: string, status: BookingStatus, reason: string) => void;
  onRecommendDrivers: (bookingId: string) => void;
  onBookingDriverSelectionChange: (bookingId: string, driverId: string) => void;
  onAssignDriver: (bookingId: string, driverId?: string) => void;
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
  allBookings,
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
}: BookingsSectionProps) => {
  const [drawerBookingId, setDrawerBookingId] = useState<string | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkReason, setBulkReason] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [pendingStatus, setPendingStatus] = useState<{
    bookingId: string;
    status: BookingStatus;
  } | null>(null);

  const selectedCount = useMemo(
    () => Object.values(selectedBookings).filter(Boolean).length,
    [selectedBookings]
  );

  const drawerBooking =
    allBookings.find((b) => b.id === drawerBookingId) ??
    currentBookings.find((b) => b.id === drawerBookingId) ??
    null;

  const openDrawer = (bookingId: string) => {
    setDrawerBookingId(bookingId);
    void onRecommendDrivers(bookingId);
  };

  const allowedStatuses = (booking: BookingContract) => {
    const next = FORWARD_TRANSITIONS[booking.status] ?? [];
    return Array.from(new Set([booking.status, ...next]));
  };

  return (
    <section className="stack" aria-label="Jobs">
      <div className="card stack">
        <h2 style={{ margin: 0 }}>Jobs</h2>
        <div className="row">
          <label style={{ flex: 1 }}>
            <span className="sr-only">Search jobs</span>
            <input
              value={bookingQuery}
              onChange={(e) => onBookingQueryChange(e.target.value)}
              placeholder="Search booking ref, service, customer, driver"
            />
          </label>
          <label>
            Status
            <select
              value={bookingStatusFilter}
              onChange={(e) =>
                onBookingStatusFilterChange(e.target.value as 'ALL' | BookingStatus)
              }>
              <option value="ALL">All</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="secondary" onClick={onExportBookings}>
            Export CSV
          </button>
        </div>

        <div className="saved-view-row" role="group" aria-label="Saved operational views">
          <button
            type="button"
            className={bookingStatusFilter === 'ALL' && !bookingQuery ? '' : 'secondary'}
            onClick={() => {
              onBookingQueryChange('');
              onBookingStatusFilterChange('ALL');
            }}>
            All jobs
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              onBookingQueryChange('unassigned');
              onBookingStatusFilterChange('ALL');
            }}>
            Unassigned
          </button>
          <button
            type="button"
            className={bookingStatusFilter === 'IN_PROGRESS' ? '' : 'secondary'}
            onClick={() => {
              onBookingQueryChange('');
              onBookingStatusFilterChange('IN_PROGRESS');
            }}>
            In progress
          </button>
          <button
            type="button"
            className={bookingStatusFilter === 'CONFIRMED' ? '' : 'secondary'}
            onClick={() => {
              onBookingQueryChange('');
              onBookingStatusFilterChange('CONFIRMED');
            }}>
            Confirmed
          </button>
          <button
            type="button"
            className={bookingStatusFilter === 'CANCELLED' ? '' : 'secondary'}
            onClick={() => {
              onBookingQueryChange('');
              onBookingStatusFilterChange('CANCELLED');
            }}>
            Cancelled
          </button>
          <button
            type="button"
            className={bookingStatusFilter === 'COMPLETED' ? '' : 'secondary'}
            onClick={() => {
              onBookingQueryChange('');
              onBookingStatusFilterChange('COMPLETED');
            }}>
            Completed
          </button>
        </div>

        <div className="row">
          <label>
            Bulk action
            <select
              value={bulkStatus}
              onChange={(e) => onBulkStatusChange(e.target.value as BookingStatus)}>
              {statusOptions
                .filter((s) => s === 'CANCELLED' || s === 'CONFIRMED' || s === 'COMPLETED')
                .map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
            </select>
          </label>
          <button
            type="button"
            className="warning"
            disabled={!canUpdateBookings || selectedCount === 0}
            onClick={() => setBulkConfirmOpen(true)}>
            Apply to {selectedCount || '…'} selected
          </button>
        </div>

        {bulkConfirmOpen ? (
          <div className="confirm-box" role="dialog" aria-labelledby="bulk-confirm-title">
            <strong id="bulk-confirm-title">
              Change {selectedCount} selected booking(s) to {bulkStatus}?
            </strong>
            <label>
              Reason (required)
              <input
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                placeholder="Why is this bulk change needed?"
              />
            </label>
            <p className="muted">
              This is audit-logged. Customers may require a separate notification depending on status.
            </p>
            <div className="row">
              <button
                type="button"
                className="danger"
                disabled={!bulkReason.trim()}
                onClick={() => {
                  onApplyBulkStatus(bulkReason.trim());
                  setBulkConfirmOpen(false);
                  setBulkReason('');
                }}>
                Confirm bulk update
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setBulkConfirmOpen(false);
                  setBulkReason('');
                }}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div className="table-wrap">
          <table>
            <caption className="sr-only">Bookings queue</caption>
            <thead>
              <tr>
                <th scope="col">Select</th>
                <th scope="col">Priority</th>
                <th scope="col">Booking</th>
                <th scope="col">Scheduled</th>
                <th scope="col">Area</th>
                <th scope="col">Status</th>
                <th scope="col">Driver</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentBookings.map((booking) => (
                <tr key={booking.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={Boolean(selectedBookings[booking.id])}
                      onChange={(e) => onToggleBookingSelected(booking.id, e.target.checked)}
                      style={{ width: 'auto' }}
                      aria-label={`Select ${formatBookingRef(booking)}`}
                    />
                  </td>
                  <td>
                    {!booking.driverId && booking.status !== 'CANCELLED' ?
                      <span className="pill-warn">Unassigned</span>
                    : booking.status === 'CANCELLED' ?
                      <span className="pill-danger">Cancelled</span>
                    : (
                      <span className="pill-ok">On track</span>
                    )}
                  </td>
                  <td>
                    <strong>{formatBookingRef(booking)}</strong>
                    <div className="muted">{booking.serviceName}</div>
                    <div className="muted">{formatPersonName(booking.customerName)}</div>
                  </td>
                  <td className="muted">{new Date(booking.scheduledAt).toLocaleString()}</td>
                  <td className="muted">{bookingZoneLabel(booking.pickupLocation)}</td>
                  <td>
                    <select
                      value={booking.status}
                      disabled={!canUpdateBookings}
                      onChange={(e) => {
                        const next = e.target.value as BookingStatus;
                        if (next === booking.status) return;
                        if (next === 'CANCELLED') {
                          setPendingStatus({ bookingId: booking.id, status: next });
                          return;
                        }
                        onUpdateBookingStatus(booking.id, next, 'Controlled status advance');
                      }}>
                      {allowedStatuses(booking).map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{driverLabel(booking.driverId, drivers)}</td>
                  <td>
                    <div className="row">
                      <button type="button" className="secondary" onClick={() => openDrawer(booking.id)}>
                        Open
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="row">
          <button
            type="button"
            className="secondary"
            onClick={onPreviousBookingPage}
            disabled={!canGoPreviousBookingPage}>
            Previous
          </button>
          <span className="muted">
            Page {bookingPage} / {bookingTotalPages}
          </span>
          <button
            type="button"
            className="secondary"
            onClick={onNextBookingPage}
            disabled={!canGoNextBookingPage}>
            Next
          </button>
        </div>
      </div>

      {pendingStatus ? (
        <div className="drawer-backdrop" role="presentation" onClick={() => setPendingStatus(null)}>
          <div
            className="drawer-panel confirm-box"
            role="dialog"
            aria-labelledby="cancel-status-title"
            onClick={(e) => e.stopPropagation()}>
            <strong id="cancel-status-title">
              Move booking to {pendingStatus.status}?
            </strong>
            <label>
              Reason (required)
              <input
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Cancellation / exception reason"
              />
            </label>
            <div className="row">
              <button
                type="button"
                className="danger"
                disabled={!statusReason.trim()}
                onClick={() => {
                  onUpdateBookingStatus(
                    pendingStatus.bookingId,
                    pendingStatus.status,
                    statusReason.trim()
                  );
                  setPendingStatus(null);
                  setStatusReason('');
                }}>
                Confirm
              </button>
              <button type="button" className="ghost" onClick={() => setPendingStatus(null)}>
                Back
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {drawerBooking ? (
        <div className="drawer-backdrop" role="presentation" onClick={() => setDrawerBookingId(null)}>
          <div
            className="drawer-panel"
            role="dialog"
            aria-labelledby="booking-drawer-title"
            onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 id="booking-drawer-title" style={{ margin: 0 }}>
                {formatBookingRef(drawerBooking)}
              </h2>
              <button type="button" className="ghost" onClick={() => setDrawerBookingId(null)}>
                Close
              </button>
            </div>
            <div className="stack">
              <div>
                <div className="muted">Service</div>
                <strong>
                  {drawerBooking.serviceName} · {drawerBooking.optionName}
                </strong>
              </div>
              <div>
                <div className="muted">Customer</div>
                <strong>{formatPersonName(drawerBooking.customerName)}</strong>
                <div className="muted">{drawerBooking.customerId}</div>
              </div>
              <div>
                <div className="muted">Address</div>
                <div>{drawerBooking.pickupLocation}</div>
                {drawerBooking.destinationLocation ? (
                  <div className="muted">→ {drawerBooking.destinationLocation}</div>
                ) : null}
              </div>
              <div>
                <div className="muted">Schedule</div>
                <div>{new Date(drawerBooking.scheduledAt).toLocaleString()}</div>
              </div>
              <div>
                <div className="muted">Payment</div>
                <div>
                  {drawerBooking.paymentMethod} · {formatMoneyZar(drawerBooking.price)}
                  {drawerBooking.appliedSpecialPromoCode ?
                    ` · promo ${drawerBooking.appliedSpecialPromoCode}`
                  : ''}
                </div>
              </div>
              <div>
                <div className="muted">Driver</div>
                <div>{driverLabel(drawerBooking.driverId, drivers)}</div>
              </div>
              <div>
                <div className="muted">Dispatch</div>
                <div>
                  Attempts {drawerBooking.dispatchAttemptCount ?? 0}/{MAX_AUTO_DISPATCH_ATTEMPTS}
                </div>
                {drawerBooking.latestAudit?.reason ? (
                  <div className="muted">{drawerBooking.latestAudit.reason}</div>
                ) : null}
              </div>
              <div>
                <div className="muted">Status</div>
                <span className="pill">{drawerBooking.status}</span>
              </div>
              <div>
                <strong>Recommended drivers</strong>
                {(recommendationsByBooking[drawerBooking.id] ?? []).length === 0 ? (
                  <p className="muted">
                    <button
                      type="button"
                      className="secondary"
                      disabled={!canAssignBookings}
                      onClick={() => onRecommendDrivers(drawerBooking.id)}>
                      Rank drivers
                    </button>
                  </p>
                ) : (
                  <div className="stack" style={{ marginTop: 8 }}>
                    {(recommendationsByBooking[drawerBooking.id] ?? []).map((rec, index) => (
                      <div key={rec.driverId} className={`recommend-card ${index === 0 ? 'rank-1' : ''}`}>
                        <strong>
                          {index + 1}. {formatPersonName(rec.driverName)}
                        </strong>
                        <div className="muted">
                          {rec.etaMinutes != null ? `${rec.etaMinutes} min` : 'ETA n/a'}
                          {rec.distanceKm != null ? ` · ${rec.distanceKm.toFixed(1)} km` : ''} ·
                          score {rec.score.toFixed(1)}
                        </div>
                        <button
                          type="button"
                          disabled={!canAssignBookings}
                          onClick={() => onAssignDriver(drawerBooking.id, rec.driverId)}>
                          Assign
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="row" style={{ marginTop: 8 }}>
                  <select
                    value={selectedDriverByBooking[drawerBooking.id] || ''}
                    onChange={(e) =>
                      onBookingDriverSelectionChange(drawerBooking.id, e.target.value)
                    }>
                    <option value="">Select driver</option>
                    {drivers
                      .filter((d) => d.status !== 'SUSPENDED')
                      .map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name} · {driver.vehicle} · ★{driver.rating.toFixed(1)}
                          {driver.activeBookingId ? ' · busy' : ' · free'}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    disabled={!canAssignBookings}
                    onClick={() => onAssignDriver(drawerBooking.id)}>
                    Assign
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};
