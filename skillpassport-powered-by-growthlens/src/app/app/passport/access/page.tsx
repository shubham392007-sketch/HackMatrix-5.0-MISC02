"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  Lock,
  ExternalLink,
  ShieldAlert,
  RotateCcw,
  CheckCircle,
  Clock,
  AlertTriangle,
  History,
  Copy,
  Check,
  Eye,
  SlidersHorizontal,
  X,
  Share2,
} from "lucide-react";
import { ShareRecord } from "@/types/sharing";

export default function SharedAccessManagementPage() {
  const {
    shareRecords,
    shareActivities,
    revokeShareRecord,
  } = useEvidence();

  const [revokingRecord, setRevokingRecord] = useState<ShareRecord | null>(null);
  const [revocationReason, setRevocationReason] = useState<string>("Recruiting cycle concluded.");
  const [inspectingRecord, setInspectingRecord] = useState<ShareRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (shareId: string) => {
    const url = `${window.location.origin}/p/${shareId}`;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedId(shareId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleConfirmRevoke = () => {
    if (revokingRecord) {
      revokeShareRecord(revokingRecord.shareId, revocationReason);
      setRevokingRecord(null);
    }
  };

  const getStatusBadge = (status: ShareRecord["status"]) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "revoked":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "expired":
        return "bg-stone-200 text-stone-800 border-stone-300";
      default:
        return "bg-amber-100 text-amber-800 border-amber-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="gl-card p-6 md:p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-peach/30 text-ink text-xs font-semibold mb-2">
              <Lock className="w-3.5 h-3.5" />
              DOMAIN 6 · ACCESS LIFECYCLE MANAGEMENT
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight">
              Shared Access & Link Management
            </h1>
            <p className="text-xs md:text-sm text-ink/70 mt-1 max-w-2xl leading-relaxed">
              Monitor all issued demo links, review recruiter access counts, and instantly revoke permissions. Revoking a link terminates public access immediately.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/app/passport/share"
              className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
            >
              + Create New Share Link
            </Link>
          </div>
        </div>
      </div>

      {/* Share Links Table */}
      <div className="gl-card p-6 md:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-ink">
            Issued Share Links ({shareRecords.length})
          </h2>
          <span className="text-xs text-ink/60 font-medium">
            Active, Expired & Revoked States
          </span>
        </div>

        <div className="overflow-x-auto border border-ink/10 rounded-2xl bg-paper">
          <table className="w-full text-left text-xs border-collapse min-w-[680px]">
            <thead>
              <tr className="border-b border-ink/10 bg-card text-ink font-bold">
                <th className="p-3.5">Link Label & ID</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Created</th>
                <th className="p-3.5">Expires</th>
                <th className="p-3.5">Permission Scope</th>
                <th className="p-3.5 text-center">Accesses</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {shareRecords.map((r) => {
                const statusStyle = getStatusBadge(r.status);
                const isActive = r.status === "active";

                return (
                  <tr key={r.shareId} className="hover:bg-card-hover transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-ink">{r.label}</div>
                      <div className="font-mono text-[11px] text-ink/50 mt-0.5">
                        /p/{r.shareId}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${statusStyle}`}
                      >
                        {r.status}
                      </span>
                    </td>

                    <td className="p-3.5 text-ink/70 font-medium">
                      {r.createdAt}
                    </td>

                    <td className="p-3.5 text-ink/70 font-medium">
                      {r.expiresAt || "Never (Manual)"}
                    </td>

                    <td className="p-3.5 text-[11px] space-y-0.5">
                      <div className="text-ink/80 font-medium">
                        {r.permissions.selectedSkillIds.length} Verified Skills
                      </div>
                      <div className="text-ink/50">
                        Detail: {r.permissions.evidenceAccessLevel === "detail_inspection" ? "Allowed" : "Summary Only"}
                        {r.permissions.includeRoleAlignment && " · Role Match"}
                      </div>
                    </td>

                    <td className="p-3.5 text-center font-mono font-bold text-ink">
                      {r.accessCount}
                    </td>

                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleCopyLink(r.shareId)}
                        title="Copy Public Link"
                        className="px-2.5 py-1 rounded-lg border border-ink/10 bg-paper hover:bg-card text-ink font-semibold text-[11px]"
                      >
                        {copiedId === r.shareId ? "Copied!" : "Copy"}
                      </button>

                      <Link
                        href={`/p/${r.shareId}`}
                        target="_blank"
                        className="px-2.5 py-1 rounded-lg border border-ink/10 bg-paper hover:bg-card text-ink font-semibold text-[11px] inline-flex items-center gap-1"
                      >
                        View
                        <ExternalLink className="w-3 h-3" />
                      </Link>

                      <button
                        onClick={() => setInspectingRecord(r)}
                        className="px-2.5 py-1 rounded-lg border border-ink/10 bg-paper hover:bg-card text-ink font-semibold text-[11px]"
                      >
                        Config
                      </button>

                      {isActive ? (
                        <button
                          onClick={() => setRevokingRecord(r)}
                          className="px-2.5 py-1 rounded-lg border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 font-bold text-[11px]"
                        >
                          Revoke
                        </button>
                      ) : (
                        <span className="text-[11px] text-ink/40 italic">
                          {r.status === "revoked" ? "Revoked" : "Expired"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Log */}
      <div className="gl-card p-6 md:p-8 space-y-4">
        <h2 className="text-base font-extrabold text-ink flex items-center gap-2">
          <History className="w-4 h-4 text-peach" />
          Recent Sharing Activity Stream
        </h2>
        <p className="text-xs text-ink/70">
          Chronological record of local link creations, recruiter views, and revocations.
        </p>

        <div className="space-y-3 pt-2">
          {shareActivities.map((act) => (
            <div
              key={act.id}
              className="p-3.5 rounded-xl bg-paper border border-ink/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-ink">{act.shareLabel}</span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.2 rounded bg-ink/5 text-ink/70">
                    {act.action}
                  </span>
                </div>
                <p className="text-ink/70 text-[11px]">{act.details}</p>
              </div>

              <span className="text-[11px] text-ink/40 font-mono shrink-0">
                {act.timestamp}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Revocation Confirmation Modal */}
      {revokingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-fadeIn">
          <div className="gl-card w-full max-w-lg p-6 md:p-8 bg-paper border-2 border-rose-400 shadow-2xl space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-ink/10 pb-4">
              <div className="flex items-center gap-2 text-rose-900 font-extrabold text-base">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                Confirm Link Revocation
              </div>
              <button
                onClick={() => setRevokingRecord(null)}
                className="w-7 h-7 rounded-full bg-ink/5 hover:bg-ink/10 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-ink/80 leading-relaxed">
              <p>
                Are you sure you want to revoke access for <strong className="text-ink">{revokingRecord.label}</strong> (<code className="font-mono bg-ink/5 px-1 py-0.5 rounded">/p/{revokingRecord.shareId}</code>)?
              </p>
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 font-medium">
                ⚠️ Once revoked, any recruiter opening this URL will immediately see a <strong>Link Revoked</strong> notice and will be unable to inspect your verified skills or evidence.
              </div>

              <div className="pt-2">
                <label className="font-bold text-ink block mb-1">
                  Revocation Reason (Optional):
                </label>
                <input
                  type="text"
                  value={revocationReason}
                  onChange={(e) => setRevocationReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-ink/20 bg-paper text-ink font-medium focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-ink/10 flex items-center justify-end gap-3">
              <button
                onClick={() => setRevokingRecord(null)}
                className="pill-btn pill-btn-ghost text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRevoke}
                className="pill-btn pill-btn-primary text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Confirm Revocation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Inspect Modal */}
      {inspectingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-fadeIn">
          <div className="gl-card w-full max-w-lg p-6 md:p-8 bg-paper border border-ink/20 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-ink/10 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-ink">
                  {inspectingRecord.label}
                </h3>
                <span className="font-mono text-xs text-ink/50">
                  ID: {inspectingRecord.shareId}
                </span>
              </div>
              <button
                onClick={() => setInspectingRecord(null)}
                className="w-7 h-7 rounded-full bg-ink/5 hover:bg-ink/10 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-paper rounded-xl border border-ink/10 space-y-1">
                <span className="font-bold text-ink block">Included Skills ({inspectingRecord.permissions.selectedSkillIds.length}):</span>
                <span className="text-ink/70">{inspectingRecord.permissions.selectedSkillIds.join(", ")}</span>
              </div>

              <div className="p-3 bg-paper rounded-xl border border-ink/10 space-y-1">
                <span className="font-bold text-ink block">Evidence Detail Inspection:</span>
                <span className="text-ink/70">
                  {inspectingRecord.permissions.evidenceAccessLevel === "detail_inspection"
                    ? "Authorized for selected projects"
                    : "Summary Only"}
                </span>
              </div>

              <div className="p-3 bg-paper rounded-xl border border-ink/10 space-y-1">
                <span className="font-bold text-ink block">Role Alignment:</span>
                <span className="text-ink/70">
                  {inspectingRecord.permissions.includeRoleAlignment ? "Included" : "Disabled"}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-ink/10 flex justify-end">
              <button
                onClick={() => setInspectingRecord(null)}
                className="pill-btn pill-btn-primary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
