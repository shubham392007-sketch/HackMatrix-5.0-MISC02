"use client";

import React from "react";
import { Check, Sparkles, Layout, Shield, Terminal, Cpu, Server, BookOpen, TrendingUp, EyeOff } from "lucide-react";
import { PassportTemplateId } from "@/types/sharing";

export interface TemplateDefinition {
  id: PassportTemplateId;
  name: string;
  badge: string;
  description: string;
  icon: React.ElementType;
  previewBg: string;
}

export const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  {
    id: "classic",
    name: "Professional Classic",
    badge: "Most Popular",
    description: "Formal, recruiter-friendly profile with clear identity banner, verified skills, and artifact proofs.",
    icon: Layout,
    previewBg: "from-[#FBF6DF] to-[#FFFFFF]",
  },
  {
    id: "executive",
    name: "Minimal Executive",
    badge: "Compact & Restrained",
    description: "High-density, restrained aesthetic emphasizing professional headline, strategic competencies, and audited proof.",
    icon: Shield,
    previewBg: "from-stone-50 to-white",
  },
  {
    id: "technical",
    name: "Technical Portfolio",
    badge: "Developer Centric",
    description: "Dark-accent terminal aesthetic, monospace typography, code repository highlights, and PR commit links.",
    icon: Terminal,
    previewBg: "from-[#1C1C1C] to-[#2D2D2D]",
  },
  {
    id: "ai_ml",
    name: "AI & Machine Learning",
    badge: "AI Engineering",
    description: "Structured layout for model architectures, dataset evaluations, LLM grounding, and AI governance.",
    icon: Cpu,
    previewBg: "from-[#2A2A2A] to-[#1C1C1C]",
  },
  {
    id: "engineering",
    name: "Software & Full-Stack",
    badge: "Systems & Cloud",
    description: "Architecture-driven layout emphasizing system design, service deliverables, and PR verification.",
    icon: Server,
    previewBg: "from-[#FBF6DF] to-[#E8F086]",
  },
  {
    id: "academic",
    name: "Research & Academic",
    badge: "Paper & Citations",
    description: "Formal publication style with serif typography, structured abstract, methodologies, and citation markers.",
    icon: BookOpen,
    previewBg: "from-[#FCFAF2] to-[#F5F0E1]",
  },
  {
    id: "project",
    name: "Project & Impact",
    badge: "Case Study Focus",
    description: "Project and deliverable-first layout grouping demonstrated competencies under business outcome case studies.",
    icon: TrendingUp,
    previewBg: "from-[#FBF6DF] to-white",
  },
  {
    id: "anonymous",
    name: "Privacy-First Anonymous",
    badge: "Zero-Knowledge",
    description: "Candidate personal identity completely concealed; focuses strictly on objective cryptographic skills.",
    icon: EyeOff,
    previewBg: "from-[#1C1C1C] to-[#333333]",
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
  const activeId = selectedTemplateId || selectedTemplate || "classic";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
            <Layout className="w-4 h-4 text-[#1C1C1C]" />
            Choose Passport Template (8 Styles)
          </h3>
          <p className="text-xs text-[#1C1C1C]/60">
            Select a presentation layout. One data model powers all views — template selection never changes verification state.
          </p>
        </div>
        <span className="text-xs font-bold text-[#1C1C1C]/60 bg-[#1C1C1C]/5 px-2.5 py-1 rounded-full border border-[#1C1C1C]/10">
          Selected: {TEMPLATE_DEFINITIONS.find((t) => t.id === activeId)?.name}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {TEMPLATE_DEFINITIONS.map((tmpl) => {
          const isSelected = tmpl.id === activeId;
          const Icon = tmpl.icon;

          return (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => onSelectTemplate(tmpl.id)}
              className={`text-left p-4 rounded-2xl border-[2px] transition-all relative overflow-hidden flex flex-col justify-between group cursor-pointer ${
                isSelected
                  ? "border-[#1C1C1C] bg-[#FBF6DF] shadow-[4px_4px_0_0_#1C1C1C] -translate-y-0.5"
                  : "border-[#1C1C1C]/15 bg-white hover:border-[#1C1C1C]/40 hover:bg-[#FBF6DF]/30"
              }`}
            >
              {/* Active selection tick */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#1C1C1C] text-[#FBF6DF] flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}

              {/* Top Row: Icon & Badge */}
              <div className="space-y-3">
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
                  <p className="text-[11px] text-[#1C1C1C]/70 leading-relaxed mt-1 line-clamp-3">
                    {tmpl.description}
                  </p>
                </div>
              </div>

              {/* Bottom Mini Preview Bar */}
              <div className="mt-4 pt-3 border-t border-[#1C1C1C]/10 flex items-center justify-between text-[10px] font-mono text-[#1C1C1C]/60">
                <span className="capitalize">{tmpl.id}</span>
                <span className="font-sans font-bold">
                  {isSelected ? "Active Layout" : "Click to Apply"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
