import { useMemo, useState } from 'react';
import type { AccountStatus, BookingContract, CustomerProfile } from '@shared/types';
import { formatPersonName, formatPhoneMasked, formatShortId } from '../formatters';

type CustomersSectionProps = {
  customerQuery: string;
  customerStatusFilter: 'ALL' | AccountStatus;
  accountStatusOptions: AccountStatus[];
  currentCustomers: CustomerProfile[];
  bookings: BookingContract[];
  customerPage: number;
  customerTotalPages: number;
  canUpdateCustomers: boolean;
  onCustomerQueryChange: (value: string) => void;
  onCustomerStatusFilterChange: (value: 'ALL' | AccountStatus) => void;
  onExportCustomers: () => void;
  onUpdateCustomerStatus: (
    customerId: string,
    status: AccountStatus,
    reason: string
  ) => void;
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
  bookings,
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
}: CustomersSectionProps) => {
  const [pending, setPending] = useState<{
    customerId: string;
    status: AccountStatus;
    name: string;
  } | null>(null);
  const [reason, setReason] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const statsByCustomer = useMemo(() => {
    const map = new Map<
      string,
      { completed: number; cancelled: number; open: number; spend: number }
    >();
    for (const booking of bookings) {
      if (!booking.customerId) continue;
      const row = map.get(booking.customerId) ?? {
        completed: 0,
        cancelled: 0,
        open: 0,
        spend: 0
      };
      if (booking.status === 'COMPLETED') {
        row.completed += 1;
        row.spend += booking.price;
      } else if (booking.status === 'CANCELLED') row.cancelled += 1;
      else row.open += 1;
      map.set(booking.customerId, row);
    }
    return map;
  }, [bookings]);

  const selected = currentCustomers.find((c) => c.id === selectedId) ?? null;
  const selectedStats = selected ?
      statsByCustomer.get(selected.id)
    : undefined;

  return (
    <section className="stack" aria-label="Customers">
      <div className="card stack">
        <h2 style={{ margin: 0 }}>Customers</h2>
        <div className="row">
          <label style={{ flex: 1 }}>
            <span className="sr-only">Search customers</span>
            <input
              value={customerQuery}
              onChange={(e) => onCustomerQueryChange(e.target.value)}
              placeholder="Search by name, email, phone, or id"
            />
          </label>
          <label>
            Status
            <select
              value={customerStatusFilter}
              onChange={(e) =>
                onCustomerStatusFilterChange(e.target.value as 'ALL' | AccountStatus)
              }>
              <option value="ALL">All statuses</option>
              {accountStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="secondary" onClick={onExportCustomers}>
            Export CSV
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <caption className="sr-only">Customer accounts</caption>
            <thead>
              <tr>
                <th scope="col">Customer</th>
                <th scope="col">Contact</th>
                <th scope="col">Wallet</th>
                <th scope="col">Jobs</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentCustomers.map((customer) => {
                const stats = statsByCustomer.get(customer.id);
                return (
                  <tr key={customer.id}>
                    <td>
                      <strong>{customer.name}</strong>
                      <div className="muted">{formatShortId(customer.id, 'CUS')}</div>
                    </td>
                    <td>
                      <div>{customer.email}</div>
                      <div className="muted">{formatPhoneMasked(customer.phone)}</div>
                    </td>
                    <td>
                      ${customer.walletBalance.toFixed(2)}
                      <div className="muted">{customer.ecoPoints} eco</div>
                    </td>
                    <td>
                      <div className="muted">
                        {stats?.completed ?? 0} done · {stats?.cancelled ?? 0} cancelled ·{' '}
                        {stats?.open ?? 0} open
                      </div>
                      <div className="muted">LTV ~${(stats?.spend ?? 0).toFixed(0)}</div>
                    </td>
                    <td>
                      <span
                        className={
                          customer.status === 'SUSPENDED' ? 'pill-danger'
                          : customer.status === 'PENDING_REVIEW' ? 'pill-warn'
                          : 'pill-ok'
                        }>
                        {customer.status}
                      </span>
                    </td>
                    <td>
                      <div className="row">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => setSelectedId(customer.id)}>
                          Profile
                        </button>
                        <select
                          value={customer.status}
                          disabled={!canUpdateCustomers}
                          onChange={(e) => {
                            const next = e.target.value as AccountStatus;
                            if (next === customer.status) return;
                            setPending({
                              customerId: customer.id,
                              status: next,
                              name: customer.name
                            });
                          }}>
                          {accountStatusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
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
            onClick={onPreviousCustomerPage}
            disabled={!canGoPreviousCustomerPage}>
            Previous
          </button>
          <span className="muted">
            Page {customerPage} / {customerTotalPages}
          </span>
          <button
            type="button"
            className="secondary"
            onClick={onNextCustomerPage}
            disabled={!canGoNextCustomerPage}>
            Next
          </button>
        </div>
      </div>

      {selected ? (
        <div className="card panel-primary stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>{formatPersonName(selected.name)}</h3>
            <button type="button" className="ghost" onClick={() => setSelectedId(null)}>
              Close
            </button>
          </div>
          <div className="row">
            <span className="pill">{selected.status}</span>
            <span className="pill">Wallet ${selected.walletBalance.toFixed(2)}</span>
            <span className="pill">{selected.ecoPoints} eco points</span>
          </div>
          <div>
            <div>{selected.email}</div>
            <div className="muted">{formatPhoneMasked(selected.phone)}</div>
            <div className="muted">{selected.address || 'No saved address on file'}</div>
          </div>
          <div className="muted">
            Lifetime completed {selectedStats?.completed ?? 0} · cancelled{' '}
            {selectedStats?.cancelled ?? 0} · spend ~${(selectedStats?.spend ?? 0).toFixed(2)}
          </div>
          <p className="muted">
            Marketing consent, POPIA requests and internal notes can be attached when backend
            fields are available. Use status changes with a reason and evidence.
          </p>
        </div>
      ) : null}

      {pending ? (
        <div className="drawer-backdrop" onClick={() => setPending(null)} role="presentation">
          <div
            className="drawer-panel confirm-box"
            role="dialog"
            aria-labelledby="customer-mod-title"
            onClick={(e) => e.stopPropagation()}>
            <strong id="customer-mod-title">
              Set {pending.name} to {pending.status}?
            </strong>
            <p className="muted">
              Suspension / moderation is never one-click. Provide a reason for the audit trail.
            </p>
            <label>
              Reason / evidence note
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Policy reference, ticket id, evidence…"
              />
            </label>
            <div className="row">
              <button
                type="button"
                className={pending.status === 'SUSPENDED' ? 'danger' : ''}
                disabled={!reason.trim()}
                onClick={() => {
                  onUpdateCustomerStatus(pending.customerId, pending.status, reason.trim());
                  setPending(null);
                  setReason('');
                }}>
                Confirm change
              </button>
              <button type="button" className="ghost" onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};
