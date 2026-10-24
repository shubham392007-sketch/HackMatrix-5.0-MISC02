import {
  ProficiencyLevel,
  SkillItem,
  SkillVerificationState,
} from "@/types/passport";
import {
  RoleDemandModel,
  RoleCompetency,
  CompetencyMatchResult,
  RoleMatchResult,
  GapRecord,
  GapClassification,
  CareerReadinessAssessment,
  GapPriorityInputs,
  ConfidenceRationale,
} from "@/types/career";

export function proficiencyToNumeric(level: ProficiencyLevel | string | undefined): number {
  if (!level) return 0;
  switch (level.trim()) {
    case "Not Established":
      return 0;
    case "Foundation":
    case "Foundational":
      return 1;
    case "Working":
      return 2;
    case "Practitioner":
    case "Intermediate":
      return 3;
    case "Advanced":
      return 4;
    case "Expert":
      return 5;
    default:
      return 0;
  }
}

export function numericToProficiency(val: number): ProficiencyLevel {
  const rounded = Math.max(0, Math.min(5, Math.round(val)));
  switch (rounded) {
    case 0:
      return "Not Established";
    case 1:
      return "Foundation";
    case 2:
      return "Working";
    case 3:
      return "Practitioner";
    case 4:
      return "Advanced";
    case 5:
      return "Expert";
    default:
      return "Not Established";
  }
}

export function getRequirementWeight(type: RoleCompetency["requirement_type"]): number {
  switch (type) {
    case "core_required":
      return 1.0;
    case "supporting":
      return 0.6;
    case "preferred":
      return 0.35;
    case "differentiating":
      return 0.2;
    default:
      return 0.5;
  }
}

const IMPORTANCE_WEIGHTS: Record<string, number> = {
  critical: 1.0,
  high: 0.85,
  medium: 0.70,
  low: 0.50,
};

const URGENCY_WEIGHTS: Record<string, number> = {
  core_required: 1.0,
  supporting: 0.80,
  preferred: 0.60,
  differentiating: 0.50,
};

/**
 * Robust skill matcher linking role requirement to user skills.
 * Checks ID, canonical name, aliases, and normalized tokens.
 */
export function findMatchingUserSkill(
  comp: RoleCompetency,
  userSkills: SkillItem[]
): SkillItem | undefined {
  const targetId = (((comp as any).canonical_skill_id || comp.skill_id) || "").toLowerCase().trim();
  const targetName = (comp.canonical_name || "").toLowerCase().trim();

  // 1. Direct ID match
  const byId = userSkills.find(
    (s) => s.id.toLowerCase() === targetId || (s as any).competency_id === targetId
  );
  if (byId) return byId;

  // 2. Exact Canonical Name match
  const byName = userSkills.find(
    (s) => s.canonicalName.toLowerCase().trim() === targetName
  );
  if (byName) return byName;

  // 3. Alias match
  const byAlias = userSkills.find((s) =>
    (s as any).aliases?.some((a: string) => a.toLowerCase().trim() === targetName)
  );
  if (byAlias) return byAlias;

  // 4. Token overlap match (e.g. "Python Programming" vs "Python Engineering")
  if (targetName) {
    const targetTokens = new Set(targetName.replace(/-/g, " ").split(/\s+/));
    targetTokens.delete("engineering");
    targetTokens.delete("programming");
    targetTokens.delete("and");
    targetTokens.delete("&");

    for (const s of userSkills) {
      const sTokens = new Set(s.canonicalName.toLowerCase().replace(/-/g, " ").split(/\s+/));
      for (const tok of targetTokens) {
        if (tok.length >= 3 && sTokens.has(tok)) {
          return s;
        }
      }
    }
  }

  return undefined;
}

