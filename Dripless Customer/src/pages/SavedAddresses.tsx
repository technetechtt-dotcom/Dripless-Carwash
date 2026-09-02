import React, { useEffect, useState } from 'react';
import { ArrowLeftIcon, MapPinIcon, PencilIcon, PlusIcon, TrashIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { customerAccountApi, geoApi } from '@shared/api';
import { toast } from 'sonner';

type Address = { id: string; label: string; line1: string; line2?: string | null; suburb?: string | null; city?: string | null; postalCode?: string | null; accessNotes?: string | null; isDefault: boolean };
const emptyForm = { label: 'Home', line1: '', line2: '', suburb: '', city: '', postalCode: '', accessNotes: '', isDefault: false };

export default function SavedAddresses() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Address[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; label: string }>>([]);
  const load = () => customerAccountApi.addresses().then((data) => setRows(data as unknown as Address[]));
  useEffect(() => { void load().catch((e) => toast.error(e.message)); }, []);
  useEffect(() => {
    if (form.line1.trim().length < 4) return setSuggestions([]);
    const timer = window.setTimeout(() => void geoApi.autocomplete(form.line1).then(setSuggestions).catch(() => setSuggestions([])), 350);
    return () => window.clearTimeout(timer);
  }, [form.line1]);
  const reset = () => { setEditingId(null); setForm(emptyForm); setSuggestions([]); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (editingId) await customerAccountApi.updateAddress(editingId, form);
      else await customerAccountApi.createAddress(form);
      await load(); reset(); toast.success('Address saved');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save address'); }
  };
  return <main className="min-h-screen pb-24"><header className="glass-nav sticky top-0 z-20 p-4 flex items-center gap-3"><button onClick={() => navigate(-1)}><ArrowLeftIcon/></button><h1 className="text-xl font-bold dark:text-white flex-1">Saved Addresses</h1><button onClick={reset} className="p-2 bg-eco-500 text-white rounded-xl"><PlusIcon/></button></header>
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      {rows.map((row) => <article key={row.id} className={`glass-card p-4 ${row.isDefault ? 'border-l-4 border-l-eco-500' : ''}`}><div className="flex gap-3"><MapPinIcon className="text-eco-600"/><div className="flex-1"><h2 className="font-bold dark:text-white">{row.label} {row.isDefault && <span className="text-xs text-eco-600">Default</span>}</h2><p className="text-sm text-slate-500">{row.line1}{row.city ? `, ${row.city}` : ''}</p></div><button onClick={() => { setEditingId(row.id); setForm({ label: row.label, line1: row.line1, line2: row.line2 || '', suburb: row.suburb || '', city: row.city || '', postalCode: row.postalCode || '', accessNotes: row.accessNotes || '', isDefault: row.isDefault }); }} className="text-blue-600"><PencilIcon size={17}/></button><button onClick={() => { if (window.confirm('Remove this address?')) void customerAccountApi.deleteAddress(row.id).then(load).catch((e) => toast.error(e.message)); }} className="text-red-600"><TrashIcon size={17}/></button></div>{!row.isDefault && <button onClick={() => void customerAccountApi.updateAddress(row.id, { isDefault: true }).then(load).catch((e) => toast.error(e.message))} className="text-xs font-bold text-eco-600 mt-3">Set as default</button>}</article>)}
      <form onSubmit={save} className="glass-card p-5 space-y-3"><h2 className="font-bold dark:text-white">{editingId ? 'Edit address' : 'Add an address'}</h2><div className="grid grid-cols-2 gap-3"><input required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Label" className="p-3 rounded-xl border dark:bg-slate-800 dark:text-white"/><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className="p-3 rounded-xl border dark:bg-slate-800 dark:text-white"/></div><div className="relative"><input required value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} placeholder="Street address" className="w-full p-3 rounded-xl border dark:bg-slate-800 dark:text-white"/>{suggestions.length > 0 && <div className="absolute z-20 w-full bg-white dark:bg-slate-800 shadow-xl rounded-xl mt-1 overflow-hidden">{suggestions.slice(0, 5).map((item) => <button key={item.id} type="button" onClick={() => { setForm({ ...form, line1: item.label }); setSuggestions([]); }} className="block w-full text-left p-3 text-sm border-b dark:text-white">{item.label}</button>)}</div>}</div><div className="grid grid-cols-2 gap-3"><input value={form.suburb} onChange={(e) => setForm({ ...form, suburb: e.target.value })} placeholder="Suburb" className="p-3 rounded-xl border dark:bg-slate-800 dark:text-white"/><input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} placeholder="Postal code" className="p-3 rounded-xl border dark:bg-slate-800 dark:text-white"/></div><textarea value={form.accessNotes} onChange={(e) => setForm({ ...form, accessNotes: e.target.value })} placeholder="Access instructions" className="w-full p-3 rounded-xl border dark:bg-slate-800 dark:text-white"/><label className="flex gap-2 text-sm dark:text-white"><input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}/>Use as default</label><div className="flex gap-3"><button type="submit" className="btn-primary flex-1 py-3">Save address</button>{editingId && <button type="button" onClick={reset} className="px-5 rounded-xl bg-slate-100 dark:bg-slate-800 dark:text-white">Cancel</button>}</div></form>
    </div>
  </main>;
}
