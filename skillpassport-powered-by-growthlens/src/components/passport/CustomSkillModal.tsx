"use client";

import React, { useState } from "react";
import {
  X,
  Plus,
  Loader2,
  AlertCircle,
  Tag,
  Link as LinkIcon,
  Layers,
  Award,
  ShieldAlert,
} from "lucide-react";
import { sharingApi } from "@/lib/sharingApi";
import { CustomSkill } from "@/types/sharing";
import { useEvidence } from "@/context/EvidenceContext";

interface CustomSkillModalProps {
  onClose: () => void;
  onSkillCreated: (skill: CustomSkill) => void;
}

export default function CustomSkillModal({
  onClose,
  onSkillCreated,
}: CustomSkillModalProps) {
  const { evidenceItems } = useEvidence();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [context, setContext] = useState("");
  const [selfAssessedLevel, setSelfAssessedLevel] = useState<
    "Beginner" | "Intermediate" | "Advanced" | "Expert"
  >("Intermediate");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [attachedEvidenceIds, setAttachedEvidenceIds] = useState<string[]>([]);
  const [externalProjectUrl, setExternalProjectUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, "");
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleToggleEvidence = (evId: string) => {
    setAttachedEvidenceIds((prev) =>
      prev.includes(evId) ? prev.filter((id) => id !== evId) : [...prev, evId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError("Please provide a title and description for your custom skill.");
      return;
    }

    setLoading(true);
    try {
      const created = await sharingApi.createCustomSkill({
        title: title.trim(),
        description: description.trim(),
        context: context.trim() || undefined,
        self_assessed_level: selfAssessedLevel,
        tags,
        attached_evidence_ids: attachedEvidenceIds,
        external_project_url: externalProjectUrl.trim() || undefined,
      });

      onSkillCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create custom skill.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-in fade-in duration-150 font-sans">
      <div
        className="relative w-full max-w-xl bg-[#FBF6DF] border-[2px] border-[#1C1C1C] rounded-2xl shadow-[6px_6px_0_0_#1C1C1C] p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto text-[#1C1C1C]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-1.5 rounded-full bg-[#1C1C1C]/10 hover:bg-[#1C1C1C]/20 text-[#1C1C1C] transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1.5 pr-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 border border-amber-400 text-amber-900 text-[10px] font-black uppercase tracking-wider">
            <AlertCircle className="w-3 h-3 text-amber-700" />
            Candidate Self-Declared Skill
          </div>
          <h2 className="text-2xl font-black text-[#1C1C1C] tracking-tight">
            Add Custom Skill
          </h2>
          <p className="text-xs text-[#1C1C1C]/70 leading-relaxed">
            Declare expertise you have built. Custom skills are clearly labeled as candidate-authored and remain distinct from independently verified competencies.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] mb-1">
              Skill Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Distributed Consensus Algorithms (Raft/Paxos)"
              className="w-full bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-xl px-3.5 py-2 text-xs font-bold text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0_0_#1C1C1C]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] mb-1">
              Capability Description *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you built, engineered, or designed using this capability..."
              className="w-full bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-xl p-3 text-xs font-bold text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0_0_#1C1C1C] resize-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] mb-1">
              Usage Context & Application (Optional)
            </label>
            <input
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g. Implemented in production financial transactions ledger"
              className="w-full bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-xl px-3.5 py-2 text-xs font-bold text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0_0_#1C1C1C]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] mb-1">
                Self-Assessed Level
              </label>
              <select
                value={selfAssessedLevel}
                onChange={(e) => setSelfAssessedLevel(e.target.value as any)}
                className="w-full bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-xl px-3 py-2 text-xs font-bold text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0_0_#1C1C1C]"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] mb-1">
                External Project URL
              </label>
              <input
                type="url"
                value={externalProjectUrl}
                onChange={(e) => setExternalProjectUrl(e.target.value)}
                placeholder="https://github.com/..."
                className="w-full bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-xl px-3 py-2 text-xs font-bold text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0_0_#1C1C1C]"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] mb-1">
              Tags & Technologies
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Type tag and press Enter"
                className="flex-1 bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-xl px-3 py-1.5 text-xs font-bold text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#DFE968]"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 rounded-xl bg-[#1C1C1C] text-[#FBF6DF] text-xs font-bold"
              >
                Add
              </button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#000000] border border-[#1A1918] text-[10px] font-bold text-[#FAF8F5]"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-rose-700"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Attach Evidence Vault Artifacts */}
          {evidenceItems.length > 0 && (
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] mb-1">
                Attach Supporting Evidence from Evidence Vault ({attachedEvidenceIds.length} selected)
              </label>
              <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-white border border-[#1C1C1C]/20">
                {evidenceItems.map((ev) => {
                  const isAttached = attachedEvidenceIds.includes(ev.id);
                  return (
                    <div
                      key={ev.id}
                      onClick={() => handleToggleEvidence(ev.id)}
                      className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer border ${
                        isAttached
                          ? "bg-[#DFE968]/30 border-[#1C1C1C] font-bold"
                          : "bg-stone-50 border-stone-200 text-[#1C1C1C]/70"
                      }`}
                    >
                      <div className="truncate max-w-[340px]">
                        <span>{ev.title}</span>
                        <span className="text-[10px] text-stone-500 block">
                          Project: {ev.project || "Workplace"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono uppercase">
                        {isAttached ? "✓ Attached" : "+ Attach"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Invariant Note */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-[10px] text-amber-950 leading-relaxed flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Verification Invariant:</strong> Adding a custom skill does not alter your verified competency count. Recruiters will see this entry under the explicit "Self-Declared Skills" section.
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-[#1C1C1C] text-xs font-bold text-[#1C1C1C] hover:bg-[#1C1C1C]/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-full bg-[#000000] hover:bg-[#1A1918] border-[1.5px] border-[#1A1918] text-xs font-black uppercase tracking-wider text-[#FAF8F5] shadow-[2px_2px_0_0_#1A1918] flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Custom Skill</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
