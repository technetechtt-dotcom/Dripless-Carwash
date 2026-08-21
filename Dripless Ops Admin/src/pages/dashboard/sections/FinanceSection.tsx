import { useState, useMemo } from 'react';
import { financeApi } from '@shared/api';
import type { BookingContract, OpsAnalytics } from '@shared/types';

type Payment = {
  paymentId: string;
  bookingId?: string | null;
  provider: string;
  status: string;
  amountZar: number;
  amountCents: number;
  currency: string;
  createdAt: string;
  paidAt?: string | null;
  failureReason?: string | null;
};

type Refund = {
  id: string;
  paymentId: string;
  status: string;
  amountCents: number;
  reason?: string | null;
  createdAt: string;
};

type Dispute = {
  id: string;
  paymentId: string;
  status: string;
  amountCents: number;
  reason?: string | null;
  createdAt: string;
};

type FinanceSectionProps = {
  analytics: OpsAnalytics | null;
  bookings: BookingContract[];
};

function statusPill(status: string) {
  const map: Record<string, string> = {
    PAID: 'pill-success',
    COMPLETED: 'pill-success',
    PENDING: 'pill-warn',
    PROCESSING: 'pill-warn',
    APPROVED: 'pill-warn',
    FAILED: 'pill-danger',
    REJECTED: 'pill-danger',
    REFUNDED: 'pill-info',
    PARTIALLY_REFUNDED: 'pill-info',
    DISPUTED: 'pill-danger',
    OPEN: 'pill-danger',
    WON: 'pill-success',
    LOST: 'pill-danger'
  };
  return map[status] ?? 'pill-muted';
}

function formatZAR(cents: number) {
  return `R ${(cents / 100).toFixed(2)}`;
}

