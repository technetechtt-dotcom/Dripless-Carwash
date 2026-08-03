import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, Loader2, User, Car, ArrowLeft } from 'lucide-react';
import { useDriverAuth } from '../contexts/DriverAuthContext';
interface SignupPageProps {
  onNavigateToLogin: () => void;
}
export function SignupPage({ onNavigateToLogin }: SignupPageProps) {
  const { signup, isLoading } = useDriverAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vehicle, setVehicle] = useState('');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signup(name, email, password, vehicle);
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-emerald-300/30 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-teal-300/30 rounded-full blur-3xl" />

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

        <button
          onClick={onNavigateToLogin}
          className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 transition-colors">

          <ArrowLeft className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Join Dripless Wash
          </h1>
          <p className="text-slate-500 mt-2">Start driving with us</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 ml-1">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                placeholder="John Doe"
                required />

            </div>
          </div>

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

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 ml-1">
              Vehicle Model
            </label>
            <div className="relative">
              <Car className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
              <input
                type="text"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                className="w-full bg-white/50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                placeholder="Toyota Prius 2023"
                required />

            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center mt-4">

            {isLoading ?
            <Loader2 className="w-5 h-5 animate-spin" /> :

            'Create Account'
            }
          </button>
        </form>
      </motion.div>
    </div>);

}