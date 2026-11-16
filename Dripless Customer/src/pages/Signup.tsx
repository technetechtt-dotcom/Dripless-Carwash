import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notify } from '../utils/notify';
import { ROUTES } from '../utils/routes';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  MailIcon,
  LockIcon,
  UserIcon,
  Loader2Icon,
  ArrowLeftIcon } from
'lucide-react';
const signupSchema = z.
object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).
refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});
type SignupForm = z.infer<typeof signupSchema>;
const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema)
  });
  const onSubmit = async (data: SignupForm) => {
    setIsLoading(true);
    try {
      await signup(
        `${data.firstName} ${data.lastName}`,
        data.email,
        data.password
      );
      navigate(ROUTES.HOME);
    } catch (error) {
      console.error(error);
      notify.error('Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-green-500 pt-12 pb-24 px-6 text-white text-center rounded-b-[3rem] shadow-lg relative">
        <button
          onClick={() => navigate(ROUTES.SPLASH)}
          className="absolute top-6 left-6 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          aria-label="Go back">

          <ArrowLeftIcon size={20} />
        </button>
        <h1 className="text-3xl font-bold mb-2">Create Account</h1>
        <p className="text-teal-100">Join Dripless Wash today</p>
      </div>

      {/* Signup Form */}
      <div className="flex-1 px-6 -mt-16 pb-8">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-700 mb-2">

                  First Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="firstName"
                    type="text"
                    {...register('firstName')}
                    aria-invalid={!!errors.firstName}
                    aria-describedby={
                    errors.firstName ? 'firstName-error' : undefined
                    }
                    className={`block w-full pl-10 pr-3 py-3 border ${errors.firstName ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors`}
                    placeholder="John" />

                </div>
                {errors.firstName &&
                <p id="firstName-error" className="mt-1 text-xs text-red-500">
                    {errors.firstName.message}
                  </p>
                }
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-700 mb-2">

                  Last Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="lastName"
                    type="text"
                    {...register('lastName')}
                    aria-invalid={!!errors.lastName}
                    aria-describedby={
                    errors.lastName ? 'lastName-error' : undefined
                    }
                    className={`block w-full pl-10 pr-3 py-3 border ${errors.lastName ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors`}
                    placeholder="Doe" />

                </div>
                {errors.lastName &&
                <p id="lastName-error" className="mt-1 text-xs text-red-500">
                    {errors.lastName.message}
                  </p>
                }
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2">

                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MailIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className={`block w-full pl-10 pr-3 py-3 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors`}
                  placeholder="you@example.com" />

              </div>
              {errors.email &&
              <p id="email-error" className="mt-1 text-xs text-red-500">
                  {errors.email.message}
                </p>
              }
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2">

                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  {...register('password')}
                  aria-invalid={!!errors.password}
                  aria-describedby={
                  errors.password ? 'password-error' : undefined
                  }
                  className={`block w-full pl-10 pr-3 py-3 border ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors`}
                  placeholder="Min 8 characters" />

              </div>
              {errors.password &&
              <p id="password-error" className="mt-1 text-xs text-red-500">
                  {errors.password.message}
                </p>
              }
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2">

                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword')}
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={
                  errors.confirmPassword ? 'confirmPassword-error' : undefined
                  }
                  className={`block w-full pl-10 pr-3 py-3 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors`}
                  placeholder="Confirm password" />

              </div>
              {errors.confirmPassword &&
              <p
                id="confirmPassword-error"
                className="mt-1 text-xs text-red-500">

                  {errors.confirmPassword.message}
                </p>
              }
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-4 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-70 disabled:cursor-not-allowed transition-colors mt-6">

              {isLoading ?
              <Loader2Icon className="h-5 w-5 animate-spin" /> :

              'Create Account'
              }
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to={ROUTES.LOGIN}
                className="font-medium text-teal-600 hover:text-teal-500">

                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>);

};
export default Signup;