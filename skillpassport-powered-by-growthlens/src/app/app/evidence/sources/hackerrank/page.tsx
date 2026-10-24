"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
import { SourceStatusBadge } from "@/components/app/StatusBadges";
import {
  connectHackerRank,
  getHackerRankProfile,
  listConnectionEvidence,
  disconnectSource,
} from "@/lib/evidenceApi";
import {
  Terminal,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  FileCode,
  Award,
  AlertCircle,
  CheckCircle2,
  LogOut,
  RefreshCw,
  FileText,
  Clock,
  ArrowRight,
  Info,
} from "lucide-react";
import LoadingAnimation from "@/components/ui/LoadingAnimation";

export default function HackerRankSourceFlow() {
  const { sources, refreshEvidenceData, addNotification } = useEvidence();
  const currentSource = sources.find((s) => s.type === "hackerrank" || s.provider === "hackerrank");

  const [profileUrl, setProfileUrl] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [connectionDetails, setConnectionDetails] = useState<any | null>(null);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Client-side quick validation for URL
  const validateUrlFormat = (url: string): string | null => {
    const trimmed = url.trim();
    if (!trimmed) return "Please enter your HackerRank profile URL.";
    if (!trimmed.startsWith("https://")) {
      return "URL must use secure HTTPS protocol (e.g. https://www.hackerrank.com/profile/username).";
    }
    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();
      if (host !== "hackerrank.com" && host !== "www.hackerrank.com") {
        return "Hostname must be hackerrank.com or www.hackerrank.com.";
      }
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length === 0) {
        return "Path must include a HackerRank username.";
      }
      const reserved = ["dashboard", "challenges", "contests", "skills-verification", "leaderboard", "administration", "login", "signup", "work", "community"];
      const username = parts[0] === "profile" ? parts[1] : parts[0];
      if (!username || reserved.includes(username.toLowerCase())) {
        return "Invalid profile URL: username cannot be a reserved HackerRank page.";
      }
    } catch {
      return "Invalid URL format.";
    }
    return null;
  };

  const loadProfileAndEvidence = async () => {
    setLoadingEvidence(true);
    try {
      const profile = await getHackerRankProfile();
      if (profile && profile.connected) {
        setConnectionDetails(profile);
        if (profile.profile_url && !profileUrl) {
          setProfileUrl(profile.profile_url);
        }
        if (profile.connection_id) {
          try {
            const ev = await listConnectionEvidence(profile.connection_id);
            setEvidenceList(ev.items || []);
          } catch (e) {
            console.warn("Could not load connection evidence:", e);
          }
        }
      } else {
        setConnectionDetails(null);
        setEvidenceList([]);
      }
    } catch (err: any) {
      if (err?.status !== 404) {
        console.warn("Error fetching HackerRank profile:", err);
      }
    } finally {
      setLoadingEvidence(false);
    }
  };

  useEffect(() => {
    loadProfileAndEvidence();
  }, [currentSource?.id]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateUrlFormat(profileUrl);
    if (validationError) {
      setConnectError(validationError);
      return;
    }

    setConnecting(true);
    setConnectError(null);
    setStatusMessage(null);

    try {
      const res = await connectHackerRank(profileUrl.trim());
      setStatusMessage("HackerRank profile linked successfully! Ownership marked unverified as per policy.");
      addNotification({
        title: "HackerRank profile linked",
        description: `Profile for @${res.username} has been linked for reference. Attach supporting credentials to verify competencies.`,
        category: "evidence",
        severity: "success",
        relatedDomain: "Evidence Workspace",
        actionRoute: "/app/evidence/sources/hackerrank",
        actionLabel: "View Details",
        dedupKey: `hackerrank_link_${Date.now()}`,
      });
      await loadProfileAndEvidence();
      await refreshEvidenceData(true);
    } catch (err: any) {
      const errMsg = err.message || "Failed to link HackerRank profile.";
      setConnectError(errMsg);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const connId = connectionDetails?.connection_id || currentSource?.id;
    if (!connId) return;
    if (!confirm("Are you sure you want to disconnect your HackerRank profile? Any previously uploaded artifacts will remain in your Evidence Vault.")) {
      return;
    }

    setDisconnecting(true);
    try {
      await disconnectSource(connId);
      setStatusMessage("HackerRank profile has been unlinked.");
      setConnectionDetails(null);
      setEvidenceList([]);
      setProfileUrl("");
      await refreshEvidenceData(true);
    } catch (err: any) {
      setConnectError(err.message || "Failed to disconnect profile.");
    } finally {
      setDisconnecting(false);
    }
  };

  const isConnected = Boolean(connectionDetails?.connected || currentSource?.status === "profile_linked" || currentSource?.status === "connected");
  const username = connectionDetails?.username || currentSource?.accountIdentity || "Not linked";
  const normalizedUrl = connectionDetails?.profile_url || currentSource?.profileUrl || profileUrl;

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="HackerRank Integration"
        description="Link public profile reference and attach certified skill artifacts."
        backHref="/app/evidence/sources"
        backLabel="Connected Sources"
      >
        <Link
          href="/app/evidence/upload?provider=hackerrank"
          className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
        >
          <UploadCloud className="w-4 h-4" /> ATTACH HACKERRANK ARTIFACT
        </Link>
      </AppTopBar>

      <main className="p-6 lg:p-10 space-y-8 max-w-[1200px]">
        {/* Status Messages */}
        {statusMessage && (
          <div className="p-4 rounded-xl border border-[#4A7A4E]/30 bg-[#4A7A4E]/10 text-xs font-semibold text-[#2D5A31] flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
        {connectError && (
          <div className="p-4 rounded-xl border border-[#B34B44]/30 bg-[#B34B44]/10 text-xs font-semibold text-[#8C332D] flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{connectError}</span>
          </div>
        )}

        {/* Integration Header Card */}
        <div className="gl-card p-6 md:p-8 bg-[#FBF6DF] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#98D8AA] border border-[#1C1C1C] flex items-center justify-center shadow-[2px_2px_0_0_#1C1C1C] flex-shrink-0">
              <Terminal className="w-8 h-8 text-[#1C1C1C]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-2xl font-black text-[#1C1C1C]">HackerRank Profile</h2>
                <SourceStatusBadge status={isConnected ? "profile_linked" : "not_connected"} />
              </div>
              <p className="text-xs font-medium text-[#1C1C1C]/75 max-w-2xl leading-relaxed">
                Connect your HackerRank profile handle to reference skill certifications, domain badges, contest participation, and problem solving achievements.
              </p>
            </div>
          </div>

          {isConnected && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="pill-btn pill-btn-secondary text-xs py-2 px-4 flex items-center gap-1.5 border-[#B34B44]/30 text-[#8C332D] hover:bg-[#B34B44]/10"
              >
                <LogOut className="w-3.5 h-3.5" />
                {disconnecting ? "Disconnecting..." : "Disconnect Profile"}
              </button>
            </div>
          )}
        </div>

        {/* Honest Policy Notice Card */}
        <div className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FBF1CF] space-y-3">
          <div className="flex items-center gap-2 text-sm font-black text-[#1C1C1C]">
            <Info className="w-5 h-5 text-[#8A6A00]" />
            <span>API Availability &amp; Integration Transparency Notice</span>
          </div>
          <div className="text-xs text-[#1C1C1C]/80 leading-relaxed space-y-2">
            <p>
              • <strong>No Public Individual Sync API:</strong> HackerRank does not provide a public developer API for automated individual candidate profile synchronization (their API is reserved for enterprise HackerRank for Work assessments).
            </p>
            <p>
              • <strong>Honest Ownership Semantics:</strong> Linking your profile saves your public handle as an authoritative reference (status: <code>Profile linked — ownership not verified</code>).
            </p>
            <p>
              • <strong>Verified Competencies via Artifacts:</strong> You can upload HackerRank Skill Certificates, contest scorecard summaries, or assessment completion records using the <strong>Attach Artifact</strong> button below. Each uploaded document is parsed, indexed, and attributed with full provenance to your profile.
            </p>
          </div>
        </div>

        {/* Profile Connection / Update Form */}
        <div className="gl-card p-6 md:p-8 bg-[#FBF6DF] space-y-6">
          <div className="border-b border-[#1C1C1C]/15 pb-3">
            <h3 className="text-lg font-black text-[#1C1C1C]">
              {isConnected ? "Update Linked Profile" : "Link Your HackerRank Profile"}
            </h3>
            <p className="text-xs font-medium text-[#1C1C1C]/75">
              Enter your public HackerRank URL (e.g. <code>https://www.hackerrank.com/profile/your_username</code> or <code>https://hackerrank.com/your_username</code>).
            </p>
          </div>

          <form onSubmit={handleConnect} className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5 uppercase tracking-wide">
                Public Profile URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://www.hackerrank.com/profile/your_handle"
                  value={profileUrl}
                  onChange={(e) => setProfileUrl(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#1C1C1C] bg-white text-xs font-mono text-[#1C1C1C] placeholder:text-[#1C1C1C]/40 focus:outline-none focus:ring-2 focus:ring-[#DFE968]"
                  required
                />
                <button
                  type="submit"
                  disabled={connecting}
                  className="pill-btn pill-btn-primary text-xs py-2.5 px-6 font-bold flex-shrink-0"
                >
                  {connecting ? "Validating & Saving..." : isConnected ? "UPDATE LINK" : "LINK PROFILE"}
                </button>
              </div>
            </div>
          </form>

          {isConnected && (
            <div className="p-4 rounded-xl bg-white border border-[#1C1C1C]/20 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="block text-[11px] font-bold text-[#1C1C1C]/60 uppercase">HackerRank Username</span>
                <span className="font-mono font-black text-[#1C1C1C] text-sm">@{username}</span>
              </div>
              <div className="md:col-span-2">
                <span className="block text-[11px] font-bold text-[#1C1C1C]/60 uppercase">Canonical Profile Link</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <a
                    href={normalizedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[#4A7A4E] hover:underline break-all inline-flex items-center gap-1 font-semibold"
                  >
                    {normalizedUrl}
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Supporting Evidence Artifacts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#1C1C1C]/15 pb-2">
            <div>
              <h3 className="text-lg font-black text-[#1C1C1C]">Supporting Evidence &amp; Artifacts</h3>
              <p className="text-xs font-medium text-[#1C1C1C]/75">
                Authentic documents attached to this HackerRank connection, stored in your Evidence Vault with provenance tracing.
              </p>
            </div>
            <Link
              href="/app/evidence/upload?provider=hackerrank"
              className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5" /> UPLOAD ARTIFACT
            </Link>
          </div>

          {loadingEvidence ? (
            <div className="p-8 text-center bg-[#FBF6DF] rounded-2xl border border-[#1C1C1C]/15">
              <LoadingAnimation size="md" />
              <p className="text-xs font-semibold text-[#1C1C1C]/70 mt-2">Loading attached artifacts...</p>
            </div>
          ) : evidenceList.length === 0 ? (
            <div className="p-8 text-center bg-[#FBF6DF] rounded-2xl border border-dashed border-[#1C1C1C]/30 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-white border border-[#1C1C1C] flex items-center justify-center mx-auto text-[#1C1C1C]/60">
                <Award className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-[#1C1C1C]">No Artifacts Attached Yet</h4>
                <p className="text-xs text-[#1C1C1C]/70 max-w-md mx-auto">
                  Upload your HackerRank Problem Solving Certificate, Python/SQL badge certs, or contest rankings to establish verified skill credentials.
                </p>
              </div>
              <Link
                href="/app/evidence/upload?provider=hackerrank"
                className="pill-btn pill-btn-secondary text-xs py-2 px-4 inline-flex items-center gap-1.5"
              >
                ATTACH FIRST ARTIFACT <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {evidenceList.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-[#1C1C1C] bg-[#FBF6DF] shadow-[1.5px_1.5px_0_0_#1C1C1C] flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white border border-[#1C1C1C] flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-[#1C1C1C]" />
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-[#1C1C1C] line-clamp-1">{item.title}</h5>
                        <span className="text-[10px] text-[#1C1C1C]/60 font-mono">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : "Recent"}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#DFE968] border border-[#1C1C1C]">
                      {item.evidence_type || "Artifact"}
                    </span>
                  </div>

                  {item.summary && (
                    <p className="text-[11px] text-[#1C1C1C]/80 line-clamp-2 leading-relaxed">
                      {item.summary}
                    </p>
                  )}

                  <div className="pt-2 border-t border-[#1C1C1C]/10 flex items-center justify-between text-[11px]">
                    <span className="text-[#1C1C1C]/60 font-medium">Source: HackerRank</span>
                    <Link
                      href="/app/evidence/vault"
                      className="font-bold text-[#1C1C1C] hover:underline inline-flex items-center gap-1"
                    >
                      VIEW IN VAULT <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
