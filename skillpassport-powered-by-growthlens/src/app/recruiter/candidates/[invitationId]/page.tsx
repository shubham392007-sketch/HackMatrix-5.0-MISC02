"use client";

import React, { useState, useEffect } from "react";
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
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Top Breadcrumb & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#1A1918]/15">
        <div className="space-y-1">
          <Link
            href="/recruiter/candidates"
            className="text-xs font-bold text-stone-600 hover:text-black flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Candidates Pipeline</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-[#1A1918] tracking-tight">
              {identity.display_name || "Candidate"}
            </h1>
            {identity.is_anonymous && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-100 text-amber-900 border border-amber-300">
                Privacy-Preserving Alias
              </span>
            )}
          </div>
          <p className="text-xs text-stone-600 font-semibold">
            {identity.headline} &bull; Target: <strong className="text-[#1A1918]">{job?.title || "General Application"}</strong>
          </p>
        </div>

        {/* Pipeline Status Selector */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border-2 border-[#1A1918] shadow-[2px_2px_0_0_#1A1918]">
          <span className="text-xs font-bold text-stone-600 pl-1">Pipeline Stage:</span>
          <select
            value={pipelineStatus}
            disabled={statusUpdating}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="bg-[#FAF8F5] border border-[#1A1918]/30 rounded-xl px-3 py-1.5 text-xs font-black text-[#1A1918] focus:outline-none"
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
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-300 text-xs text-amber-950 space-y-1">
          <span className="font-bold text-[10px] uppercase font-mono text-amber-800 block">
            Personal Note from Candidate:
          </span>
          <p className="italic leading-relaxed">&quot;{invitation.candidate_message}&quot;</p>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-stone-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("passport")}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "passport"
              ? "border-black text-black bg-white"
              : "border-transparent text-stone-500 hover:text-black"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Skill Passport ({verifiedSkills.length} Verified Skills)</span>
        </button>

        <button
          onClick={() => setActiveTab("evidence")}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "evidence"
              ? "border-black text-black bg-white"
              : "border-transparent text-stone-500 hover:text-black"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Evidence Inspection ({passport.evidence_permission_level} level)</span>
        </button>

        {job && (
          <button
            onClick={() => setActiveTab("job_fit")}
            className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "job_fit"
                ? "border-black text-black bg-white"
                : "border-transparent text-stone-500 hover:text-black"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Job Requirements Fit</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab("notes")}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "notes"
              ? "border-black text-black bg-white"
              : "border-transparent text-stone-500 hover:text-black"
          }`}
        >
          <FolderGit2 className="w-3.5 h-3.5" />
          <span>Internal Recruiter Notes</span>
        </button>

        <button
          onClick={() => setActiveTab("messages")}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "messages"
              ? "border-black text-black bg-white"
              : "border-transparent text-stone-500 hover:text-black"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Conversation ({messages.length})</span>
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* TAB 1: PASSPORT OVERVIEW */}
      {activeTab === "passport" && (
        <div className="space-y-6">
          {/* Summary Box */}
          {identity.summary && (
            <div className="p-6 rounded-3xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-bold block">
                Professional Summary
              </span>
              <p className="text-xs text-[#1A1918] leading-relaxed whitespace-pre-wrap">
                {identity.summary}
              </p>
            </div>
          )}

          {/* Verified Skills Grid */}
          <div className="p-6 rounded-3xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-[#1A1918] uppercase tracking-wider">
                  Verified Skills & Capabilities
                </h3>
                <p className="text-xs text-stone-600">
                  Authoritatively verified from workplace evidence (GitHub repos, Jira commits, documents)
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold">
                {verifiedSkills.length} Verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {verifiedSkills.map((sk: any) => (
                <div
                  key={sk.competency_id}
                  className="p-4 rounded-2xl bg-[#FAF8F5] border border-stone-300 space-y-2"
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-xs font-black text-[#1A1918]">
                      {sk.canonical_name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold">
                      {sk.level}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-500 font-mono">
                    <span>Category: {sk.category}</span>
                    <span className="text-emerald-700 font-bold">
                      {(sk.score * 100).toFixed(0)}% Match
                    </span>
                  </div>

                  <div className="text-[10px] text-stone-500 flex items-center gap-1 pt-1 border-t border-stone-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Backed by {sk.evidence_count} evidence items</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Work Experience */}
          {passport.work_experiences && passport.work_experiences.length > 0 && (
            <div className="p-6 rounded-3xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] space-y-4">
              <h3 className="text-sm font-black text-[#1A1918] uppercase tracking-wider">
                Work Experience
              </h3>
              <div className="space-y-3">
                {passport.work_experiences.map((exp: any, i: number) => (
                  <div key={i} className="p-4 rounded-2xl bg-[#FAF8F5] border border-stone-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#1A1918]">
                        {exp.title || exp.role} &bull; {exp.company}
                      </span>
                      <span className="text-[11px] text-stone-500 font-mono">
                        {exp.startDate || exp.start_date} – {exp.endDate || exp.end_date || "Present"}
                      </span>
                    </div>
                    {exp.description && (
                      <p className="text-xs text-stone-700 leading-relaxed">{exp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education & Credentials */}
          {passport.education_entries && passport.education_entries.length > 0 && (
            <div className="p-6 rounded-3xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] space-y-4">
              <h3 className="text-sm font-black text-[#1A1918] uppercase tracking-wider">
                Education & Credentials
              </h3>
              <div className="space-y-3">
                {passport.education_entries.map((edu: any, i: number) => (
                  <div key={i} className="p-4 rounded-2xl bg-[#FAF8F5] border border-stone-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#1A1918]">
                        {edu.degree} in {edu.field || edu.major} &bull; {edu.institution}
                      </span>
                      <span className="text-[11px] text-stone-500 font-mono">
                        {edu.graduationYear || edu.year}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EVIDENCE INSPECTION */}
      {activeTab === "evidence" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-[#1A1918] uppercase tracking-wider">
                  Candidate Workplace Proof Inspection
                </h3>
                <p className="text-xs text-stone-600">
                  Candidate granted permission level:{" "}
                  <strong className="text-emerald-700 uppercase font-mono">
                    {passport.evidence_permission_level}
                  </strong>
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Cryptographically Authorized</span>
              </div>
            </div>

            {/* List Evidence by Skill */}
            <div className="space-y-4">
              {verifiedSkills.map((sk: any) => (
                <div
                  key={sk.competency_id}
                  className="p-5 rounded-2xl bg-[#FAF8F5] border border-stone-300 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[#1A1918]">{sk.canonical_name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold">
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
                          className="p-3.5 rounded-xl bg-white border border-stone-200 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#1A1918]">{ev.title}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sand/30 border border-stone-200 text-stone-700 capitalize">
                              Source: {ev.source_type}
                            </span>
                          </div>

                          {ev.content_summary ? (
                            <p className="text-stone-700 leading-relaxed font-sans">
                              {ev.content_summary}
                            </p>
                          ) : (
                            <p className="text-stone-500 text-[11px] italic">
                              Candidate authorized summary verification only. Full code details are shielded.
                            </p>
                          )}

                          <div className="flex items-center gap-2 text-[10px] text-stone-400 font-mono pt-1">
                            <span>Status: {ev.verification_status || "verified"}</span>
                            <span>&bull;</span>
                            <span>Recorded: {new Date(ev.created_at).toLocaleDateString()}</span>
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
          <div className="p-6 rounded-3xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] space-y-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-black text-[#1A1918] uppercase tracking-wider">
                Alignment with &quot;{job.title}&quot;
              </h3>
              <p className="text-xs text-stone-600">
                Comparing candidate verified skills against job requirements posted by your organization
              </p>
            </div>

            <div className="space-y-2">
              {(job.requirements || []).map((req: any, i: number) => {
                const matchedSkill = verifiedSkills.find(
                  (sk: any) => sk.canonical_name.toLowerCase().includes(req.name.toLowerCase()) || req.name.toLowerCase().includes(sk.canonical_name.toLowerCase())
                );

                return (
                  <div
                    key={i}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                      matchedSkill
                        ? "bg-emerald-50/60 border-emerald-300 text-emerald-950"
                        : "bg-stone-50 border-stone-200 text-stone-600"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        {matchedSkill ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-stone-400 shrink-0" />
                        )}
                        <span className="font-black text-[#1A1918]">{req.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white border border-stone-200">
                          Expected: {req.expected_level || "Practitioner"}
                        </span>
                      </div>
                      {matchedSkill && (
                        <p className="text-[11px] text-emerald-800 pl-6">
                          Demonstrated Level: <strong>{matchedSkill.level}</strong> (Match: {(matchedSkill.score * 100).toFixed(0)}%)
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
          <div className="p-6 rounded-3xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-[#1A1918] uppercase tracking-wider">
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
              className="w-full bg-[#FAF8F5] border border-[#1A1918]/25 rounded-2xl p-4 text-xs text-[#1A1918] font-sans focus:outline-none focus:border-[#1A1918]"
            />

            <div className="flex justify-end">
              <button
                type="button"
                disabled={notesSaving}
                onClick={handleSaveNotes}
                className="px-5 py-2 rounded-full bg-[#1A1918] hover:bg-stone-800 text-xs font-black uppercase tracking-wider text-[#FAF8F5] shadow flex items-center gap-1.5"
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
          <div className="p-6 rounded-3xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] space-y-4">
            <h3 className="text-sm font-black text-[#1A1918] uppercase tracking-wider">
              Communication History
            </h3>

            {messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((m: any) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-2xl bg-[#FAF8F5] border border-stone-200 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1A1918]">{m.sender_name} ({m.company})</span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {new Date(m.created_at).toLocaleString()}
                      </span>
                    </div>

                    <p className="font-semibold text-stone-900">{m.subject}</p>
                    <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">{m.message_body}</p>

                    {/* Candidate Reply */}
                    {m.reply_body && (
                      <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-300 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-950">
                          <span>Candidate Reply:</span>
                          <span className="text-[10px] font-mono text-emerald-700">
                            {m.replied_at ? new Date(m.replied_at).toLocaleString() : ""}
                          </span>
                        </div>
                        <p className="text-emerald-900 leading-relaxed">{m.reply_body}</p>
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
          <div className="p-6 rounded-3xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#1A1918] uppercase tracking-wider">
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
                <label className="block text-xs font-bold text-[#1A1918] mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={msgSubject}
                  onChange={(e) => setMsgSubject(e.target.value)}
                  required
                  className="w-full bg-[#FAF8F5] border border-[#1A1918]/25 rounded-xl px-3 py-2 text-xs text-[#1A1918] focus:outline-none focus:border-[#1A1918]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A1918] mb-1">
                  Message Body
                </label>
                <textarea
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  rows={5}
                  placeholder="Share details about the interview process, scheduling, or role highlights..."
                  required
                  className="w-full bg-[#FAF8F5] border border-[#1A1918]/25 rounded-xl p-3 text-xs text-[#1A1918] font-sans focus:outline-none focus:border-[#1A1918]"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-stone-500">
                  Delivered directly to candidate&apos;s Skill Passport notification center
                </span>

                <button
                  type="submit"
                  disabled={msgSending}
                  className="px-5 py-2 rounded-full bg-[#1A1918] hover:bg-stone-800 text-xs font-black uppercase tracking-wider text-[#FAF8F5] shadow flex items-center gap-1.5 disabled:opacity-50"
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
    </div>
  );
}
