import { useMemo, useState } from 'react';
import type {
  AccountStatus,
  BookingContract,
  DriverProfile,
  DriverVerificationStatus
} from '@shared/types';
import { formatPersonName, formatShortId, minutesLabel } from '../formatters';

type DriversSectionProps = {
  driverQuery: string;
  driverStatusFilter: 'ALL' | AccountStatus;
  driverVerificationFilter: 'ALL' | DriverVerificationStatus;
  accountStatusOptions: AccountStatus[];
  verificationStatusOptions: DriverVerificationStatus[];
  currentDrivers: DriverProfile[];
  allDrivers: DriverProfile[];
  bookings: BookingContract[];
  driverLocations: Array<{
    driverId: string;
    driverName: string;
    activeBookingId?: string | null;
    status: string;
    location?: {
      lat: number;
      lng: number;
      updatedAt: string;
    } | null;
  }>;
  driverPage: number;
  driverTotalPages: number;
  canUpdateDrivers: boolean;
  canVerifyDrivers: boolean;
  onDriverQueryChange: (value: string) => void;
  onDriverStatusFilterChange: (value: 'ALL' | AccountStatus) => void;
  onDriverVerificationFilterChange: (value: 'ALL' | DriverVerificationStatus) => void;
  onExportDrivers: () => void;
  onUpdateDriverStatus: (driverId: string, status: AccountStatus, reason: string) => void;
  onUpdateDriverVerification: (
    driverId: string,
    status: DriverVerificationStatus,
    reason: string
  ) => void;
  onPreviousDriverPage: () => void;
  onNextDriverPage: () => void;
  canGoPreviousDriverPage: boolean;
  canGoNextDriverPage: boolean;
};

type OpsDriverBucket =
  | 'pending_verification'
  | 'available'
  | 'offline'
  | 'working'
  | 'suspended'
  | 'all';

