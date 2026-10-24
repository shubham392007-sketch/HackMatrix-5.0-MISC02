"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  Loader2,
  Calendar,
  Sparkles,
  Plus,
} from "lucide-react";
import { ShareRecord } from "@/types/sharing";
import AppTopBar from "@/components/app/AppTopBar";
import { sharingApi } from "@/lib/sharingApi";

export default function SharedAccessManagementPage() {
  const [links, setLinks] = useState<ShareRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [revokingRecord, setRevokingRecord] = useState<ShareRecord | null>(null);
  const [revocationReason, setRevocationReason] = useState<string>("Recruiting cycle concluded.");
  const [extendingRecord, setExtendingRecord] = useState<ShareRecord | null>(null);
  const [extendingDays, setExtendingDays] = useState<number>(14);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [inspectingRecord, setInspectingRecord] = useState<ShareRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const data = await sharingApi.listLinks();
      setLinks(data);
    } catch (err) {
      console.error("Failed to load share links:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleCopyLink = (shareId: string) => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/p/${shareId}`;
      navigator.clipboard.writeText(url);
      setCopiedId(shareId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!revokingRecord) return;
    setActionLoading(true);
    try {
      await sharingApi.revokeLink(revokingRecord.shareId, revocationReason);
      await fetchLinks();
      setRevokingRecord(null);
    } catch (err: any) {
      console.error("Failed to revoke link:", err);
      alert("Revocation failed: " + (err.message || "Unknown error"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmExtend = async () => {
    if (!extendingRecord) return;
    setActionLoading(true);
    try {
      await sharingApi.extendLink(extendingRecord.shareId, extendingDays);
      await fetchLinks();
      setExtendingRecord(null);
    } catch (err: any) {
      console.error("Failed to extend link:", err);
      alert("Extension failed: " + (err.message || "Unknown error"));
    } finally {
      setActionLoading(false);
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

  const totalAccesses = links.reduce((sum, l) => sum + (l.accessCount || 0), 0);
  const activeCount = links.filter((l) => l.status === "active").length;
  const expiredCount = links.filter((l) => l.status === "expired").length;
  const revokedCount = links.filter((l) => l.status === "revoked").length;

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Shared Access Links"
        description="Monitor issued recruiter links, track genuine access counts, and instantly revoke permissions."
        badge="Domain 6 · Access Management"
        badgeColor="border-peach/40 text-ink bg-peach/20"
      >
        <Link
          href="/app/passport/share"
          className="pill-btn pill-btn-primary text-[11px] py-1.5 px-3 flex items-center gap-1 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Link</span>
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-paper rounded-2xl border border-ink/10 space-y-1">
            <span className="text-[11px] text-ink/60 font-semibold">Active Links</span>
            <div className="text-2xl font-extrabold text-emerald-700">{activeCount}</div>
            <p className="text-[10px] text-emerald-800 font-medium">Currently accessible</p>
          </div>

          <div className="p-4 bg-paper rounded-2xl border border-ink/10 space-y-1">
            <span className="text-[11px] text-ink/60 font-semibold">Total Views</span>
            <div className="text-2xl font-extrabold text-ink">{totalAccesses}</div>
            <p className="text-[10px] text-ink/50">Genuine recruiter loads</p>
          </div>

          <div className="p-4 bg-paper rounded-2xl border border-ink/10 space-y-1">
            <span className="text-[11px] text-ink/60 font-semibold">Expired Links</span>
            <div className="text-2xl font-extrabold text-stone-600">{expiredCount}</div>
            <p className="text-[10px] text-stone-500">Validity period elapsed</p>
          </div>

          <div className="p-4 bg-paper rounded-2xl border border-ink/10 space-y-1">
            <span className="text-[11px] text-ink/60 font-semibold">Revoked Links</span>
            <div className="text-2xl font-extrabold text-rose-700">{revokedCount}</div>
            <p className="text-[10px] text-rose-800 font-medium">Manually terminated</p>
          </div>
        </div>

        {/* Share Links Table */}
        <div className="gl-card p-6 md:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-ink">
                Issued Share Links ({links.length})
              </h2>
              <p className="text-xs text-ink/60">
                Cryptographic tokens with instant server-side revocation.
              </p>
            </div>
            <button
              onClick={fetchLinks}
              className="text-xs font-semibold text-ink/70 hover:text-ink flex items-center gap-1 self-start sm:self-auto"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-ink/70" />
              <p className="text-xs text-ink/60">Loading access records from database...</p>
            </div>
          ) : links.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-paper rounded-2xl border border-ink/10">
              <p className="text-xs text-ink/60">No share links issued yet.</p>
              <Link
                href="/app/passport/share"
                className="pill-btn pill-btn-primary text-xs py-1.5 px-4 inline-flex items-center gap-1"
              >
                Issue First Recruiter Link &rarr;
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto border border-ink/10 rounded-2xl bg-paper">
              <table className="w-full text-left text-xs border-collapse min-w-[720px]">
                <thead>
                  <tr className="border-b border-ink/10 bg-card text-ink font-bold">
                    <th className="p-3.5">Label & Token</th>
                    <th className="p-3.5">Template</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Created</th>
                    <th className="p-3.5">Expires</th>
                    <th className="p-3.5">Views</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {links.map((link) => (
                    <tr key={link.shareId} className="hover:bg-peach/5 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-ink">{link.label}</div>
                        <div className="font-mono text-[10px] text-ink/50 mt-0.5">
                          {link.shareId}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-ink/5 text-ink">
                          {link.templateId || link.permissions?.templateId || "classic"}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(
                            link.status
                          )}`}
                        >
                          {link.status}
                        </span>
                      </td>

                      <td className="p-3.5 text-ink/70">
                        {link.createdAt ? new Date(link.createdAt).toLocaleDateString() : "—"}
                      </td>

                      <td className="p-3.5">
                        {link.expiresAt ? (
                          <span className="font-medium text-ink">
                            {new Date(link.expiresAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-ink/40">Never</span>
                        )}
                      </td>

                      <td className="p-3.5 font-bold text-ink">
                        {link.accessCount || 0}
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyLink(link.shareId)}
                            className="p-1.5 rounded-lg border border-ink/10 hover:bg-card text-ink transition-colors"
                            title="Copy Public Link"
                          >
                            {copiedId === link.shareId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {link.status === "active" && (
                            <Link
                              href={`/p/${link.shareId}`}
                              target="_blank"
                              className="p-1.5 rounded-lg border border-ink/10 hover:bg-card text-ink transition-colors"
                              title="Open Live Recruiter View"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() => setInspectingRecord(link)}
                            className="p-1.5 rounded-lg border border-ink/10 hover:bg-card text-ink transition-colors"
                            title="Inspect Permissions"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {link.status === "active" && (
                            <>
                              <button
                                type="button"
                                onClick={() => setExtendingRecord(link)}
                                className="px-2 py-1 rounded-lg border border-ink/10 hover:bg-card text-[11px] font-semibold text-ink"
                              >
                                Extend
                              </button>

                              <button
                                type="button"
                                onClick={() => setRevokingRecord(link)}
                                className="px-2 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-[11px] font-bold"
                              >
                                Revoke
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Revocation Security Guarantee Notice */}
        <div className="p-4 rounded-2xl bg-paper border border-ink/10 text-xs text-ink/70 flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-peach shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-ink">Cryptographic Zero-Knowledge Revocation: </strong>
            When a link is revoked, the server immediately marks it revoked in PostgreSQL. Any recruiter attempting to view the URL thereafter is served a clean revocation notice with capability data completely purged from the response payload.
          </div>
        </div>
      </div>

      {/* Revocation Modal */}
      {revokingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FBF6DF] rounded-2xl border-2 border-ink p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-ink/10 pb-3">
              <h3 className="text-sm font-extrabold text-ink flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-600" />
                Revoke Shared Access Instantly
              </h3>
              <button
                onClick={() => setRevokingRecord(null)}
                className="p-1 text-ink/50 hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-ink/80 leading-relaxed">
              Are you sure you want to revoke access to{" "}
              <strong className="text-ink font-bold">{revokingRecord.label}</strong> (token:{" "}
              <span className="font-mono">{revokingRecord.shareId}</span>)? Recruiters will no longer be able to view candidate skills or authorized evidence.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-ink block">
                Revocation Audit Reason:
              </label>
              <input
                type="text"
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                placeholder="e.g. Hiring cycle closed, offer accepted."
                className="w-full p-2.5 rounded-xl border border-ink/20 bg-paper text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink/10">
              <button
                type="button"
                onClick={() => setRevokingRecord(null)}
                className="pill-btn pill-btn-ghost text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                disabled={actionLoading}
                className="pill-btn text-xs py-1.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-full"
              >
                {actionLoading ? "Revoking..." : "Confirm Revoke"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Validity Modal */}
      {extendingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FBF6DF] rounded-2xl border-2 border-ink p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-ink/10 pb-3">
              <h3 className="text-sm font-extrabold text-ink flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Extend Access Validity
              </h3>
              <button
                onClick={() => setExtendingRecord(null)}
                className="p-1 text-ink/50 hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-ink/80 leading-relaxed">
              Extend access window for{" "}
              <strong className="text-ink font-bold">{extendingRecord.label}</strong>.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-ink block">
                Add Days:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[7, 14, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setExtendingDays(d)}
                    className={`p-2.5 rounded-xl border text-xs font-bold ${
                      extendingDays === d
                        ? "bg-ink text-paper border-ink"
                        : "bg-paper text-ink border-ink/10"
                    }`}
                  >
                    +{d} Days
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink/10">
              <button
                type="button"
                onClick={() => setExtendingRecord(null)}
                className="pill-btn pill-btn-ghost text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExtend}
                disabled={actionLoading}
                className="pill-btn pill-btn-primary text-xs py-1.5 px-4"
              >
                {actionLoading ? "Extending..." : "Confirm Extension"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Permissions Drawer / Modal */}
      {inspectingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FBF6DF] rounded-2xl border-2 border-ink p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-ink/10 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-ink">
                  Permissions: {inspectingRecord.label}
                </h3>
                <span className="font-mono text-[10px] text-ink/60">
                  {inspectingRecord.shareId}
                </span>
              </div>
              <button
                onClick={() => setInspectingRecord(null)}
                className="p-1 text-ink/50 hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-paper rounded-xl border border-ink/10 space-y-1">
                <span className="font-bold text-ink block">Presentation Template:</span>
                <span className="text-ink/80 uppercase font-semibold">
                  {inspectingRecord.templateId || inspectingRecord.permissions?.templateId || "classic"}
                </span>
              </div>

              <div className="p-3 bg-paper rounded-xl border border-ink/10 space-y-1">
                <span className="font-bold text-ink block">Identity Disclosed:</span>
                <p className="text-ink/70">
                  Name: {inspectingRecord.permissions?.identity.showDisplayName ? "Yes" : "Hidden"} · Headline: {inspectingRecord.permissions?.identity.showHeadline ? "Yes" : "Hidden"} · Contact: {inspectingRecord.permissions?.identity.showContactInfo ? "Disclosed" : "Protected"}
                </p>
              </div>

              <div className="p-3 bg-paper rounded-xl border border-ink/10 space-y-1">
                <span className="font-bold text-ink block">Disclosed Competencies:</span>
                <p className="text-ink/70">
                  {inspectingRecord.permissions?.selectedSkillIds?.length || 0} Verified Skills selected
                </p>
              </div>

              <div className="p-3 bg-paper rounded-xl border border-ink/10 space-y-1">
                <span className="font-bold text-ink block">Candidate-Declared Skills:</span>
                <p className="text-ink/70">
                  {inspectingRecord.permissions?.selectedCustomSkillIds?.length || 0} Custom Skills attached
                </p>
              </div>

              <div className="p-3 bg-paper rounded-xl border border-ink/10 space-y-1">
                <span className="font-bold text-ink block">Recruiter Messaging:</span>
                <p className="text-ink/70">
                  {inspectingRecord.permissions?.allowRecruiterMessaging ? "Enabled (recruiter contact form active)" : "Disabled"}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-ink/10">
              <button
                type="button"
                onClick={() => setInspectingRecord(null)}
                className="pill-btn pill-btn-primary text-xs py-1.5 px-4"
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