export function classifyCompetencyGap(
  competency: RoleCompetency,
  userSkill: SkillItem | undefined,
  currentNumeric: number,
  expectedNumeric: number,
  currentProf: string
): { gapType: GapClassification | null; explanation: string } {
  if (!userSkill || currentNumeric === 0 || currentProf === "Not Established") {
    if (competency.requirement_type === "differentiating") {
      return {
        gapType: "differentiation_opportunity",
        explanation:
          "High-value differentiator that would elevate your profile above standard peer baseline.",
      };
    }
    return {
      gapType: "skill_gap",
      explanation:
        "Not yet demonstrated in current Skill Passport evidence.",
    };
  }

  const vState = userSkill.verificationState;
  const hasEvidence = (userSkill.evidenceIds || []).length > 0;

  if (vState === "conflicting") {
    return {
      gapType: "evidence_gap",
      explanation: "Open attribution conflict between source artifacts flagged in Trust Center.",
    };
  }

  if (vState === "rejected") {
    return {
      gapType: "evidence_gap",
      explanation: `Capability claim at ${currentProf} was rejected during verification.`,
    };
  }

  if (currentNumeric >= expectedNumeric && vState === "verified" && hasEvidence) {
    if (currentNumeric > expectedNumeric) {
      const surplus = currentNumeric - expectedNumeric;
      return {
        gapType:
          competency.requirement_type === "preferred" ||
          competency.requirement_type === "differentiating"
            ? "differentiation_opportunity"
            : null,
        explanation: `Requirement exceeded at ${currentProf} (+${surplus} level surplus above ${competency.expected_level}) with verified evidence.`,
      };
    }
    return {
      gapType:
        competency.requirement_type === "preferred" ||
        competency.requirement_type === "differentiating"
          ? "differentiation_opportunity"
          : null,
      explanation: `Target requirement fully satisfied at ${competency.expected_level} with verified evidence.`,
    };
  }

  if (currentNumeric < expectedNumeric) {
    const shortfall = expectedNumeric - currentNumeric;
    const vLabel = vState !== "verified" ? ` (${vState})` : "";
    return {
      gapType: "depth_gap",
      explanation: `Demonstrated at ${currentProf}${vLabel}; target requires ${competency.expected_level} (-${shortfall} level shortfall).`,
    };
  }

  if (!hasEvidence || vState === "candidate" || vState === "insufficient_evidence" || (vState as string) === "unverified") {
    return {
      gapType: "evidence_gap",
      explanation: `Demonstrated at ${currentProf} (provisional claim); corroborating evidence or verification review required to confirm.`,
    };
  }

  return {
    gapType: null,
    explanation: `Requirement met at ${currentProf}.`,
  };
}


