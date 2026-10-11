"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
import { AppSettings } from "@/types/account";
import { ConfirmationModal } from "@/components/app/AppStates";
import {
  Settings,
  User,
  FolderGit2,
  ShieldCheck,
  Bell,
  Eye,
  Sliders,
  RotateCcw,
  Save,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Info,
  Layers,
  Sparkles,
  Lock,
} from "lucide-react";

export default function SettingsOverviewPage() {
  const { appSettings, updateAppSettings, addToast } = useEvidence();

  const [settings, setSettings] = useState<AppSettings>(appSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const toggleNotificationPref = (
    key: keyof AppSettings["notificationPreferences"]
  ) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        notificationPreferences: {
          ...prev.notificationPreferences,
          [key]: !prev.notificationPreferences[key],
        },
      };
      setHasChanges(true);
      return next;
    });
  };

  const setDensity = (density: "comfortable" | "compact") => {
    setSettings((prev) => {
      setHasChanges(true);
      return { ...prev, displayDensity: density };
    });
  };

  const handleSave = () => {
    updateAppSettings(settings);
    setHasChanges(false);
  };

  const handleResetDemo = () => {
    try {
      localStorage.clear();
      addToast(
        "Demo Reset Complete",
        "Prototype state has been reset to initial seed values.",
        "info"
      );
    } catch {
      // Ignore
    }
    setIsResetModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <AppTopBar
        title="Settings & Application Preferences"
        description="Centralized account hub, notification routing rules, display density, and privacy controls."
        breadcrumbs={[
          { label: "Settings & Access" },
          { label: "Overview" },
        ]}
      />

      <div className="p-6 lg:p-10 max-w-5xl space-y-8">
        {/* Navigation Quick Cards */}
        <div>
          <h2 className="text-base font-bold text-ink mb-3 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-ink/70" />
            <span>Account & Access Workspaces</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Link
              href="/app/settings/profile"
              className="p-5 rounded-2xl bg-white border border-ink/15 hover:border-ink/30 shadow-sm transition-all group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#DFE968] border border-ink/15 flex items-center justify-center font-bold text-ink">
                  <User className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-ink group-hover:underline">
                  Profile Identity
                </h3>
                <p className="text-xs text-ink/70 leading-relaxed">
                  Manage your display name, headline, professional summary, and contact information.
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-ink/10 flex items-center justify-between text-xs font-semibold text-ink/60 group-hover:text-ink">
                <span>Edit Profile</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            <Link
              href="/app/settings/connections"
              className="p-5 rounded-2xl bg-white border border-ink/15 hover:border-ink/30 shadow-sm transition-all group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 text-blue-900 flex items-center justify-center font-bold">
                  <FolderGit2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-ink group-hover:underline">
                  Connected Accounts
                </h3>
                <p className="text-xs text-ink/70 leading-relaxed">
                  Review GitHub organizations, Jira projects, granted scopes, and synchronization status.
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-ink/10 flex items-center justify-between text-xs font-semibold text-ink/60 group-hover:text-ink">
                <span>Manage Sources</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            <Link
              href="/app/settings/privacy"
              className="p-5 rounded-2xl bg-white border border-ink/15 hover:border-ink/30 shadow-sm transition-all group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-900 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-ink group-hover:underline">
                  Privacy & Consent
                </h3>
                <p className="text-xs text-ink/70 leading-relaxed">
                  Data-use governance, visibility tiers, default sharing permissions, and retention limits.
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-ink/10 flex items-center justify-between text-xs font-semibold text-ink/60 group-hover:text-ink">
                <span>Privacy Settings</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            <Link
              href="/app/notifications"
              className="p-5 rounded-2xl bg-white border border-ink/15 hover:border-ink/30 shadow-sm transition-all group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 text-purple-900 flex items-center justify-center font-bold">
                  <Bell className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-ink group-hover:underline">
                  Notification Center
                </h3>
                <p className="text-xs text-ink/70 leading-relaxed">
                  Inspect unread ingestion alerts, verification review requests, and sharing view hits.
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-ink/10 flex items-center justify-between text-xs font-semibold text-ink/60 group-hover:text-ink">
                <span>View Notifications</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            <Link
              href="/app/activity"
              className="p-5 rounded-2xl bg-white border border-ink/15 hover:border-ink/30 shadow-sm transition-all group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-900 flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-ink group-hover:underline">
                  Activity History
                </h3>
                <p className="text-xs text-ink/70 leading-relaxed">
                  Unified chronological timeline of profile updates, ingestion runs, and learning milestones.
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-ink/10 flex items-center justify-between text-xs font-semibold text-ink/60 group-hover:text-ink">
                <span>Timeline Feed</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            <Link
              href="/app/help"
              className="p-5 rounded-2xl bg-white border border-ink/15 hover:border-ink/30 shadow-sm transition-all group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-ink group-hover:underline">
                  Help & Explanations
                </h3>
                <p className="text-xs text-ink/70 leading-relaxed">
                  Glossary and conceptual rules: evidence vs skills, confidence vs verification, and scoring.
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-ink/10 flex items-center justify-between text-xs font-semibold text-ink/60 group-hover:text-ink">
                <span>Browse Guidance</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          </div>
        </div>

        {/* Section B: Display & Appearance Preferences */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white border border-ink/15 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <Eye className="w-4 h-4 text-ink/70" />
              <span>Display & Interface Density</span>
            </h2>
            {hasChanges && (
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-1.5 rounded-xl bg-ink text-[#FBF1CF] hover:bg-ink/90 text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Preferences</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div
              onClick={() => setDensity("comfortable")}
              className={`p-4 rounded-xl border cursor-pointer transition-all space-y-1.5 ${
                settings.displayDensity === "comfortable"
                  ? "bg-[#DFE968]/20 border-ink shadow-sm"
                  : "bg-white border-ink/15 hover:border-ink/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">Comfortable Density (Default)</span>
                {settings.displayDensity === "comfortable" && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                )}
              </div>
              <p className="text-[11px] text-ink/70 leading-relaxed">
                Generous spacing, relaxed cards, and ample whitespace suited for deep technical reviews.
              </p>
            </div>

            <div
              onClick={() => setDensity("compact")}
              className={`p-4 rounded-xl border cursor-pointer transition-all space-y-1.5 ${
                settings.displayDensity === "compact"
                  ? "bg-[#DFE968]/20 border-ink shadow-sm"
                  : "bg-white border-ink/15 hover:border-ink/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">Compact Density</span>
                {settings.displayDensity === "compact" && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                )}
              </div>
              <p className="text-[11px] text-ink/70 leading-relaxed">
                Tighter tables and condensed cards optimized for high-density multi-tasking workflows.
              </p>
            </div>
          </div>
        </div>

        {/* Section C: Notification Routing Rules */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white border border-ink/15 shadow-sm space-y-5">
          <div>
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <Bell className="w-4 h-4 text-ink/70" />
              <span>In-App Notification Routing Rules</span>
            </h2>
            <p className="text-xs text-ink/60 mt-0.5">
              Select which categories generate in-app alerts and top-bar badge counts.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            {(
              [
                {
                  key: "evidenceImports",
                  label: "Evidence Ingestion & Synchronization",
                  desc: "Alerts when new commits, PRs, or Jira stories are normalized into candidate skills.",
                },
                {
                  key: "verificationUpdates",
                  label: "Verification Status & Human Review",
                  desc: "Notifications when a skill claim receives corroboration or is flagged for human review.",
                },
                {
                  key: "learningMilestones",
                  label: "Learning Diagnostics & Mini-Project Scoring",
                  desc: "Updates on completed diagnostic assessments and automated sandbox project evaluations.",
                },
                {
                  key: "passportSharingViews",
                  label: "Recruiter Passport Access & View Events",
                  desc: "Real-time alerts when external recruiters load active shared passport links.",
                },
                {
                  key: "governanceAlerts",
                  label: "AI Governance & Prompt Injection Guard Alerts",
                  desc: "Security notifications for prompt-injection sanitization or hallucination threshold flags.",
                },
              ] as const
            ).map((item) => (
              <div
                key={item.key}
                className="p-3.5 rounded-xl bg-ink/5 border border-ink/10 flex items-center justify-between gap-4"
              >
                <div>
                  <span className="font-bold text-ink block">{item.label}</span>
                  <p className="text-[11px] text-ink/60">{item.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleNotificationPref(item.key)}
                  className={`w-11 h-6 rounded-full border border-ink/20 p-0.5 transition-colors shrink-0 ${
                    settings.notificationPreferences[item.key]
                      ? "bg-ink"
                      : "bg-ink/20"
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                      settings.notificationPreferences[item.key]
                        ? "translate-x-5"
                        : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section D: Prototype Metadata & Reset */}
        <div className="p-6 rounded-2xl bg-white border border-ink/15 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ink/10">
            <div>
              <h3 className="text-base font-bold text-ink">
                Prototype Architecture & Release Metadata
              </h3>
              <p className="text-xs text-ink/60">
                Specification: IM-03 Verifiable Skill Passport & GrowthLens TRD
              </p>
            </div>
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-[#DFE968] border border-ink text-ink shadow-[1px_1px_0_0_#1C1C1C]">
              {settings.prototypeVersion}
            </span>
          </div>

          <p className="text-xs text-ink/70 leading-relaxed">
            This application operates as a standalone frontend prototype. All data state is persisted locally in the browser context. Disconnecting sources, updating profiles, and generating recruiter links will update live mock models without contacting external production backends.
          </p>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="px-4 py-2 rounded-xl border border-rose-300 bg-white hover:bg-rose-50 text-rose-800 text-xs font-semibold shadow-sm transition-all"
            >
              Reset Demo Session to Seed Baseline
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Resetting Demo */}
      <ConfirmationModal
        isOpen={isResetModalOpen}
        title="Reset Demo Session?"
        message="This will clear your local prototype state and restore all mock records across Domains 1 through 6 to their default demonstration states."
        confirmLabel="Reset Demo Session"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleResetDemo}
        onCancel={() => setIsResetModalOpen(false)}
      />
    </div>
  );
}
