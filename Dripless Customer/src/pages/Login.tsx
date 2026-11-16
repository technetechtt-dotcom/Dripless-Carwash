import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROUTES } from '../utils/routes';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  MailIcon,
  LockIcon,
  Loader2Icon,
  ArrowLeftIcon,
  LeafIcon } from
'lucide-react';
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});
type LoginForm = z.infer<typeof loginSchema>;
const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });
  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      navigate(ROUTES.HOME);
    } catch (error) {
      console.error(error);
      // Toast handled in AuthContext
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-br from-eco-500 to-teal-700 rounded-b-[3rem] z-0"></div>
      <div className="absolute top-20 right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl z-0"></div>

      {/* Header */}
      <div className="relative z-10 pt-12 px-6 pb-24 text-white text-center">
        <button
          onClick={() => navigate(ROUTES.SPLASH)}
          className="absolute top-6 left-6 p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-colors">

          <ArrowLeftIcon size={20} />
        </button>

        <div className="flex justify-center mb-6">
          <div className="bg-white/20 backdrop-blur-xl p-4 rounded-3xl border border-white/30 shadow-xl">
            <LeafIcon size={40} className="text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-2 tracking-tight">Welcome Back</h1>
        <p className="text-eco-100 font-medium">
          Log in to your Dripless Wash account
        </p>
      </div>

      {/* Login Form */}
      <div className="flex-1 px-6 -mt-10 relative z-10 pb-8">
        <div className="glass p-8 dark:bg-slate-900/90 dark:border-slate-800">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <MailIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  {...register('email')}
                  className={`block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border ${errors.email ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-eco-500 focus:border-transparent outline-none transition-all dark:text-white`}
                  placeholder="you@example.com" />

              </div>
              {errors.email &&
              <p className="mt-1 text-xs text-red-500 font-medium">
                  {errors.email.message}
                </p>
              }
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <LockIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  {...register('password')}
                  className={`block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border ${errors.password ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-eco-500 focus:border-transparent outline-none transition-all dark:text-white`}
                  placeholder="••••••••" />

              </div>
              {errors.password &&
              <p className="mt-1 text-xs text-red-500 font-medium">
                  {errors.password.message}
                </p>
              }
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                className="text-sm font-bold text-eco-600 dark:text-eco-400 hover:text-eco-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-eco-500 rounded"
                onClick={() => navigate(ROUTES.FORGOT_PASSWORD)}>
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-4 text-lg font-bold shadow-xl shadow-eco-500/20 disabled:opacity-70 disabled:cursor-not-allowed">

              {isLoading ?
              <Loader2Icon className="h-6 w-6 animate-spin mx-auto" /> :

              'Log In'
              }
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-600 dark:text-slate-400">
              Don't have an account?{' '}
              <Link
                to={ROUTES.SIGNUP}
                className="font-bold text-eco-600 dark:text-eco-400 hover:text-eco-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-eco-500 rounded px-1">

                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>);

};
export default Login;
