"use client";

import React, { useState } from "react";
import {
  ShareProjection,
  AuthorizedVerifiedSkill,
  AuthorizedCustomSkill,
  PassportTemplateId,
} from "@/types/sharing";
import TemplateClassic from "./TemplateClassic";
import TemplateExecutive from "./TemplateExecutive";
import TemplateTechnical from "./TemplateTechnical";
import TemplateAiMl from "./TemplateAiMl";
import TemplateEngineering from "./TemplateEngineering";
import TemplateAcademic from "./TemplateAcademic";
import TemplateProject from "./TemplateProject";
import TemplateAnonymous from "./TemplateAnonymous";
import SkillInspectionModal from "../SkillInspectionModal";
import RecruiterMessageModal from "../RecruiterMessageModal";
import PublicEvidenceModal from "../PublicEvidenceModal";

interface TemplateDispatcherProps {
  projection: ShareProjection;
  activeTemplateId?: PassportTemplateId;
  isPreview?: boolean;
}

export default function TemplateDispatcher({
  projection,
  activeTemplateId,
  isPreview = false,
}: TemplateDispatcherProps) {
  const [selectedSkill, setSelectedSkill] = useState<
    AuthorizedVerifiedSkill | AuthorizedCustomSkill | null
  >(null);
  const [inspectingEvidenceId, setInspectingEvidenceId] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);

  const templateId = activeTemplateId || projection.templateId || "classic";

  const templateProps = {
    projection,
    onSelectSkill: (skill: AuthorizedVerifiedSkill | AuthorizedCustomSkill) => setSelectedSkill(skill),
    onInspectEvidence: (evidenceId: string) => setInspectingEvidenceId(evidenceId),
    onOpenContact: () => setContactOpen(true),
    isPreview,
  };

  const renderTemplate = () => {
    switch (templateId) {
      case "executive":
        return <TemplateExecutive {...templateProps} />;
      case "technical":
        return <TemplateTechnical {...templateProps} />;
      case "ai_ml":
        return <TemplateAiMl {...templateProps} />;
      case "engineering":
        return <TemplateEngineering {...templateProps} />;
      case "academic":
        return <TemplateAcademic {...templateProps} />;
      case "project":
        return <TemplateProject {...templateProps} />;
      case "anonymous":
        return <TemplateAnonymous {...templateProps} />;
      case "classic":
      default:
        return <TemplateClassic {...templateProps} />;
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

      {/* Recruiter Message Modal */}
      {contactOpen && (
        <RecruiterMessageModal
          token={projection.shareId}
          candidateName={projection.candidateProfile.displayName || "Candidate"}
          onClose={() => setContactOpen(false)}
        />
      )}
    </div>
  );
}
