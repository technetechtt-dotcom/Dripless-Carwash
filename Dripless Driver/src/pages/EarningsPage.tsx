import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, RefreshCw } from 'lucide-react';
import { driverOperationsApi } from '@shared/api';
import { EarningsChart } from '../components/EarningsChart';
import { PageContainer } from '../components/ui/PageContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useToast } from '../contexts/ToastContext';

type Earning = { id: string; netZar: number; amountZar: number; feeZar: number; bookingId: string; createdAt: string };
type Payout = { id: string; amountZar: number; status: string; createdAt: string; periodStart: string; periodEnd: string };
type Summary = { availableZar: number; earnings: Earning[]; payouts: Payout[] };
type Account = { bankCode: string; accountLast4: string; accountName: string; status: string };

export function EarningsPage() {
  const { showToast } = useToast();
  const [summary, setSummary] = useState<Summary>({ availableZar: 0, earnings: [], payouts: [] });
  const [account, setAccount] = useState<Account | null>(null);
  const [showAccount, setShowAccount] = useState(false);
  const [form, setForm] = useState({ bankCode: '', accountNumber: '', accountName: '' });
  const load = async () => {
    const [nextSummary, nextAccount] = await Promise.all([driverOperationsApi.payoutSummary(), driverOperationsApi.payoutAccount()]);
    setSummary(nextSummary as unknown as Summary); setAccount(nextAccount as unknown as Account | null);
  };
  useEffect(() => { void load().catch((e) => showToast(e instanceof Error ? e.message : 'Could not load earnings', 'error')); }, []);
  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (6 - index)); return { key: date.toISOString().slice(0, 10), name: date.toLocaleDateString(undefined, { weekday: 'short' }), amount: 0 }; });
    for (const earning of summary.earnings) { const bucket = days.find((day) => day.key === earning.createdAt.slice(0, 10)); if (bucket) bucket.amount += earning.netZar; }
    return days;
  }, [summary.earnings]);
  const submitAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    try { await driverOperationsApi.updatePayoutAccount(form); await load(); setShowAccount(false); setForm({ bankCode: '', accountNumber: '', accountName: '' }); showToast('Payout account verified', 'success'); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Could not verify payout account', 'error'); }
  };
  return <PageContainer withOrbs>
    <div className="flex items-center justify-between"><SectionHeader title="Earnings"/><button onClick={() => void load()} aria-label="Refresh earnings"><RefreshCw size={18} className="text-slate-500"/></button></div>
    <div className="text-center mb-7"><p className="text-sm text-slate-500">Available for next approved payout</p><h2 className="text-5xl font-bold text-slate-900 dark:text-white">R{summary.availableZar.toFixed(2)}</h2></div>
    <GlassCard className="p-4 mb-7"><EarningsChart data={chartData}/></GlassCard>
    <GlassCard className="p-5 mb-7"><div className="flex items-center justify-between"><div><h2 className="font-bold dark:text-white">Payout account</h2><p className="text-xs text-slate-500">{account ? `${account.accountName} · •••• ${account.accountLast4} · ${account.status}` : 'No verified bank account'}</p></div><button onClick={() => setShowAccount((value) => !value)} className="text-sm text-emerald-600 font-bold"><CreditCard size={17} className="inline mr-1"/>{account ? 'Change' : 'Add'}</button></div>{showAccount && <form onSubmit={submitAccount} className="space-y-3 mt-4"><input required value={form.bankCode} onChange={(e) => setForm({ ...form, bankCode: e.target.value })} placeholder="Paystack bank code" className="w-full p-3 rounded-xl border dark:bg-slate-800 dark:text-white"/><input required inputMode="numeric" pattern="[0-9]{6,20}" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/\D/g, '') })} placeholder="Account number" className="w-full p-3 rounded-xl border dark:bg-slate-800 dark:text-white"/><input required value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} placeholder="Account holder" className="w-full p-3 rounded-xl border dark:bg-slate-800 dark:text-white"/><button type="submit" className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold">Verify and save</button></form>}</GlassCard>
    <SectionHeader title="Recent earnings"/><div className="space-y-3 mb-7">{summary.earnings.length === 0 ? <p className="text-sm text-slate-500">Completed-job earnings will appear here.</p> : summary.earnings.slice(0, 20).map((row) => <GlassCard key={row.id} className="p-4 flex justify-between"><div><p className="font-medium dark:text-white">Job {row.bookingId.slice(-8)}</p><p className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleString()} · fee R{row.feeZar.toFixed(2)}</p></div><p className="font-bold text-emerald-600">R{row.netZar.toFixed(2)}</p></GlassCard>)}</div>
    <SectionHeader title="Payout history"/><div className="space-y-3">{summary.payouts.length === 0 ? <p className="text-sm text-slate-500">No payouts yet.</p> : summary.payouts.map((row) => <GlassCard key={row.id} className="p-4 flex justify-between"><div><p className="font-medium dark:text-white">Payout</p><p className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleDateString()} · {row.status}</p></div><p className="font-bold dark:text-white">R{row.amountZar.toFixed(2)}</p></GlassCard>)}</div>
  </PageContainer>;
}
