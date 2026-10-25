"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Network,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Edit2,
  Save,
  Filter,
} from "lucide-react";
import { useEvidence } from "@/context/EvidenceContext";
import {
  TargetRoleSelectorBar,
  RequirementTypeBadge,
  ImportanceBadge,
} from "@/components/app/CareerBadges";
import AppTopBar from "@/components/app/AppTopBar";
import { MappingStatus } from "@/types/career";

export default function RoleSkillMappingPage() {
  const { activeRole, skills, updateRoleCompetency } = useEvidence();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editedCanonicalId, setEditedCanonicalId] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredCompetencies = activeRole.competencies.filter((c) => {
    if (statusFilter === "all") return true;
    return c.mapping_status === statusFilter;
  });

  const mappedCount = activeRole.competencies.filter(
    (c) => c.mapping_status === "mapped" || c.mapping_status === "alias_resolved"
  ).length;

  const ambiguousCount = activeRole.competencies.filter(
    (c) => c.mapping_status === "ambiguous" || c.mapping_status === "needs_review"
  ).length;

  const handleStartEdit = (skillId: string) => {
    setEditingSkillId(skillId);
    setEditedCanonicalId(skillId);
  };

  const handleSaveCorrection = (skillId: string) => {
    const targetCanonicalSkill = skills.find((s) => s.id === editedCanonicalId);
    if (targetCanonicalSkill) {
      updateRoleCompetency(activeRole.role_id, skillId, {
        skill_id: targetCanonicalSkill.id,
        canonical_name: targetCanonicalSkill.canonicalName,
        category: targetCanonicalSkill.category,
        mapping_status: "mapped",
      });
      showToast(`Mapping updated to canonical skill "${targetCanonicalSkill.canonicalName}"`);
    }
    setEditingSkillId(null);
  };

  const getStatusBadge = (status: MappingStatus) => {
    switch (status) {
      case "mapped":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
            Mapped (1:1)
          </span>
        );
      case "alias_resolved":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-sky-100 text-sky-900 border border-sky-300">
            Alias Resolved
          </span>
        );
      case "related":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
            Related
          </span>
        );
      case "ambiguous":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-purple-100 text-purple-900 border border-purple-300">
            Ambiguous
          </span>
        );
      case "unrecognized":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-red-100 text-red-900 border border-red-300">
            Unrecognized
          </span>
        );
      case "needs_review":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-orange-100 text-orange-900 border border-orange-300">
            Needs Review
          </span>
        );
    }
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
        title="Role–Skill Taxonomy Mapping"
        description="Inspect how external job requirements resolve into the canonical SkillPassport ontology. Loose terminology or synonym aliases are anchored strictly to canonical skills to prevent fragmentation."
        badge="Canonical Ontology"
      />

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto pb-16">

      {/* Target Role Selector Bar */}
      <TargetRoleSelectorBar />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="gl-card p-4 bg-white">
          <span className="text-xs font-mono text-ink-muted uppercase">Role Demands</span>
          <p className="text-2xl font-bold text-ink mt-1">{activeRole.competencies.length}</p>
          <span className="text-[11px] text-ink-muted">In active role model</span>
        </div>
        <div className="gl-card p-4 bg-emerald-50/50 border-emerald-200">
          <span className="text-xs font-mono text-emerald-950 uppercase">Mapped Canonical</span>
          <p className="text-2xl font-bold text-emerald-950 mt-1">{mappedCount}</p>
          <span className="text-[11px] text-emerald-800">1:1 Canonical Anchor</span>
        </div>
        <div className="gl-card p-4 bg-purple-50/50 border-purple-200">
          <span className="text-xs font-mono text-purple-950 uppercase">Ambiguous / Aliased</span>
          <p className="text-2xl font-bold text-purple-950 mt-1">{ambiguousCount}</p>
          <span className="text-[11px] text-purple-800">Reviewable mapping</span>
        </div>
        <div className="gl-card p-4 bg-white">
          <span className="text-xs font-mono text-ink-muted uppercase">Ontology Anchor</span>
          <p className="text-sm font-bold text-ink mt-2">Domain 2 Skill Taxonomy</p>
          <span className="text-[11px] text-ink-muted">Single source of truth</span>
        </div>
      </div>

      {/* Filter and Mapping Table */}
      <div className="gl-card p-6 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink/10 pb-4">
          <h3 className="text-base font-bold text-ink flex items-center gap-2">
            <Network className="w-4 h-4 text-ink" />
            Requirement Mapping Matrix ({filteredCompetencies.length})
          </h3>

          <div className="flex items-center gap-1.5 bg-ink/5 p-1 rounded-full text-xs">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-0.5 rounded-full font-medium ${
                statusFilter === "all" ? "bg-ink text-white" : "text-ink-muted hover:text-ink"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("mapped")}
              className={`px-2.5 py-0.5 rounded-full font-medium ${
                statusFilter === "mapped" ? "bg-emerald-700 text-white" : "text-ink-muted hover:text-ink"
              }`}
            >
              Mapped
            </button>
            <button
              onClick={() => setStatusFilter("ambiguous")}
              className={`px-2.5 py-0.5 rounded-full font-medium ${
                statusFilter === "ambiguous" ? "bg-purple-700 text-white" : "text-ink-muted hover:text-ink"
              }`}
            >
              Ambiguous
            </button>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[680px]">
            <thead>
              <tr className="border-b border-ink/10 text-ink-muted font-mono uppercase text-[10px]">
                <th className="py-3 px-3">Role Requirement Label</th>
                <th className="py-3 px-3">Canonical Skill Anchor</th>
                <th className="py-3 px-3">Requirement Type</th>
                <th className="py-3 px-3">Importance</th>
                <th className="py-3 px-3">Expected Level</th>
                <th className="py-3 px-3">Mapping Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10 font-sans">
              {filteredCompetencies.map((comp, idx) => {
                const isEditing = editingSkillId === comp.skill_id;

                return (
                  <tr key={`${comp.skill_id}-${idx}`} className="hover:bg-sand/10 transition-all">
                    <td className="py-3.5 px-3 font-medium text-ink">
                      <div>{comp.canonical_name}</div>
                      {comp.source_span && (
                        <div className="text-[11px] text-ink-muted font-mono line-clamp-1 italic">
                          &ldquo;{comp.source_span}&rdquo;
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editedCanonicalId}
                            onChange={(e) => setEditedCanonicalId(e.target.value)}
                            className="pill-input text-xs py-1"
                          >
                            {skills.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.canonicalName} ({s.category})
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleSaveCorrection(comp.skill_id)}
                            className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                            title="Save mapping"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <Link
                          href={`/app/passport/skills/${comp.skill_id}`}
                          className="font-bold text-ink hover:underline flex items-center gap-1.5"
                        >
                          {comp.canonical_name}
                          <ExternalLink className="w-3 h-3 text-ink-muted" />
                        </Link>
                      )}
                      <span className="text-[10px] font-mono text-ink-muted block">
                        ID: {comp.skill_id}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <RequirementTypeBadge type={comp.requirement_type} />
                    </td>

                    <td className="py-3.5 px-3">
                      <ImportanceBadge importance={comp.importance} />
                    </td>

                    <td className="py-3.5 px-3 font-mono font-bold text-ink">
                      {comp.expected_level}
                    </td>

                    <td className="py-3.5 px-3">
                      {getStatusBadge(comp.mapping_status)}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      {!isEditing && (
                        <button
                          onClick={() => handleStartEdit(comp.skill_id)}
                          className="text-xs text-ink hover:underline font-semibold flex items-center gap-1 ml-auto"
                        >
                          <Edit2 className="w-3 h-3" /> Correct
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pt-3 border-t border-ink/10 flex items-center justify-between text-xs text-ink-muted">
          <span>
            Anchors guarantee that the SkillPassport capability state matches the role model cleanly.
          </span>
          <Link
            href="/app/career/match"
            className="pill-btn pill-btn-primary text-xs py-1.5 px-4 flex items-center gap-1"
          >
            Proceed to Role Match &rarr;
          </Link>
        </div>
      </div>
    </div>
  </div>
);
}
