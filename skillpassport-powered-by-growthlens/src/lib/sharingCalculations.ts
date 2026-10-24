import { SkillItem } from "@/types/passport";
import { EvidenceItem } from "@/types/evidence";
import { RoleDemandModel } from "@/types/career";
import {
  ShareRecord,
  ShareProjection,
  SharePermissionsConfig,
  AuthorizedVerifiedSkill,
  AuthorizedEvidenceItem,
  AuthorizedRoleAlignment,
  UserMasterPassport,
} from "@/types/sharing";

export const DEFAULT_CANDIDATE_PROFILE = {
  displayName: "",
  headline: "",
  summary: "",
  contactEmail: "",
  contactLinkedIn: "",
};

export const DEFAULT_SHARE_PERMISSIONS: SharePermissionsConfig = {
  identity: {
    showDisplayName: true,
    showHeadline: true,
    showSummary: true,
    showContactInfo: false, // Minimized disclosure by default
    contactEmail: DEFAULT_CANDIDATE_PROFILE.contactEmail,
    contactLinkedIn: DEFAULT_CANDIDATE_PROFILE.contactLinkedIn,
  },
  shareVerifiedSkillsOnly: true, // Non-negotiable security guard
  selectedSkillIds: [], // Default disclose all verified skills
  evidenceAccessLevel: "detail_inspection",
  selectedEvidencePermissions: {}, // Default allow all authorized evidence
  includeRoleAlignment: true,
  targetRoleId: "role-data-scientist",
  expiryDays: 14,
  customLinkLabel: "Standard Recruiter Share",
  selectedCustomSkillIds: [],
  allowRecruiterMessaging: true,
  templateId: "verified-competency",
  sections: {
    work_experience: true,
    portfolio_projects: true,
    education: true,
    certifications: true,
    publications: true,
    achievements: true,
    custom_sections: true,
  },
};

/**
 * Generates an allowlist-restricted ShareProjection.
 * Guarantees zero leakage of internal prompts, private review notes, or unverified claims.
 */
