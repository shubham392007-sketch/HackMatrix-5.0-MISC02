"use client";

import React from "react";
import {
  Check,
  Sparkles,
  Layout,
  Shield,
  Terminal,
  Cpu,
  Server,
  BookOpen,
  TrendingUp,
  EyeOff,
  Briefcase,
  Layers,
  FileText,
  GitBranch,
} from "lucide-react";
import { PassportTemplateId } from "@/types/sharing";
import { normalizeTemplateId } from "./templates/TemplateDispatcher";

export interface TemplateDefinition {
  id: PassportTemplateId;
  name: string;
  badge: string;
  description: string;
  icon: React.ElementType;
  previewBg: string;
  architectureType:
    | "two-column-credential"
    | "single-column-resume"
    | "terminal-project-grid"
    | "ai-ml-architecture"
    | "fullstack-layers"
    | "academic-paper"
    | "case-study-impact"
    | "privacy-minimal";
}

export const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  {
    id: "verified-competency",
    name: "Verified Competency Passport",
    badge: "Signature Layout",
    description: "Editorial credential design prioritizing authoritative verified competencies, two-column layout, and direct evidence links.",
    icon: Shield,
    previewBg: "from-[#FBF6DF] to-white",
    architectureType: "two-column-credential",
  },
  {
    id: "professional-resume",
    name: "Professional Resume",
    badge: "Chronological",
    description: "Polished single-column resume with reverse-chronological experience, education, verified skills, and print-ready typography.",
    icon: FileText,
    previewBg: "from-stone-50 to-white",
    architectureType: "single-column-resume",
  },
  {
    id: "technical-portfolio",
    name: "Technical Portfolio",
    badge: "Project-First",
    description: "Developer-centric dark terminal header, 2-column project cards, repository links, and code commit evidence.",
    icon: Terminal,
    previewBg: "from-[#1C1C1C] to-[#2D2D2D]",
    architectureType: "terminal-project-grid",
  },
  {
    id: "ai-ml-engineer",
    name: "AI & Machine Learning",
    badge: "AI Engineering",
    description: "High-tech neural architecture, model pipelines, dynamic verification metrics, and benchmark evaluation evidence.",
    icon: Cpu,
    previewBg: "from-[#1C1C1C] to-[#2A2A2A]",
    architectureType: "ai-ml-architecture",
  },
  {
    id: "software-fullstack",
    name: "Software & Full-Stack",
    badge: "Systems & Layers",
    description: "Architecture-driven layout organizing capabilities by tier (Frontend, Backend & APIs, Cloud/DB) with deliverables.",
    icon: Server,
    previewBg: "from-[#FBF6DF] to-[#E8F086]",
    architectureType: "fullstack-layers",
  },
  {
    id: "research-academic",
    name: "Research & Academic",
    badge: "Paper & Citations",
    description: "Formal academic publication style with serif typography, abstract box, numbered methodologies, and citation links.",
    icon: BookOpen,
    previewBg: "from-[#FCFAF2] to-[#F5F0E1]",
    architectureType: "academic-paper",
  },
  {
    id: "projects-impact",
    name: "Projects & Impact",
    badge: "Case Studies",
    description: "Narrative case study layout with Problem, Contribution, Measurable Outcomes, and tangible workplace deliverables.",
    icon: TrendingUp,
    previewBg: "from-[#FBF6DF] to-white",
    architectureType: "case-study-impact",
  },
  {
    id: "minimal-privacy",
    name: "Minimal & Privacy-First",
    badge: "Zero-Knowledge",
    description: "Restrained, compact layout shielding personal identifiable information while demonstrating objective verified skills.",
    icon: EyeOff,
    previewBg: "from-[#1C1C1C] to-[#333333]",
    architectureType: "privacy-minimal",
  },
];

export interface TemplateSelectorProps {
  selectedTemplateId?: PassportTemplateId;
  selectedTemplate?: PassportTemplateId;
  onSelectTemplate: (templateId: PassportTemplateId) => void;
}

