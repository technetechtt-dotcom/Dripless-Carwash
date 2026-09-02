import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, MailIcon } from 'lucide-react';
import { accountApi } from '@shared/api';
import { ROUTES } from '../utils/routes';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await accountApi.requestPasswordReset(email);
      setSent(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not request a reset');
    } finally {
      setLoading(false);
    }
  };
  return <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex items-center justify-center">
    <section className="glass-card w-full max-w-md p-7">
      <Link to={ROUTES.LOGIN} className="inline-flex items-center gap-2 text-sm text-slate-500 mb-6"><ArrowLeftIcon size={16}/>Back to login</Link>
      <MailIcon className="text-eco-600 mb-4" size={32}/>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reset your password</h1>
      <p className="text-sm text-slate-500 mt-2 mb-6">Enter your account email. If it exists, we’ll send a secure, single-use reset link.</p>
      {sent ? <div className="rounded-xl bg-eco-50 text-eco-800 p-4">Check your inbox and spam folder for the reset link.</div> :
        <form onSubmit={submit} className="space-y-4">
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"/>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-60">{loading ? 'Sending…' : 'Send reset link'}</button>
        </form>}
    </section>
  </main>;
}
