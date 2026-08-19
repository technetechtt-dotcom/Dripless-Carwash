import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownIcon, ArrowLeftIcon, ArrowUpIcon, FilterIcon, WalletIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBookings, type Transaction } from '../contexts/BookingContext';
import { formatCurrency, formatSignedCurrency } from '../utils/currency';

const FILTERS: Array<{ value: 'all' | Transaction['type']; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'service', label: 'Payments' },
  { value: 'refund', label: 'Refunds' },
  { value: 'reward', label: 'Promotions' },
  { value: 'topup', label: 'Credits' }
];

const WalletManagement = () => {
  const navigate = useNavigate();
  const { walletBalance, transactions } = useBookings();
  const [filter, setFilter] = useState<'all' | Transaction['type']>('all');
  const visible = useMemo(
    () => filter === 'all' ? transactions : transactions.filter((entry) => entry.type === filter),
    [filter, transactions]
  );

  return (
    <main className="min-h-screen pb-24">
      <header className="bg-gradient-to-br from-eco-500 to-teal-700 pt-6 pb-14 px-4 text-white">
        <div className="flex items-center mb-7">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="mr-3 p-2 bg-white/20 rounded-full" aria-label="Go back">
            <ArrowLeftIcon size={20} />
          </motion.button>
          <h1 className="text-2xl font-bold">Dripless Wallet</h1>
        </div>
        <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <div className="flex items-center gap-2 mb-1 text-white/75"><WalletIcon size={16} /><span className="text-sm">Available balance</span></div>
          <p className="text-4xl font-bold">{formatCurrency(walletBalance)}</p>
          <p className="text-xs text-white/75 mt-3">Verified credits and eligible refunds appear automatically. Direct wallet top-ups are not currently offered.</p>
        </div>
      </header>

      <section className="p-4 max-w-xl mx-auto space-y-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3 text-slate-700 dark:text-slate-200"><FilterIcon size={17} /><span className="font-bold">Transactions</span></div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((item) => (
              <button key={item.value} onClick={() => setFilter(item.value)} className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${filter === item.value ? 'bg-eco-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="glass-card p-8 text-center text-slate-500 dark:text-slate-400">No wallet transactions found.</div>
        ) : visible.map((entry) => {
          const incoming = entry.amount >= 0;
          const Icon = incoming ? ArrowDownIcon : ArrowUpIcon;
          return (
            <article key={entry.id} className="glass-card p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${incoming ? 'bg-eco-100 text-eco-600 dark:bg-eco-900/30' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}><Icon size={18} /></div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-800 dark:text-slate-100 capitalize truncate">{entry.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{entry.date}</p>
              </div>
              <p className={`font-bold ${incoming ? 'text-eco-600' : 'text-slate-800 dark:text-slate-100'}`}>{formatSignedCurrency(entry.amount)}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
};

export default WalletManagement;
