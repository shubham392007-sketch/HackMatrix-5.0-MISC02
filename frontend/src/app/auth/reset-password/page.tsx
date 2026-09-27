'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GlobalHeader from '@/components/layout/GlobalHeader';
import GlobalFooter from '@/components/layout/GlobalFooter';
import { ArrowRight, AlertCircle, CheckCircle2, Loader2, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage("New password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setErrorMessage(error.message || "Failed to update password.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-[#1C1C1C]">
      <GlobalHeader />
      
      <main className="flex-grow flex items-center justify-center py-12 px-6">
        <div className="max-w-md w-full mx-auto">
          {success ? (
            <div className="gl-card p-8 border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] rounded-3xl text-center space-y-5">
              <div className="w-14 h-14 rounded-full bg-[#DFE968] border border-[#1C1C1C] mx-auto flex items-center justify-center shadow-[2px_2px_0_0_#1C1C1C]">
                <CheckCircle2 className="w-7 h-7 text-[#1C1C1C]" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Password Updated</h2>
              <p className="text-sm font-medium leading-relaxed text-gray-700">
                Your password has been changed successfully. Redirecting you to sign in ···
              </p>
              <div className="pt-4">
                <Link
                  href="/login"
                  className="pill-btn pill-btn-primary w-full flex justify-center items-center gap-2 text-xs font-black uppercase py-3.5"
                >
                  SIGN IN NOW <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="gl-card p-8 border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] rounded-3xl space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#DFE968] border border-[#1C1C1C] mx-auto flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-[#1C1C1C]" />
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight">Reset Password</h1>
                <p className="text-sm font-medium text-gray-700">
                  Enter your new secure password below.
                </p>
              </div>

              {errorMessage && (
                <div className="p-4 rounded-2xl bg-[#F6C8D6] border-[1.5px] border-[#1C1C1C] flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#1C1C1C] flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-bold leading-relaxed">{errorMessage}</p>
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase tracking-wider ml-4">New Password</label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    className="pill-input w-full bg-[#FBF1CF] border-[#1C1C1C] font-medium"
                    placeholder="•••••••• (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase tracking-wider ml-4">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    className="pill-input w-full bg-[#FBF1CF] border-[#1C1C1C] font-medium"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                      UPDATING PASSWORD ···
                    </>
                  ) : (
                    <>
                      UPDATE PASSWORD <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      <GlobalFooter />
    </div>
  );
}
