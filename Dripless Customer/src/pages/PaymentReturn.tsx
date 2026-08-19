import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircleIcon, CheckCircleIcon, Loader2Icon } from 'lucide-react';
import { paymentsApi } from '@shared/api';
import { ROUTES } from '../utils/routes';

type PendingPayment = { paymentId: string; bookingId: string };

const readPending = (): PendingPayment | null => {
  try {
    return JSON.parse(localStorage.getItem('dripless_pending_payment') || 'null') as PendingPayment | null;
  } catch {
    return null;
  }
};

const PaymentReturn = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [state, setState] = useState<'checking' | 'paid' | 'pending' | 'failed'>('checking');
  const [message, setMessage] = useState('Confirming payment with the server…');
  const [bookingId, setBookingId] = useState<string | null>(null);

  const check = useCallback(async () => {
    setState('checking');
    const pending = readPending();
    const providerReference = params.get('reference') || params.get('trxref');
    try {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const payments = await paymentsApi.list();
        const payment = payments.find((item) =>
          item.paymentId === pending?.paymentId ||
          item.externalRef === providerReference
        );
        if (payment) {
          setBookingId(payment.bookingId || pending?.bookingId || null);
          if (payment.status === 'PAID') {
            localStorage.removeItem('dripless_pending_payment');
            setState('paid');
            setMessage('Payment verified. Your booking is ready.');
            return;
          }
          if (['FAILED', 'REFUNDED'].includes(payment.status)) {
            setState('failed');
            setMessage(`Payment status: ${payment.status.toLowerCase()}.`);
            return;
          }
        }
        await new Promise((resolve) => window.setTimeout(resolve, 2500));
      }
      setState('pending');
      setMessage('Payment confirmation is still pending. You can safely check again.');
    } catch (error) {
      setState('failed');
      setMessage(error instanceof Error ? error.message : 'Unable to verify payment.');
    }
  }, [params]);

  useEffect(() => { void check(); }, [check]);

  const Icon = state === 'paid' ? CheckCircleIcon : state === 'checking' ? Loader2Icon : AlertCircleIcon;
  return <main className="min-h-screen px-5 py-16 bg-slate-50 dark:bg-slate-950">
    <section className="max-w-md mx-auto glass-card p-7 text-center dark:bg-slate-800/90">
      <Icon size={52} className={`mx-auto mb-4 ${state === 'paid' ? 'text-eco-600' : state === 'checking' ? 'text-eco-600 animate-spin' : 'text-amber-500'}`} />
      <h1 className="text-2xl font-bold dark:text-white">{state === 'paid' ? 'Payment complete' : state === 'checking' ? 'Checking payment' : 'Payment update'}</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{message}</p>
      <div className="mt-6 space-y-3">
        {state === 'paid' && bookingId ? <button className="btn-primary w-full py-3" onClick={() => navigate(ROUTES.TRACKING, { state: { bookingId } })}>Track booking</button> : null}
        {state === 'pending' || state === 'failed' ? <button className="btn-primary w-full py-3" onClick={() => void check()}>Check again</button> : null}
        <button className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold dark:text-white" onClick={() => navigate(ROUTES.SERVICE_HISTORY)}>View bookings</button>
      </div>
    </section>
  </main>;
};

export default PaymentReturn;
