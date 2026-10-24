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

  if (loading) {
    return (
      <div className="flex-1 p-16 text-center text-xs text-stone-500">
        <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-stone-400" />
        Loading organization details...
      </div>
    );
  }

  const org = profile?.organization;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-6">
      {/* Header */}
      <div className="pb-6 border-b border-[#1A1918]/15 space-y-1">
        <h1 className="text-2xl font-black text-[#1A1918] tracking-tight">
          Organization Profile & Team
        </h1>
        <p className="text-xs text-stone-600">
          Employer credentials, organization isolation settings, and public recruiter contact defaults
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Organization Profile (7 cols) */}
        <div className="md:col-span-7 space-y-6">
          <div className="p-6 rounded-3xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1A1918] text-[#FAF8F5] flex items-center justify-center font-black text-lg">
                  {org?.name?.slice(0, 2).toUpperCase() || "OR"}
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#1A1918]">{org?.name}</h2>
                  <span className="text-xs font-mono text-stone-500">slug: {org?.slug}</span>
                </div>
              </div>

              {org?.is_verified && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Organization
                </span>
              )}
            </div>

            <div className="pt-3 border-t border-stone-200 space-y-3 text-xs">
              {org?.website && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> Website
                  </span>
                  <a
                    href={org.website.startsWith("http") ? org.website : `https://${org.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#1A1918] hover:underline flex items-center gap-1"
                  >
                    <span>{org.website}</span>
                    <ExternalLink className="w-3 h-3 text-stone-400" />
                  </a>
                </div>
              )}

              {org?.location && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> HQ Location
                  </span>
                  <span className="font-bold text-[#1A1918]">{org.location}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-stone-500 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Organization UUID
                </span>
                <span className="font-mono text-[11px] text-stone-600">{org?.id}</span>
              </div>
            </div>
          </div>

          {/* Security & Isolation Card */}
          <div className="p-6 rounded-3xl bg-sand/20 border border-stone-300 space-y-2 text-xs">
            <h3 className="font-bold text-[#1A1918] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Multi-Tenant Data Isolation Guarantee</span>
            </h3>
            <p className="text-stone-600 leading-relaxed">
              Candidate submissions, job openings, and internal evaluation notes are strictly isolated to your organization via PostgreSQL Row-Level Security (RLS). Other employers cannot access or view your candidate shares or private notes.
            </p>
          </div>
        </div>

        {/* Right Column: Recruiter Profile & Contact Defaults (5 cols) */}
        <div className="md:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] space-y-4">
            <h3 className="text-sm font-black text-[#1A1918] uppercase tracking-wider">
              Your Recruiter Profile
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-stone-200 space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase block">Name & Role</span>
                <p className="font-black text-[#1A1918]">{profile?.full_name}</p>
                <p className="text-stone-600">{profile?.job_title || "Recruiter"} &bull; <strong className="capitalize">{profile?.role?.replace("_", " ")}</strong></p>
              </div>

              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-stone-200 space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase block">Account Work Email</span>
                <p className="font-mono text-stone-900">{profile?.email}</p>
              </div>

              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-stone-200 space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase block">Public Contact on Job Postings</span>
                <p className="font-bold text-[#1A1918]">{profile?.public_contact_name || profile?.full_name}</p>
                <p className="text-stone-600 font-mono text-[11px]">{profile?.public_contact_email || profile?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
