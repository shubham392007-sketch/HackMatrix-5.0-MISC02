"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
import AppTopBar from "@/components/app/AppTopBar";
import {
  GitBranch,
  FileCode,
  FileText,
  UploadCloud,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  Info,
  SkipForward,
  Plus,
  Trash2,
  Lock,
} from "lucide-react";

interface UploadedDoc {
  id: string;
  name: string;
  category: string;
  size: string;
}

export default function EvidenceOnboardingPage() {
  const router = useRouter();
  const {
    connectSource,
    addEvidenceItem,
    addToast,
    addNotification,
    userProfile,
  } = useEvidence();

  // GitHub Credentials State (GrowthLens Reference)
  const [ghUsername, setGhUsername] = useState("alexrivera-dev");
  const [ghToken, setGhToken] = useState("");
  const [ghOwner, setGhOwner] = useState("growthlens-lab");
  const [ghRepo, setGhRepo] = useState("worker-queue-engine");
  const [ghBranch, setGhBranch] = useState("main");
  const [showGhToken, setShowGhToken] = useState(false);
  const [ghConnected, setGhConnected] = useState(false);

  // Jira Cloud Credentials State (GrowthLens Reference)
  const [jiraUrl, setJiraUrl] = useState("https://growthlens.atlassian.net");
  const [jiraEmail, setJiraEmail] = useState(userProfile.contactEmail || "alex.rivera@growthlens.io");
  const [jiraToken, setJiraToken] = useState("");
  const [jiraProject, setJiraProject] = useState("CORE");
  const [showJiraToken, setShowJiraToken] = useState(false);
  const [jiraConnected, setJiraConnected] = useState(false);

  // Document Uploads State
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([
    {
      id: "doc-sample-1",
      name: "RFC-09-distributed-pubsub.md",
      category: "Architecture RFC",
      size: "24.8 KB",
    },
  ]);
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState("Technical Specification");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill helpers
  const handlePrefillGithub = () => {
    setGhUsername("alexrivera-dev");
    setGhToken("ghp_sampleToken987654321");
    setGhOwner("growthlens-lab");
    setGhRepo("worker-queue-engine");
    setGhBranch("main");
    setGhConnected(true);
    addToast("GitHub Config Populated", "Sample GitHub credentials filled.", "info");
  };

  const handlePrefillJira = () => {
    setJiraUrl("https://growthlens.atlassian.net");
    setJiraEmail("alex.rivera@growthlens.io");
    setJiraToken("ATATT3_sampleToken87654");
    setJiraProject("CORE");
    setJiraConnected(true);
    addToast("Jira Config Populated", "Sample Jira credentials filled.", "info");
  };

  const handleAddSampleDoc = (title: string, category: string, size: string) => {
    if (uploadedDocs.some((d) => d.name === title)) return;
    setUploadedDocs((prev) => [
      ...prev,
      {
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: title,
        category,
        size,
      },
    ]);
  };

  const handleRemoveDoc = (id: string) => {
    setUploadedDocs((prev) => prev.filter((d) => d.id !== id));
  };

  // Skip flow: User skips entering credentials and proceeds directly with pre-loaded demo artifacts
  const handleSkip = () => {
    addToast(
      "Ingestion Skipped",
      "Proceeding with pre-loaded demo evidence for Alex Rivera.",
      "info"
    );
    router.push("/app/evidence");
  };

  // Submit flow: Save configured sources & documents, then proceed to Evidence Workspace
  const handleSaveAndIngest = () => {
    setIsSubmitting(true);

    setTimeout(() => {
      // Connect GitHub if token or repo provided
      if (ghToken || ghConnected || ghRepo) {
        connectSource("github", [ghRepo, "smart-irrigation-ai"]);
      }

      // Connect Jira if URL or project provided
      if (jiraToken || jiraConnected || jiraProject) {
        connectSource("jira", [`${jiraProject}-101`, `${jiraProject}-204`]);
      }

      // Add uploaded documents into evidence workspace
      uploadedDocs.forEach((doc, idx) => {
        addEvidenceItem({
          title: doc.name.replace(/\.[^/.]+$/, ""),
          description: `Uploaded work artifact: ${doc.name} (${doc.category})`,
          sourceType: "document",
          sourceReference: `upload://${doc.name}`,
          project: "Engineering System Documentation",
          evidenceType: "Design Specification & Architecture RFC",
          date: "Just now",
          claimedContribution: "Authored technical architecture and specification documentation.",
          author: userProfile.displayName || "Alex Rivera",
          isCollaborative: true,
          evidenceStrength: "high",
          extractionConfidence: 88,
          processingStatus: "discovered",
          reviewStatus: "unreviewed",
          normalizedMetadata: {
            format: "application/pdf",
            fileSize: doc.size,
            authorIdentified: userProfile.displayName || "Alex Rivera",
          },
          extractedSummary: `Uploaded ${doc.category} artifact: ${doc.name} (${doc.size}). Verified engineering provenance ready for canonical skill extraction.`,
          candidateSkills: [
            {
              id: `sk-doc-${idx}`,
              name: "System Architecture & Design",
              category: "Architecture",
              excerpt: "Detailed architectural boundary specifications and state machine definitions.",
              associationReason: "Explicitly documented design decisions and technical specifications.",
              status: "candidate",
              proficiencyLevel: "Advanced",
            },
          ],
          processingHistory: [
            {
              stage: "Upload & Ingestion",
              status: "completed",
              timestamp: "Just now",
              detail: `Uploaded ${doc.name} via Evidence Onboarding portal.`,
            },
          ],
        });
      });

      addNotification({
        title: "Evidence Ingestion Initialized",
        description: "Your connected development sources and documents were saved and queued for analysis.",
        severity: "success",
        category: "evidence",
        relatedDomain: "Evidence Workspace",
        actionRoute: "/app/evidence",
        actionLabel: "View Evidence",
      });

      addToast(
        "Evidence Configured",
        "Your sources and work artifacts were successfully saved to the workspace.",
        "success"
      );

      setIsSubmitting(false);
      router.push("/app/evidence");
    }, 600);
  };

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Evidence Ingestion & Setup"
        description="Connect your engineering accounts (GitHub & Jira) or upload project artifacts to extract verified capability signals."
        badge="GETTING STARTED · EVIDENCE ONBOARDING"
        badgeColor="peach"
      >
        <button
          onClick={handleSkip}
          className="pill-btn pill-btn-ghost text-xs flex items-center gap-1.5"
        >
          <SkipForward className="w-3.5 h-3.5" />
          Skip for Now
        </button>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-5xl w-full mx-auto pb-24">
        {/* Intro Welcome Card */}
        <div className="gl-card p-6 md:p-8 relative overflow-hidden bg-gradient-to-r from-[#FBF6DF] to-[#FBF1CF]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DFE968] border border-[#1C1C1C] text-[10px] font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#1C1C1C]" />
                STEP 1 OF 1 · WORK INGESTION
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1C1C1C] tracking-tight">
                Where does your work live?
              </h1>
              <p className="text-xs sm:text-sm text-[#1C1C1C]/80 leading-relaxed font-medium">
                SkillPassport turns raw commits, pull requests, sprint stories, and documents into an inspectable capability record. Enter your credentials below, or click <strong className="text-[#1C1C1C]">Skip for Now</strong> to explore with pre-loaded demo artifacts.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              <button
                onClick={handleSkip}
                className="pill-btn pill-btn-ghost text-xs flex items-center justify-center gap-1.5 py-3"
              >
                <SkipForward className="w-3.5 h-3.5" />
                Skip &amp; Use Demo Evidence
              </button>
            </div>
          </div>
        </div>

        {/* Section 1: GitHub Integration (GrowthLens Reference) */}
        <div className="gl-card p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1C1C1C]/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1C1C1C] text-white flex items-center justify-center shadow-[2px_2px_0px_#1C1C1C]">
                <GitBranch className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#1C1C1C] flex items-center gap-2">
                  1. GitHub Integration Credentials
                  <span className="text-[10px] font-bold text-[#1C1C1C]/60 px-2 py-0.5 rounded-full bg-white border border-[#1C1C1C]/30 uppercase">
                    Commits &amp; PRs
                  </span>
                </h2>
                <p className="text-xs text-[#1C1C1C]/70 font-medium">
                  Reference: GrowthLens GitHub client. Ingest commit history, pull request reviews, and code changes.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePrefillGithub}
              className="pill-btn pill-btn-secondary text-[11px] py-1.5 px-3 self-start sm:self-auto shrink-0"
            >
              ⚡ Fill Sample GitHub
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black uppercase tracking-wider">
                GitHub Username
              </label>
              <input
                type="text"
                placeholder="e.g. alexrivera-dev"
                value={ghUsername}
                onChange={(e) => setGhUsername(e.target.value)}
                className="pill-input w-full bg-[#FBF6DF] border-[#1C1C1C] font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-black uppercase tracking-wider">
                Personal Access Token (PAT)
              </label>
              <div className="relative">
                <input
                  type={showGhToken ? "text" : "password"}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={ghToken}
                  onChange={(e) => setGhToken(e.target.value)}
                  className="pill-input w-full bg-[#FBF6DF] border-[#1C1C1C] font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowGhToken(!showGhToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1C1C1C]/60 hover:text-[#1C1C1C]"
                >
                  {showGhToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-black uppercase tracking-wider">
                Default Repo Owner / Organization
              </label>
              <input
                type="text"
                placeholder="e.g. growthlens-lab"
                value={ghOwner}
                onChange={(e) => setGhOwner(e.target.value)}
                className="pill-input w-full bg-[#FBF6DF] border-[#1C1C1C] font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-black uppercase tracking-wider">
                Default Repository Name
              </label>
              <input
                type="text"
                placeholder="e.g. worker-queue-engine"
                value={ghRepo}
                onChange={(e) => setGhRepo(e.target.value)}
                className="pill-input w-full bg-[#FBF6DF] border-[#1C1C1C] font-medium"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Jira Cloud Integration (GrowthLens Reference) */}
        <div className="gl-card p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1C1C1C]/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0052CC] text-white flex items-center justify-center shadow-[2px_2px_0px_#1C1C1C]">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#1C1C1C] flex items-center gap-2">
                  2. Jira Cloud Credentials
                  <span className="text-[10px] font-bold text-[#1C1C1C]/60 px-2 py-0.5 rounded-full bg-white border border-[#1C1C1C]/30 uppercase">
                    Stories &amp; Sprints
                  </span>
                </h2>
                <p className="text-xs text-[#1C1C1C]/70 font-medium">
                  Reference: GrowthLens Jira client. Track delivered epics, sprint tasks, complexity points, and technical execution.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePrefillJira}
              className="pill-btn pill-btn-secondary text-[11px] py-1.5 px-3 self-start sm:self-auto shrink-0"
            >
              ⚡ Fill Sample Jira
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black uppercase tracking-wider">
                Jira Cloud Base URL
              </label>
              <input
                type="url"
                placeholder="https://company.atlassian.net"
                value={jiraUrl}
                onChange={(e) => setJiraUrl(e.target.value)}
                className="pill-input w-full bg-[#FBF6DF] border-[#1C1C1C] font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-black uppercase tracking-wider">
                Jira Account Email
              </label>
              <input
                type="email"
                placeholder="e.g. user@company.com"
                value={jiraEmail}
                onChange={(e) => setJiraEmail(e.target.value)}
                className="pill-input w-full bg-[#FBF6DF] border-[#1C1C1C] font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-black uppercase tracking-wider">
                Jira API Token
              </label>
              <div className="relative">
                <input
                  type={showJiraToken ? "text" : "password"}
                  placeholder="ATATT3xxxxxxxxxxxxxxxx"
                  value={jiraToken}
                  onChange={(e) => setJiraToken(e.target.value)}
                  className="pill-input w-full bg-[#FBF6DF] border-[#1C1C1C] font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowJiraToken(!showJiraToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1C1C1C]/60 hover:text-[#1C1C1C]"
                >
                  {showJiraToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-black uppercase tracking-wider">
                Jira Project Key
              </label>
              <input
                type="text"
                placeholder="e.g. CORE or PROD"
                value={jiraProject}
                onChange={(e) => setJiraProject(e.target.value)}
                className="pill-input w-full bg-[#FBF6DF] border-[#1C1C1C] font-medium"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Document Uploads & Work Artifacts */}
        <div className="gl-card p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1C1C1C]/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#DFE968] text-[#1C1C1C] border border-[#1C1C1C] flex items-center justify-center shadow-[2px_2px_0px_#1C1C1C]">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#1C1C1C] flex items-center gap-2">
                  3. Upload Documents, Specs &amp; Proof
                  <span className="text-[10px] font-bold text-[#1C1C1C]/60 px-2 py-0.5 rounded-full bg-white border border-[#1C1C1C]/30 uppercase">
                    Files &amp; RFCs
                  </span>
                </h2>
                <p className="text-xs text-[#1C1C1C]/70 font-medium">
                  Upload architectural RFCs, resumes, system specifications, or course credentials.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() =>
                  handleAddSampleDoc("telemetry-sensor-fusion-spec.pdf", "Technical Specification", "142 KB")
                }
                className="pill-btn pill-btn-ghost text-[10px] py-1 px-2.5"
              >
                + Spec PDF
              </button>
              <button
                type="button"
                onClick={() =>
                  handleAddSampleDoc("alex-rivera-verified-resume.pdf", "Candidate Resume", "89 KB")
                }
                className="pill-btn pill-btn-ghost text-[10px] py-1 px-2.5"
              >
                + Resume PDF
              </button>
            </div>
          </div>

          {/* Uploaded Documents List */}
          <div className="space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/70">
              Attached Artifacts ({uploadedDocs.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {uploadedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-xl bg-white/80 border border-[#1C1C1C]/20 flex items-start justify-between gap-2 shadow-sm"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-[#1C1C1C] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-[#1C1C1C] truncate">
                        {doc.name}
                      </div>
                      <div className="text-[10px] text-[#1C1C1C]/60 font-medium">
                        {doc.category} • {doc.size}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDoc(doc.id)}
                    className="text-[#1C1C1C]/40 hover:text-rose-600 transition-colors p-1"
                    title="Remove file"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Submission Bar */}
        <div className="p-6 rounded-2xl bg-[#DFE968]/50 border-[1.5px] border-[#1C1C1C] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[4px_4px_0px_#1C1C1C]">
          <div className="space-y-0.5 text-center sm:text-left">
            <div className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]">
              Ready to explore your capability passport?
            </div>
            <div className="text-xs font-medium text-[#1C1C1C]/70">
              You can always add or adjust sources later in Evidence Workspace &gt; Connected Sources.
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleSkip}
              className="pill-btn pill-btn-ghost text-xs py-3 px-5 flex-1 sm:flex-initial"
            >
              Skip for Now →
            </button>
            <button
              type="button"
              onClick={handleSaveAndIngest}
              disabled={isSubmitting}
              className="pill-btn pill-btn-primary text-xs py-3.5 px-6 flex items-center justify-center gap-2 flex-1 sm:flex-initial shadow-[2px_2px_0px_#1C1C1C]"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? "Ingesting Evidence ···" : "Save & Ingest Evidence →"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