export function buildConfidenceRationale(
  comp: RoleCompetency,
  userSkill: any,
  currentNumeric: number,
  expectedNumeric: number,
  currentProf: ProficiencyLevel,
  vState: string,
  rawConfidence: number,
  matchStatus: string,
  evidenceIds: string[]
): ConfidenceRationale {
  const cName = comp.canonical_name;
  const expectedLevel = comp.expected_level;
  const scorePercent = rawConfidence <= 1.0 ? Math.round(rawConfidence * 100) : Math.round(rawConfidence);
  const normalizedScore = rawConfidence <= 1.0 ? rawConfidence : rawConfidence / 100;

  const supportingFactors: string[] = [];
  const evidenceLimitations: string[] = [];
  const uncertaintyNotes: string[] = [];
  let scoreMeaning = "";
  let summary = "";

  if (!userSkill || currentNumeric === 0) {
    scoreMeaning = "Confidence reflects the complete absence of attributable engineering artifacts in connected sources.";
    summary = `Assigned 0% confidence because no attributable code commits, pull requests, technical documents, or repository files were found in your connected sources for ${cName}.`;
    evidenceLimitations.push(`No verifiable engineering artifacts currently demonstrate ${cName} in your Skill Passport.`);
    uncertaintyNotes.push("An evidence gap indicates that relevant work has not yet been ingested or connected; it does not serve as proof that you lack this competency.");
  } else {
    scoreMeaning = "Confidence reflects the relevance, cryptographic attribution, and verification standing of source artifacts supporting this competency claim.";

    if (evidenceIds.length > 0) {
      supportingFactors.push(`Directly supported by ${evidenceIds.length} attributable work artifact(s) in Evidence Workspace.`);
    }
    if (currentNumeric > 0) {
      supportingFactors.push(`Demonstrated capability established at ${currentProf} level (numeric ${currentNumeric}/5).`);
    }
    if (vState === "verified") {
      supportingFactors.push("Cleared 7-point Trust & Governance verification with confirmed code authorship and zero open conflicts.");
    }

    if (currentNumeric < expectedNumeric) {
      const dist = expectedNumeric - currentNumeric;
      evidenceLimitations.push(`Proficiency shortfall: currently supported at ${currentProf} (numeric ${currentNumeric}/5) against target role expectation of ${expectedLevel} (numeric ${expectedNumeric}/5), representing a ${dist}-level depth gap.`);
    }

    if (vState === "candidate") {
      evidenceLimitations.push("Capability claim is currently in 'candidate' review state and has not yet cleared independent verification.");
      uncertaintyNotes.push("Candidate skills receive a fractional verification weight in effective coverage until reviewed.");
    } else if (vState === "conflicting") {
      evidenceLimitations.push("Open attribution conflict or contradictory source signals detected in Trust Center.");
      uncertaintyNotes.push("Confidence is discounted until the conflicting source claims are resolved.");
    } else if (vState === "insufficient_evidence") {
      evidenceLimitations.push("Extracted mention lacks sufficient corroborating code implementation examples.");
    }

    if (evidenceIds.length < 2) {
      evidenceLimitations.push("Single-source evidence: evaluation relies on one artifact without cross-source validation.");
    }

    if (vState === "verified" && currentNumeric >= expectedNumeric) {
      summary = `Assigned high confidence (${scorePercent}%) because ${cName} at ${currentProf} level is directly backed by ${evidenceIds.length || 1} verified engineering artifact(s) passing all Trust & Governance integrity checks.`;
    } else if (vState === "verified" && currentNumeric < expectedNumeric) {
      const dist = expectedNumeric - currentNumeric;
      summary = `Assigned ${scorePercent}% confidence reflecting high certainty in your demonstrated ${currentProf} capabilities, while noting a ${dist}-level depth gap relative to the target role's ${expectedLevel} requirement.`;
    } else if (vState === "candidate") {
      summary = `Assigned moderate confidence (${scorePercent}%) because work evidence was extracted for ${cName}, but remains in candidate status awaiting peer or automated verification clearance.`;
    } else if (vState === "conflicting") {
      summary = `Assigned discounted confidence (${scorePercent}%) due to conflicting evidence attribution flagged in Trust Center.`;
    } else {
      summary = `Assigned ${scorePercent}% confidence based on available evidence signals for ${cName} at ${currentProf} level.`;
    }

    uncertaintyNotes.push("Skill gaps represent areas where formal proof has not yet been recorded under the current evaluation policy, not a conclusion of candidate inability.");
  }

  return {
    score: Math.round(normalizedScore * 100) / 100,
    score_percent: scorePercent,
    score_meaning: scoreMeaning,
    summary,
    supporting_factors: supportingFactors,
    evidence_limitations: evidenceLimitations,
    uncertainty_notes: uncertaintyNotes,
    is_verified: vState === "verified",
  };
}

