import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CalendarClockIcon, DownloadIcon, MapPinIcon, SearchIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useBookings } from '../contexts/BookingContext';
import { formatCurrency, formatPoints } from '../utils/currency';
import { ROUTES } from '../utils/routes';

type Filter = 'all' | 'active' | 'completed' | 'cancelled';

const routeForService = (service: string) => {
  const value = service.toLowerCase();
  if (value.includes('ride') || value.includes('taxi')) return 'taxi';
  if (value.includes('parcel') || value.includes('delivery')) return 'delivery';
  if (value.includes('solar') || value.includes('window')) return 'window-solar-clean';
  return 'car-wash';
};

const ServiceHistory = () => {
  const navigate = useNavigate();
  const { bookings, cancelBooking } = useBookings();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const visible = useMemo(() => bookings.filter((booking) => {
    const matchesFilter = filter === 'all' || (filter === 'active' ? ['pending', 'confirmed', 'in-progress'].includes(booking.status) : booking.status === filter);
    const query = search.trim().toLowerCase();
    return matchesFilter && (!query || `${booking.service} ${booking.option} ${booking.location} ${booking.id}`.toLowerCase().includes(query));
  }), [bookings, filter, search]);
  const completed = bookings.filter((booking) => booking.status === 'completed');
  const totalSpent = completed.reduce((sum, booking) => sum + booking.price, 0);
  const totalPoints = completed.reduce((sum, booking) => sum + booking.ecoPoints, 0);

  const exportHistory = () => {
    const rows = visible.map((booking) => [booking.id, booking.service, booking.option, booking.date, booking.time, booking.location, booking.price, booking.status, booking.ecoPoints]);
    const csv = [['id', 'service', 'option', 'date', 'time', 'location', 'price_zar', 'status', 'eco_points'], ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dripless-bookings.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const cancel = async (id: string) => {
    setBusyId(id);
    try {
      await cancelBooking(id, 'Cancelled from customer booking history');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to cancel booking');
    } finally {
      setBusyId(null);
    }
  };

  return <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
    <header className="bg-gradient-to-r from-teal-500 to-green-500 pt-6 pb-8 px-4 text-white">
      <div className="flex items-center mb-5"><button onClick={() => navigate(-1)} className="mr-3" aria-label="Go back"><ArrowLeftIcon /></button><h1 className="text-2xl font-bold">Bookings</h1></div>
      <div className="bg-white/20 rounded-xl p-3 flex items-center"><SearchIcon size={18} className="mr-2" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your bookings" className="bg-transparent flex-1 text-white placeholder-white/70 outline-none" /></div>
    </header>
    <section className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="glass-card p-4 grid grid-cols-3 text-center dark:bg-slate-800/90"><div><strong className="text-xl text-eco-600">{bookings.length}</strong><p className="text-xs text-slate-500">Bookings</p></div><div className="border-x border-slate-200 dark:border-slate-700"><strong className="text-xl dark:text-white">{formatCurrency(totalSpent)}</strong><p className="text-xs text-slate-500">Completed value</p></div><div><strong className="text-xl text-blue-600">{formatPoints(totalPoints)}</strong><p className="text-xs text-slate-500">EcoPoints</p></div></div>
      <div className="flex gap-2 overflow-x-auto">{(['all', 'active', 'completed', 'cancelled'] as Filter[]).map((value) => <button key={value} onClick={() => setFilter(value)} className={`px-4 py-2 rounded-xl text-sm font-bold capitalize ${filter === value ? 'bg-eco-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>{value}</button>)}</div>

      {visible.length === 0 ? <div className="glass-card p-8 text-center text-slate-500">No bookings match this view.</div> : visible.map((booking) => <article key={booking.id} className="glass-card p-5 dark:bg-slate-800/90">
        <div className="flex justify-between gap-4"><div><h2 className="font-bold text-slate-900 dark:text-white">{booking.service} · {booking.option}</h2><p className="text-xs text-slate-500 font-mono mt-1">{booking.id}</p></div><div className="text-right"><strong className="dark:text-white">{formatCurrency(booking.price)}</strong><p className="text-xs capitalize text-eco-600 font-bold mt-1">{booking.status}</p></div></div>
        <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300"><p className="flex gap-2"><CalendarClockIcon size={16} />{booking.date} at {booking.time}</p><p className="flex gap-2"><MapPinIcon size={16} />{booking.location}</p></div>
        <div className="flex flex-wrap justify-end gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={() => navigate(ROUTES.SERVICE_DETAILS, { state: { service: booking } })} className="text-sm font-bold text-slate-600 dark:text-slate-300">Details</button>
          {['pending', 'confirmed', 'in-progress'].includes(booking.status) ? <button onClick={() => navigate(ROUTES.TRACKING, { state: { bookingId: booking.id } })} className="text-sm font-bold text-eco-600">Track</button> : null}
          {['pending', 'confirmed'].includes(booking.status) ? <button disabled={busyId === booking.id} onClick={() => void cancel(booking.id)} className="text-sm font-bold text-red-600 disabled:opacity-50">Cancel</button> : null}
          {booking.status === 'completed' ? <button onClick={() => navigate(ROUTES.RATE_SERVICE, { state: { bookingId: booking.id, service: { name: booking.service, date: booking.date } } })} className="text-sm font-bold text-amber-600">Rate</button> : null}
          <button onClick={() => navigate(ROUTES.BOOK_SERVICE(routeForService(booking.service)))} className="text-sm font-bold text-slate-600 dark:text-slate-300">Rebook</button>
        </div>
      </article>)}
      <button onClick={exportHistory} disabled={visible.length === 0} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"><DownloadIcon size={18} />Export current view</button>
    </section>
  </main>;
};

export default ServiceHistory;
