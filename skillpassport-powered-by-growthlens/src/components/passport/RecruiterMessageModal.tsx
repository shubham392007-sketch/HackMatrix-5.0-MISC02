"use client";

import React, { useState } from "react";
import {
  X,
  Mail,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Briefcase,
  User,
  ShieldCheck,
} from "lucide-react";
import { sharingApi } from "@/lib/sharingApi";

interface RecruiterMessageModalProps {
  token: string;
  candidateName: string;
  onClose: () => void;
}

export default function RecruiterMessageModal({
  token,
  candidateName,
  onClose,
}: RecruiterMessageModalProps) {
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [company, setCompany] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ messageId: string; deliveredAt: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!senderName.trim() || !senderEmail.trim() || !messageBody.trim()) {
      setError("Please complete all required fields (Name, Work Email, and Message).");
      return;
    }

    setLoading(true);
    try {
      const res = await sharingApi.sendPublicMessage(token, {
        sender_name: senderName.trim(),
        sender_email: senderEmail.trim(),
        company: company.trim() || undefined,
        role_title: roleTitle.trim() || undefined,
        subject: subject.trim() || "Skill Passport Inquiry",
        message_body: messageBody.trim(),
      });
      setSuccessResult({
        messageId: res.messageId,
        deliveredAt: res.deliveredAt,
      });
    } catch (err: any) {
      setError(err.message || "Failed to deliver message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg bg-[#FAF8F5] border-[2px] border-[#1A1918] rounded-2xl shadow-[6px_6px_0_0_#1A1918] p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-1.5 rounded-full bg-[#1A1918]/10 hover:bg-[#1A1918]/20 text-[#1A1918] transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {successResult ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 border-[2px] border-emerald-500 text-emerald-800 flex items-center justify-center mx-auto shadow-[2px_2px_0_0_#1A1918]">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-[#1A1918]">Message Delivered!</h3>
              <p className="text-xs text-[#1A1918]/75 max-w-sm mx-auto leading-relaxed">
                Your message has been securely delivered to <strong className="text-[#1A1918]">{candidateName}</strong>'s private SkillPassport dashboard.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#1A1918]/15 text-left text-[11px] text-[#1A1918]/70 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Message ID:</span>
                <span className="font-bold text-[#1A1918]">{successResult.messageId.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span>Timestamp:</span>
                <span>{new Date(successResult.deliveredAt).toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Channel:</span>
                <span className="text-emerald-700 font-bold">In-App Notification & Inbox</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-full bg-[#1A1918] text-[#FBF6DF] hover:bg-[#1A1918]/90 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#1A1918]"
            >
              Close Window
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1 pr-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#000000] border border-[#1A1918] text-[#FAF8F5] text-[10px] font-black uppercase tracking-wider mb-1">
                <Mail className="w-3 h-3 text-[#1A1918]" />
                Direct Candidate Outreach
              </div>
              <h3 className="text-2xl font-black text-[#1A1918] tracking-tight">
                Contact {candidateName}
              </h3>
              <p className="text-xs text-[#1A1918]/70 leading-relaxed">
                Send a verified opportunity message. Your inquiry will appear directly in the candidate's notification feed.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#1A1918] mb-1">
                  Your Full Name *
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-[#1A1918]/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full bg-[#FFFFFF] border-[1.5px] border-[#1A1918] rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-[#1A1918] focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0_0_#1A1918]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#1A1918] mb-1">
                  Work Email *
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-[#1A1918]/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="jane@company.com"
                    className="w-full bg-[#FFFFFF] border-[1.5px] border-[#1A1918] rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-[#1A1918] focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0_0_#1A1918]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#1A1918] mb-1">
                  Company / Organization
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-[#1A1918]/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Stripe, Google, etc."
                    className="w-full bg-[#FFFFFF] border-[1.5px] border-[#1A1918] rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-[#1A1918] focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0_0_#1A1918]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#1A1918] mb-1">
                  Role / Opportunity
                </label>
                <div className="relative">
                  <Briefcase className="w-3.5 h-3.5 text-[#1A1918]/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="Staff Platform Engineer"
                    className="w-full bg-[#FFFFFF] border-[1.5px] border-[#1A1918] rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-[#1A1918] focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0_0_#1A1918]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#1A1918] mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Senior Backend Opportunity · Remote"
                className="w-full bg-[#FFFFFF] border-[1.5px] border-[#1A1918] rounded-xl px-3 py-2 text-xs font-bold text-[#1A1918] focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0_0_#1A1918]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#1A1918] mb-1">
                Message Body *
              </label>
              <textarea
                required
                rows={4}
                maxLength={3000}
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Hi Alex, we reviewed your verified Skill Passport and would love to connect..."
                className="w-full bg-[#FFFFFF] border-[1.5px] border-[#1A1918] rounded-xl p-3 text-xs font-bold text-[#1A1918] focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0_0_#1A1918] resize-none"
              />
              <span className="text-[10px] text-[#1A1918]/50 text-right block mt-0.5">
                {messageBody.length} / 3000 chars
              </span>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <span className="text-[11px] text-[#1A1918]/60 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                Anti-Spam & Rate-Limited
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-full border border-[#1A1918] text-xs font-bold text-[#1A1918] hover:bg-[#1A1918]/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-full bg-[#000000] hover:bg-[#1A1918] border-[1.5px] border-[#1A1918] text-xs font-black tracking-wider uppercase text-[#FAF8F5] shadow-[2px_2px_0_0_#1A1918] flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Message</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
