import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { accountApi } from '@shared/api';
import { ROUTES } from '../utils/routes';
import { toast } from 'sonner';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [complete, setComplete] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 10) return toast.error('Use at least 10 characters');
    if (password !== confirm) return toast.error('Passwords do not match');
    try {
      await accountApi.confirmPasswordReset(token, password);
      setComplete(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Reset link is invalid or expired');
    }
  };
  return <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex items-center justify-center">
    <section className="glass-card w-full max-w-md p-7">
      <h1 className="text-2xl font-bold dark:text-white">Choose a new password</h1>
      {!token ? <p className="mt-4 text-red-600">This reset link is missing its token.</p> : complete ?
        <div className="mt-5"><p className="text-eco-700">Password updated. Other sessions have been revoked.</p><Link to={ROUTES.LOGIN} className="btn-primary block text-center mt-5 py-3">Log in</Link></div> :
        <form onSubmit={submit} className="space-y-4 mt-5">
          <input required type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" className="w-full p-3 rounded-xl border dark:bg-slate-800 dark:text-white"/>
          <input required type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password" className="w-full p-3 rounded-xl border dark:bg-slate-800 dark:text-white"/>
          <button type="submit" className="btn-primary w-full py-3">Update password</button>
        </form>}
    </section>
  </main>;
}
