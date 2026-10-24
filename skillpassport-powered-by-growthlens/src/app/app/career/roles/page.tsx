"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Search,
  Filter,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Layers,
  Compass,
  Globe,
  Plus,
  Trash2,
  BookOpen,
  Target,
  AlertCircle,
  X,
} from "lucide-react";
import { useEvidence } from "@/context/EvidenceContext";
import AppTopBar from "@/components/app/AppTopBar";

export default function TargetRolesCataloguePage() {
  const {
    targetRoles,
    catalogueRoles,
    savedTargetRoles,
    selectedRoleId,
    setSelectedRoleId,
    saveCustomRole,
    removeTargetRole,
    saveCatalogueRoleToTargets,
  } = useEvidence();

  const [activeTab, setActiveTab] = useState<"targets" | "catalogue">("targets");
  const [searchQuery, setSearchQuery] = useState("");
  const [seniorityFilter, setSeniorityFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);

  // New Custom Role Form State
  const [newTitle, setNewTitle] = useState("");
  const [newSeniority, setNewSeniority] = useState("Mid Level");
  const [newContext, setNewContext] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine which list to display based on active tab
  const displayedRoles = activeTab === "targets"
    ? (savedTargetRoles || [])
    : catalogueRoles;

  const filteredRoles = displayedRoles.filter((role) => {
    if (seniorityFilter !== "all" && role.seniority !== seniorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = `${role.title} ${role.context} ${role.description}`.toLowerCase();
      if (!match.includes(q)) return false;
    }
    return true;
  });

  const handleCreateCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const slug = newTitle.toLowerCase().replace(/\s+/g, "-").slice(0, 24);
      const roleId = `role-custom-${slug}-${Date.now().toString(36)}`;
      const customModel = {
        role_id: roleId,
        version: "v2026.custom.1",
        title: newTitle.trim(),
        seniority: newSeniority as "Entry Level" | "Mid Level" | "Senior Level" | "Staff / Lead",
        context: newContext.trim() || "General Engineering",
        description: newDescription.trim() || `User-created target role for ${newTitle.trim()}.`,
        provenance: `User Target Definition (${new Date().toLocaleDateString()})`,
        source_type: "custom_parsed_job" as const,
        competencies: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await saveCustomRole(customModel);
      setSelectedRoleId(roleId);
      setIsAddModalOpen(false);
      setNewTitle("");
      setNewContext("");
      setNewDescription("");
      setActiveTab("targets");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;
    try {
      await removeTargetRole(roleToDelete);
    } finally {
      setRoleToDelete(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Role Targets & Benchmark Catalogue"
        description="Manage the roles you are actively targeting and explore curated industry benchmarks to guide your skill development."
        badge="Target Management"
        badgeColor="border-ink/20 text-ink bg-lime"
      >
        <div className="flex items-center gap-2">
          <Link
            href="/app/career/discover"
            className="pill-btn bg-lime/40 hover:bg-lime border border-ink/20 text-ink text-xs py-2 px-3 flex items-center gap-1.5 font-bold shadow-sm"
          >
            <Globe className="w-3.5 h-3.5" /> Discover Jobs
          </Link>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Add Target Role
          </button>
        </div>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto pb-16">
        {/* Navigation / Header */}
        <div className="flex items-center justify-between border-b border-ink/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="pill-btn bg-ink text-white shadow text-xs py-2 px-4 flex items-center gap-2 font-bold">
              <Target className="w-3.5 h-3.5" />
              My Target Roles ({savedTargetRoles.length})
            </span>
          </div>

          <div className="hidden sm:block text-xs font-mono text-ink-muted">
            {activeTab === "targets"
              ? "Your explicitly selected goals"
              : "Standard reference models"}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="gl-card p-4 bg-white space-y-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none z-10" />
              <input
                type="text"
                placeholder={
                  activeTab === "targets"
                    ? "Search your saved target roles..."
                    : "Search catalogue benchmarks by title, technology, context..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pill-input w-full !pl-12 text-xs"
                style={{ paddingLeft: "3.25rem" }}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <select
                value={seniorityFilter}
                onChange={(e) => setSeniorityFilter(e.target.value)}
                className="pill-input text-xs"
              >
                <option value="all">All Seniority Levels</option>
                <option value="Entry Level">Entry Level</option>
                <option value="Mid Level">Mid Level</option>
                <option value="Senior Level">Senior Level</option>
              </select>

              {(searchQuery || seniorityFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSeniorityFilter("all");
                  }}
                  className="text-xs text-ink-muted hover:text-ink underline px-2 py-1"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Empty State when no targets saved */}
        {activeTab === "targets" && filteredRoles.length === 0 && (
          <div className="gl-card p-12 text-center space-y-4 border-dashed border-2 border-ink/20">
            <div className="w-12 h-12 rounded-2xl bg-sand/40 border border-ink/20 flex items-center justify-center mx-auto text-ink">
              <Target className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-bold text-ink">No Saved Target Roles Yet</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                You have not explicitly saved any career targets yet. Explore standard benchmark roles in the catalogue or define your own custom target.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/app/career/discover"
                className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold shadow-sm"
              >
                <Globe className="w-3.5 h-3.5" /> Discover Jobs
              </Link>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-ink text-xs py-2 px-4 flex items-center gap-1.5 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add Custom Role
              </button>
            </div>
          </div>
        )}

        {/* Role Cards Grid or Empty States */}
        {activeTab === "targets" && (!savedTargetRoles || savedTargetRoles.length === 0) ? (
          <div className="gl-card p-12 text-center bg-white border border-ink/10 space-y-4 max-w-xl mx-auto my-8 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-sand/40 border border-ink/10 flex items-center justify-center mx-auto text-ink">
              <Compass className="w-6 h-6 text-ink" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-ink">
                You haven&apos;t selected a target role yet
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Choose a benchmark role from our curated catalogue or create a custom role from any job posting to begin skill gap analysis.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/app/career/discover"
                className="pill-btn pill-btn-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Globe className="w-3.5 h-3.5" />
                Discover Jobs
              </Link>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-ink text-xs py-2 px-4 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Custom Role
              </button>
            </div>
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="gl-card p-10 text-center bg-white border border-ink/10 space-y-2">
            <h4 className="text-sm font-bold text-ink">No roles match your search filters</h4>
            <p className="text-xs text-ink-muted">Try clearing your search query or seniority filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredRoles.map((role, roleIdx) => {
            const isSelected = role.role_id === selectedRoleId;
            const isSavedTarget = savedTargetRoles.some((r) => r.role_id === role.role_id);
            const coreCount = (role.competencies || []).filter(
              (c) => c.requirement_type === "core_required"
            ).length;
            const suppCount = (role.competencies || []).filter(
              (c) => c.requirement_type !== "core_required"
            ).length;

            return (
              <div
                key={`${role.role_id || "role"}-${roleIdx}`}
                className={`gl-card p-6 bg-white transition-all border flex flex-col justify-between space-y-4 ${
                  isSelected
                    ? "ring-2 ring-ink border-ink shadow-md"
                    : "border-ink/10 hover:border-ink/30"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sand font-bold text-ink uppercase">
                        {role.seniority}
                      </span>
                      <span className="text-[10px] font-mono text-ink-muted">
                        {role.version}
                      </span>
                      {role.source_type === "custom_parsed_job" && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 font-bold">
                          Custom Role
                        </span>
                      )}
                      {role.source_type === "curated_model" && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 font-bold">
                          Benchmark
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-lime text-ink border border-ink/20 font-extrabold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Active Target
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-ink">{role.title}</h3>
                    <span className="text-xs font-mono text-ink-muted block mt-0.5">
                      Context: <strong>{role.context}</strong>
                    </span>
                    <p className="text-xs text-ink/80 mt-2 line-clamp-3 leading-relaxed">
                      {role.description}
                    </p>
                  </div>

                  {/* Competency count preview */}
                  <div className="pt-2 flex items-center gap-4 text-xs font-mono text-ink-muted">
                    <span>
                      <strong className="text-red-900">{coreCount}</strong> Core Required
                    </span>
                    <span>&bull;</span>
                    <span>
                      <strong className="text-sky-900">{suppCount}</strong> Supporting / Preferred
                    </span>
                  </div>

                  {/* Competency badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(role.competencies || []).slice(0, 5).map((comp, compIdx) => (
                      <span
                        key={`${role.role_id || "role"}-${comp.skill_id || comp.canonical_name || "comp"}-${compIdx}`}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-sand/30 border border-ink/10 text-ink font-mono"
                      >
                        {comp.canonical_name} ({comp.expected_level})
                      </span>
                    ))}
                    {(role.competencies || []).length > 5 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md text-ink-muted font-mono">
                        +{(role.competencies || []).length - 5} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Card Action Footer */}
                <div className="pt-4 border-t border-ink/10 flex items-center justify-between gap-3 text-xs flex-wrap">
                  <Link
                    href={`/app/career/roles/${role.role_id}`}
                    className="text-ink hover:underline font-semibold flex items-center gap-1"
                  >
                    View Requirements <ChevronRight className="w-3.5 h-3.5" />
                  </Link>

                  <div className="flex items-center gap-2">
                    {/* Add to Targets action for Catalogue Benchmark */}
                    {activeTab === "catalogue" && !isSavedTarget && (
                      <button
                        onClick={async () => {
                          await saveCatalogueRoleToTargets(role.role_id);
                          setSelectedRoleId(role.role_id);
                          setActiveTab("targets");
                        }}
                        className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-ink text-xs py-2 px-3 flex items-center gap-1 font-medium"
                      >
                        <Plus className="w-3 h-3" /> Add to My Targets
                      </button>
                    )}

                    {/* Set Active action */}
                    <button
                      onClick={() => setSelectedRoleId(role.role_id)}
                      className={`pill-btn text-xs py-2 px-3.5 flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-sand/30 border border-ink text-ink font-bold"
                          : "bg-white hover:bg-sand/20 border border-ink/20 text-ink"
                      }`}
                    >
                      {isSelected ? "Active Target" : "Set as Active"}
                    </button>

                    <Link
                      href="/app/career/match"
                      onClick={() => setSelectedRoleId(role.role_id)}
                      className="pill-btn pill-btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
                    >
                      Match Skills &rarr;
                    </Link>

                    {/* Remove button for user target roles */}
                    {activeTab === "targets" && (
                      <button
                        onClick={() => setRoleToDelete(role.role_id)}
                        className="p-2 text-ink-muted hover:text-red-700 hover:bg-red-50 rounded-xl transition"
                        title="Remove role from target list"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* Add Custom Target Role Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 space-y-5 border-2 border-ink shadow-2xl relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 text-ink-muted hover:text-ink p-1 rounded-full bg-sand/30"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-lime/40 border border-ink flex items-center justify-center">
                <Target className="w-5 h-5 text-ink" />
              </div>
              <div>
                <span className="text-xs font-mono uppercase text-ink-muted">
                  New Target Role
                </span>
                <h3 className="text-xl font-bold text-ink">Add a Target Role</h3>
              </div>
            </div>

            <form onSubmit={handleCreateCustomRole} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-ink">Role Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Staff AI Systems Architect"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="pill-input w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-ink">Seniority Level</label>
                  <select
                    value={newSeniority}
                    onChange={(e) => setNewSeniority(e.target.value)}
                    className="pill-input w-full text-xs"
                  >
                    <option value="Entry Level">Entry Level</option>
                    <option value="Mid Level">Mid Level</option>
                    <option value="Senior Level">Senior Level</option>
                    <option value="Lead / Staff">Lead / Staff</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-ink">Domain Context</label>
                  <input
                    type="text"
                    placeholder="e.g. Cloud & LLM Platform"
                    value={newContext}
                    onChange={(e) => setNewContext(e.target.value)}
                    className="pill-input w-full text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-ink">Role Description</label>
                <textarea
                  rows={3}
                  placeholder="Briefly describe what this role entails..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-ink/20 text-xs focus:ring-2 focus:ring-ink focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-ink/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-ink text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim()}
                  className="pill-btn pill-btn-primary text-xs py-2 px-5 flex items-center gap-1 font-bold"
                >
                  {isSubmitting ? "Saving..." : "Save Target Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {roleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border-2 border-red-500 shadow-2xl relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 border border-red-300 flex items-center justify-center text-red-700">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink">Remove Target Role?</h3>
                <p className="text-xs text-ink-muted">
                  This will remove the role from your active target list. Your evidence, skills, and job postings remain completely safe.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-ink/10 flex items-center justify-end gap-2">
              <button
                onClick={() => setRoleToDelete(null)}
                className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-ink text-xs py-2 px-4"
              >
                Keep Role
              </button>
              <button
                onClick={handleConfirmDelete}
                className="pill-btn bg-red-600 hover:bg-red-700 text-white text-xs py-2 px-4 font-bold"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