export function FinanceSection({ analytics, bookings }: FinanceSectionProps) {
  const [tab, setTab] = useState<'payments' | 'refunds' | 'disputes' | 'reconciliation'>('payments');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [providerFilter, setProviderFilter] = useState('ALL');
  const [reconciliationFrom, setReconciliationFrom] = useState(
    new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  );
  const [reconciliationTo, setReconciliationTo] = useState(new Date().toISOString().slice(0, 10));
  const [reconciliationResult, setReconciliationResult] = useState<null | {
    matched: number;
    mismatches: number;
    total: number;
  }>(null);
  const [exportFeedback, setExportFeedback] = useState('');

  async function loadPayments() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await financeApi.listPayments();
      setPayments(data as unknown as Payment[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load payments');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadRefunds() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await financeApi.listRefunds();
      setRefunds(data as unknown as Refund[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load refunds');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDisputes() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await financeApi.listDisputes();
      setDisputes(data as unknown as Dispute[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load disputes');
    } finally {
      setIsLoading(false);
    }
  }

  async function runReconciliation() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await financeApi.runReconciliation(reconciliationFrom, reconciliationTo);
      const result = data as { matched?: number; mismatches?: number | { length: number }; total?: number };
      setReconciliationResult({
        matched: Number(result.matched ?? 0),
        mismatches:
          typeof result.mismatches === 'number'
            ? result.mismatches
            : Array.isArray(result.mismatches)
            ? (result.mismatches as unknown[]).length
            : 0,
        total: Number(result.total ?? 0)
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reconciliation failed');
    } finally {
      setIsLoading(false);
    }
  }

  function exportCsv(rows: Record<string, unknown>[], filename: string) {
    if (!rows.length) return;
    const keys = Object.keys(rows[0]);
    const csv = [
      keys.join(','),
      ...rows.map((row) => keys.map((k) => JSON.stringify(row[k] ?? '')).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setExportFeedback(`Exported ${rows.length} rows`);
    setTimeout(() => setExportFeedback(''), 3000);
  }

  const kpiRevenue = useMemo(() => {
    if (analytics) return Math.round((analytics.revenue ?? 0) * 100);
    return payments.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + p.amountCents, 0);
  }, [analytics, payments]);

  const kpiRefunded = useMemo(
    () => refunds.filter((r) => r.status === 'COMPLETED').reduce((sum, r) => sum + r.amountCents, 0),
    [refunds]
  );

  const kpiDisputed = useMemo(
    () => disputes.filter((d) => d.status === 'OPEN').length,
    [disputes]
  );

  const kpiFailures = useMemo(
    () => payments.filter((p) => p.status === 'FAILED').length,
    [payments]
  );

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (providerFilter !== 'ALL' && p.provider !== providerFilter) return false;
      return true;
    });
  }, [payments, statusFilter, providerFilter]);

  return (
    <section className="stack" aria-label="Finance">
      <div className="card stack">
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ margin: 0 }}>Finance</h2>
          {exportFeedback ? <span className="pill-success">{exportFeedback}</span> : null}
        </div>
        <div className="kpi-grid">
          <div className="card kpi-card">
            <span className="kpi-label">Revenue (paid)</span>
            <span className="kpi-value">{formatZAR(kpiRevenue)}</span>
          </div>
          <div className="card kpi-card">
            <span className="kpi-label">Refunded</span>
            <span className="kpi-value">{formatZAR(kpiRefunded)}</span>
          </div>
          <div className="card kpi-card">
            <span className="kpi-label">Open disputes</span>
            <span className="kpi-value" style={{ color: kpiDisputed > 0 ? 'var(--ops-red)' : undefined }}>
              {kpiDisputed}
            </span>
          </div>
          <div className="card kpi-card">
            <span className="kpi-label">Failed payments</span>
            <span className="kpi-value" style={{ color: kpiFailures > 0 ? 'var(--ops-amber)' : undefined }}>
              {kpiFailures}
            </span>
          </div>
        </div>
      </div>

      <div className="saved-view-row" role="tablist" aria-label="Finance tabs">
        {(['payments', 'refunds', 'disputes', 'reconciliation'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => {
              setTab(t);
              if (t === 'payments' && !payments.length) void loadPayments();
              if (t === 'refunds' && !refunds.length) void loadRefunds();
              if (t === 'disputes' && !disputes.length) void loadDisputes();
            }}
            className={tab === t ? 'primary' : 'secondary'}
            style={{ textTransform: 'capitalize' }}
          >
            {t}
          </button>
        ))}
      </div>

      {error ? (
        <p className="card alert-danger" role="alert">{error}</p>
      ) : null}

      {tab === 'payments' && (
        <div className="card stack">
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              {['ALL', 'PAID', 'PENDING', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'DISPUTED'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              aria-label="Filter by provider"
            >
              {['ALL', 'paystack', 'wallet', 'stub'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <button className="secondary" onClick={() => void loadPayments()} disabled={isLoading}>
              {isLoading ? 'Loading…' : 'Load payments'}
            </button>
            <button
              className="ghost"
              onClick={() => exportCsv(filteredPayments as unknown as Record<string, unknown>[], 'payments.csv')}
              disabled={!filteredPayments.length}
            >
              Export CSV
            </button>
          </div>
          {filteredPayments.length === 0 ? (
            <p className="muted">{payments.length === 0 ? 'Click "Load payments" to fetch data.' : 'No payments match filters.'}</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Payment ID</th>
                    <th>Booking</th>
                    <th>Provider</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((p) => (
                    <tr key={p.paymentId}>
                      <td><code style={{ fontSize: 12 }}>{p.paymentId.slice(-8)}</code></td>
                      <td>{p.bookingId ? <code style={{ fontSize: 12 }}>{p.bookingId.slice(-8)}</code> : <span className="muted">—</span>}</td>
                      <td>{p.provider}</td>
                      <td>{formatZAR(p.amountCents)}</td>
                      <td><span className={statusPill(p.status)}>{p.status}</span></td>
                      <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td>{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : <span className="muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'refunds' && (
        <div className="card stack">
          <div className="row" style={{ gap: 8 }}>
            <button className="secondary" onClick={() => void loadRefunds()} disabled={isLoading}>
              {isLoading ? 'Loading…' : 'Load refunds'}
            </button>
            <button
              className="ghost"
              onClick={() => exportCsv(refunds as unknown as Record<string, unknown>[], 'refunds.csv')}
              disabled={!refunds.length}
            >
              Export CSV
            </button>
          </div>
          {refunds.length === 0 ? (
            <p className="muted">Click "Load refunds" to fetch data.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Refund ID</th>
                    <th>Payment ID</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Reason</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.map((r) => (
                    <tr key={r.id}>
                      <td><code style={{ fontSize: 12 }}>{r.id.slice(-8)}</code></td>
                      <td><code style={{ fontSize: 12 }}>{r.paymentId.slice(-8)}</code></td>
                      <td>{formatZAR(r.amountCents)}</td>
                      <td><span className={statusPill(r.status)}>{r.status}</span></td>
                      <td>{r.reason ?? <span className="muted">—</span>}</td>
                      <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'disputes' && (
        <div className="card stack">
          <div className="row" style={{ gap: 8 }}>
            <button className="secondary" onClick={() => void loadDisputes()} disabled={isLoading}>
              {isLoading ? 'Loading…' : 'Load disputes'}
            </button>
            <button
              className="ghost"
              onClick={() => exportCsv(disputes as unknown as Record<string, unknown>[], 'disputes.csv')}
              disabled={!disputes.length}
            >
              Export CSV
            </button>
          </div>
          {disputes.length === 0 ? (
            <p className="muted">Click "Load disputes" to fetch data.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Dispute ID</th>
                    <th>Payment ID</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Reason</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {disputes.map((d) => (
                    <tr key={d.id}>
                      <td><code style={{ fontSize: 12 }}>{d.id.slice(-8)}</code></td>
                      <td><code style={{ fontSize: 12 }}>{d.paymentId.slice(-8)}</code></td>
                      <td>{formatZAR(d.amountCents)}</td>
                      <td><span className={statusPill(d.status)}>{d.status}</span></td>
                      <td>{d.reason ?? <span className="muted">—</span>}</td>
                      <td>{new Date(d.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'reconciliation' && (
        <div className="card stack">
          <h3 style={{ margin: 0 }}>Payment Reconciliation</h3>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Reconcile local payment records against Paystack settlements for a date range.
          </p>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <label className="stack" style={{ gap: 4 }}>
              <span style={{ fontSize: 12 }}>From</span>
              <input
                type="date"
                value={reconciliationFrom}
                onChange={(e) => setReconciliationFrom(e.target.value)}
              />
            </label>
            <label className="stack" style={{ gap: 4 }}>
              <span style={{ fontSize: 12 }}>To</span>
              <input
                type="date"
                value={reconciliationTo}
                onChange={(e) => setReconciliationTo(e.target.value)}
              />
            </label>
            <button
              className="primary"
              onClick={() => void runReconciliation()}
              disabled={isLoading}
              style={{ alignSelf: 'flex-end' }}
            >
              {isLoading ? 'Running…' : 'Run reconciliation'}
            </button>
          </div>
          {reconciliationResult ? (
            <div
              className={`card ${reconciliationResult.mismatches > 0 ? 'alert-danger' : ''}`}
              style={{ padding: 16 }}
            >
              <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div className="kpi-label">Total records</div>
                  <div className="kpi-value">{reconciliationResult.total}</div>
                </div>
                <div>
                  <div className="kpi-label">Matched</div>
                  <div className="kpi-value" style={{ color: 'var(--ops-teal)' }}>
                    {reconciliationResult.matched}
                  </div>
                </div>
                <div>
                  <div className="kpi-label">Mismatches</div>
                  <div
                    className="kpi-value"
                    style={{ color: reconciliationResult.mismatches > 0 ? 'var(--ops-red)' : undefined }}
                  >
                    {reconciliationResult.mismatches}
                  </div>
                </div>
              </div>
              {reconciliationResult.mismatches > 0 ? (
                <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--ops-red)' }}>
                  Mismatches detected. Review payment records and provider dashboard for discrepancies.
                </p>
              ) : (
                <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--ops-teal)' }}>
                  All records reconcile cleanly.
                </p>
              )}
            </div>
          ) : null}

          <div className="card stack" style={{ opacity: 0.8 }}>
            <h4 style={{ margin: 0, fontSize: 13 }}>Wallet integrity</h4>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              Wallet balance reconciliation runs automatically every 24 hours as a background job.
              Any mismatches trigger an operational alert. Check the audit log for the latest result.
            </p>
          </div>
        </div>
      )}

      <div className="card stack">
        <h3 style={{ margin: 0, fontSize: 14 }}>Recent completed bookings — revenue summary</h3>
        {bookings.filter((b) => b.status === 'COMPLETED').slice(0, 10).length === 0 ? (
          <p className="muted">No completed bookings in current view.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Service</th>
                  <th>Price (ZAR)</th>
                  <th>Payment</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {bookings
                  .filter((b) => b.status === 'COMPLETED')
                  .slice(0, 10)
                  .map((b) => (
                    <tr key={b.id}>
                      <td><code style={{ fontSize: 12 }}>{b.reference ?? b.id.slice(-8)}</code></td>
                      <td>{b.serviceName}</td>
                      <td>R {(b.price / 100).toFixed(2)}</td>
                      <td><span className={statusPill(b.paymentStatus ?? '')}>{b.paymentStatus ?? '—'}</span></td>
                      <td>{new Date(b.updatedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
