import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, Loader2, Droplets } from 'lucide-react';
import { useDriverAuth } from '../contexts/DriverAuthContext';
interface LoginPageProps {
  onNavigateToSignup: () => void;
}
export function LoginPage({ onNavigateToSignup }: LoginPageProps) {
  const { login, isLoading } = useDriverAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError('Invalid credentials. Try driver@driplesswash.com / password');
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-emerald-300/30 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-teal-300/30 rounded-full blur-3xl" />

      <motion.div
        initial={{
          opacity: 0,
          y: 20
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        className="w-full max-w-md bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-8 shadow-2xl shadow-black/5 relative z-10">

        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
            <Droplets className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Dripless Wash</h1>
          <p className="text-slate-500 mt-2">Driver App</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 ml-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                placeholder="driver@driplesswash.com"
                required />

            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 ml-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                placeholder="••••••••"
                required />

            </div>
          </div>

          {error &&
          <p className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg border border-red-100">
              {error}
            </p>
          }

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center">

            {isLoading ?
            <Loader2 className="w-5 h-5 animate-spin" /> :

            'Sign In'
            }
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-500 text-sm">
            New to Dripless Wash?{' '}
            <button
              onClick={onNavigateToSignup}
              className="text-emerald-600 font-bold hover:text-emerald-700 transition-colors">

              Create Account
            </button>
          </p>
        </div>
      </motion.div>
    </div>);

}