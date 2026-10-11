"use client";

import { useState } from "react";
import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
import {
  UploadCloud,
  FileCode,
  Award,
  BookOpen,
  Globe,
  FileText,
  CheckCircle2,
  Loader2,
  Info,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function UploadEvidencePage() {
  const router = useRouter();
  const { addEvidenceItem } = useEvidence();

  const [category, setCategory] = useState<
    "document" | "certificate" | "resume" | "portfolio" | "research" | "other"
  >("document");

  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [contribution, setContribution] = useState("");
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [urlOrRef, setUrlOrRef] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSimulatedFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    setTimeout(() => {
      addEvidenceItem({
        title: title || "New Uploaded Evidence Artifact",
        description: `Imported as ${category.toUpperCase()} artifact with verified provenance.`,
        sourceType: category,
        sourceReference: fileName || urlOrRef || "Uploaded File",
        sourceUrl: urlOrRef || undefined,
        project: project || "Independent Work",
        evidenceType:
          category === "certificate"
            ? "Course Certificate"
            : category === "research"
            ? "Research Publication"
            : "Project Report",
        date: new Date().toISOString().split("T")[0],
        claimedContribution: contribution || "Sole Author / Individual Contributor",
        author: "Alex Rivera",
        isCollaborative,
        evidenceStrength: "high",
        extractionConfidence: 95,
        processingStatus: "ready_for_review",
        reviewStatus: "needs_confirmation",
        normalizedMetadata: {
          format: fileName ? fileName.split(".").pop()?.toUpperCase() || "PDF" : "URL",
          authorIdentified: "Alex Rivera",
          fileSize: "2.4 MB",
        },
        extractedSummary: `Normalized artifact: ${title}. Awaiting human review before contributing to skill verification.`,
        candidateSkills: [
          {
            id: `cs-${Date.now()}-1`,
            name: title.includes("API") ? "API Integration" : "Software Engineering",
            category: "Core Engineering",
            excerpt: "Demonstrated in uploaded artifact: " + title,
            associationReason: "Direct practical artifact documentation.",
            status: "candidate",
            proficiencyLevel: "Practitioner",
          },
        ],
        processingHistory: [
          {
            stage: "Upload & OCR",
            status: "completed",
            timestamp: "Just now",
            detail: "Normalized artifact text",
          },
          {
            stage: "Skill Mapping",
            status: "completed",
            timestamp: "Just now",
            detail: "Candidate skill detected",
          },
        ],
      });

      setUploading(false);
      setSuccess(true);
    }, 700);
  };

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Upload Work &amp; Documents"
        description="Add certificates, technical reports, papers, and portfolio URLs to your Evidence Library."
        backHref="/app/evidence"
        backLabel="Evidence Center"
      />

      <main className="p-6 lg:p-10 space-y-8 max-w-4xl">
        {/* Category Selector Tabs */}
        <section className="space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/60 block">
            SELECT EVIDENCE CATEGORY
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { id: "document", label: "Project Doc", icon: FileCode },
              { id: "certificate", label: "Certificate", icon: Award },
              { id: "resume", label: "Resume / CV", icon: FileText },
              { id: "portfolio", label: "Project URL", icon: Globe },
              { id: "research", label: "Research", icon: BookOpen },
              { id: "other", label: "Other Artifact", icon: UploadCloud },
            ].map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id as any)}
                  className={`p-3 rounded-2xl border-[1.5px] border-[#1C1C1C] flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#DFE968] shadow-[2px_2px_0_0_#1C1C1C]"
                      : "bg-[#FBF6DF] opacity-75 hover:opacity-100"
                  }`}
                >
                  <Icon className="w-5 h-5 text-[#1C1C1C]" />
                  <span className="text-[11px] font-black">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {success ? (
          <div className="p-8 rounded-[32px] border-[2px] border-[#1C1C1C] bg-[#DFE968] text-center space-y-4 shadow-[4px_4px_0_0_#1C1C1C]">
            <CheckCircle2 className="w-12 h-12 text-[#4A7A4E] mx-auto" />
            <h3 className="text-2xl font-black text-[#1C1C1C]">Artifact Uploaded &amp; Normalized!</h3>
            <p className="text-sm font-medium text-[#1C1C1C]/80 max-w-md mx-auto">
              Your item has been indexed as candidate evidence with candidate skills waiting for human attribution confirmation.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link
                href="/app/evidence/library"
                className="pill-btn pill-btn-primary text-xs py-3 px-6"
              >
                VIEW IN EVIDENCE LIBRARY →
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSuccess(false);
                  setTitle("");
                  setFileName("");
                  setContribution("");
                }}
                className="pill-btn pill-btn-secondary text-xs py-3 px-6"
              >
                UPLOAD ANOTHER
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Drop Area */}
            {category !== "portfolio" ? (
              <div className="p-8 rounded-[28px] border-[2px] border-dashed border-[#1C1C1C] bg-[#FBF6DF] text-center space-y-3 relative">
                <input
                  type="file"
                  onChange={handleSimulatedFileSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="w-12 h-12 rounded-full bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center mx-auto shadow-[1.5px_1.5px_0_0_#1C1C1C]">
                  <UploadCloud className="w-6 h-6 text-[#1C1C1C]" />
                </div>
                <div>
                  <p className="text-sm font-black text-[#1C1C1C]">
                    {fileName ? `Selected: ${fileName}` : "Click or drag file to simulate upload"}
                  </p>
                  <p className="text-xs font-medium text-[#1C1C1C]/60 mt-1">
                    Accepts PDF, DOCX, PNG, JPG (Simulated client-side parsing)
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider ml-2">
                  Project or Portfolio URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://github.com/my-project or https://portfolio.dev"
                  className="pill-input bg-[#FBF6DF]"
                  value={urlOrRef}
                  onChange={(e) => setUrlOrRef(e.target.value)}
                />
              </div>
            )}

            {/* Metadata Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider ml-2">
                  Document / Artifact Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Telemetry Capstone"
                  className="pill-input bg-[#FBF6DF]"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider ml-2">
                  Related Project Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Smart Irrigation Platform"
                  className="pill-input bg-[#FBF6DF]"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider ml-2">
                Your Specific Claimed Contribution
              </label>
              <textarea
                rows={3}
                required
                placeholder="Explain what portions you personally implemented or authored..."
                className="w-full p-4 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] text-xs font-medium outline-none focus:ring-2 focus:ring-[#1C1C1C]"
                value={contribution}
                onChange={(e) => setContribution(e.target.value)}
              />
            </div>

            {/* Collaborative Toggle */}
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-[#1C1C1C] bg-[#FBF6DF]">
              <input
                type="checkbox"
                id="collaborative"
                checked={isCollaborative}
                onChange={(e) => setIsCollaborative(e.target.checked)}
                className="w-4 h-4 accent-[#1C1C1C]"
              />
              <label htmlFor="collaborative" className="text-xs font-bold text-[#1C1C1C] cursor-pointer">
                This was a team or collaborative project (will flag attribution for review)
              </label>
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="pill-btn pill-btn-primary text-xs py-3.5 px-8 w-full justify-center"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  SIMULATING EXTRACTION &amp; NORMALIZATION ···
                </>
              ) : (
                "SUBMIT TO EVIDENCE LIBRARY →"
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
