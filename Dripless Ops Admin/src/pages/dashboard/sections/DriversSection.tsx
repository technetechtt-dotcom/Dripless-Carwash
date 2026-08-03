import type { AccountStatus, DriverProfile, DriverVerificationStatus } from '@shared/types';

type DriversSectionProps = {
  driverQuery: string;
  driverStatusFilter: 'ALL' | AccountStatus;
  driverVerificationFilter: 'ALL' | DriverVerificationStatus;
  accountStatusOptions: AccountStatus[];
  verificationStatusOptions: DriverVerificationStatus[];
  currentDrivers: DriverProfile[];
  driverPage: number;
  driverTotalPages: number;
  canUpdateDrivers: boolean;
  canVerifyDrivers: boolean;
  onDriverQueryChange: (value: string) => void;
  onDriverStatusFilterChange: (value: 'ALL' | AccountStatus) => void;
  onDriverVerificationFilterChange: (value: 'ALL' | DriverVerificationStatus) => void;
  onExportDrivers: () => void;
  onUpdateDriverStatus: (driverId: string, status: AccountStatus) => void;
  onUpdateDriverVerification: (driverId: string, status: DriverVerificationStatus) => void;
  onPreviousDriverPage: () => void;
  onNextDriverPage: () => void;
  canGoPreviousDriverPage: boolean;
  canGoNextDriverPage: boolean;
};

export const DriversSection = ({
  driverQuery,
  driverStatusFilter,
  driverVerificationFilter,
  accountStatusOptions,
  verificationStatusOptions,
  currentDrivers,
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
}: DriversSectionProps) => (
  <div className="card stack">
    <h2 style={{ margin: 0 }}>Driver management</h2>
    <div className="row">
      <input
        value={driverQuery}
        onChange={(event) => onDriverQueryChange(event.target.value)}
        placeholder="Search by name, email, vehicle, or id"
      />
      <select
        value={driverStatusFilter}
        onChange={(event) => onDriverStatusFilterChange(event.target.value as 'ALL' | AccountStatus)}>
        <option value="ALL">All account statuses</option>
        {accountStatusOptions.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <select
        value={driverVerificationFilter}
        onChange={(event) =>
          onDriverVerificationFilterChange(event.target.value as 'ALL' | DriverVerificationStatus)
        }>
        <option value="ALL">All verification states</option>
        {verificationStatusOptions.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <button className="secondary" onClick={onExportDrivers}>
        Export CSV
      </button>
    </div>
    <table>
      <thead>
        <tr>
          <th>Driver</th>
          <th>Vehicle</th>
          <th>Rating</th>
          <th>Current Assignment</th>
          <th>Account Status</th>
          <th>Verification</th>
        </tr>
      </thead>
      <tbody>
        {currentDrivers.map((driver) => (
          <tr key={driver.id}>
            <td>
              <strong>{driver.name}</strong>
              <div className="muted">{driver.email}</div>
              <div className="muted">{driver.id}</div>
            </td>
            <td>{driver.vehicle}</td>
            <td>{driver.rating.toFixed(2)}</td>
            <td>{driver.activeBookingId || 'Available'}</td>
            <td>
              <select
                value={driver.status}
                onChange={(event) =>
                  onUpdateDriverStatus(driver.id, event.target.value as AccountStatus)
                }
                disabled={!canUpdateDrivers}>
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
                onChange={(event) =>
                  onUpdateDriverVerification(driver.id, event.target.value as DriverVerificationStatus)
                }
                disabled={!canVerifyDrivers}>
                {verificationStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="row">
      <button className="secondary" onClick={onPreviousDriverPage} disabled={!canGoPreviousDriverPage}>
        Previous
      </button>
      <span className="muted">
        Page {driverPage} / {driverTotalPages}
      </span>
      <button className="secondary" onClick={onNextDriverPage} disabled={!canGoNextDriverPage}>
        Next
      </button>
    </div>
  </div>
);
