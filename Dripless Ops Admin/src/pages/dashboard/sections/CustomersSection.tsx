import type { AccountStatus, CustomerProfile } from '@shared/types';

type CustomersSectionProps = {
  customerQuery: string;
  customerStatusFilter: 'ALL' | AccountStatus;
  accountStatusOptions: AccountStatus[];
  currentCustomers: CustomerProfile[];
  customerPage: number;
  customerTotalPages: number;
  canUpdateCustomers: boolean;
  onCustomerQueryChange: (value: string) => void;
  onCustomerStatusFilterChange: (value: 'ALL' | AccountStatus) => void;
  onExportCustomers: () => void;
  onUpdateCustomerStatus: (customerId: string, status: AccountStatus) => void;
  onPreviousCustomerPage: () => void;
  onNextCustomerPage: () => void;
  canGoPreviousCustomerPage: boolean;
  canGoNextCustomerPage: boolean;
};

export const CustomersSection = ({
  customerQuery,
  customerStatusFilter,
  accountStatusOptions,
  currentCustomers,
  customerPage,
  customerTotalPages,
  canUpdateCustomers,
  onCustomerQueryChange,
  onCustomerStatusFilterChange,
  onExportCustomers,
  onUpdateCustomerStatus,
  onPreviousCustomerPage,
  onNextCustomerPage,
  canGoPreviousCustomerPage,
  canGoNextCustomerPage
}: CustomersSectionProps) => (
  <div className="card stack">
    <h2 style={{ margin: 0 }}>Customer management</h2>
    <div className="row">
      <input
        value={customerQuery}
        onChange={(event) => onCustomerQueryChange(event.target.value)}
        placeholder="Search by name, email, or id"
      />
      <select
        value={customerStatusFilter}
        onChange={(event) =>
          onCustomerStatusFilterChange(event.target.value as 'ALL' | AccountStatus)
        }>
        <option value="ALL">All statuses</option>
        {accountStatusOptions.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <button className="secondary" onClick={onExportCustomers}>
        Export CSV
      </button>
    </div>
    <table>
      <thead>
        <tr>
          <th>Customer</th>
          <th>ID</th>
          <th>Wallet</th>
          <th>Eco Points</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {currentCustomers.map((customer) => (
          <tr key={customer.id}>
            <td>
              <strong>{customer.name}</strong>
              <div className="muted">{customer.email}</div>
            </td>
            <td>{customer.id}</td>
            <td>${customer.walletBalance.toFixed(2)}</td>
            <td>{customer.ecoPoints}</td>
            <td>
              <select
                value={customer.status}
                onChange={(event) =>
                  onUpdateCustomerStatus(customer.id, event.target.value as AccountStatus)
                }
                disabled={!canUpdateCustomers}>
                {accountStatusOptions.map((status) => (
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
      <button
        className="secondary"
        onClick={onPreviousCustomerPage}
        disabled={!canGoPreviousCustomerPage}>
        Previous
      </button>
      <span className="muted">
        Page {customerPage} / {customerTotalPages}
      </span>
      <button className="secondary" onClick={onNextCustomerPage} disabled={!canGoNextCustomerPage}>
        Next
      </button>
    </div>
  </div>
);
