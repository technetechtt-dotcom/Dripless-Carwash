import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, AlertCircle, Clock, Download, FileCheck, Upload } from 'lucide-react';
import { driverOperationsApi } from '@shared/api';
import { PageContainer } from '../components/ui/PageContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { useToast } from '../contexts/ToastContext';
import { useDriverAuth } from '../contexts/DriverAuthContext';

interface DocumentsPageProps { onBack: () => void }
type DocumentKind = 'SA_ID' | 'DRIVERS_LICENCE' | 'PROOF_OF_ADDRESS' | 'VEHICLE_REGISTRATION' | 'INSURANCE' | 'TRAINING_CERT';
type RemoteDocument = { id: string; kind: DocumentKind; status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'; expiresAt?: string | null; createdAt: string; rejectionReason?: string | null; submissionVersion: number };
const labels: Record<DocumentKind, string> = {
  SA_ID: 'South African ID', DRIVERS_LICENCE: "Driver's licence", PROOF_OF_ADDRESS: 'Proof of address',
  VEHICLE_REGISTRATION: 'Vehicle registration', INSURANCE: 'Insurance', TRAINING_CERT: 'Training certificate'
};
const kinds = Object.keys(labels) as DocumentKind[];
const expiryRequired = new Set<DocumentKind>(['DRIVERS_LICENCE', 'INSURANCE', 'TRAINING_CERT']);

export function DocumentsPage({ onBack }: DocumentsPageProps) {
  const { driver } = useDriverAuth();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<RemoteDocument[]>([]);
  const [kind, setKind] = useState<DocumentKind>('SA_ID');
  const [expiresAt, setExpiresAt] = useState('');
  const [uploading, setUploading] = useState(false);
  const load = async () => setDocuments(await driverOperationsApi.documents() as unknown as RemoteDocument[]);
  useEffect(() => { void load().catch((e) => showToast(e instanceof Error ? e.message : 'Could not load documents', 'error')); }, []);
  const latest = useMemo(() => {
    const map = new Map<DocumentKind, RemoteDocument>();
    for (const row of documents) if (!map.has(row.kind)) map.set(row.kind, row);
    return map;
  }, [documents]);
  const upload = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) return showToast('Use a JPEG, PNG, WebP or PDF file', 'error');
    if (file.size > 8 * 1024 * 1024) return showToast('The document must be 8 MB or smaller', 'error');
    if (expiryRequired.has(kind) && !expiresAt) return showToast('Choose the document expiry date', 'error');
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
      await driverOperationsApi.uploadDocument({ kind, dataUrl, ...(expiresAt ? { expiresAt: new Date(`${expiresAt}T12:00:00`).toISOString() } : {}) });
      await load(); setExpiresAt(''); showToast('Document submitted for Ops review', 'success');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Upload failed', 'error'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  const statusStyle = (status: RemoteDocument['status'] | 'MISSING') => status === 'APPROVED' ? 'text-emerald-600 bg-emerald-50' : status === 'PENDING' ? 'text-amber-600 bg-amber-50' : status === 'MISSING' ? 'text-slate-500 bg-slate-100' : 'text-red-600 bg-red-50';
  return <PageContainer>
    <div className="flex items-center mb-6"><button onClick={onBack} className="p-2 -ml-2 text-slate-500"><ArrowLeft size={24}/></button><div className="ml-2"><h1 className="text-xl font-bold dark:text-white">Documents & verification</h1><p className="text-xs text-slate-500">Driver status: {driver?.verificationStatus || 'PENDING'}</p></div></div>
    <GlassCard className="p-5 mb-6">
      <h2 className="font-bold dark:text-white mb-3">Upload or resubmit</h2>
      <select value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)} className="w-full p-3 rounded-xl border dark:bg-slate-800 dark:text-white">{kinds.map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select>
      {expiryRequired.has(kind) && <label className="block text-xs text-slate-500 mt-3">Expiry date<input type="date" min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="block w-full mt-1 p-3 rounded-xl border dark:bg-slate-800 dark:text-white"/></label>}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); }}/>
      <GlassButton variant="primary" className="w-full mt-4" disabled={uploading} onClick={() => fileRef.current?.click()}><Upload size={17}/>{uploading ? 'Uploading…' : 'Choose document'}</GlassButton>
    </GlassCard>
    <div className="space-y-3">{kinds.map((documentKind) => { const row = latest.get(documentKind); const status = row?.status || 'MISSING'; return <GlassCard key={documentKind} className="p-4"><div className="flex items-start gap-3"><div className={`p-2 rounded-full ${statusStyle(status)}`}>{status === 'APPROVED' ? <FileCheck size={17}/> : status === 'PENDING' ? <Clock size={17}/> : <AlertCircle size={17}/>}</div><div className="flex-1"><h3 className="font-medium dark:text-white">{labels[documentKind]}</h3><p className="text-xs text-slate-500">{status}{row ? ` · submission ${row.submissionVersion}` : ''}{row?.expiresAt ? ` · expires ${new Date(row.expiresAt).toLocaleDateString()}` : ''}</p>{row?.rejectionReason && <p className="text-xs text-red-600 mt-2">Reason: {row.rejectionReason}</p>}{(status === 'REJECTED' || status === 'EXPIRED') && <button onClick={() => { setKind(documentKind); fileRef.current?.click(); }} className="text-xs font-bold text-eco-600 mt-2">Resubmit</button>}</div>{row && <button aria-label="Download document" onClick={() => void driverOperationsApi.downloadDocument(row.id, row.kind).catch((e) => showToast(e.message, 'error'))} className="text-slate-500"><Download size={18}/></button>}</div></GlassCard>; })}</div>
  </PageContainer>;
}
