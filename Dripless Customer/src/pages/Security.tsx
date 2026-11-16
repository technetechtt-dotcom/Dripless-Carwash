import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeftIcon, DownloadIcon, LogOutIcon, SmartphoneIcon, Trash2Icon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { accountApi, privacyApi } from '@shared/api';
import { useAuth } from '../contexts/AuthContext';
import { ROUTES } from '../utils/routes';
import { toast } from 'sonner';

type SessionRow = { id: string; deviceLabel: string | null; ipAddress: string | null; createdAt: string; expiresAt: string; current: boolean };
type PrivacyRequest = { id: string; kind: string; status: string; downloadPath?: string | null; createdAt: string };
type Consent = { purpose: string; granted: boolean; createdAt: string };

export default function Security() {
  const navigate = useNavigate();
  const { user, logoutAll } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [phone, setPhone] = useState(user?.phone || '');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const load = async () => {
    const [nextSessions, nextRequests, nextConsents] = await Promise.all([
      accountApi.sessions(), privacyApi.requests(), privacyApi.consents()
    ]);
    setSessions(nextSessions);
    setRequests(nextRequests as unknown as PrivacyRequest[]);
    setConsents(nextConsents as unknown as Consent[]);
  };
  useEffect(() => { void load().catch((e) => toast.error(e instanceof Error ? e.message : 'Could not load security settings')); }, []);
  const marketing = useMemo(() => consents.find((row) => row.purpose === 'MARKETING')?.granted ?? false, [consents]);
  const requestData = async (kind: 'EXPORT' | 'DELETE') => {
    if (kind === 'DELETE' && !window.confirm('Delete your account? This request cannot be undone after processing.')) return;
    try { await privacyApi.createRequest(kind); await load(); toast.success(`${kind === 'EXPORT' ? 'Export' : 'Deletion'} request submitted`); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Request failed'); }
  };
  return <main className="min-h-screen pb-24">
    <header className="glass-nav sticky top-0 z-20 p-4 flex items-center gap-3"><button onClick={() => navigate(-1)} aria-label="Back"><ArrowLeftIcon/></button><h1 className="text-xl font-bold dark:text-white">Security & Privacy</h1></header>
    <div className="p-4 space-y-5 max-w-2xl mx-auto">
      <section className="glass-card p-5">
        <h2 className="font-bold dark:text-white mb-3">Phone verification</h2>
        <div className="flex gap-2"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27…" className="flex-1 p-3 rounded-xl border dark:bg-slate-800 dark:text-white"/><button onClick={() => void accountApi.requestPhoneVerification(phone).then((result) => { setCodeSent(true); toast.success(result.demoCode ? `Demo code: ${result.demoCode}` : 'Verification code sent'); }).catch((e) => toast.error(e.message))} className="btn-primary px-4">Send code</button></div>
        {codeSent && <div className="flex gap-2 mt-3"><input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder="Code" className="flex-1 p-3 rounded-xl border dark:bg-slate-800 dark:text-white"/><button onClick={() => void accountApi.verifyPhone(phone, code).then(() => { setCodeSent(false); toast.success('Phone verified'); }).catch((e) => toast.error(e.message))} className="btn-primary px-4">Verify</button></div>}
      </section>

      <section className="glass-card p-5">
        <h2 className="font-bold dark:text-white mb-3">Signed-in devices</h2>
        <div className="space-y-3">{sessions.map((session) => <div key={session.id} className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-3"><SmartphoneIcon className="text-slate-400"/><div className="flex-1"><p className="font-medium dark:text-white">{session.deviceLabel || 'Unknown device'} {session.current && <span className="text-xs text-eco-600">Current</span>}</p><p className="text-xs text-slate-500">{session.ipAddress || 'IP unavailable'} · {new Date(session.createdAt).toLocaleString()}</p></div>{!session.current && <button onClick={() => void accountApi.revokeSession(session.id).then(load).catch((e) => toast.error(e.message))} className="text-sm text-red-600">Revoke</button>}</div>)}</div>
        <button onClick={() => void logoutAll().then(() => navigate(ROUTES.LOGIN)).catch((e) => toast.error(e.message))} className="mt-4 w-full py-3 rounded-xl bg-red-50 text-red-700 font-bold flex items-center justify-center gap-2"><LogOutIcon size={17}/>Log out all devices</button>
      </section>

      <section className="glass-card p-5">
        <h2 className="font-bold dark:text-white">Privacy choices</h2>
        <label className="flex items-center justify-between my-4 text-sm dark:text-slate-200"><span>Marketing messages</span><input type="checkbox" checked={marketing} onChange={(e) => void privacyApi.setConsent('MARKETING', e.target.checked, '2026-08').then(load).catch((err) => toast.error(err.message))} className="h-5 w-5 accent-eco-600"/></label>
        <div className="grid grid-cols-2 gap-3"><button onClick={() => void requestData('EXPORT')} className="py-3 rounded-xl bg-slate-100 dark:bg-slate-800 dark:text-white font-medium flex items-center justify-center gap-2"><DownloadIcon size={17}/>Export data</button><button onClick={() => void requestData('DELETE')} className="py-3 rounded-xl bg-red-50 text-red-700 font-medium flex items-center justify-center gap-2"><Trash2Icon size={17}/>Delete account</button></div>
        {requests.length > 0 && <div className="mt-4 space-y-2">{requests.map((request) => <div key={request.id} className="text-sm flex justify-between"><span>{request.kind} · {request.status}</span>{request.downloadPath && <button onClick={() => void privacyApi.downloadExport(request.id).catch((e) => toast.error(e.message))} className="text-eco-600 font-bold">Download</button>}</div>)}</div>}
      </section>
    </div>
  </main>;
}