export function evaluateRoleMatch(
  role: RoleDemandModel,
  userSkills: SkillItem[]
): RoleMatchResult {
  const matches: CompetencyMatchResult[] = role.competencies.map((comp) => {
    const userSkill = findMatchingUserSkill(comp, userSkills);

    const currentProf =
      userSkill?.verifiedProficiency && userSkill.verifiedProficiency !== "Not Established"
        ? userSkill.verifiedProficiency
        : (userSkill?.estimatedProficiency && userSkill.estimatedProficiency !== "Not Established"
            ? userSkill.estimatedProficiency
            : "Not Established");

    const currentNumeric = proficiencyToNumeric(currentProf);
    const expectedNumeric =
      comp.expected_level_numeric || proficiencyToNumeric(comp.expected_level) || 3;

    // Mathematical requirement coverage: P = min(1.0, L_u / L_r)
    const rawCoverage = expectedNumeric > 0
      ? Math.min(1.0, currentNumeric / expectedNumeric)
      : 1.0;
    const proficiencyCoverage = Math.round(rawCoverage * 1000) / 10;

    // Verification adjustment
    const vState = userSkill?.verificationState || "not_established";
    let verificationFactor = 0.0;
    if (vState === "verified") {
      verificationFactor = 1.0;
    } else if (vState === "candidate") {
      const conf = userSkill?.confidence ? (userSkill.confidence <= 1.0 ? userSkill.confidence : userSkill.confidence / 100) : 0.60;
      verificationFactor = Math.min(0.75, Math.max(0.50, conf));
    } else if (vState === "insufficient_evidence" || (vState as string) === "insufficient") {
      verificationFactor = 0.50;
    } else if (vState === "conflicting") {
      verificationFactor = 0.35;
    } else {
      verificationFactor = 0.0;
    }

    const effectiveCoverage = currentNumeric > 0 ? rawCoverage * verificationFactor : 0.0;

    const { gapType, explanation } = classifyCompetencyGap(
      comp,
      userSkill,
      currentNumeric,
      expectedNumeric,
      currentProf
    );

    let matchStatus: CompetencyMatchResult["match_status"] = "missing_weak";
    let matchClassification = "not_found";
    if (vState === "conflicting") {
      matchStatus = "conflicting";
      matchClassification = "conflicting";
    } else if (vState === "rejected" || currentNumeric === 0 || currentProf === "Not Established") {
      matchStatus = "missing_weak";
      matchClassification = "not_found";
    } else if (currentNumeric >= expectedNumeric && vState === "verified" && (userSkill?.evidenceIds?.length || 0) > 0) {
      matchStatus = "strong_match";
      matchClassification = "meets";
    } else if (currentNumeric < expectedNumeric) {
      matchStatus = "partial_match";
      matchClassification = (expectedNumeric - currentNumeric) > 1 ? "below" : "partial";
    } else if (vState === "candidate" || vState === "insufficient_evidence" || (vState as string) === "unverified" || (userSkill?.evidenceIds?.length || 0) === 0) {
      matchStatus = "evidence_gap";
      matchClassification = "unverified";
    } else {
      matchStatus = "strong_match";
      matchClassification = "meets";
    }

    const rawConf = userSkill?.confidence || (currentNumeric > 0 ? 80 : 0);
    const evIds = userSkill?.evidenceIds || [];
    const rationale = buildConfidenceRationale(
      comp,
      userSkill,
      currentNumeric,
      expectedNumeric,
      currentProf,
      vState,
      rawConf,
      matchStatus,
      evIds
    );

    return {
      skill_id: comp.skill_id,
      canonical_skill_id: (comp as any).canonical_skill_id || (userSkill as any)?.id,
      canonical_name: comp.canonical_name,
      requirement_type: comp.requirement_type,
      importance: comp.importance,
      expected_level: comp.expected_level,
      expected_level_numeric: expectedNumeric,
      current_proficiency: currentProf,
      current_proficiency_numeric: currentNumeric,
      verification_status: vState,
      confidence: rawConf,
      confidence_explanation: rationale.summary,
      confidence_rationale: rationale,
      evidence_strength: userSkill?.evidenceStrength || (evIds.length ? "medium" : "none"),
      evidence_ids: evIds,
      raw_coverage: Math.round(rawCoverage * 1000) / 1000,
      proficiency_coverage: proficiencyCoverage,
      effective_coverage: Math.round(effectiveCoverage * 1000) / 1000,
      gap_type: gapType,
      gap_explanation: explanation,
      match_status: matchStatus,
      match_classification: matchClassification,
      exceeds_by: Math.max(0, currentNumeric - expectedNumeric),
      reason_codes: comp.reason_codes || [],
    };
  });

  // Calculate weighted Role Match score
  let totalWeight = 0;
  let weightedEffectiveSum = 0;

  let reqWeight = 0;
  let reqEffectiveSum = 0;

  let suppWeight = 0;
  let suppEffectiveSum = 0;

  matches.forEach((m) => {
    const w = getRequirementWeight(m.requirement_type);
    totalWeight += w;
    weightedEffectiveSum += m.effective_coverage * w;

    if (m.requirement_type === "core_required") {
      reqWeight += w;
      reqEffectiveSum += m.effective_coverage * w;
    } else {
      suppWeight += w;
      suppEffectiveSum += m.effective_coverage * w;
    }
  });

  const overallScore = totalWeight > 0
    ? Math.round((weightedEffectiveSum / totalWeight) * 100)
    : 0;

  const hasCore = reqWeight > 0;
  const reqScore = hasCore
    ? Math.round((reqEffectiveSum / reqWeight) * 100)
    : overallScore;

  const suppScore = suppWeight > 0
    ? Math.round((suppEffectiveSum / suppWeight) * 100)
    : 0;

  const strongMatches = matches.filter((m) => m.match_status === "strong_match").length;
  const partialMatches = matches.filter((m) => m.match_status === "partial_match").length;
  const evidenceGaps = matches.filter((m) => m.match_status === "evidence_gap").length;
  const missingWeak = matches.filter((m) => m.match_status === "missing_weak").length;
  const criticalBlockers = matches.filter(
    (m) => m.requirement_type === "core_required" && (m.current_proficiency_numeric === 0 || m.effective_coverage < 0.5)
  ).length;

  return {
    role_id: role.role_id,
    role_title: role.title,
    role_version: role.version || "v2026.2",
    overall_match_score: overallScore,
    required_coverage_score: reqScore,
    supporting_coverage_score: suppScore,
    total_competencies: matches.length,
    strong_matches_count: strongMatches,
    partial_matches_count: partialMatches,
    evidence_gaps_count: evidenceGaps,
    missing_capability_count: missingWeak,
    critical_blockers_count: criticalBlockers,
    competency_matches: matches,
    calculated_at: new Date().toISOString(),
  };
}

