"use client";

import { useState } from "react";
import Link from "next/link";
import SPHeader from "@/components/layout/SPHeader";
import { ArrowRight, Loader2, AlertCircle, CheckCircle, Lock, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { updatePassword } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        setErrorMessage(error.message || "Failed to update password.");
        setLoading(false);
        return;
      }
      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        router.push("/app/evidence");
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col text-[#1C1C1C]">
      <SPHeader />

      <main className="flex-grow flex items-center justify-center py-12 px-6">
        <div className="w-full max-w-md mx-auto space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-extrabold text-[#1C1C1C] tracking-tight">
              Set New Password
            </h1>
            <p className="text-sm font-medium text-[#1C1C1C]/75">
              Enter your new password below to secure your account.
            </p>
          </div>

          {success ? (
            <div className="p-6 rounded-2xl bg-[#DFE968]/30 border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0px_#1C1C1C] space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-[#2E7D32]" />
                <h3 className="text-lg font-black text-[#1C1C1C]">Password Updated!</h3>
              </div>
              <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                Your password has been successfully updated. Redirecting you to your workspace...
              </p>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="p-4 rounded-2xl bg-[#FFA69E]/30 border-[1.5px] border-[#E0533C] flex items-start gap-3 shadow-[2px_2px_0_0_#1C1C1C]">
                  <AlertCircle className="w-5 h-5 text-[#E0533C] shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-[#1C1C1C] leading-relaxed">{errorMessage}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#1C1C1C]/40 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      className="w-full bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-full pl-11 pr-12 py-3 text-sm font-bold text-[#1C1C1C] placeholder:text-[#1C1C1C]/35 focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0px_#1C1C1C]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1C1C1C]/50 hover:text-[#1C1C1C]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#1C1C1C]/40 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      required
                      className="w-full bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-full pl-11 pr-5 py-3 text-sm font-bold text-[#1C1C1C] placeholder:text-[#1C1C1C]/35 focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0px_#1C1C1C]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#DFE968] hover:bg-[#d4df55] active:scale-[0.99] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs sm:text-sm font-extrabold tracking-[0.06em] uppercase px-5 py-3.5 rounded-full flex items-center justify-center gap-2 shadow-[3px_3px_0px_#1C1C1C] cursor-pointer transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>UPDATING PASSWORD ···</span>
                    </>
                  ) : (
                    <>
                      <span>UPDATE PASSWORD</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
