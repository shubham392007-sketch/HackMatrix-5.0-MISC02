"use client";

import React, { useState } from "react";
import {
  ShareProjection,
  AuthorizedVerifiedSkill,
  AuthorizedCustomSkill,
  PassportTemplateId,
} from "@/types/sharing";
import TemplateVerifiedCompetency from "./TemplateVerifiedCompetency";
import TemplateProfessionalResume from "./TemplateProfessionalResume";
import TemplateTechnicalPortfolio from "./TemplateTechnicalPortfolio";
import TemplateAiMlEngineer from "./TemplateAiMlEngineer";
import TemplateSoftwareFullstack from "./TemplateSoftwareFullstack";
import TemplateResearchAcademic from "./TemplateResearchAcademic";
import TemplateProjectsImpact from "./TemplateProjectsImpact";
import TemplateMinimalPrivacy from "./TemplateMinimalPrivacy";

import SkillInspectionModal from "../SkillInspectionModal";
import RecruiterMessageModal from "../RecruiterMessageModal";
import PublicEvidenceModal from "../PublicEvidenceModal";

interface TemplateDispatcherProps {
  projection: ShareProjection;
  activeTemplateId?: PassportTemplateId;
  isPreview?: boolean;
  onOpenContact?: () => void;
}

export function normalizeTemplateId(templateId?: string): string {
  if (!templateId) return "verified-competency";
  switch (templateId) {
    case "classic":
    case "verified-competency":
      return "verified-competency";
    case "executive":
    case "professional-resume":
      return "professional-resume";
    case "technical":
    case "technical-portfolio":
      return "technical-portfolio";
    case "ai_ml":
    case "ai-ml-engineer":
      return "ai-ml-engineer";
    case "engineering":
    case "software-fullstack":
      return "software-fullstack";
    case "academic":
    case "research-academic":
      return "research-academic";
    case "project":
    case "projects-impact":
      return "projects-impact";
    case "anonymous":
    case "minimal-privacy":
      return "minimal-privacy";
    default:
      return templateId;
  }
}

export default function TemplateDispatcher({
  projection,
  activeTemplateId,
  isPreview = false,
  onOpenContact,
}: TemplateDispatcherProps) {
  const [selectedSkill, setSelectedSkill] = useState<
    AuthorizedVerifiedSkill | AuthorizedCustomSkill | null
  >(null);
  const [inspectingEvidenceId, setInspectingEvidenceId] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);

  const rawTemplateId = activeTemplateId || projection.templateId || "verified-competency";
  const canonicalId = normalizeTemplateId(rawTemplateId);

  const handleOpenContact = onOpenContact || (() => setContactOpen(true));

  const templateProps = {
    projection,
    onSelectSkill: (skill: AuthorizedVerifiedSkill | AuthorizedCustomSkill) => setSelectedSkill(skill),
    onInspectEvidence: (evidenceId: string) => setInspectingEvidenceId(evidenceId),
    onOpenContact: handleOpenContact,
    isPreview,
  };

  const renderTemplate = () => {
    switch (canonicalId) {
      case "professional-resume":
        return <TemplateProfessionalResume {...templateProps} />;
      case "technical-portfolio":
        return <TemplateTechnicalPortfolio {...templateProps} />;
      case "ai-ml-engineer":
        return <TemplateAiMlEngineer {...templateProps} />;
      case "software-fullstack":
        return <TemplateSoftwareFullstack {...templateProps} />;
      case "research-academic":
        return <TemplateResearchAcademic {...templateProps} />;
      case "projects-impact":
        return <TemplateProjectsImpact {...templateProps} />;
      case "minimal-privacy":
        return <TemplateMinimalPrivacy {...templateProps} />;
      case "verified-competency":
      default:
        return <TemplateVerifiedCompetency {...templateProps} />;
    }
  };

  return (
    <div className="w-full">
      {renderTemplate()}

      {/* Skill Detail Modal */}
      {selectedSkill && (
        <SkillInspectionModal
          skill={selectedSkill}
          allEvidence={projection.authorizedEvidence || []}
          onClose={() => setSelectedSkill(null)}
          onInspectEvidence={(evId) => {
            setSelectedSkill(null);
            setInspectingEvidenceId(evId);
          }}
        />
      )}

      {/* Public Evidence Artifact Inspector Modal */}
      {inspectingEvidenceId && (
        <PublicEvidenceModal
          token={projection.shareId}
          evidenceId={inspectingEvidenceId}
          onClose={() => setInspectingEvidenceId(null)}
        />
      )}

      {/* Recruiter Message Modal (fallback if not controlled by parent) */}
      {!onOpenContact && contactOpen && (
        <RecruiterMessageModal
          token={projection.shareId}
          candidateName={projection.candidateProfile?.displayName || "Candidate"}
          onClose={() => setContactOpen(false)}
        />
      )}
    </div>
  );
}
