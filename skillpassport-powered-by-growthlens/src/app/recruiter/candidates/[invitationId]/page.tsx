"use client";

import React, { useState, useEffect, useMemo } from "react";
import { sharingApi } from "@/lib/sharingApi";
import TemplateDispatcher from "@/components/passport/templates/TemplateDispatcher";
import PublicEvidenceModal from "@/components/passport/PublicEvidenceModal";
import { ShareProjection, PassportTemplateId } from "@/types/sharing";
import { Printer, Eye } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Users,
  Briefcase,
  ExternalLink,
  MessageSquare,
  FileText,
  Clock,
  Sparkles,
  Lock,
  Mail,
  Send,
  Building,
  RotateCw,
  AlertCircle,
  FolderGit2,
  GraduationCap,
  Award,
  ChevronDown,
} from "lucide-react";
import {
  getCandidatePassportDetail,
  updateCandidatePipelineStatus,
  updateCandidateRecruiterNotes,
  sendCandidateMessage,
} from "@/lib/recruiterApi";

export default function CandidatePassportReviewPage() {
  const router = useRouter();
  const params = useParams();
  const invitationId = params?.invitationId as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"passport" | "evidence" | "job_fit" | "notes" | "messages">("passport");

  // Editorial Template Selection
  const [projection, setProjection] = useState<ShareProjection | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PassportTemplateId>("verified-competency");
  const [inspectingEvidenceId, setInspectingEvidenceId] = useState<string | null>(null);

  // Pipeline Status
  const [pipelineStatus, setPipelineStatus] = useState("new");
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Private Notes
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSavedNotice, setNotesSavedNotice] = useState(false);

  // Send Message
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const [msgSentNotice, setMsgSentNotice] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCandidateData = async () => {
    if (!invitationId) return;
    setLoading(true);
    try {
      const res = await getCandidatePassportDetail(invitationId);
      setData(res);
      setPipelineStatus(res.invitation.pipeline_status || "new");
      setNotes(res.invitation.recruiter_notes || "");
      if (res.job) {
        setMsgSubject(`Invitation: Next steps for ${res.job.title}`);
      } else {
        setMsgSubject("Skill Passport Review & Career Opportunity");
      }

      // Authoritative template projection
      if (res.invitation?.share_token) {
        try {
          const proj = await sharingApi.getPublicProjection(res.invitation.share_token);
          setProjection(proj);
          if (proj.templateId) {
            setSelectedTemplate(proj.templateId as PassportTemplateId);
          }
        } catch (projErr) {
          console.warn("Could not load direct public projection:", projErr);
        }
      }
    } catch (err: any) {
      console.error("Could not load candidate passport:", err);
      setErrorMessage(err.message || "Failed to load candidate review data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidateData();
  }, [invitationId]);

  const effectiveProjection: ShareProjection | null = useMemo(() => {
    if (!data?.passport && !projection) return null;

    const baseProj = projection || {
      shareId: data.invitation?.share_token || invitationId,
      status: "active",
      createdAt: data.invitation?.created_at || new Date().toISOString(),
      expiresAt: null,
      isExpired: false,
      isRevoked: false,
      templateId: (data.passport.template_id || "verified-competency") as PassportTemplateId,
      candidateProfile: {
        displayName: data.passport.identity?.display_name || "Candidate",
        headline: data.passport.identity?.headline || "Software Professional",
        summary: data.passport.identity?.summary || "",
        contactEmail: data.passport.identity?.contact_email || "",
        contactLinkedIn: "",
      },
      verifiedSkills: [],
      customSkills: [],
      authorizedEvidence: [],
      allowRecruiterMessaging: true,
      verificationGuaranteeNote: "Cryptographically verifiable against workplace artifact SHA-256 proofs.",
      workExperience: data.passport.work_experiences || [],
      education: data.passport.education_entries || [],
      projects: data.passport.portfolio_projects || [],
      certifications: data.passport.certifications || [],
    };

    // 1. Build unified evidence map across both sources (deduplicating by ev.id)
    const evidenceMap = new Map<string, any>();
    (baseProj.authorizedEvidence || []).forEach((ev: any) => {
      if (ev?.id) evidenceMap.set(ev.id, ev);
    });

    for (const sk of data?.passport?.verified_skills || []) {
      for (const ev of sk.evidence || []) {
        if (!ev?.id) continue;
        if (!evidenceMap.has(ev.id)) {
          evidenceMap.set(ev.id, {
            id: ev.id,
            title: ev.title,
            sourceType: ev.source_type || "Artifact",
            sourceProvider: ev.source_provider || "Workplace Proof",
            project: ev.project || "Production",
            date: ev.created_at,
            shortSummary: ev.content_summary || ev.title,
            relatedSkillName: sk.canonical_name,
            allowDetailInspection: data.passport.evidence_permission_level === "details",
            sourceUrl: ev.source_url,
            externalUrl: ev.external_url,
            documentUrl: ev.document_url,
            fileUrl: ev.file_url,
          });
        }
      }
    }

    // 2. Map skills and ensure authorizedEvidenceIds contains ALL evidence items for each skill
    const passportSkillsMap = new Map<string, any>();
    (data?.passport?.verified_skills || []).forEach((sk: any) => {
      const key = (sk.canonical_name || sk.name || "").toLowerCase().trim();
      const ids = (sk.evidence || []).map((e: any) => e.id);
      passportSkillsMap.set(key, { ...sk, evidenceIds: ids });
    });

    let unifiedSkills: any[] = [];
    if (baseProj.verifiedSkills && baseProj.verifiedSkills.length > 0) {
      unifiedSkills = baseProj.verifiedSkills.map((skill: any) => {
        const key = (skill.canonicalName || "").toLowerCase().trim();
        const pSkill = passportSkillsMap.get(key);
        const extraIds = pSkill?.evidenceIds || [];
        const combinedIds = Array.from(new Set([...(skill.authorizedEvidenceIds || []), ...extraIds]));
        return {
          ...skill,
          authorizedEvidenceIds: combinedIds,
          evidenceCount: combinedIds.length,
        };
      });
    } else {
      unifiedSkills = (data?.passport?.verified_skills || []).map((sk: any) => {
        const ids = (sk.evidence || []).map((e: any) => e.id);
        return {
          id: sk.competency_id || sk.id,
          canonicalName: sk.canonical_name || sk.name,
          category: sk.category || "Core Competency",
          verifiedProficiency: sk.level || "Practitioner",
          description: sk.description || "",
          evidenceCount: ids.length,
          authorizedEvidenceIds: ids,
        };
      });
    }

    return {
      ...baseProj,
      verifiedSkills: unifiedSkills,
      authorizedEvidence: Array.from(evidenceMap.values()),
    };
  }, [projection, data, invitationId]);

  const handleStatusChange = async (newStatus: string) => {
    setStatusUpdating(true);
    try {
      await updateCandidatePipelineStatus(invitationId, newStatus);
      setPipelineStatus(newStatus);
    } catch (err: any) {
      alert(err.message || "Could not update pipeline status.");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    setNotesSaving(true);
    try {
      await updateCandidateRecruiterNotes(invitationId, notes);
      setNotesSavedNotice(true);
      setTimeout(() => setNotesSavedNotice(false), 3000);
    } catch (err: any) {
      alert(err.message || "Could not save notes.");
    } finally {
      setNotesSaving(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgSubject.trim() || !msgBody.trim()) return;

    setMsgSending(true);
    try {
      await sendCandidateMessage(invitationId, {
        subject: msgSubject.trim(),
        message_body: msgBody.trim(),
      });
      setMsgBody("");
      setMsgSentNotice(true);
      setTimeout(() => setMsgSentNotice(false), 4000);
      loadCandidateData(); // Refresh conversation
    } catch (err: any) {
      alert(err.message || "Failed to send message to candidate.");
    } finally {
      setMsgSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-16 text-center text-xs text-stone-500">
        <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-stone-400" />
        Loading candidate Skill Passport & verified proof...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 p-16 text-center text-xs text-stone-500">
        Candidate review data not found.
      </div>
    );
  }



  const { invitation, passport, job, messages } = data;
  const identity = passport.identity || {};
  const verifiedSkills = passport.verified_skills || [];

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 pb-16">
      {/* ── CLEAN PAGE HEADER ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#1C1C1C]/15">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/recruiter/candidates"
              className="pill-btn pill-btn-secondary inline-flex items-center gap-1.5 text-xs py-1 px-2.5 shadow-[1.5px_1.5px_0_0_#1C1C1C] mr-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </Link>
            <h1 className="text-2xl font-black text-[#1C1C1C] tracking-tight">
              {identity.display_name || "Candidate Review"}
            </h1>
            {identity.is_anonymous && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FBF6DF] text-[#1C1C1C] border border-[#1C1C1C] shadow-[1px_1px_0_0_#1C1C1C]">
                Privacy Alias
              </span>
            )}
          </div>
          <p className="text-xs text-stone-600 mt-1">
            {identity.headline || "Candidate Profile"} &bull; Target: <span className="font-semibold text-[#1C1C1C]">{job?.title || "General Application"}</span>
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-[#FAF8F5] p-1 rounded-full border-[1.5px] border-[#1C1C1C] shadow-[1.5px_1.5px_0_0_#1C1C1C] self-start sm:self-auto">
          <span className="text-[11px] font-bold text-stone-600 pl-2">Stage:</span>
          <select
            value={pipelineStatus}
            disabled={statusUpdating}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="bg-transparent rounded-full px-2.5 py-1 text-xs font-black text-[#1C1C1C] focus:outline-none cursor-pointer"
          >
            <option value="new">New Submission</option>
            <option value="reviewing">In Review</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="interview">Interview Scheduled</option>
            <option value="offer">Offer Extended</option>
            <option value="hired">Hired</option>
            <option value="rejected">Not Moving Forward</option>
          </select>
        </div>
      </div>
        {/* Candidate Message Banner if present */}
        {invitation.candidate_message && (
          <div className="p-4 rounded-2xl bg-amber-50/80 border-[1.5px] border-amber-300 text-xs text-amber-950 space-y-1 shadow-[2px_2px_0_0_#d97706]">
            <span className="font-bold text-[10px] uppercase font-mono text-amber-800 block">
              Personal Note from Candidate:
            </span>
            <p className="italic leading-relaxed">&quot;{invitation.candidate_message}&quot;</p>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("passport")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border-[1.5px] flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "passport"
                ? "bg-[#1C1C1C] text-[#FAF8F5] border-[#1C1C1C] shadow-[1.5px_1.5px_0_0_#1C1C1C]"
                : "bg-[#FAF8F5] hover:bg-white text-[#1C1C1C] border-[#1C1C1C]/25"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Skill Passport ({verifiedSkills.length} Verified)</span>
          </button>

          <button
            onClick={() => setActiveTab("evidence")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border-[1.5px] flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "evidence"
                ? "bg-[#1C1C1C] text-[#FAF8F5] border-[#1C1C1C] shadow-[1.5px_1.5px_0_0_#1C1C1C]"
                : "bg-[#FAF8F5] hover:bg-white text-[#1C1C1C] border-[#1C1C1C]/25"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Evidence Proof ({passport.evidence_permission_level})</span>
          </button>

          {job && (
            <button
              onClick={() => setActiveTab("job_fit")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border-[1.5px] flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "job_fit"
                  ? "bg-[#1C1C1C] text-[#FAF8F5] border-[#1C1C1C] shadow-[1.5px_1.5px_0_0_#1C1C1C]"
                  : "bg-[#FAF8F5] hover:bg-white text-[#1C1C1C] border-[#1C1C1C]/25"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Job Fit</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab("notes")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border-[1.5px] flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "notes"
                ? "bg-[#1C1C1C] text-[#FAF8F5] border-[#1C1C1C] shadow-[1.5px_1.5px_0_0_#1C1C1C]"
                : "bg-[#FAF8F5] hover:bg-white text-[#1C1C1C] border-[#1C1C1C]/25"
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Private Notes</span>
          </button>

          <button
            onClick={() => setActiveTab("messages")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border-[1.5px] flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "messages"
                ? "bg-[#1C1C1C] text-[#FAF8F5] border-[#1C1C1C] shadow-[1.5px_1.5px_0_0_#1C1C1C]"
                : "bg-[#FAF8F5] hover:bg-white text-[#1C1C1C] border-[#1C1C1C]/25"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Conversation ({messages.length})</span>
          </button>
        </div>

        {/* TAB 1: PASSPORT OVERVIEW */}
        {activeTab === "passport" && (
          <div className="space-y-4">
            {/* Perspective & Template Selector Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-[#1C1C1C]/15 shadow-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-stone-600 pl-1">
                  Layout:
                </span>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value as PassportTemplateId)}
                  className="bg-[#FAF8F5] border border-[#1C1C1C]/20 rounded-full px-3 py-1 text-xs font-bold text-[#1C1C1C] focus:outline-none cursor-pointer"
                >
                  <option value="technical-portfolio">Technical Portfolio (Code & Architecture)</option>
                  <option value="verified-competency">Verified Competency (Capability Matrix)</option>
                  <option value="professional-resume">Professional Resume (Executive Experience)</option>
                  <option value="ai-ml-engineer">AI & ML Engineer (Models & Pipelines)</option>
                  <option value="software-fullstack">Full-Stack Engineer (Systems & UI)</option>
                  <option value="projects-impact">Projects & Impact (Outcomes & Metrics)</option>
                  <option value="research-academic">Research & Academic (Publications & Patents)</option>
                  <option value="minimal-privacy">Minimalist (Privacy & High Trust)</option>
                </select>
                {effectiveProjection?.templateId && selectedTemplate === effectiveProjection.templateId && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold">
                    Candidate's Chosen Template
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") window.print();
                  }}
                  className="pill-btn pill-btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5 border border-[#1C1C1C]/15"
                  title="Print or Save PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / PDF</span>
                </button>
                {invitation?.share_token && (
                  <Link
                    href={`/p/${invitation.share_token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pill-btn pill-btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 border border-[#1C1C1C] shadow-[1.5px_1.5px_0_0_#1C1C1C]"
                    title="Open Candidate's Public Passport URL"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Public View</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Authoritative Template Render */}
            {effectiveProjection ? (
              <div className="p-4 sm:p-8 rounded-2xl bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] print:border-none print:shadow-none print:p-0">
                <TemplateDispatcher
                  projection={effectiveProjection}
                  activeTemplateId={selectedTemplate}
                  isPreview={false}
                  onOpenContact={() => setActiveTab("messages")}
                />
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-stone-500 bg-white rounded-2xl border border-stone-200">
                No candidate passport projection available.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EVIDENCE INSPECTION */}
        {activeTab === "evidence" && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-black text-[#1C1C1C] uppercase tracking-wider">
                    Candidate Workplace Proof Inspection
                  </h3>
                  <p className="text-xs text-stone-600">
                    Candidate granted permission level:{" "}
                    <strong className="text-emerald-700 uppercase font-mono">
                      {passport.evidence_permission_level}
                    </strong>
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-emerald-950 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-300 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Cryptographically Authorized</span>
                </div>
              </div>

              {/* List Evidence by Skill */}
              <div className="space-y-4">
                {verifiedSkills.map((sk: any) => (
                  <div
                    key={sk.competency_id}
                    className="p-5 rounded-xl bg-white border border-[#1C1C1C]/15 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#1C1C1C]">{sk.canonical_name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold">
                          {sk.level}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-stone-500">
                        {sk.evidence?.length || 0} proof items attached
                      </span>
                    </div>

                    {sk.evidence && sk.evidence.length > 0 ? (
                      <div className="space-y-2">
                        {sk.evidence.map((ev: any) => (
                          <div
                            key={ev.id}
                            className="p-3.5 rounded-xl bg-[#FAF8F5] border border-stone-200 text-xs space-y-1.5"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-[#1C1C1C] text-sm">{ev.title}</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-stone-700 capitalize font-bold">
                                  {ev.source_provider || ev.source_type}
                                </span>
                                {ev.project && (
                                  <span className="text-[10px] font-mono text-stone-500">
                                    Project: <strong className="text-stone-800">{ev.project}</strong>
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setInspectingEvidenceId(ev.id)}
                                  className="px-2.5 py-1 rounded-full bg-[#1C1C1C] hover:bg-[#1C1C1C]/90 text-[#FBF6DF] text-[10px] font-bold uppercase inline-flex items-center gap-1 shadow-[1px_1px_0_0_#DFE968] cursor-pointer"
                                >
                                  <Eye className="w-3 h-3 text-[#DFE968]" />
                                  <span>Inspect Artifact</span>
                                </button>
                                {(ev.external_url || ev.source_url) && (
                                  <a
                                    href={ev.external_url || ev.source_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1 rounded-full bg-white hover:bg-stone-100 border border-stone-300 text-[10px] font-bold uppercase inline-flex items-center gap-1 text-stone-800"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Source</span>
                                  </a>
                                )}
                              </div>
                            </div>

                            {ev.content_summary ? (
                              <p className="text-stone-700 leading-relaxed font-sans text-xs">
                                {ev.content_summary}
                              </p>
                            ) : (
                              <p className="text-stone-500 text-[11px] italic">
                                Candidate authorized summary verification only. Full code details are shielded.
                              </p>
                            )}

                            <div className="flex items-center gap-2 text-[10px] text-stone-400 font-mono pt-1 border-t border-stone-200/60">
                              <span>Status: <strong className="text-emerald-700 uppercase">{ev.verification_status || "verified"}</strong></span>
                              <span>&bull;</span>
                              <span>Recorded: {new Date(ev.created_at).toLocaleDateString()}</span>
                              <span>&bull;</span>
                              <span className="truncate max-w-[200px]">ID: {ev.id}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-stone-500 italic">
                        No individual evidence items shared for this capability.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: JOB FIT COMPARISON */}
        {activeTab === "job_fit" && job && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] space-y-4">
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-[#1C1C1C] uppercase tracking-wider">
                  Alignment with &quot;{job.title}&quot;
                </h3>
                <p className="text-xs text-stone-600">
                  Comparing candidate verified skills against job requirements posted by your organization
                </p>
              </div>

              <div className="space-y-2">
                {(job.requirements || []).map((req: any, i: number) => {
                  const matchedSkill = verifiedSkills.find(
                    (sk: any) =>
                      sk.canonical_name.toLowerCase().includes(req.name.toLowerCase()) ||
                      req.name.toLowerCase().includes(sk.canonical_name.toLowerCase())
                  );

                  return (
                    <div
                      key={i}
                      className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                        matchedSkill
                          ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                          : "bg-white border-stone-200 text-stone-600"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          {matchedSkill ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-stone-400 shrink-0" />
                          )}
                          <span className="font-black text-[#1C1C1C]">{req.name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white border border-stone-200">
                            Expected: {req.expected_level || "Practitioner"}
                          </span>
                        </div>
                        {matchedSkill && (
                          <p className="text-[11px] text-emerald-800 pl-6">
                            Demonstrated Level: <strong>{matchedSkill.level}</strong> (Match:{" "}
                            {(matchedSkill.score * 100).toFixed(0)}%)
                          </p>
                        )}
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                          matchedSkill ? "bg-emerald-200/80 text-emerald-950" : "bg-stone-200 text-stone-700"
                        }`}
                      >
                        {matchedSkill ? "Verified Match" : "Unverified Gap"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PRIVATE NOTES */}
        {activeTab === "notes" && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-black text-[#1C1C1C] uppercase tracking-wider">
                    Internal Recruiter Evaluation Notes
                  </h3>
                  <p className="text-xs text-stone-600">
                    Private to your organization. Never visible to the candidate.
                  </p>
                </div>

                {notesSavedNotice && (
                  <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Notes Saved
                  </span>
                )}
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={8}
                placeholder="Record interview impressions, technical assessment scores, salary expectations, team feedback..."
                className="w-full bg-white border border-[#1C1C1C]/25 rounded-xl p-4 text-xs text-[#1C1C1C] font-sans focus:outline-none focus:border-[#1C1C1C]"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={notesSaving}
                  onClick={handleSaveNotes}
                  className="pill-btn pill-btn-primary px-5 py-2 text-xs shadow-[2px_2px_0_0_#1C1C1C] flex items-center gap-1.5"
                >
                  {notesSaving ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Notes</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MESSAGES & COMMUNICATION */}
        {activeTab === "messages" && (
          <div className="space-y-6">
            {/* Conversation History */}
            <div className="p-6 rounded-2xl bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] space-y-4">
              <h3 className="text-sm font-black text-[#1C1C1C] uppercase tracking-wider">
                Communication History
              </h3>

              {messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((m: any) => (
                    <div
                      key={m.id}
                      className="p-4 rounded-xl bg-white border border-[#1C1C1C]/15 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#1C1C1C]">{m.sender_name} ({m.company})</span>
                        <span className="text-[10px] text-stone-400 font-mono">
                          {new Date(m.created_at).toLocaleString()}
                        </span>
                      </div>

                      <p className="font-semibold text-stone-900">{m.subject}</p>
                      <p className="text-stone-700 leading-relaxed whitespace-pre-wrap font-sans">{m.message_body}</p>

                      {/* Candidate Reply */}
                      {m.reply_body && (
                        <div className="mt-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-950">
                            <span>Candidate Reply:</span>
                            <span className="text-[10px] font-mono text-emerald-700">
                              {m.replied_at ? new Date(m.replied_at).toLocaleString() : ""}
                            </span>
                          </div>
                          <p className="text-emerald-900 leading-relaxed font-sans">{m.reply_body}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-500 italic">
                  No messages sent yet. Use the composer below to reach out directly.
                </p>
              )}
            </div>

            {/* New Message Composer */}
            <div className="p-6 rounded-2xl bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-[#1C1C1C] uppercase tracking-wider">
                  Send In-App Message to Candidate
                </h3>
                {msgSentNotice && (
                  <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Message Delivered
                  </span>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#1C1C1C] mb-1">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={msgSubject}
                    onChange={(e) => setMsgSubject(e.target.value)}
                    required
                    className="w-full bg-white border border-[#1C1C1C]/25 rounded-xl px-3 py-2 text-xs text-[#1C1C1C] focus:outline-none focus:border-[#1C1C1C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1C1C] mb-1">
                    Message Body
                  </label>
                  <textarea
                    value={msgBody}
                    onChange={(e) => setMsgBody(e.target.value)}
                    rows={5}
                    placeholder="Share details about the interview process, scheduling, or role highlights..."
                    required
                    className="w-full bg-white border border-[#1C1C1C]/25 rounded-xl p-3 text-xs text-[#1C1C1C] font-sans focus:outline-none focus:border-[#1C1C1C]"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-stone-500">
                    Delivered directly to candidate&apos;s Skill Passport notification center
                  </span>

                  <button
                    type="submit"
                    disabled={msgSending}
                    className="pill-btn pill-btn-primary px-5 py-2 text-xs shadow-[2px_2px_0_0_#1C1C1C] flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {msgSending ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      {/* Public Evidence Artifact Inspector Modal for Recruiter */}
      {inspectingEvidenceId && (
        <PublicEvidenceModal
          token={data.invitation?.share_token || effectiveProjection?.shareId || ""}
          evidenceId={inspectingEvidenceId}
          onClose={() => setInspectingEvidenceId(null)}
        />
      )}
    </div>
  );
}
