'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import GlobalHeader from '@/components/layout/GlobalHeader';
import GlobalFooter from '@/components/layout/GlobalFooter';
import { CheckCircle2, AlertCircle, ArrowRight, Sparkles, RefreshCw } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshProfile } = useAuth();

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function handleAuthConfirmation() {
      // 1. Check for errors returned in query params
      const errorParam = searchParams.get('error');
      const errorDesc = searchParams.get('error_description');
      if (errorParam) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage(errorDesc || 'The email confirmation link is invalid or has expired.');
        }
        return;
      }

      const code = searchParams.get('code');
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type') || 'signup';

      try {
        // 2. PKCE code exchange
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            throw error;
          }
        } 
        // 3. Token hash verification
        else if (tokenHash) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });
          if (error) {
            throw error;
          }
        }

        // 4. Verify that we have an active session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // If no session from code or hash, check if hash fragment was parsed by client
          if (typeof window !== 'undefined' && window.location.hash) {
            // Give supabase client a split second to process hash
            await new Promise((r) => setTimeout(r, 400));
            const { data: { session: hashSession } } = await supabase.auth.getSession();
            if (!hashSession) {
              throw new Error('No active session could be found from this confirmation link.');
            }
          } else {
            throw new Error('No verification code or session detected. Please sign in.');
          }
        }

        // 5. Successful email confirmation!
        if (isMounted) {
          setStatus('success');
        }

        // Refresh user profile in context
        await refreshProfile();

        // 6. Check onboarding status to route correctly
        const { data: { user } } = await supabase.auth.getUser();
        let onboardingCompleted = false;
        let role = 'EMPLOYEE';

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed, role')
            .eq('user_id', user.id)
            .maybeSingle();

          if (profile) {
            onboardingCompleted = Boolean(profile.onboarding_completed);
            role = profile.role || 'EMPLOYEE';
          }
        }

        // Redirect after short confirmation feedback
        setTimeout(() => {
          if (!onboardingCompleted) {
            router.replace('/onboarding?confirmed=true');
          } else {
            router.replace(role === 'MANAGER' ? '/manager/dashboard' : '/employee/dashboard');
          }
        }, 1200);

      } catch (err: any) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage(err?.message || 'Could not verify email confirmation link.');
        }
      }
    }

    handleAuthConfirmation();

    return () => {
      isMounted = false;
    };
  }, [searchParams, router, refreshProfile]);

  return (
    <div className="max-w-md w-full mx-auto">
      {status === 'verifying' && (
        <div className="gl-card p-10 border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] rounded-3xl text-center space-y-6 shadow-[4px_4px_0_0_#1C1C1C]">
          <div className="w-16 h-16 rounded-full bg-[#DFE968] border border-[#1C1C1C] mx-auto flex items-center justify-center shadow-[2px_2px_0_0_#1C1C1C]">
            <RefreshCw className="w-8 h-8 text-[#1C1C1C] animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tight">Verifying Email Confirmation</h2>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Validating token & activating talent workspace ···
            </p>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="gl-card p-10 border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] rounded-3xl text-center space-y-6 shadow-[4px_4px_0_0_#1C1C1C]">
          <div className="w-16 h-16 rounded-full bg-[#D3E8D5] border border-[#1C1C1C] mx-auto flex items-center justify-center shadow-[2px_2px_0_0_#1C1C1C]">
            <CheckCircle2 className="w-8 h-8 text-[#1C1C1C]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tight">Email Confirmed!</h2>
            <p className="text-sm font-medium text-gray-700 leading-relaxed">
              Your identity has been verified. Redirecting you to complete your profile and connect GitHub & Jira integrations...
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#DFE968] border border-[#1C1C1C] text-xs font-extrabold uppercase">
              <Sparkles className="w-4 h-4" /> LAUNCHING ONBOARDING ···
            </div>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="gl-card p-10 border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] rounded-3xl text-center space-y-6 shadow-[4px_4px_0_0_#1C1C1C]">
          <div className="w-16 h-16 rounded-full bg-[#F6C8D6] border border-[#1C1C1C] mx-auto flex items-center justify-center shadow-[2px_2px_0_0_#1C1C1C]">
            <AlertCircle className="w-8 h-8 text-[#1C1C1C]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tight">Verification Problem</h2>
            <p className="text-xs font-bold leading-relaxed text-gray-800">
              {errorMessage || 'This confirmation link may have already been used or has expired.'}
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <Link
              href="/login"
              className="pill-btn pill-btn-primary w-full flex items-center justify-center gap-2 text-xs font-black uppercase py-3.5"
            >
              PROCEED TO SIGN IN <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/signup"
              className="pill-btn bg-[#FBF1CF] border border-[#1C1C1C] w-full flex items-center justify-center text-xs font-black uppercase py-3 hover:bg-[#1C1C1C]/5"
            >
              REGISTER NEW ACCOUNT
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex flex-col text-[#1C1C1C]">
      <GlobalHeader />
      <main className="flex-grow flex items-center justify-center py-12 px-6">
        <Suspense
          fallback={
            <div className="gl-card p-8 border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] rounded-3xl text-center space-y-4">
              <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin mx-auto" />
              <p className="text-xs font-bold uppercase tracking-wider">Loading verification handler...</p>
            </div>
          }
        >
          <CallbackContent />
        </Suspense>
      </main>
      <GlobalFooter />
    </div>
  );
}
