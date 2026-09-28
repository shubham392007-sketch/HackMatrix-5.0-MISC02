'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import GlobalHeader from '@/components/layout/GlobalHeader';
import GlobalFooter from '@/components/layout/GlobalFooter';
import { Mail, CheckCircle2, AlertCircle, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function ConfirmForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const { verifyOtp, resendConfirmation } = useAuth();

  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setResendMessage(null);

    if (!email.trim() || !token.trim()) {
      setErrorMessage('Please provide both your email address and 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await verifyOtp(email, token);
      if (error) {
        setErrorMessage(error.message || 'Invalid or expired confirmation code.');
        setLoading(false);
        return;
      }
      // Redirect to onboarding
      router.push('/onboarding?confirmed=true');
    } catch {
      setErrorMessage('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim() || resendCooldown > 0) return;
    setErrorMessage(null);
    try {
      const { error } = await resendConfirmation(email);
      if (error) {
        setErrorMessage(error.message || 'Could not resend confirmation email.');
      } else {
        setResendMessage('A new confirmation email has been dispatched.');
        setResendCooldown(60);
      }
    } catch {
      setErrorMessage('Could not request a new code.');
    }
  };

  return (
    <div className="max-w-md w-full mx-auto">
      <div className="gl-card p-8 md:p-10 border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] rounded-3xl shadow-[4px_4px_0_0_#1C1C1C] space-y-6">
        <div className="w-14 h-14 rounded-full bg-[#DFE968] border border-[#1C1C1C] mx-auto flex items-center justify-center shadow-[2px_2px_0_0_#1C1C1C]">
          <KeyRound className="w-7 h-7 text-[#1C1C1C]" />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold uppercase tracking-tight">Confirm Your Email</h1>
          <p className="text-xs font-medium text-gray-700 leading-relaxed">
            Enter the 6-digit verification code sent to your inbox to activate your account and proceed to profile setup.
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-[#F6C8D6] border-[1.5px] border-[#1C1C1C] flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#1C1C1C] flex-shrink-0 mt-0.5" />
            <p className="text-xs font-bold leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {resendMessage && (
          <div className="p-4 rounded-2xl bg-[#D3E8D5] border-[1.5px] border-[#1C1C1C] flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-800 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-green-900 leading-relaxed">{resendMessage}</p>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider ml-4">Email Address</label>
            <input
              type="email"
              required
              className="pill-input w-full bg-[#FBF1CF] border-[#1C1C1C] font-medium text-xs"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider ml-4">
              6-Digit Verification Code
            </label>
            <input
              type="text"
              required
              maxLength={8}
              className="pill-input w-full bg-[#FBF1CF] border-[#1C1C1C] font-mono font-black text-center text-lg tracking-[0.3em]"
              placeholder="123456"
              value={token}
              onChange={(e) => setToken(e.target.value.trim())}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="pill-btn pill-btn-primary w-full flex items-center justify-center gap-2 text-xs font-black uppercase py-3.5 tracking-wider disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> VERIFYING CODE ···
                </>
              ) : (
                <>
                  VERIFY & BEGIN ONBOARDING <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="pt-2 border-t border-[#1C1C1C]/15 flex flex-col items-center gap-3 text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || !email.trim()}
            className="text-xs font-extrabold uppercase tracking-wider text-gray-700 hover:text-black disabled:opacity-40 underline"
          >
            {resendCooldown > 0
              ? `Resend available in ${resendCooldown}s`
              : "Didn't receive email? Resend code"}
          </button>

          <Link
            href="/login"
            className="text-xs font-extrabold uppercase tracking-wider text-gray-600 hover:text-black"
          >
            Return to Log In →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <div className="min-h-screen flex flex-col text-[#1C1C1C]">
      <GlobalHeader />
      <main className="flex-grow flex items-center justify-center py-12 px-6">
        <Suspense
          fallback={
            <div className="gl-card p-8 border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] rounded-3xl text-center">
              <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin mx-auto" />
            </div>
          }
        >
          <ConfirmForm />
        </Suspense>
      </main>
      <GlobalFooter />
    </div>
  );
}