/**
 * Normalized 0–100 Gap Prioritization Engine.
 * Replaces unbounded multiplicative formulas (such as 1013.0) with clean, explainable rankings.
 */
export function extractGapRecords(
  matchResult: RoleMatchResult,
  role: RoleDemandModel,
  options?: { effortSensitivity?: number; leverageWeight?: number }
): GapRecord[] {
  const effortSens = options?.effortSensitivity ?? 1.0;
  const levWeight = options?.leverageWeight ?? 1.0;
  const gaps: GapRecord[] = [];

  matchResult.competency_matches.forEach((comp) => {
    if (!comp.gap_type || comp.gap_type === "differentiation_opportunity") return;

    const levelGap = Math.max(0, comp.expected_level_numeric - comp.current_proficiency_numeric);
    const impFactor = IMPORTANCE_WEIGHTS[comp.importance?.toLowerCase() || "medium"] || 0.70;
    const urgFactor = URGENCY_WEIGHTS[comp.requirement_type || "core_required"] || 0.80;
    const gapFactor = Math.max(0.1, 1.0 - comp.effective_coverage);
    const hasEvidence = comp.evidence_ids.length > 0;

    // Estimated effort (1.0 to 5.0 scale)
    const estimatedEffort = comp.gap_type === "evidence_gap" ? 1.5 : levelGap >= 2 ? 3.5 : 2.0;

    // Base score: 100 * G_i * I_i * U_i
    const baseScore = 100.0 * gapFactor * impFactor * urgFactor;

    // Effort discount
    const effortDiscount = Math.max(0.60, 1.0 - 0.08 * (estimatedEffort - 1.0) * effortSens);

    // Leverage boost
    const leverageBoost = Math.min(1.25, 1.0 + (hasEvidence ? 0.12 * levWeight : 0.0));

    // Bounded normalized final priority score strictly within [1.0, 100.0]
    const finalScore = Math.min(100.0, Math.max(1.0, Math.round(baseScore * effortDiscount * leverageBoost * 10) / 10));

    let nextStep = `Produce attributable evidence demonstrating ${comp.canonical_name} at ${comp.expected_level} level.`;
    if (comp.gap_type === "application_gap") {
      nextStep = "Extend existing repositories with applied production implementations rather than theoretical work.";
    } else if (comp.gap_type === "evidence_gap") {
      nextStep = "Connect Git commits, deployment manifests, or tickets to substantiate this existing capability.";
    } else if (comp.gap_type === "depth_gap") {
      nextStep = `Undertake production challenges to elevate proficiency from ${comp.current_proficiency} to ${comp.expected_level}.`;
    }

    const whyPrioritized =
      `Priority score ${finalScore}/100: ${comp.importance} importance (${Math.round(impFactor * 100)}%), ` +
      `${comp.requirement_type.replace(/_/g, " ")} urgency, and remaining gap of ${Math.round(gapFactor * 100)}%.` +
      (hasEvidence ? ` Supported by ${comp.evidence_ids.length} existing project artifact(s).` : "");

    gaps.push({
      gap_id: `gap-${comp.skill_id}`,
      skill_id: comp.skill_id,
      canonical_name: comp.canonical_name,
      role_id: role.role_id,
      role_title: role.title,
      gap_type: comp.gap_type,
      requirement_type: comp.requirement_type,
      importance: comp.importance,
      expected_level: comp.expected_level,
      current_supported_level: comp.current_proficiency,
      verification_status: comp.verification_status,
      evidence_status: comp.evidence_ids.length >= 2 ? "sufficient" : comp.evidence_ids.length === 1 ? "insufficient" : "none",
      proficiency_distance: levelGap,
      priority_rank: 1,
      priority_score: finalScore,
      priority_inputs: {
        criticality: impFactor * 5.0,
        level_gap: levelGap,
        dependency_impact: comp.gap_type === "dependency_gap" ? 1.5 : 1.0,
        evidence_leverage: hasEvidence ? 1.5 : 1.0,
        user_fit: comp.evidence_ids.length === 1 ? 1.2 : 1.0,
        marginal_gain: comp.requirement_type === "core_required" ? 3.0 : 2.0,
        estimated_effort: estimatedEffort,
      },
      why_prioritized: whyPrioritized,
      project_leverage_example:
        hasEvidence
          ? {
              project_name: "Active Work Repository",
              current_contribution: `Contains ${comp.evidence_ids.length} work artifact(s) demonstrating foundational capabilities.`,
              extension_idea: `Add high-assurance tests or deployment pipelines to elevate ${comp.canonical_name} to ${comp.expected_level}.`,
            }
          : undefined,
      diagnosis: comp.gap_explanation,
      next_step_direction: nextStep,
      relevant_evidence_ids: comp.evidence_ids,
      confidence: comp.confidence,
      confidence_explanation: comp.confidence_explanation,
      confidence_rationale: comp.confidence_rationale,
    });
  });

  // Sort descending by priority_score
  gaps.sort((a, b) => b.priority_score - a.priority_score);
  gaps.forEach((g, idx) => {
    g.priority_rank = idx + 1;
  });

  return gaps;
}