export default function TemplateSelector({
  selectedTemplateId,
  selectedTemplate,
  onSelectTemplate,
}: TemplateSelectorProps) {
  const activeRaw = selectedTemplateId || selectedTemplate || "verified-competency";
  const activeNormalized = normalizeTemplateId(activeRaw);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
            <Layout className="w-4 h-4 text-[#1C1C1C]" />
            Choose Passport Template (8 Distinct Archetypes)
          </h3>
          <p className="text-xs text-[#1C1C1C]/60">
            Select a presentation layout. One canonical data model powers all views — template selection never changes verification state.
          </p>
        </div>
        <span className="text-xs font-bold text-[#1C1C1C] bg-[#DFE968]/50 px-3 py-1 rounded-full border border-[#1C1C1C]">
          Active: {TEMPLATE_DEFINITIONS.find((t) => t.id === activeNormalized)?.name || activeNormalized}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TEMPLATE_DEFINITIONS.map((tmpl) => {
          const isSelected = tmpl.id === activeNormalized;
          const Icon = tmpl.icon;

          return (
            <div
              key={tmpl.id}
              onClick={() => onSelectTemplate(tmpl.id)}
              className={`p-4 rounded-2xl border-[2px] transition-all relative overflow-hidden flex flex-col justify-between group cursor-pointer ${
                isSelected
                  ? "border-[#1C1C1C] bg-[#FBF6DF] shadow-[4px_4px_0_0_#1C1C1C] -translate-y-0.5"
                  : "border-[#1C1C1C]/15 bg-white hover:border-[#1C1C1C]/40 hover:bg-[#FBF6DF]/20"
              }`}
            >
              {/* Active selection tick */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#1C1C1C] text-[#FBF6DF] flex items-center justify-center z-10 shadow-sm">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}

              <div className="space-y-3">
                {/* Header: Icon & Badge */}
                <div className="flex items-center justify-between pr-6">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border border-[#1C1C1C]/20 ${
                      isSelected
                        ? "bg-[#DFE968] text-[#1C1C1C]"
                        : "bg-[#1C1C1C]/5 text-[#1C1C1C] group-hover:bg-[#DFE968]/50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      isSelected
                        ? "bg-[#DFE968] text-[#1C1C1C] border-[#1C1C1C]"
                        : "bg-stone-100 text-stone-600 border-stone-200"
                    }`}
                  >
                    {tmpl.badge}
                  </span>
                </div>

                {/* Name & Description */}
                <div>
                  <h4 className="text-xs font-black text-[#1C1C1C] group-hover:underline">
                    {tmpl.name}
                  </h4>
                  <p className="text-[11px] text-[#1C1C1C]/70 leading-relaxed mt-1 line-clamp-2">
                    {tmpl.description}
                  </p>
                </div>

                {/* Realistic Architectural Layout Miniature Preview */}
                <div className="p-2.5 rounded-xl bg-stone-100 border border-stone-300/80 overflow-hidden text-[9px]">
                  {tmpl.architectureType === "two-column-credential" && (
                    <div className="space-y-1.5">
                      <div className="h-4 bg-[#DFE968]/80 rounded border border-[#1C1C1C]/30 flex items-center px-1.5 justify-between">
                        <span className="font-bold text-[8px]">ID BAND</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                      <div className="grid grid-cols-12 gap-1">
                        <div className="col-span-8 space-y-1">
                          <div className="h-5 bg-white rounded border border-[#1C1C1C]/20 flex items-center px-1 font-mono text-[7px] text-emerald-800">
                            VERIFIED SKILLS (2-COL)
                          </div>
                          <div className="h-4 bg-white rounded border border-[#1C1C1C]/20 flex items-center px-1 text-[7px] text-stone-500">
                            EVIDENCE VAULT
                          </div>
                        </div>
                        <div className="col-span-4 space-y-1">
                          <div className="h-5 bg-white/80 rounded border border-stone-300 flex items-center justify-center text-[7px]">
                            DOMAINS
                          </div>
                          <div className="h-4 bg-white/80 rounded border border-stone-300 flex items-center justify-center text-[7px]">
                            ROLE
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {tmpl.architectureType === "single-column-resume" && (
                    <div className="space-y-1 bg-white p-1.5 rounded border border-stone-300 text-center">
                      <div className="font-bold text-[8px] border-b border-stone-300 pb-0.5">
                        CANDIDATE RESUME
                      </div>
                      <div className="space-y-0.5 text-left text-[7px] text-stone-600">
                        <div className="h-2 w-3/4 bg-stone-200 rounded" />
                        <div className="h-2 w-full bg-stone-100 rounded" />
                        <div className="h-2.5 w-full bg-emerald-50 border border-emerald-200 rounded px-1 flex items-center text-[7px] text-emerald-900">
                          VERIFIED COMPETENCIES
                        </div>
                      </div>
                    </div>
                  )}

                  {tmpl.architectureType === "terminal-project-grid" && (
                    <div className="space-y-1 bg-[#1C1C1C] p-1.5 rounded border border-stone-800 font-mono text-[#DFE968] text-[7px]">
                      <div className="flex items-center justify-between border-b border-stone-700 pb-0.5">
                        <span>&gt; whoami.sh</span>
                        <div className="flex gap-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          <div className="w-1.5 h-1.5 rounded-full bg-[#DFE968]" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-white">
                        <div className="bg-stone-800 p-1 rounded border border-stone-700 text-[6px]">
                          REPO: CORE_SYS
                        </div>
                        <div className="bg-stone-800 p-1 rounded border border-stone-700 text-[6px]">
                          REPO: API_GW
                        </div>
                      </div>
                    </div>
                  )}

                  {tmpl.architectureType === "ai-ml-architecture" && (
                    <div className="space-y-1 bg-gradient-to-r from-stone-900 to-stone-800 p-1.5 rounded border border-[#DFE968]/50 text-white text-[7px]">
                      <div className="flex items-center justify-between text-[#DFE968] font-bold">
                        <span>AI ARCHITECTURE</span>
                        <span>4-METRIC GRID</span>
                      </div>
                      <div className="grid grid-cols-2 gap-0.5 text-[6px] text-stone-300">
                        <div className="bg-white/10 px-1 py-0.5 rounded">EVAL CORPUS</div>
                        <div className="bg-white/10 px-1 py-0.5 rounded">MODELS/DATA</div>
                      </div>
                    </div>
                  )}

                  {tmpl.architectureType === "fullstack-layers" && (
                    <div className="space-y-1 bg-[#FBF6DF] p-1.5 rounded border border-[#1C1C1C]/40 text-[7px]">
                      <div className="h-2.5 bg-stone-800 text-[#DFE968] px-1 rounded flex items-center text-[6px]">
                        TIER 1: FRONTEND / UI
                      </div>
                      <div className="h-2.5 bg-stone-700 text-white px-1 rounded flex items-center text-[6px]">
                        TIER 2: BACKEND & APIS
                      </div>
                      <div className="h-2.5 bg-stone-600 text-white px-1 rounded flex items-center text-[6px]">
                        TIER 3: CLOUD & INFRA
                      </div>
                    </div>
                  )}

                  {tmpl.architectureType === "academic-paper" && (
                    <div className="space-y-1 bg-[#FCFAF2] p-1.5 rounded border border-stone-300 font-serif text-[7px] text-stone-800">
                      <div className="text-center font-normal italic border-b border-stone-200 pb-0.5">
                        1. Abstract & Methods
                      </div>
                      <div className="space-y-0.5 text-[6px] font-sans">
                        <div className="bg-white px-1 py-0.5 rounded border border-stone-200">
                          [1] PUBLICATIONS & PREPRINTS
                        </div>
                        <div className="bg-white px-1 py-0.5 rounded border border-stone-200">
                          [2] VERIFIED METHODOLOGIES
                        </div>
                      </div>
                    </div>
                  )}

                  {tmpl.architectureType === "case-study-impact" && (
                    <div className="space-y-1 bg-white p-1.5 rounded border border-[#1C1C1C]/30 text-[7px]">
                      <div className="font-bold text-stone-900 border-b border-stone-200 pb-0.5 flex justify-between">
                        <span>CASE STUDY</span>
                        <span className="text-emerald-700 font-bold">+28%</span>
                      </div>
                      <div className="bg-emerald-50 text-emerald-900 px-1 py-0.5 rounded text-[6px]">
                        ✓ CHALLENGE · IMPACT · PROOF
                      </div>
                    </div>
                  )}

                  {tmpl.architectureType === "privacy-minimal" && (
                    <div className="space-y-1 bg-stone-900 p-1.5 rounded border border-stone-700 text-stone-300 text-[7px]">
                      <div className="flex items-center gap-1 text-emerald-400 font-mono text-[6px]">
                        <span>[SHIELDED ID: #8F9A12]</span>
                      </div>
                      <div className="flex gap-1">
                        <span className="h-2 w-8 bg-emerald-800/80 rounded-full" />
                        <span className="h-2 w-10 bg-stone-700 rounded-full" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Apply Action Bar */}
              <div className="mt-4 pt-3 border-t border-[#1C1C1C]/10 flex items-center justify-between text-[11px] font-mono text-[#1C1C1C]">
                <span className="capitalize text-[10px] text-stone-500 font-mono">
                  {tmpl.id}
                </span>
                <span
                  className={`font-sans font-bold px-2 py-0.5 rounded-md text-[10px] ${
                    isSelected
                      ? "bg-[#1C1C1C] text-[#DFE968]"
                      : "bg-stone-100 group-hover:bg-[#DFE968]"
                  }`}
                >
                  {isSelected ? "Active Layout" : "Choose Template"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
