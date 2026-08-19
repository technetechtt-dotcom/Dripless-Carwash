import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CreditCardIcon, LockKeyholeIcon, ShieldCheckIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { ROUTES } from '../utils/routes';

const PaymentMethods = () => {
  const navigate = useNavigate();

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen pb-24">
      <header className="sticky top-0 z-20 glass-nav px-4 py-4 flex items-center">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          className="mr-4 p-2 rounded-full glass"
          aria-label="Go back"
        >
          <ArrowLeftIcon size={20} className="text-slate-700 dark:text-slate-200" />
        </motion.button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Payment security</h1>
      </header>

      <section className="p-5 space-y-5 max-w-xl mx-auto">
        <div className="glass-card p-6 dark:bg-slate-800/90">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-5">
            <CreditCardIcon className="text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Cards are handled by Paystack
          </h2>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            Dripless does not ask for or store your card number, expiry date, or CVV. When you pay
            by card, you are redirected to Paystack&apos;s secure hosted checkout.
          </p>
        </div>

        <div className="grid gap-3">
          <div className="glass-card p-4 flex gap-3">
            <ShieldCheckIcon className="text-eco-600 shrink-0" />
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-100">No card data in this app</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Payment details are entered only on the provider checkout.</p>
            </div>
          </div>
          <div className="glass-card p-4 flex gap-3">
            <LockKeyholeIcon className="text-eco-600 shrink-0" />
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-100">Verified server confirmation</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">A booking is marked paid only after the backend verifies the payment.</p>
            </div>
          </div>
        </div>

        <button className="btn-primary w-full py-3" onClick={() => navigate(ROUTES.SERVICES)}>
          Book a service
        </button>
      </section>
    </motion.main>
  );
};

export default PaymentMethods;
