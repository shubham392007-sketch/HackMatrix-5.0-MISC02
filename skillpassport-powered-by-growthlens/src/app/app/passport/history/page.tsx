"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  User,
  Cpu,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from "lucide-react";

export default function SkillHistoryPage() {
  const { historyEvents, skills } = useEvidence();
  const [search, setSearch] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("all");
  const [selectedActor, setSelectedActor] = useState("all");

  const filteredEvents = historyEvents.filter((ev) => {
    const q = search.toLowerCase();
    const matchesSearch =
      ev.skillName.toLowerCase().includes(q) ||
      ev.reason.toLowerCase().includes(q) ||
      ev.newValue.toLowerCase().includes(q);

    const matchesType =
      selectedEventType === "all" || ev.eventType === selectedEventType;

    const matchesActor = selectedActor === "all" || ev.actor === selectedActor;

    return matchesSearch && matchesType && matchesActor;
  });

  const getActorIcon = (actor: string) => {
    if (actor.includes("Pipeline")) {
      return <Cpu className="w-4 h-4 text-[#4361EE]" />;
    }
    if (actor.includes("Guard")) {
      return <ShieldCheck className="w-4 h-4 text-[#2E6941]" />;
    }
    return <User className="w-4 h-4 text-[#8A38F5]" />;
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case "candidate_extracted":
        return { label: "Candidate Extracted", color: "bg-[#FFF6E9] text-[#B07219]" };
      case "evidence_linked":
        return { label: "Evidence Linked", color: "bg-[#EBF3ED] text-[#2E6941]" };
      case "verified_state_changed":
        return { label: "Verification Updated", color: "bg-[#EBF3ED] text-[#234D31]" };
      case "mapping_corrected":
        return { label: "Mapping Corrected", color: "bg-[#FBE8E8] text-[#BA1A1A]" };
      case "conflict_flagged":
        return { label: "Conflict Flagged", color: "bg-[#FBE8E8] text-[#801414]" };
      default:
        return { label: "System Action", color: "bg-[#EFEAE1] text-[#1F1E1D]" };
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8C827A] uppercase tracking-wider mb-2">
            <Link href="/app/passport" className="hover:text-[#1F1E1D]">
              Passport
            </Link>
            <span>/</span>
            <span className="text-[#1F1E1D]">Skill History</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1F1E1D] tracking-tight">
            Skill Evolution & Audit History
          </h1>
          <p className="text-sm text-[#5A5550] mt-1.5 max-w-2xl">
            Audit trail capturing model extractions, reviewer approvals, evidence links, and calibration adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/passport/skills"
            className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
          >
            Verified Skills
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Trust & Audit Standards */}
      <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EBE5DC] flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#2E6941] flex-shrink-0 mt-0.5" />
        <div className="text-xs text-[#5A5550] leading-relaxed">
          <strong className="text-[#1F1E1D]">Cryptographic Audit Integrity:</strong> Every transition in your Skill Passport is logged with actor identification, timestamp, preceding state, and substantiating rationale. Nothing is silently mutated or erased.
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="gl-card p-5 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C827A]" />
            <input
              type="text"
              placeholder="Search audit trail by competency name, reason, or change..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pill-input pl-10 text-xs w-full"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="pill-input text-xs py-2 px-3 pr-8 bg-white cursor-pointer"
            >
              <option value="all">All Event Types</option>
              <option value="verified_state_changed">Verification Updated</option>
              <option value="evidence_linked">Evidence Linked</option>
              <option value="candidate_extracted">Candidate Extracted</option>
              <option value="mapping_corrected">Mapping Corrected</option>
              <option value="conflict_flagged">Conflict Flagged</option>
            </select>

            <select
              value={selectedActor}
              onChange={(e) => setSelectedActor(e.target.value)}
              className="pill-input text-xs py-2 px-3 pr-8 bg-white cursor-pointer"
            >
              <option value="all">All Actors</option>
              <option value="System Pipeline">System Pipeline</option>
              <option value="Reviewer (Alex Rivera)">Reviewer (Alex Rivera)</option>
              <option value="Verification Guard">Verification Guard</option>
            </select>
          </div>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#1F1E1D]">
            Audit Timeline ({filteredEvents.length} records)
          </h2>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="gl-card p-12 text-center text-xs text-[#8C827A]">
            No historical events match this query.
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E0D9CD]">
            {filteredEvents.map((ev) => {
              const typeMeta = getEventTypeLabel(ev.eventType);

              return (
                <div key={ev.id} className="relative group">
                  {/* Timeline Node Dot */}
                  <div className="absolute -left-6 sm:-left-8 top-4 w-3 h-3 rounded-full bg-white border-2 border-[#1F1E1D] group-hover:scale-125 transition-transform" />

                  {/* Event Card */}
                  <div className="gl-card p-5 space-y-3 border-[#E4DDD3] hover:shadow-sm transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${typeMeta.color}`}
                        >
                          {typeMeta.label}
                        </span>
                        <Link
                          href={`/app/passport/skills/${ev.skillId}`}
                          className="text-sm font-bold text-[#1F1E1D] hover:text-[#2E6941]"
                        >
                          {ev.skillName}
                        </Link>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[#8C827A]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{ev.timestamp}</span>
                      </div>
                    </div>

                    {/* Transition Details */}
                    <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EBE5DC] text-xs space-y-1">
                      {ev.previousValue && (
                        <div className="text-[#8C827A] flex items-center gap-2">
                          <span>Previous:</span>
                          <span className="line-through">{ev.previousValue}</span>
                        </div>
                      )}
                      <div className="font-semibold text-[#1F1E1D] flex items-center gap-2">
                        <span>New State:</span>
                        <span className="text-[#2E6941]">{ev.newValue}</span>
                      </div>
                    </div>

                    {/* Reason & Actor Footer */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-xs text-[#5A5550]">
                      <p className="italic text-[11px] leading-relaxed max-w-xl">
                        &ldquo;{ev.reason}&rdquo;
                      </p>

                      <div className="flex items-center gap-3 text-[11px] flex-shrink-0">
                        {ev.relatedEvidenceId && (
                          <Link
                            href={`/app/evidence/${ev.relatedEvidenceId}`}
                            className="font-bold text-[#1F1E1D] hover:underline flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#8C827A]" />
                            {ev.relatedEvidenceId}
                          </Link>
                        )}

                        <div className="flex items-center gap-1.5 text-[#1F1E1D] font-medium bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#EBE5DC]">
                          {getActorIcon(ev.actor)}
                          <span>{ev.actor}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