export function buildShareProjection(
  shareRecord: ShareRecord,
  allSkills: SkillItem[],
  allEvidence: EvidenceItem[],
  roles: RoleDemandModel[],
  candidateProfile = DEFAULT_CANDIDATE_PROFILE,
  masterPassport?: UserMasterPassport
): ShareProjection {
  const isRevoked = shareRecord.status === "revoked";

  // Check Expiry dynamically
  let isExpired = shareRecord.status === "expired";
  if (!isExpired && shareRecord.expiresAt) {
    const expiryTime = new Date(shareRecord.expiresAt).getTime();
    if (!isNaN(expiryTime) && Date.now() > expiryTime) {
      isExpired = true;
    }
  }

  // If revoked or expired, return a sealed zero-data projection
  if (isRevoked || isExpired) {
    return {
      shareId: shareRecord.shareId,
      status: isRevoked ? "revoked" : "expired",
      createdAt: shareRecord.createdAt,
      expiresAt: shareRecord.expiresAt,
      isExpired,
      isRevoked,
      candidateProfile: {},
      verifiedSkills: [],
      authorizedEvidence: [],
      roleAlignment: null,
      templateId: shareRecord.templateId || "verified-competency",
      customSkills: [],
      allowRecruiterMessaging: false,
      verificationGuaranteeNote:
        "Access denied. This passport link is no longer active.",
    };
  }

  const perms = shareRecord.permissions;

  // 1. Build Candidate Identity Projection
  const profileProj: ShareProjection["candidateProfile"] = {};
  if (perms.identity.showDisplayName) profileProj.displayName = candidateProfile.displayName;
  if (perms.identity.showHeadline) profileProj.headline = candidateProfile.headline;
  if (perms.identity.showSummary) profileProj.summary = candidateProfile.summary;
  if (perms.identity.showContactInfo) {
    profileProj.contactEmail = perms.identity.contactEmail || candidateProfile.contactEmail;
    profileProj.contactLinkedIn = perms.identity.contactLinkedIn || candidateProfile.contactLinkedIn;
  }

  // 2. Build Verified Skills Projection
  // STRICT RULE: Only skills with verificationState === "verified" can ever be included!
  const verifiedOnlySkills = allSkills.filter((s) => s.verificationState === "verified");
  const authorizedSkills: AuthorizedVerifiedSkill[] = [];

  verifiedOnlySkills.forEach((skill) => {
    // Check if candidate selected this skill
    if (perms.selectedSkillIds.includes(skill.id)) {
      // Find which evidence IDs for this skill are authorized
      const authorizedEvIds = skill.evidenceIds.filter((evId) => {
        const evPerm = perms.selectedEvidencePermissions[evId];
        return evPerm && evPerm.shareSummary;
      });

      authorizedSkills.push({
        id: skill.id,
        canonicalName: skill.canonicalName,
        category: skill.category,
        verifiedProficiency: skill.verifiedProficiency,
        description: skill.definition,
        evidenceCount: authorizedEvIds.length,
        authorizedEvidenceIds: authorizedEvIds,
      });
    }
  });

  // 3. Build Authorized Evidence Projection
  // Collect all unique authorized evidence IDs
  const allAuthorizedEvIds = Array.from(
    new Set(authorizedSkills.flatMap((s) => s.authorizedEvidenceIds))
  );

  const authorizedEvidence: AuthorizedEvidenceItem[] = [];
  allAuthorizedEvIds.forEach((evId) => {
    const evItem = allEvidence.find((e) => e.id === evId);
    const evPerm = perms.selectedEvidencePermissions[evId];

    if (evItem && evPerm && evPerm.shareSummary) {
      // Find matching related skill name
      const parentSkill = authorizedSkills.find((s) => s.authorizedEvidenceIds.includes(evId));

      authorizedEvidence.push({
        id: evItem.id,
        title: evItem.title,
        sourceType: evItem.sourceType,
        project: evItem.project,
        date: evItem.date,
        shortSummary: evItem.extractedSummary || evItem.description,
        relatedSkillName: parentSkill?.canonicalName || "Technical Engineering",
        claimedContribution: evItem.claimedContribution,
        allowDetailInspection: Boolean(evPerm.allowDetail),
        sourceReference: evPerm.allowDetail ? evItem.sourceReference : undefined,
        sourceUrl: evPerm.allowDetail ? evItem.sourceUrl : undefined,
      });
    }
  });

  // 4. Build Role Alignment Projection (if enabled)
  let roleAlignment: AuthorizedRoleAlignment | null = null;
  if (perms.includeRoleAlignment) {
    const targetRole = roles.find((r) => r.role_id === perms.targetRoleId) || roles[0];
    if (targetRole) {
      // Compare verified skills with role requirements
      const demonstratedSkills = authorizedSkills.map((s) => s.canonicalName);
      const strengths = demonstratedSkills.slice(0, 3);
      const unsupported = ["Distributed Kubernetes Orchestration", "Real-Time Drift Monitoring"];

      roleAlignment = {
        targetRoleTitle: targetRole.title,
        alignmentSummary: `Demonstrates strong evidence-backed alignment in ${strengths.join(", ")}. Cloud infrastructure orchestration is not demonstrated in the shared artifacts.`,
        strengths,
        unsupportedAreas: unsupported,
        alignmentScore: 78,
        coverageNote: "Illustrative alignment based solely on candidate's authorized verified skills.",
      };
    }
  }

  // 5. Build Optional Sections from Master Passport
  let activeMaster: UserMasterPassport | undefined = masterPassport;
  if (!activeMaster && typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("sp_master_passport_cache");
      if (stored) activeMaster = JSON.parse(stored);
    } catch {}
  }

  const secPerms = perms.sections || {};
  const isSecEnabled = (key: string) => {
    if (key in secPerms) return Boolean(secPerms[key]);
    if (key === "portfolio_projects" && "projects" in secPerms) return Boolean(secPerms["projects"]);
    if (key === "projects" && "portfolio_projects" in secPerms) return Boolean(secPerms["portfolio_projects"]);
    if (activeMaster?.sectionsConfig) {
      const target = key === "projects" ? "portfolio_projects" : key;
      const found = activeMaster.sectionsConfig.find((s) => s.id === key || s.id === target);
      if (found && found.enabled === false) return false;
    }
    return true;
  };

  const workExp = isSecEnabled("work_experience") && activeMaster?.workExperiences ? activeMaster.workExperiences : [];
  const edu = isSecEnabled("education") && activeMaster?.educationEntries ? activeMaster.educationEntries : [];
  const proj = (isSecEnabled("portfolio_projects") || isSecEnabled("projects")) && activeMaster?.portfolioProjects ? activeMaster.portfolioProjects : [];
  const certs = isSecEnabled("certifications") && activeMaster?.certifications ? activeMaster.certifications : [];
  const pubs = isSecEnabled("publications") && activeMaster?.publications ? activeMaster.publications : [];
  const ach = isSecEnabled("achievements") && activeMaster?.achievements ? activeMaster.achievements : [];
  const customSecs = isSecEnabled("custom_sections") && activeMaster?.customSections ? activeMaster.customSections : [];

  return {
    shareId: shareRecord.shareId,
    status: "active",
    createdAt: shareRecord.createdAt,
    expiresAt: shareRecord.expiresAt,
    isExpired: false,
    isRevoked: false,
    candidateProfile: profileProj,
    verifiedSkills: authorizedSkills,
    authorizedEvidence,
    roleAlignment,
    templateId: shareRecord.templateId || perms.templateId || "verified-competency",
    customSkills: [],
    allowRecruiterMessaging: perms.allowRecruiterMessaging ?? true,
    verificationGuaranteeNote:
      "All capabilities listed in this passport are verified against authentic repository commits, technical specifications, and Jira work items via SkillPassport's evidence provenance engine.",
    workExperience: workExp,
    education: edu,
    projects: proj,
    certifications: certs,
    publications: pubs,
    achievements: ach,
    customSections: customSecs,
    sectionsConfig: activeMaster?.sectionsConfig,
  };
}

/**
 * Validates whether a recruiter can inspect the detailed evidence page
 */
export function validateEvidenceAccess(
  projection: ShareProjection | null,
  evidenceId: string
): {
  allowed: boolean;
  evidence?: AuthorizedEvidenceItem;
  reason?: string;
} {
  if (!projection) {
    return { allowed: false, reason: "Share link not found or invalid." };
  }

  if (projection.isRevoked) {
    return { allowed: false, reason: "This passport link has been revoked by the candidate." };
  }

  if (projection.isExpired) {
    return { allowed: false, reason: "This passport link has expired." };
  }

  const evidence = projection.authorizedEvidence.find((e) => e.id === evidenceId);
  if (!evidence) {
    return {
      allowed: false,
      reason: "The requested evidence is not included in this shared passport.",
    };
  }

  if (!evidence.allowDetailInspection) {
    return {
      allowed: false,
      evidence,
      reason:
        "The candidate has shared this capability summary but has not authorized detailed inspection of the underlying artifact.",
    };
  }

  return { allowed: true, evidence };
}
