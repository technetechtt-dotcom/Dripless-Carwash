import React, { useState } from 'react';
import { CalendarIcon, CheckCircleIcon, ClockIcon, CreditCardIcon, MapPinIcon, WalletIcon, XIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useBookings } from '../contexts/BookingContext';
import { formatCurrency, formatPoints } from '../utils/currency';

type PaymentMethod = 'ozow' | 'wallet';

type CheckoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentMethod: PaymentMethod) => void;
  selectedPackage?: { name: string; price: number };
  customServices?: Array<{ name: string; price: number }>;
  date: string;
  time: string;
  location: string;
};

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, onConfirm, selectedPackage, customServices, date, time, location }) => {
  const { walletBalance } = useBookings();
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('ozow');
  const total = selectedPackage?.price ?? customServices?.reduce((sum, service) => sum + service.price, 0) ?? 0;
  const canPayWithWallet = walletBalance >= total;
  const options = [
    { id: 'ozow' as const, label: 'Pay by bank (Ozow)', description: 'Secure instant EFT via Ozow', icon: CreditCardIcon, available: true },
    { id: 'wallet' as const, label: 'Dripless Wallet', description: `Balance: ${formatCurrency(walletBalance)}`, icon: WalletIcon, available: canPayWithWallet }
  ];

  return <AnimatePresence>{isOpen ? (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} aria-label="Close checkout" />
      <motion.section initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <header className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Confirm booking</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full" aria-label="Close"><XIcon size={20} /></button>
        </header>
        <div className="p-6 space-y-6">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5">
            <div className="flex justify-between gap-4"><span className="font-bold text-slate-800 dark:text-slate-100">{selectedPackage?.name || 'Custom services'}</span><span className="font-bold dark:text-white">{formatCurrency(total)}</span></div>
            {customServices?.map((service) => <p key={service.name} className="text-sm text-slate-500 mt-1">{service.name}</p>)}
          </div>
          <div className="grid gap-3 text-sm text-slate-700 dark:text-slate-200">
            <div className="flex gap-3"><CalendarIcon size={18} className="text-purple-500" /><span>{date}</span></div>
            <div className="flex gap-3"><ClockIcon size={18} className="text-amber-500" /><span>{time}</span></div>
            <div className="flex gap-3"><MapPinIcon size={18} className="text-blue-500" /><span>{location}</span></div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-bold text-slate-500 uppercase">Payment method</p>
            {options.map((option) => {
              const Icon = option.icon;
              const selected = selectedPayment === option.id;
              return <button key={option.id} type="button" disabled={!option.available} onClick={() => setSelectedPayment(option.id)} className={`w-full p-4 rounded-xl border-2 flex items-center text-left ${selected ? 'border-eco-500 bg-eco-50 dark:bg-eco-900/20' : 'border-slate-200 dark:border-slate-700'} ${option.available ? '' : 'opacity-50 cursor-not-allowed'}`}>
                <Icon size={20} className="text-eco-600 mr-3" />
                <span className="flex-1"><span className="block font-bold dark:text-white">{option.label}</span><span className="block text-xs text-slate-500">{option.description}</span></span>
                {selected ? <CheckCircleIcon size={18} className="text-eco-600" /> : null}
              </button>;
            })}
            {!canPayWithWallet ? <p className="text-xs text-slate-500">Wallet payment requires a sufficient verified balance.</p> : null}
          </div>
          <div className="bg-gradient-to-r from-eco-500 to-teal-600 text-white rounded-2xl p-5">
            <div className="flex justify-between"><span>Total</span><strong className="text-2xl">{formatCurrency(total)}</strong></div>
            <p className="text-xs mt-2 text-eco-100">Earn {formatPoints(Math.round(total * 10))} EcoPoints after completion.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={onClose} className="py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold">Cancel</button>
            <button onClick={() => onConfirm(selectedPayment)} disabled={selectedPayment === 'wallet' && !canPayWithWallet} className="btn-primary py-3 font-bold disabled:opacity-50">Continue</button>
          </div>
        </div>
      </motion.section>
    </div>
  ) : null}</AnimatePresence>;
};

export default CheckoutModal;
