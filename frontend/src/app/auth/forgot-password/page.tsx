'use client';

import { useState } from 'react';
import Link from 'next/link';
import GlobalHeader from '@/components/layout/GlobalHeader';
import { ArrowRight, AlertCircle, CheckCircle2, Loader2, KeyRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        setErrorMessage(error.message || "Failed to initiate password reset.");
        setLoading(false);
        return;
      }

      setSentSuccess(true);
    } catch {
      setErrorMessage("A network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-[#1C1C1C]">
      <GlobalHeader />
      
      <main className="flex-grow flex items-center justify-center py-12 px-6">
        <div className="max-w-md w-full mx-auto">
          {sentSuccess ? (
            <div className="gl-card p-8 border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] rounded-3xl text-center space-y-5">
              <div className="w-14 h-14 rounded-full bg-[#DFE968] border border-[#1C1C1C] mx-auto flex items-center justify-center shadow-[2px_2px_0_0_#1C1C1C]">
                <CheckCircle2 className="w-7 h-7 text-[#1C1C1C]" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Reset Link Sent</h2>
              <p className="text-sm font-medium leading-relaxed text-gray-700">
                If an account exists for <span className="font-bold underline">{email}</span>, you will receive password reset instructions shortly.
              </p>
              <div className="pt-4">
                <Link
                  href="/login"
                  className="pill-btn pill-btn-primary w-full flex justify-center items-center gap-2 text-xs font-black uppercase py-3.5"
                >
                  RETURN TO SIGN IN <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="gl-card p-8 border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] rounded-3xl space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#DFE968] border border-[#1C1C1C] mx-auto flex items-center justify-center mb-4">
                  <KeyRound className="w-6 h-6 text-[#1C1C1C]" />
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight">Forgot Password?</h1>
                <p className="text-sm font-medium text-gray-700">
                  Enter your work email and we will send you a recovery link.
                </p>
              </div>

              {errorMessage && (
                <div className="p-4 rounded-2xl bg-[#F6C8D6] border-[1.5px] border-[#1C1C1C] flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#1C1C1C] flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-bold leading-relaxed">{errorMessage}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase tracking-wider ml-4">Work Email</label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    className="pill-input w-full bg-[#FBF1CF] border-[#1C1C1C] font-medium"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="pill-btn pill-btn-primary w-full flex justify-center items-center gap-2 text-xs font-black uppercase tracking-wider py-4 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      SENDING LINK ···
                    </>
                  ) : (
                    <>
                      SEND RESET LINK <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center pt-2">
                <Link href="/login" className="text-xs font-extrabold underline hover:text-[#4A7A4E]">
                  Remember your password? Log in
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