export const DriversSection = ({
  driverQuery,
  driverStatusFilter,
  driverVerificationFilter,
  accountStatusOptions,
  verificationStatusOptions,
  currentDrivers,
  allDrivers,
  bookings,
  driverLocations,
  driverPage,
  driverTotalPages,
  canUpdateDrivers,
  canVerifyDrivers,
  onDriverQueryChange,
  onDriverStatusFilterChange,
  onDriverVerificationFilterChange,
  onExportDrivers,
  onUpdateDriverStatus,
  onUpdateDriverVerification,
  onPreviousDriverPage,
  onNextDriverPage,
  canGoPreviousDriverPage,
  canGoNextDriverPage
}: DriversSectionProps) => {
  const [bucket, setBucket] = useState<OpsDriverBucket>('all');
  const [pendingStatus, setPendingStatus] = useState<{
    driverId: string;
    name: string;
    status: AccountStatus;
  } | null>(null);
  const [pendingVerify, setPendingVerify] = useState<{
    driverId: string;
    name: string;
    status: DriverVerificationStatus;
  } | null>(null);
  const [reason, setReason] = useState('');

  const buckets = useMemo(() => {
    const rows = {
      pending_verification: 0,
      available: 0,
      offline: 0,
      working: 0,
      suspended: 0
    };
    for (const driver of allDrivers) {
      if (driver.status === 'SUSPENDED') rows.suspended += 1;
      else if (driver.verificationStatus === 'PENDING') rows.pending_verification += 1;
      else if (driver.activeBookingId) rows.working += 1;
      else if (driver.lastKnownLocation) rows.available += 1;
      else rows.offline += 1;
    }
    return rows;
  }, [allDrivers]);

  const filtered = useMemo(() => {
    if (bucket === 'all') return currentDrivers;
    return currentDrivers.filter((driver) => {
      if (bucket === 'suspended') return driver.status === 'SUSPENDED';
      if (bucket === 'pending_verification') return driver.verificationStatus === 'PENDING';
      if (bucket === 'working') return Boolean(driver.activeBookingId);
      if (bucket === 'available')
        return (
          driver.status === 'ACTIVE' &&
          driver.verificationStatus === 'VERIFIED' &&
          !driver.activeBookingId &&
          Boolean(driver.lastKnownLocation)
        );
      if (bucket === 'offline')
        return (
          driver.status !== 'SUSPENDED' &&
          !driver.activeBookingId &&
          !driver.lastKnownLocation
        );
      return true;
    });
  }, [bucket, currentDrivers]);

  const locationById = useMemo(() => {
    const map = new Map(driverLocations.map((row) => [row.driverId, row]));
    return map;
  }, [driverLocations]);

  return (
    <section className="stack" aria-label="Drivers">
      <div className="kpi-grid">
        {(
          [
            ['pending_verification', 'Pending verification', buckets.pending_verification],
            ['available', 'Available', buckets.available],
            ['working', 'Working', buckets.working],
            ['offline', 'Offline', buckets.offline],
            ['suspended', 'Suspended', buckets.suspended]
          ] as Array<[OpsDriverBucket, string, number]>
        ).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            className={`kpi-card ${bucket === key ? 'is-warn' : ''}`}
            onClick={() => setBucket(key)}>
            <span className="kpi-label">{label}</span>
            <span className="kpi-value">{count}</span>
          </button>
        ))}
      </div>

      <div className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>Driver operations</h2>
          <button type="button" className="ghost" onClick={() => setBucket('all')}>
            Clear bucket filter
          </button>
        </div>
        <div className="row">
          <label style={{ flex: 1 }}>
            <span className="sr-only">Search drivers</span>
            <input
              value={driverQuery}
              onChange={(e) => onDriverQueryChange(e.target.value)}
              placeholder="Search name, email, vehicle, id"
            />
          </label>
          <label>
            Account
            <select
              value={driverStatusFilter}
              onChange={(e) =>
                onDriverStatusFilterChange(e.target.value as 'ALL' | AccountStatus)
              }>
              <option value="ALL">All accounts</option>
              {accountStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label>
            Verification
            <select
              value={driverVerificationFilter}
              onChange={(e) =>
                onDriverVerificationFilterChange(
                  e.target.value as 'ALL' | DriverVerificationStatus
                )
              }>
              <option value="ALL">All verification</option>
              {verificationStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="secondary" onClick={onExportDrivers}>
            Export CSV
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <caption className="sr-only">Driver workforce</caption>
            <thead>
              <tr>
                <th scope="col">Driver</th>
                <th scope="col">Vehicle</th>
                <th scope="col">Ops state</th>
                <th scope="col">Location</th>
                <th scope="col">Job</th>
                <th scope="col">Rating</th>
                <th scope="col">Account</th>
                <th scope="col">Verification</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((driver) => {
                const loc = locationById.get(driver.id)?.location ?? driver.lastKnownLocation;
                const gpsAge = loc?.updatedAt
                  ? Math.floor((Date.now() - new Date(loc.updatedAt).getTime()) / 60000)
                  : null;
                const nextJob = bookings.find(
                  (b) =>
                    b.driverId === driver.id &&
                    !['COMPLETED', 'CANCELLED'].includes(b.status) &&
                    b.id !== driver.activeBookingId
                );
                const opsState =
                  driver.status === 'SUSPENDED' ? 'Suspended'
                  : driver.verificationStatus === 'PENDING' ? 'Pending verification'
                  : driver.activeBookingId ? 'Working'
                  : loc ? 'Available'
                  : 'Offline';
                return (
                  <tr key={driver.id}>
                    <td>
                      <strong>{formatPersonName(driver.name)}</strong>
                      <div className="muted">{formatShortId(driver.id, 'DRV')}</div>
                      <div className="muted">{driver.email}</div>
                    </td>
                    <td>{driver.vehicle}</td>
                    <td>
                      <span
                        className={
                          opsState === 'Suspended' || opsState === 'Offline' ? 'pill-warn'
                          : opsState === 'Pending verification' ? 'pill-warn'
                          : 'pill-ok'
                        }>
                        {opsState}
                      </span>
                    </td>
                    <td className="muted">
                      {loc ?
                        `${loc.lat.toFixed(3)}, ${loc.lng.toFixed(3)}${
                          gpsAge != null ? ` · ${minutesLabel(gpsAge)} ago` : ''
                        }`
                      : 'No GPS'}
                    </td>
                    <td className="muted">
                      {driver.activeBookingId ?
                        `Active ${formatShortId(driver.activeBookingId, 'JOB')}`
                      : '—'}
                      {nextJob ?
                        <div>Next soon</div>
                      : null}
                    </td>
                    <td>{driver.rating.toFixed(2)}</td>
                    <td>
                      <select
                        value={driver.status}
                        disabled={!canUpdateDrivers}
                        onChange={(e) => {
                          const next = e.target.value as AccountStatus;
                          if (next === driver.status) return;
                          setPendingStatus({
                            driverId: driver.id,
                            name: driver.name,
                            status: next
                          });
                        }}>
                        {accountStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={driver.verificationStatus}
                        disabled={!canVerifyDrivers}
                        onChange={(e) => {
                          const next = e.target.value as DriverVerificationStatus;
                          if (next === driver.verificationStatus) return;
                          setPendingVerify({
                            driverId: driver.id,
                            name: driver.name,
                            status: next
                          });
                        }}>
                        {verificationStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="row">
          <button
            type="button"
            className="secondary"
            onClick={onPreviousDriverPage}
            disabled={!canGoPreviousDriverPage}>
            Previous
          </button>
          <span className="muted">
            Page {driverPage} / {driverTotalPages}
          </span>
          <button
            type="button"
            className="secondary"
            onClick={onNextDriverPage}
            disabled={!canGoNextDriverPage}>
            Next
          </button>
        </div>
      </div>

      {(pendingStatus || pendingVerify) && (
        <div
          className="drawer-backdrop"
          role="presentation"
          onClick={() => {
            setPendingStatus(null);
            setPendingVerify(null);
            setReason('');
          }}>
          <div
            className="drawer-panel confirm-box"
            role="dialog"
            onClick={(e) => e.stopPropagation()}>
            <strong>
              {pendingStatus ?
                `Set ${pendingStatus.name} account to ${pendingStatus.status}?`
              : `Set ${pendingVerify!.name} verification to ${pendingVerify!.status}?`}
            </strong>
            <label>
              Reason / evidence
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Document review note, policy, duration…"
              />
            </label>
            <div className="row">
              <button
                type="button"
                className="danger"
                disabled={!reason.trim()}
                onClick={() => {
                  if (pendingStatus) {
                    onUpdateDriverStatus(
                      pendingStatus.driverId,
                      pendingStatus.status,
                      reason.trim()
                    );
                  } else if (pendingVerify) {
                    onUpdateDriverVerification(
                      pendingVerify.driverId,
                      pendingVerify.status,
                      reason.trim()
                    );
                  }
                  setPendingStatus(null);
                  setPendingVerify(null);
                  setReason('');
                }}>
                Confirm
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setPendingStatus(null);
                  setPendingVerify(null);
                  setReason('');
                }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
