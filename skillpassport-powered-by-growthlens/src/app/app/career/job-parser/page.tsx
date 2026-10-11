"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileSearch,
  Sparkles,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Plus,
  Trash2,
  Scale,
  Save,
  HelpCircle,
  FileText,
} from "lucide-react";
import { useEvidence } from "@/context/EvidenceContext";
import { SAMPLE_JOB_DESCRIPTIONS } from "@/data/careerMock";
import {
  RoleDemandModel,
  RoleCompetency,
  RequirementType,
  ImportanceLevel,
} from "@/types/career";
import { ProficiencyLevel } from "@/types/passport";
import { DemoDataNotice, DemoRoleSelector } from "@/components/app/AIBadges";
import AppTopBar from "@/components/app/AppTopBar";

interface ExtractedCompItem {
  id: string;
  original_label: string;
  skill_id: string;
  canonical_name: string;
  category: string;
  requirement_type: RequirementType;
  importance: ImportanceLevel;
  expected_level: ProficiencyLevel;
  evidence_expectation: string;
  source_span: string;
  mapping_status: "mapped" | "ambiguous" | "unrecognized";
}

export default function JobDescriptionParserPage() {
  const router = useRouter();
  const { saveCustomRole, setSelectedRoleId } = useEvidence();

  const [jobTitle, setJobTitle] = useState("AI Product Engineer");
  const [companyName, setCompanyName] = useState("TerraPulse Analytics");
  const [seniority, setSeniority] = useState<"Entry Level" | "Mid Level" | "Senior Level">("Entry Level");
  const [rawText, setRawText] = useState(SAMPLE_JOB_DESCRIPTIONS[0].text);
  const [isParsing, setIsParsing] = useState(false);
  const [parsed, setParsed] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [competencies, setCompetencies] = useState<ExtractedCompItem[]>([
    {
      id: "comp-1",
      original_label: "Python (asyncio, type hints, pytest)",
      skill_id: "skill-python",
      canonical_name: "Python Engineering",
      category: "Programming",
      requirement_type: "core_required",
      importance: "critical",
      expected_level: "Practitioner",
      evidence_expectation: "Asynchronous Python services, type hints, and pytest suites.",
      source_span: "Strong demonstrable skills in Python (asyncio, type hints, pytest).",
      mapping_status: "mapped",
    },
    {
      id: "comp-2",
      original_label: "REST APIs & message queues (RabbitMQ)",
      skill_id: "skill-api-integration",
      canonical_name: "API Integration & Messaging",
      category: "Software Engineering",
      requirement_type: "core_required",
      importance: "high",
      expected_level: "Practitioner",
      evidence_expectation: "API development and message queue integration (RabbitMQ or Kafka).",
      source_span: "Hands-on experience with API development and message queue integration (RabbitMQ or Kafka).",
      mapping_status: "mapped",
    },
    {
      id: "comp-3",
      original_label: "Supervised Machine Learning regression",
      skill_id: "skill-machine-learning",
      canonical_name: "Machine Learning (Supervised)",
      category: "AI & Machine Learning",
      requirement_type: "core_required",
      importance: "high",
      expected_level: "Practitioner",
      evidence_expectation: "Supervised Machine Learning model training and evaluation.",
      source_span: "Foundational understanding of Supervised Machine Learning (regression and classification).",
      mapping_status: "mapped",
    },
    {
      id: "comp-4",
      original_label: "Docker containerization",
      skill_id: "skill-cloud-deployment",
      canonical_name: "Cloud & Container Deployment",
      category: "Cloud & Deployment",
      requirement_type: "core_required",
      importance: "high",
      expected_level: "Working",
      evidence_expectation: "Containerizing services with Docker and Docker Compose.",
      source_span: "Practical experience containerizing applications using Docker.",
      mapping_status: "mapped",
    },
    {
      id: "comp-5",
      original_label: "Deep Learning (PyTorch exposure)",
      skill_id: "skill-deep-learning",
      canonical_name: "Deep Learning Foundations",
      category: "AI & Machine Learning",
      requirement_type: "preferred",
      importance: "medium",
      expected_level: "Working",
      evidence_expectation: "Exposure to PyTorch or neural network training.",
      source_span: "Deep Learning course completion or exposure to PyTorch.",
      mapping_status: "mapped",
    },
    {
      id: "comp-6",
      original_label: "Telemetry data analysis",
      skill_id: "skill-data-analysis",
      canonical_name: "Data & Telemetry Analysis",
      category: "Data & Analytics",
      requirement_type: "supporting",
      importance: "medium",
      expected_level: "Working",
      evidence_expectation: "Exploratory data analysis and telemetry sanity checks using Pandas.",
      source_span: "Perform exploratory data analysis and telemetry sanity checks using Pandas.",
      mapping_status: "mapped",
    },
    {
      id: "comp-7",
      original_label: "Technical documentation & RFCs",
      skill_id: "skill-technical-writing",
      canonical_name: "Research & Technical Writing",
      category: "Research & Technical Communication",
      requirement_type: "preferred",
      importance: "low",
      expected_level: "Working",
      evidence_expectation: "Clear technical documentation and API specifications.",
      source_span: "Author clear technical documentation and API specifications.",
      mapping_status: "mapped",
    },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleLoadSample = (sampleId: string) => {
    const s = SAMPLE_JOB_DESCRIPTIONS.find((x) => x.id === sampleId);
    if (!s) return;
    setJobTitle(s.title);
    setCompanyName(s.company);
    setRawText(s.text);
    showToast(`Loaded sample: "${s.title}"`);
  };

  const handleSimulateParse = () => {
    if (!rawText.trim()) return;
    setIsParsing(true);
    setTimeout(() => {
      setIsParsing(false);
      setParsed(true);
      showToast("Job text parsed successfully into structured requirements!");
    }, 1200);
  };

  const handleRemoveComp = (id: string) => {
    setCompetencies(competencies.filter((c) => c.id !== id));
  };

  const handleUpdateComp = (id: string, updates: Partial<ExtractedCompItem>) => {
    setCompetencies(
      competencies.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleSaveAndCompare = () => {
    const customRoleId = `role-custom-${Date.now()}`;
    const newCustomModel: RoleDemandModel = {
      role_id: customRoleId,
      version: "v2026.custom.1",
      title: jobTitle,
      seniority: seniority,
      context: `${companyName || "Custom Employer"} — Parsed Specification`,
      description: `Custom role extracted from job posting: ${jobTitle} at ${companyName || "Employer"}.`,
      provenance: `Parsed from user-provided job description text on ${new Date().toLocaleDateString()}`,
      source_type: "custom_parsed_job",
      created_at: "Just now",
      updated_at: "Just now",
      competencies: competencies.map((c) => ({
        skill_id: c.skill_id,
        canonical_name: c.canonical_name,
        category: c.category,
        requirement_type: c.requirement_type,
        importance: c.importance,
        presence_rate: 95,
        expected_level: c.expected_level,
        expected_level_numeric:
          c.expected_level === "Expert"
            ? 5
            : c.expected_level === "Advanced"
            ? 4
            : c.expected_level === "Practitioner"
            ? 3
            : c.expected_level === "Working"
            ? 2
            : 1,
        evidence_expectation: c.evidence_expectation,
        prerequisites: [],
        reason_codes: ["PARSED_FROM_JOB_TEXT"],
        source_references: [c.source_span],
        mapping_status: c.mapping_status,
        source_span: c.source_span,
      })),
    };

    saveCustomRole(newCustomModel);
    setSelectedRoleId(customRoleId);
    showToast(`Custom role "${jobTitle}" saved and set as active target!`);
    router.push("/app/career/match");
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink text-white px-5 py-3 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2 border border-ink/20 animate-fade-in">
          <Sparkles className="w-4 h-4 text-sand" />
          <span>{toastMessage}</span>
        </div>
      )}

      <AppTopBar
        title="Analyze a Job Description"
        description="Turn any real-world job posting into structured, versioned role requirements. Review and edit the canonical taxonomy mappings, importance weights, and expected proficiencies before comparing with your SkillPassport."
        badge="Simulated Job Parsing"
        badgeColor="border-purple-300 text-purple-900 bg-purple-100"
      />

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto pb-16">

      {/* Input Options Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Job Text Area and Metadata Form */}
        <div className="lg:col-span-5 space-y-4">
          <div className="gl-card p-5 bg-white space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <FileText className="w-4 h-4 text-ink" />
                Job Description Input
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-ink-muted">Samples:</span>
                <button
                  type="button"
                  onClick={() => handleLoadSample("sample-job-01")}
                  className="text-[11px] font-semibold text-ink underline hover:text-sky-800"
                >
                  AI Engineer
                </button>
                <span className="text-ink-muted">&bull;</span>
                <button
                  type="button"
                  onClick={() => handleLoadSample("sample-job-02")}
                  className="text-[11px] font-semibold text-ink underline hover:text-sky-800"
                >
                  Backend
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-ink mb-1">Target Job Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="pill-input w-full text-xs"
                  placeholder="e.g. AI Application Engineer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-ink mb-1">Company / Organization</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="pill-input w-full text-xs"
                    placeholder="e.g. TerraPulse Analytics"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink mb-1">Target Seniority</label>
                  <select
                    value={seniority}
                    onChange={(e) => setSeniority(e.target.value as any)}
                    className="pill-input w-full text-xs"
                  >
                    <option value="Entry Level">Entry Level</option>
                    <option value="Mid Level">Mid Level</option>
                    <option value="Senior Level">Senior Level</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">
                  Paste Raw Job Posting Text
                </label>
                <textarea
                  rows={10}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="w-full p-3 rounded-xl border border-ink/20 font-mono text-[11px] leading-relaxed focus:ring-1 focus:ring-ink focus:outline-none"
                  placeholder="Paste requirements, responsibilities, and qualifications..."
                />
              </div>

              <button
                type="button"
                onClick={handleSimulateParse}
                disabled={isParsing || !rawText.trim()}
                className="pill-btn pill-btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-2 shadow-sm"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isParsing ? "animate-spin" : ""}`} />
                {isParsing ? "Extracting Requirements..." : "Analyze Job Description →"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Parsed & Editable Competencies */}
        <div className="lg:col-span-7 space-y-4">
          <div className="gl-card p-6 bg-white space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink/10 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-sand font-bold text-ink uppercase">
                    {seniority}
                  </span>
                  <span className="text-xs font-mono text-ink-muted">
                    {competencies.length} Extracted Requirements
                  </span>
                </div>
                <h3 className="text-xl font-bold text-ink">
                  {jobTitle} <span className="font-normal text-ink-muted">at {companyName}</span>
                </h3>
              </div>

              <button
                type="button"
                onClick={handleSaveAndCompare}
                className="pill-btn pill-btn-primary text-xs py-2.5 px-5 flex items-center gap-2 shadow-md shrink-0"
              >
                <Save className="w-3.5 h-3.5" /> Save & Compare My Skills &rarr;
              </button>
            </div>

            <p className="text-xs text-ink/80 leading-relaxed">
              Review and correct the extracted requirements below. You can adjust requirement types,
              change importance ratings, or fine-tune the expected proficiency levels.
            </p>

            {/* Editable Competencies List */}
            <div className="space-y-3">
              {competencies.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-ink/15 bg-sand/10 hover:bg-sand/20 transition-all space-y-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-ink text-sm flex items-center gap-2">
                        {item.canonical_name}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-ink/10 text-ink-muted font-normal">
                          {item.skill_id}
                        </span>
                      </div>
                      <span className="text-[11px] text-ink-muted font-mono block mt-0.5">
                        Matched from: &ldquo;{item.original_label}&rdquo;
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveComp(item.id)}
                      className="text-ink-muted hover:text-red-700 p-1"
                      title="Remove requirement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Editable Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-ink-muted mb-0.5">
                        Requirement Type
                      </label>
                      <select
                        value={item.requirement_type}
                        onChange={(e) =>
                          handleUpdateComp(item.id, {
                            requirement_type: e.target.value as any,
                          })
                        }
                        className="pill-input w-full text-xs py-1"
                      >
                        <option value="core_required">Core Required</option>
                        <option value="supporting">Supporting</option>
                        <option value="preferred">Preferred</option>
                        <option value="differentiating">Differentiating</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-ink-muted mb-0.5">
                        Importance
                      </label>
                      <select
                        value={item.importance}
                        onChange={(e) =>
                          handleUpdateComp(item.id, {
                            importance: e.target.value as any,
                          })
                        }
                        className="pill-input w-full text-xs py-1"
                      >
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-ink-muted mb-0.5">
                        Expected Proficiency
                      </label>
                      <select
                        value={item.expected_level}
                        onChange={(e) =>
                          handleUpdateComp(item.id, {
                            expected_level: e.target.value as any,
                          })
                        }
                        className="pill-input w-full text-xs py-1"
                      >
                        <option value="Foundation">Foundation</option>
                        <option value="Working">Working</option>
                        <option value="Practitioner">Practitioner</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Expert">Expert</option>
                      </select>
                    </div>
                  </div>

                  {/* Source Span Box */}
                  <div className="p-2.5 bg-white/80 rounded-xl border border-ink/10 text-[11px] font-mono text-ink-muted">
                    <span className="font-bold text-ink">Source Span: </span>
                    &ldquo;{item.source_span}&rdquo;
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Controls */}
            <div className="pt-4 border-t border-ink/10 flex items-center justify-between">
              <span className="text-[11px] text-ink-muted font-mono">
                Saving creates an immutable versioned custom demand model.
              </span>
              <button
                type="button"
                onClick={handleSaveAndCompare}
                className="pill-btn pill-btn-primary text-xs py-2 px-5 flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" /> Save & Compute Match &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
