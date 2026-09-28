'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GlobalHeader from '@/components/layout/GlobalHeader';
import { User, Users, ArrowRight, AlertCircle, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function SignupPage() {
  const router = useRouter();
  const { signup, verifyOtp, resendConfirmation } = useAuth();

  const [role, setRole] = useState<'EMPLOYEE' | 'MANAGER'>('EMPLOYEE');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Confirmation state
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

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
        if (error.message.includes("already exists") || error.message.includes("already registered")) {
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
        router.push('/onboarding?confirmed=true');
      }
    } catch {
      setErrorMessage("A network error occurred during registration. Please try again.");
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    if (!otpCode.trim()) {
      setOtpError("Please enter your 6-digit verification code.");
      return;
    }
    setVerifyingOtp(true);
    try {
      const { error } = await verifyOtp(email, otpCode);
      if (error) {
        setOtpError(error.message || "Invalid or expired confirmation code.");
        setVerifyingOtp(false);
        return;
      }
      router.push('/onboarding?confirmed=true');
    } catch {
      setOtpError("Could not verify code. Please try again.");
      setVerifyingOtp(false);
    }
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;
    setOtpError(null);
    try {
      const { error } = await resendConfirmation(email);
      if (error) {
        setOtpError(error.message || "Failed to resend confirmation email.");
      } else {
        setResendMessage("A new confirmation email has been dispatched to your inbox.");
        setResendCooldown(60);
        const timer = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch {
      setOtpError("Could not dispatch confirmation email.");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col text-[#1C1C1C]">
      <GlobalHeader />
      
      <main className="flex-grow flex items-center justify-center py-12 px-6">
        <div className="container mx-auto max-w-6xl flex flex-col lg:flex-row-reverse items-center gap-16">
          <div className="flex-1 w-full max-w-md mx-auto">
            {confirmationSent ? (
              <div className="gl-card p-8 md:p-10 border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] rounded-3xl text-center space-y-6 shadow-[4px_4px_0_0_#1C1C1C]">
                <div className="w-16 h-16 rounded-full bg-[#DFE968] border border-[#1C1C1C] mx-auto flex items-center justify-center shadow-[2px_2px_0_0_#1C1C1C]">
                  <Mail className="w-8 h-8 text-[#1C1C1C]" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Check Your Inbox</h2>
                  <p className="text-xs font-medium leading-relaxed text-gray-700">
                    We sent a confirmation link to <span className="font-extrabold underline text-black">{email}</span>.
                    Click the link in the email to activate your account and proceed to profile setup.
                  </p>
                </div>

                {otpError && (
                  <div className="p-3.5 rounded-2xl bg-[#F6C8D6] border-[1.5px] border-[#1C1C1C] flex items-start gap-2.5 text-left">
                    <AlertCircle className="w-4 h-4 text-[#1C1C1C] flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-bold leading-relaxed">{otpError}</p>
                  </div>
                )}

                {resendMessage && (
                  <div className="p-3.5 rounded-2xl bg-[#D3E8D5] border-[1.5px] border-[#1C1C1C] flex items-start gap-2.5 text-left">
                    <CheckCircle2 className="w-4 h-4 text-green-800 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-green-900 leading-relaxed">{resendMessage}</p>
                  </div>
                )}

                {/* Inline OTP Code Verification */}
                <form onSubmit={handleVerifyOtp} className="space-y-3 pt-2 text-left border-t border-[#1C1C1C]/15">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-gray-800 ml-2">
                    Or Enter 6-Digit Code From Email
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={8}
                      className="pill-input flex-1 bg-[#FBF1CF] border-[#1C1C1C] font-mono font-black text-center text-sm tracking-[0.25em]"
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.trim())}
                    />
                    <button
                      type="submit"
                      disabled={verifyingOtp || !otpCode.trim()}
                      className="pill-btn pill-btn-primary px-5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {verifyingOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "VERIFY"}
                    </button>
                  </div>
                </form>

                <div className="pt-2 border-t border-[#1C1C1C]/15 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={handleResendEmail}
                    disabled={resendCooldown > 0}
                    className="text-xs font-extrabold uppercase tracking-wider text-gray-700 hover:text-black underline disabled:opacity-40"
                  >
                    {resendCooldown > 0
                      ? `Resend available in ${resendCooldown}s`
                      : "Didn't receive email? Resend confirmation"}
                  </button>

                  <div className="flex items-center justify-center gap-4 text-xs font-bold text-gray-600 pt-1">
                    <button
                      type="button"
                      onClick={() => setConfirmationSent(false)}
                      className="hover:text-black underline"
                    >
                      Edit details
                    </button>
                    <span>·</span>
                    <Link href="/login" className="hover:text-black underline">
                      Sign in
                    </Link>
                  </div>
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
              <h2 className="text-6xl md:text-7xl lg:text-8xl text-[#1C1C1C] mb-4 font-normal tracking-tight" style={{ fontFamily: "'Yellowtail', cursive", transform: 'rotate(3deg)' }}>
                GrowthLens
              </h2>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1C1C1C]/80 max-w-[240px]">
                Autonomous Skill Growth & Verified Evidence
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
