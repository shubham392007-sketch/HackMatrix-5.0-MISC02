'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import GlobalHeader from '@/components/layout/GlobalHeader';
import { ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const { error } = await login(email, password);
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setErrorMessage("Invalid email or password. Please verify your credentials and try again.");
        } else if (error.message.includes("Email not confirmed")) {
          setErrorMessage("Please check your email and click the confirmation link before signing in.");
        } else {
          setErrorMessage(error.message || "Failed to sign in. Please try again.");
        }
        setLoading(false);
        return;
      }

      // Check profile completion status for returning user
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      let profileCompleted = false;
      let userRole = 'EMPLOYEE';

      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('onboarding_completed, role')
          .eq('user_id', user.id)
          .maybeSingle();
        if (profileData) {
          profileCompleted = Boolean(profileData.onboarding_completed);
          userRole = profileData.role || 'EMPLOYEE';
        }
      }

      if (!profileCompleted) {
        router.push('/onboarding');
      } else if (redirectUrl) {
        router.push(redirectUrl);
      } else if (userRole === 'MANAGER') {
        router.push('/manager/dashboard');
      } else {
        router.push('/employee/dashboard');
      }
    } catch {
      setErrorMessage("An unexpected network error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-[#1C1C1C]">
      <GlobalHeader />
      
      <main className="flex-grow flex items-center justify-center py-12 px-6">
        <div className="container mx-auto max-w-6xl flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 w-full max-w-md mx-auto">
            <div className="mb-8 text-center lg:text-left">
              <h1 className="text-4xl font-extrabold mb-3">Welcome back</h1>
              <p className="text-lg font-medium text-gray-700">Sign in to continue your talent growth journey.</p>
            </div>

            {errorMessage && (
              <div className="mb-6 p-4 rounded-2xl bg-[#F6C8D6] border-[1.5px] border-[#1C1C1C] flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#1C1C1C] flex-shrink-0 mt-0.5" />
                <p className="text-xs font-bold leading-relaxed">{errorMessage}</p>
              </div>
            )}
            
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider ml-4">Work Email</label>
                <input 
                  type="email" 
                  required
                  autoComplete="email"
                  className="pill-input w-full bg-[#FBF6DF] border-[#1C1C1C] placeholder:text-gray-400 font-medium" 
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center px-4">
                  <label className="block text-xs font-black uppercase tracking-wider">Password</label>
                  <Link href="/auth/forgot-password" className="text-xs font-bold underline hover:opacity-80">
                    Forgot?
                  </Link>
                </div>
                <input 
                  type="password" 
                  required
                  autoComplete="current-password"
                  className="pill-input w-full bg-[#FBF6DF] border-[#1C1C1C] font-medium" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading}
                className="pill-btn pill-btn-primary w-full flex justify-center items-center gap-2 mt-4 text-sm font-extrabold tracking-wider py-4 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AUTHENTICATING ···
                  </>
                ) : (
                  <>
                    LOG IN <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
            
            <div className="mt-8 text-center text-sm font-medium">
              Don't have an account?{' '}
              <Link href="/signup" className="font-extrabold underline hover:text-[#4A7A4E] transition-colors">
                Sign up
              </Link>
            </div>
          </div>
          
          <div className="hidden lg:flex flex-1 justify-center relative w-full h-[540px]">
            <div 
              className="w-full max-w-md h-full bg-gradient-to-tr from-[#DFE968] via-[#FBF1CF] to-[#F3A878] border-[1.5px] border-[#1C1C1C] flex flex-col items-center justify-center p-8 text-center overflow-hidden shadow-[4px_4px_0_0_#1C1C1C]"
              style={{ borderRadius: '45% 55% 45% 55% / 58% 42% 55% 45%' }}
            >
               <h2 className="text-5xl md:text-6xl text-[#1C1C1C] mb-4" style={{ fontFamily: "'Yellowtail', cursive", transform: 'rotate(-4deg)' }}>
                GrowthLens
              </h2>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1C1C1C]/80 max-w-[240px]">
                Continuous Talent Intelligence & Skill Growth
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center font-bold tracking-widest text-sm text-[#1C1C1C]">
          LOADING LOGIN...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
