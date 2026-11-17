'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Lock, Mail, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/adminAuth';

type LoginForm = { email: string; password: string };

export default function AdminLoginClient() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({ defaultValues: { email: '', password: '' } });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setAuthError('');
    await new Promise((r) => setTimeout(r, 500));
    const session = signIn(data.email, data.password);
    if (session) {
      router.push('/admin-dashboard');
    } else {
      setIsLoading(false);
      setAuthError('Incorrect email or password.');
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#0E0D0B' }}>
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center" style={{ background: 'linear-gradient(135deg, #0E0D0B 0%, #1A1610 100%)' }}>
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #B8892B, transparent)' }} />
        <div className="absolute bottom-24 right-16 w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #B8892B, transparent)' }} />
        <div className="relative z-10 px-12 text-center">
          <div className="flex justify-center mb-8"><AppLogo size={150} /></div>
          <h1 className="text-white font-extrabold text-3xl leading-tight mb-3">Restaurant management</h1>
          <p className="text-white/60 text-base">Southall · Ilford · Tooting · Wood Green</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden"><AppLogo size={56} /></div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-white mb-2">Staff sign in</h2>
            <p className="text-white/60">Access your WATAN restaurant dashboard</p>
          </div>

          {authError && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-6">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{authError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-white mb-1.5" htmlFor="email">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@watanrestaurant.co.uk"
                  className={`form-input pl-10 ${errors.email ? 'form-input-error' : ''}`}
                  {...register('email', { required: 'Email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' } })}
                />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1.5">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-1.5" htmlFor="password">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className={`form-input pl-10 pr-12 ${errors.password ? 'form-input-error' : ''}`}
                  {...register('password', { required: 'Password is required' })}
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1.5">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary text-base py-3.5">
              {isLoading ? (<><Loader2 size={18} className="animate-spin" />Signing in...</>) : (<>Sign in<ChevronRight size={18} /></>)}
            </button>
          </form>

          <p className="text-center text-xs text-white/40 mt-8">WATAN Restaurant Management · Authorised staff only</p>
        </div>
      </div>
    </div>
  );
}