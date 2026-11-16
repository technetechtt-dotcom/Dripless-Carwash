import React, { useEffect, useState } from 'react';
import { ArrowLeftIcon, DownloadIcon, FileTextIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { invoicesApi } from '@shared/api';
import { formatCurrency } from '../utils/currency';
import { toast } from 'sonner';

type Invoice = { id: string; number: string; status: string; totalZar: number; taxZar: number; issuedAt: string; downloadPath: string | null };

export default function Receipts() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void invoicesApi.list().then((data) => setRows(data as unknown as Invoice[])).catch((e) => toast.error(e.message)).finally(() => setLoading(false)); }, []);
  return <main className="min-h-screen pb-24"><header className="glass-nav sticky top-0 p-4 flex items-center gap-3"><button onClick={() => navigate(-1)}><ArrowLeftIcon/></button><h1 className="text-xl font-bold dark:text-white">Receipts & Invoices</h1></header><div className="p-4 max-w-2xl mx-auto space-y-3">
    {loading ? <p className="text-slate-500">Loading invoices…</p> : rows.length === 0 ? <div className="glass-card p-8 text-center"><FileTextIcon className="mx-auto text-slate-400 mb-3"/><p className="dark:text-white">Paid booking invoices will appear here.</p></div> : rows.map((row) => <article key={row.id} className="glass-card p-5 flex items-center gap-4"><FileTextIcon className="text-eco-600"/><div className="flex-1"><h2 className="font-bold dark:text-white">{row.number}</h2><p className="text-xs text-slate-500">{new Date(row.issuedAt).toLocaleDateString()} · VAT {formatCurrency(row.taxZar)}</p></div><div className="text-right"><p className="font-bold dark:text-white">{formatCurrency(row.totalZar)}</p>{row.downloadPath && <button onClick={() => void invoicesApi.download(row.id, row.number).catch((e) => toast.error(e.message))} className="text-sm text-eco-600 inline-flex items-center gap-1"><DownloadIcon size={14}/>PDF</button>}</div></article>)}
  </div></main>;
}
