'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GlobalHeader from '@/components/layout/GlobalHeader';
import GlobalFooter from '@/components/layout/GlobalFooter';
import { User, Users, ArrowRight, AlertCircle, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [role, setRole] = useState<'EMPLOYEE' | 'MANAGER'>('EMPLOYEE');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);

    try {
      const { error, emailConfirmationRequired } = await signup(email, password, fullName, role);
      if (error) {
        if (error.message.includes("User already registered")) {
          setErrorMessage("An account with this email already exists. Please log in.");
        } else {
          setErrorMessage(error.message || "Could not complete registration.");
        }
        setLoading(false);
        return;
      }

      if (emailConfirmationRequired) {
        setConfirmationSent(true);
        setLoading(false);
      } else {
        router.push('/onboarding');
      }
    } catch {
      setErrorMessage("A network error occurred during registration. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-[#1C1C1C]">
      <GlobalHeader />
      
      <main className="flex-grow flex items-center justify-center py-12 px-6">
        <div className="container mx-auto max-w-6xl flex flex-col lg:flex-row-reverse items-center gap-16">
          <div className="flex-1 w-full max-w-md mx-auto">
            {confirmationSent ? (
              <div className="gl-card p-8 border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] rounded-3xl text-center space-y-5">
                <div className="w-14 h-14 rounded-full bg-[#DFE968] border border-[#1C1C1C] mx-auto flex items-center justify-center shadow-[2px_2px_0_0_#1C1C1C]">
                  <Mail className="w-7 h-7 text-[#1C1C1C]" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight">Verify Your Work Email</h2>
                <p className="text-sm font-medium leading-relaxed text-gray-700">
                  We sent a confirmation link to <span className="font-bold underline">{email}</span>. Click the link in the message to activate your account.
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
              <>
                <div className="mb-6 text-center lg:text-left">
                  <h1 className="text-4xl font-extrabold mb-2">Create your account</h1>
                  <p className="text-sm font-medium text-gray-700">Choose your workspace role to begin.</p>
                </div>

                {errorMessage && (
                  <div className="mb-6 p-4 rounded-2xl bg-[#F6C8D6] border-[1.5px] border-[#1C1C1C] flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[#1C1C1C] flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-bold leading-relaxed">{errorMessage}</p>
                  </div>
                )}
                
                <form onSubmit={handleSignup} className="space-y-4">
                  {/* Role Selection */}
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <button
                      type="button"
                      onClick={() => setRole('EMPLOYEE')}
                      className={`flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-[999px] border-[1.5px] transition-all ${
                        role === 'EMPLOYEE' 
                          ? 'bg-[#DFE968] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C]' 
                          : 'bg-[#FBF6DF] border-gray-400 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <User className="w-5 h-5" />
                      <span className="font-extrabold text-xs tracking-wider uppercase">Employee</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('MANAGER')}
                      className={`flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-[999px] border-[1.5px] transition-all ${
                        role === 'MANAGER' 
                          ? 'bg-[#F6C8D6] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C]' 
                          : 'bg-[#FBF6DF] border-gray-400 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <Users className="w-5 h-5" />
                      <span className="font-extrabold text-xs tracking-wider uppercase">Manager</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-wider ml-4">Full Name</label>
                    <input 
                      type="text" 
                      required
                      autoComplete="name"
                      className="pill-input w-full bg-[#FBF6DF] border-[#1C1C1C] font-medium" 
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-wider ml-4">Work Email</label>
                    <input 
                      type="email" 
                      required
                      autoComplete="email"
                      className="pill-input w-full bg-[#FBF6DF] border-[#1C1C1C] font-medium" 
                      placeholder="jane@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-wider ml-4">Password</label>
                    <input 
                      type="password" 
                      required
                      autoComplete="new-password"
                      className="pill-input w-full bg-[#FBF6DF] border-[#1C1C1C] font-medium" 
                      placeholder="•••••••• (min 6 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-wider ml-4">Confirm Password</label>
                    <input 
                      type="password" 
                      required
                      autoComplete="new-password"
                      className="pill-input w-full bg-[#FBF6DF] border-[#1C1C1C] font-medium" 
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="pill-btn pill-btn-primary w-full flex justify-center items-center gap-2 mt-4 text-xs font-black uppercase tracking-wider py-4 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        CREATING PROFILE ···
                      </>
                    ) : (
                      <>
                        CREATE {role} ACCOUNT <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
                
                <div className="mt-6 text-center text-sm font-medium">
                  Already have an account?{' '}
                  <Link href="/login" className="font-extrabold underline hover:text-[#4A7A4E] transition-colors">
                    Log in
                  </Link>
                </div>
              </>
            )}
          </div>
          
          <div className="hidden lg:flex flex-1 justify-center relative w-full h-[540px]">
            <div 
              className="w-full max-w-md h-full bg-gradient-to-tr from-[#F3A878] via-[#FBF1CF] to-[#DFE968] border-[1.5px] border-[#1C1C1C] flex flex-col items-center justify-center p-8 text-center overflow-hidden shadow-[4px_4px_0_0_#1C1C1C]"
              style={{ borderRadius: '58% 42% 55% 45% / 45% 55% 45% 55%' }}
            >
              <h2 className="text-5xl md:text-6xl text-[#1C1C1C] mb-4" style={{ fontFamily: "'Yellowtail', cursive", transform: 'rotate(3deg)' }}>
                GrowthLens
              </h2>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1C1C1C]/80 max-w-[240px]">
                Autonomous Skill Growth & Verified Evidence
              </p>
            </div>
          </div>
        </div>
      </main>

      <GlobalFooter />
    </div>
  );
}
