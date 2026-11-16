import React, { useEffect, useState } from 'react';
import { ArrowLeftIcon, BellIcon, CheckCheckIcon, SettingsIcon, Trash2Icon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationApi, subscribePlatformEvents } from '@shared/api';
import type { NotificationContract } from '@shared/types';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

type Preferences = { pushEnabled: boolean; emailEnabled: boolean; smsEnabled: boolean; marketing: boolean };

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<NotificationContract[]>([]);
  const [preferences, setPreferences] = useState<Preferences>({ pushEnabled: true, emailEnabled: true, smsEnabled: false, marketing: false });
  const [showSettings, setShowSettings] = useState(false);
  const load = async () => {
    if (!user) return;
    const [notifications, prefs] = await Promise.all([
      notificationApi.listNotifications('customer', user.id),
      notificationApi.preferences()
    ]);
    setRows(notifications);
    setPreferences(prefs);
  };
  useEffect(() => {
    void load().catch((e) => toast.error(e instanceof Error ? e.message : 'Could not load notifications'));
    return subscribePlatformEvents((event) => {
      if (event.type.startsWith('notification.') || event.type.startsWith('booking.') || event.type === 'payment.status') void load();
    });
  }, [user?.id]);
  const updatePreference = async (key: keyof Preferences, value: boolean) => {
    const previous = preferences; setPreferences({ ...preferences, [key]: value });
    try { await notificationApi.updatePreferences({ [key]: value }); }
    catch (error) { setPreferences(previous); toast.error(error instanceof Error ? error.message : 'Could not save preference'); }
  };
  const markRead = async (id: string) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, read: true } : row));
    try { await notificationApi.markRead(id); } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not mark notification read'); }
  };
  const markAll = async () => {
    try { await notificationApi.markAllRead(); setRows((current) => current.map((row) => ({ ...row, read: true }))); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not mark all read'); }
  };
  const remove = async (id: string) => {
    try { await notificationApi.remove(id); setRows((current) => current.filter((row) => row.id !== id)); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not remove notification'); }
  };
  return <main className="min-h-screen pb-24">
    <header className="sticky top-0 z-20 glass-nav px-4 py-4 flex items-center gap-3"><button onClick={() => navigate(-1)} aria-label="Back"><ArrowLeftIcon/></button><h1 className="text-xl font-bold dark:text-white flex-1">Notifications</h1><button onClick={() => setShowSettings((value) => !value)} aria-label="Notification settings" className="p-2"><SettingsIcon size={20}/></button>{rows.some((row) => !row.read) && <button onClick={() => void markAll()} aria-label="Mark all as read" className="p-2 text-eco-600"><CheckCheckIcon size={20}/></button>}</header>
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      {showSettings && <section className="glass-card p-5 space-y-4"><h2 className="font-bold dark:text-white">Delivery preferences</h2>{([['pushEnabled','Push notifications'],['emailEnabled','Email updates'],['smsEnabled','SMS updates'],['marketing','Promotions']] as const).map(([key,label]) => <label key={key} className="flex items-center justify-between text-sm dark:text-slate-200"><span>{label}</span><input type="checkbox" checked={preferences[key]} onChange={(e) => void updatePreference(key, e.target.checked)} className="h-5 w-5 accent-eco-600"/></label>)}</section>}
      {rows.length === 0 ? <section className="glass-card p-8 text-center"><BellIcon size={30} className="text-slate-400 mx-auto mb-3"/><h2 className="font-bold dark:text-white">All caught up</h2><p className="text-sm text-slate-500">Operational and booking updates will appear here.</p></section> : rows.map((row) => <article key={row.id} onClick={() => { if (!row.read) void markRead(row.id); }} className={`glass-card p-4 flex gap-3 cursor-pointer ${!row.read ? 'border-l-4 border-l-eco-500' : ''}`}><div className={`mt-1 h-2 w-2 rounded-full ${row.read ? 'bg-slate-300' : 'bg-eco-500'}`}/><div className="flex-1"><div className="flex justify-between gap-2"><h2 className="font-bold text-sm dark:text-white">{row.title}</h2><time className="text-[10px] text-slate-400 whitespace-nowrap">{new Date(row.createdAt).toLocaleString()}</time></div><p className="text-xs text-slate-500 mt-1">{row.message}</p></div><button onClick={(event) => { event.stopPropagation(); void remove(row.id); }} aria-label="Remove notification" className="text-slate-400 hover:text-red-600"><Trash2Icon size={16}/></button></article>)}
    </div>
  </main>;
}