export function evaluateCareerReadiness(
  match: RoleMatchResult,
  gaps: GapRecord[]
): CareerReadinessAssessment {
  const evidenceQualityPct = Math.round(
    (match.competency_matches.filter((m) => m.evidence_ids.length > 0).length /
      Math.max(1, match.total_competencies)) *
      100
  );

  const coreMatches = match.competency_matches.filter(
    (m) => m.requirement_type === "core_required"
  );
  const hasCore = coreMatches.length > 0;

  // Unified readiness index:
  // If role defines core requirements: 50% core coverage + 35% overall match + 15% evidence completeness
  // If role has no core requirements designated: 85% overall match + 15% evidence completeness
  const effectiveCoreScore = hasCore
    ? match.required_coverage_score
    : match.overall_match_score;

  const readinessIndex = hasCore
    ? Math.round(
        match.required_coverage_score * 0.50 +
          match.overall_match_score * 0.35 +
          evidenceQualityPct * 0.15
      )
    : Math.round(
        match.overall_match_score * 0.85 +
          evidenceQualityPct * 0.15
      );

  let tier: CareerReadinessAssessment["readiness_tier"] = "Early Stage";
  if (readinessIndex >= 80) tier = "High Readiness";
  else if (readinessIndex >= 60) tier = "Moderate Alignment";
  else if (readinessIndex >= 40) tier = "Developing Foundations";
  else tier = "Early Stage";

  const criticalBlockers = gaps
    .filter(
      (g) =>
        (hasCore ? g.requirement_type === "core_required" : true) &&
        (g.proficiency_distance >= 2 || g.gap_type === "skill_gap" || g.priority_score >= 60)
    )
    .map((g) => ({
      skill_id: g.skill_id,
      skill_name: g.canonical_name,
      expected_level: g.expected_level,
      current_state: `${g.current_supported_level} (${g.verification_status})`,
      reason: g.diagnosis,
      gap_id: g.gap_id,
    }));

  const uncertainties: string[] = [];
  match.competency_matches.forEach((m) => {
    if (m.verification_status === "insufficient_evidence" || m.verification_status === "candidate") {
      uncertainties.push(
        `${m.canonical_name}: Identified at ${m.current_proficiency}, but awaiting authoritative verification review.`
      );
    } else if (m.verification_status === "conflicting") {
      uncertainties.push(
        `${m.canonical_name}: Attribution conflict identified across source artifacts.`
      );
    }
  });

  return {
    role_id: match.role_id,
    role_title: match.role_title,
    readiness_index: readinessIndex,
    readiness_tier: tier,
    required_supported_pct: match.required_coverage_score,
    proficiency_alignment_pct: match.overall_match_score,
    evidence_quality_pct: evidenceQualityPct,
    critical_blockers: criticalBlockers,
    major_uncertainties: uncertainties,
    disclaimer:
      "This readiness assessment is an internal capability diagnostic and not an employment decision or hiring guarantee. It reflects verified evidence alignment for capability development.",
  };
}
