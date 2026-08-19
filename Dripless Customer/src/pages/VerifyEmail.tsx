import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { accountApi } from '@shared/api';
import { ROUTES } from '../utils/routes';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [state, setState] = useState<'working' | 'success' | 'error'>('working');
  useEffect(() => {
    const token = params.get('token') || '';
    if (!token) return setState('error');
    void accountApi.verifyEmail(token).then(() => setState('success')).catch(() => setState('error'));
  }, [params]);
  return <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex items-center justify-center">
    <section className="glass-card w-full max-w-md p-7 text-center">
      <h1 className="text-2xl font-bold dark:text-white">Email verification</h1>
      <p className={`my-5 ${state === 'error' ? 'text-red-600' : 'text-slate-600 dark:text-slate-300'}`}>
        {state === 'working' ? 'Verifying your secure link…' : state === 'success' ? 'Your email is verified. You can continue to Dripless.' : 'This verification link is invalid or expired.'}
      </p>
      <Link to={state === 'success' ? ROUTES.HOME : ROUTES.LOGIN} className="btn-primary block py-3">Continue</Link>
    </section>
  </main>;
}
