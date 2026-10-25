"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building,
  ShieldCheck,
  Globe,
  MapPin,
  Mail,
  User,
  Users,
  CheckCircle2,
  Lock,
  RotateCw,
  ExternalLink,
} from "lucide-react";
import {
  getCurrentRecruiterProfile,
  RecruiterProfile,
} from "@/lib/recruiterApi";

export default function RecruiterOrganizationPage() {
  const [profile, setProfile] = useState<RecruiterProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentRecruiterProfile()
      .then((p) => setProfile(p))
      .catch((err) => console.error("Could not load organization profile:", err))
      .finally(() => setLoading(false));
  }, []);

  const org = profile?.organization;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 pb-16">
      {/* ── CLEAN PAGE HEADER ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#1C1C1C]/15">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-black text-[#1C1C1C] tracking-tight">
              Organization Profile & Team
            </h1>
            {org?.is_verified && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#DFE968] text-[#1C1C1C] border border-[#1C1C1C] shadow-[1px_1px_0_0_#1C1C1C]">
                Verified Organization
              </span>
            )}
          </div>
          <p className="text-xs text-stone-600 mt-1">
            Employer credentials, organization isolation settings, and public recruiter contact defaults.
          </p>
        </div>
      </div>
        {loading ? (
          <div className="p-16 text-center text-xs text-stone-500 bg-[#FAF8F5] rounded-2xl border-[1.5px] border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C]">
            <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-stone-400" />
            Loading organization details...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left Column: Organization Profile (7 cols) */}
            <div className="md:col-span-7 space-y-6">
              <div className="p-6 rounded-2xl bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#1C1C1C] text-[#FAF8F5] flex items-center justify-center font-black text-lg shadow-[1.5px_1.5px_0_0_#1C1C1C]">
                      {org?.name?.slice(0, 2).toUpperCase() || "OR"}
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-[#1C1C1C]">{org?.name}</h2>
                      <span className="text-xs font-mono text-stone-500">slug: {org?.slug}</span>
                    </div>
                  </div>

                  {org?.is_verified && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border-[1.5px] border-emerald-400 text-xs font-bold shadow-[1px_1px_0_0_#059669]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      Verified
                    </span>
                  )}
                </div>

                <div className="pt-3 border-t border-stone-200 space-y-3 text-xs">
                  {org?.website && (
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-stone-400" /> Website
                      </span>
                      <a
                        href={org.website.startsWith("http") ? org.website : `https://${org.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-[#1C1C1C] hover:underline flex items-center gap-1"
                      >
                        <span>{org.website}</span>
                        <ExternalLink className="w-3 h-3 text-stone-400" />
                      </a>
                    </div>
                  )}

                  {org?.location && (
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-stone-400" /> HQ Location
                      </span>
                      <span className="font-bold text-[#1C1C1C]">{org.location}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-stone-500 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-stone-400" /> Organization UUID
                    </span>
                    <span className="font-mono text-[11px] text-stone-600">{org?.id}</span>
                  </div>
                </div>
              </div>

              {/* Security & Isolation Card */}
              <div className="p-6 rounded-2xl bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] space-y-2 text-xs">
                <h3 className="font-black text-[#1C1C1C] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Multi-Tenant Data Isolation Guarantee</span>
                </h3>
                <p className="text-stone-700 leading-relaxed font-sans">
                  Candidate submissions, job openings, and internal evaluation notes are strictly isolated to your organization via PostgreSQL Row-Level Security (RLS). Other employers cannot access or view your candidate shares or private notes.
                </p>
              </div>
            </div>

            {/* Right Column: Recruiter Profile & Contact Defaults (5 cols) */}
            <div className="md:col-span-5 space-y-6">
              <div className="p-6 rounded-2xl bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] space-y-4">
                <h3 className="text-sm font-black text-[#1C1C1C] uppercase tracking-wider">
                  Your Recruiter Profile
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-white border border-[#1C1C1C]/15 space-y-1">
                    <span className="text-[10px] font-bold text-stone-400 uppercase block">Name & Role</span>
                    <p className="font-black text-[#1C1C1C]">{profile?.full_name}</p>
                    <p className="text-stone-600">{profile?.job_title || "Recruiter"} &bull; <strong className="capitalize">{profile?.role?.replace("_", " ")}</strong></p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-[#1C1C1C]/15 space-y-1">
                    <span className="text-[10px] font-bold text-stone-400 uppercase block">Account Work Email</span>
                    <p className="font-mono text-stone-900">{profile?.email}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-[#1C1C1C]/15 space-y-1">
                    <span className="text-[10px] font-bold text-stone-400 uppercase block">Public Contact on Job Postings</span>
                    <p className="font-bold text-[#1C1C1C]">{profile?.public_contact_name || profile?.full_name}</p>
                    <p className="text-stone-600 font-mono text-[11px]">{profile?.public_contact_email || profile?.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
