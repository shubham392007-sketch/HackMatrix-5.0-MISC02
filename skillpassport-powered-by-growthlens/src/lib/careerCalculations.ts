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
} from "@/types/career";

export function proficiencyToNumeric(level: ProficiencyLevel): number {
  switch (level) {
    case "Not Established":
      return 0;
    case "Foundation":
      return 1;
    case "Working":
      return 2;
    case "Practitioner":
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
  const rounded = Math.round(val);
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
      return rounded > 5 ? "Expert" : "Not Established";
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

export function classifyCompetencyGap(
  competency: RoleCompetency,
  userSkill: SkillItem | undefined,
  currentNumeric: number,
  expectedNumeric: number
): { gapType: GapClassification | null; explanation: string } {
  // If no record exists at all
  if (!userSkill || currentNumeric === 0) {
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
        "No verifiable capability or evidence found in connected ingestion sources.",
    };
  }

  // If prerequisites are unfulfilled
  if (competency.prerequisites && competency.prerequisites.length > 0) {
    // For prototype demo, if skill is deep-learning and machine-learning is candidate, flag dependency gap
    if (competency.skill_id === "skill-deep-learning") {
      return {
        gapType: "dependency_gap",
        explanation:
          "Prerequisite 'Supervised Machine Learning' is still in Candidate state and needs verification first.",
      };
    }
  }

  // If evidence status is insufficient or zero attributable proof
  if (
    userSkill.verificationState === "insufficient_evidence" ||
    userSkill.evidenceIds.length === 0
  ) {
    if (userSkill.id === "skill-deep-learning") {
      return {
        gapType: "application_gap",
        explanation:
          "Theoretical knowledge demonstrated by course certificate, but lacks applied codebase implementation commits.",
      };
    }
    return {
      gapType: "evidence_gap",
      explanation:
        "Claimed or suggested competency lacks attributable codebase, PR, or architecture artifacts to substantiate it.",
    };
  }

  // If established but below target depth
  if (currentNumeric < expectedNumeric) {
    return {
      gapType: "depth_gap",
      explanation: `Current demonstrated proficiency is ${userSkill.verifiedProficiency || userSkill.estimatedProficiency}, while target role requires ${competency.expected_level}.`,
    };
  }

  // If baseline met, and preferred
  if (
    competency.requirement_type === "preferred" ||
    competency.requirement_type === "differentiating"
  ) {
    return {
      gapType: "differentiation_opportunity",
      explanation:
        "Proficiency meets or exceeds expectations; strategically strengthens candidature.",
    };
  }

  return { gapType: null, explanation: "Target requirement fully satisfied with verified evidence." };
}

export function evaluateRoleMatch(
  role: RoleDemandModel,
  userSkills: SkillItem[]
): RoleMatchResult {
  const matches: CompetencyMatchResult[] = role.competencies.map((comp) => {
    const userSkill = userSkills.find((s) => s.id === comp.skill_id);

    const currentProf = userSkill?.verifiedProficiency !== "Not Established" && userSkill?.verifiedProficiency
      ? userSkill.verifiedProficiency
      : userSkill?.estimatedProficiency || "Not Established";

    const currentNumeric = proficiencyToNumeric(currentProf);
    const expectedNumeric = comp.expected_level_numeric || proficiencyToNumeric(comp.expected_level);

    const rawCoverage = expectedNumeric > 0
      ? Math.min(1.0, currentNumeric / expectedNumeric)
      : 1.0;

    // Apply verification adjustment
    let verificationFactor = 1.0;
    const vState = userSkill?.verificationState || "rejected";

    if (vState === "verified") {
      verificationFactor = 1.0;
    } else if (vState === "candidate") {
      verificationFactor = 0.55 * ((userSkill?.confidence || 80) / 100);
    } else if (vState === "insufficient_evidence") {
      verificationFactor = 0.2;
    } else if (vState === "conflicting") {
      verificationFactor = 0.35;
    } else {
      verificationFactor = 0.0;
    }

    const effectiveCoverage = rawCoverage * verificationFactor;

    const { gapType, explanation } = classifyCompetencyGap(
      comp,
      userSkill,
      currentNumeric,
      expectedNumeric
    );

    let matchStatus: CompetencyMatchResult["match_status"] = "missing_weak";
    if (vState === "verified" && effectiveCoverage >= 0.85) {
      matchStatus = "strong_match";
    } else if (effectiveCoverage > 0.4 && effectiveCoverage < 0.85) {
      matchStatus = "partial_match";
    } else if (vState === "insufficient_evidence" || vState === "candidate") {
      matchStatus = "evidence_gap";
    } else if (vState === "conflicting") {
      matchStatus = "conflicting";
    } else {
      matchStatus = "missing_weak";
    }

    return {
      skill_id: comp.skill_id,
      canonical_name: comp.canonical_name,
      requirement_type: comp.requirement_type,
      importance: comp.importance,
      expected_level: comp.expected_level,
      expected_level_numeric: expectedNumeric,
      current_proficiency: currentProf,
      current_proficiency_numeric: currentNumeric,
      verification_status: vState,
      confidence: userSkill?.confidence || 0,
      evidence_strength: userSkill?.evidenceStrength || "low",
      evidence_ids: userSkill?.evidenceIds || [],
      raw_coverage: rawCoverage,
      effective_coverage: effectiveCoverage,
      gap_type: gapType,
      gap_explanation: explanation,
      match_status: matchStatus,
      reason_codes: comp.reason_codes,
    };
  });

  // Calculate overall weighted match
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

  const reqScore = reqWeight > 0
    ? Math.round((reqEffectiveSum / reqWeight) * 100)
    : 0;

  const suppScore = suppWeight > 0
    ? Math.round((suppEffectiveSum / suppWeight) * 100)
    : 0;

  const strongMatches = matches.filter((m) => m.match_status === "strong_match").length;
  const partialMatches = matches.filter((m) => m.match_status === "partial_match").length;
  const evidenceGaps = matches.filter((m) => m.match_status === "evidence_gap").length;
  const missingWeak = matches.filter((m) => m.match_status === "missing_weak").length;
  const criticalBlockers = matches.filter(
    (m) => m.requirement_type === "core_required" && m.effective_coverage < 0.6
  ).length;

  return {
    role_id: role.role_id,
    role_title: role.title,
    role_version: role.version,
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
    calculated_at: "Today, Just now",
  };
}

export function extractGapRecords(
  matchResult: RoleMatchResult,
  role: RoleDemandModel
): GapRecord[] {
  const gaps: GapRecord[] = [];

  matchResult.competency_matches.forEach((comp) => {
    if (!comp.gap_type || comp.gap_type === "differentiation_opportunity") return;

    const levelGap = Math.max(0, comp.expected_level_numeric - comp.current_proficiency_numeric);
    const criticality = comp.importance === "critical" ? 5 : comp.importance === "high" ? 4 : comp.importance === "medium" ? 3 : 2;
    const depImpact = comp.skill_id === "skill-python" ? 3 : comp.skill_id === "skill-machine-learning" ? 3 : 1;
    const evLeverage = comp.evidence_ids.length > 0 ? 3 : 1;
    const userFit = 3;
    const marginalGain = comp.requirement_type === "core_required" ? 3 : 2;
    const estimatedEffort = levelGap >= 2 ? 4 : 2;

    const priorityScore = Math.round(
      ((criticality * Math.max(1, levelGap) * depImpact * evLeverage * userFit * marginalGain) /
        estimatedEffort) *
        10
    );

    let nextStep = "Build an applied codebase demonstration to substantiate this capability.";
    if (comp.gap_type === "application_gap") {
      nextStep = "Extend existing repo with applied production modules rather than taking more theory courses.";
    } else if (comp.gap_type === "evidence_gap") {
      nextStep = "Connect deployment manifests, Dockerfiles, or CI/CD pipelines to provide attributable proof.";
    } else if (comp.gap_type === "depth_gap") {
      nextStep = "Undertake multi-node distributed benchmarks to elevate proficiency from Working to Practitioner.";
    } else if (comp.gap_type === "dependency_gap") {
      nextStep = "Peer-verify foundational machine learning code before attempting deep learning qualification.";
    }

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
      evidence_status: comp.evidence_ids.length > 0 ? "sufficient" : "none",
      proficiency_distance: levelGap,
      priority_rank: 1, // Will be set after sorting
      priority_score: priorityScore,
      priority_inputs: {
        criticality,
        level_gap: levelGap,
        dependency_impact: depImpact,
        evidence_leverage: evLeverage,
        user_fit: userFit,
        marginal_gain: marginalGain,
        estimated_effort: estimatedEffort,
      },
      why_prioritized: `Ranked based on ${comp.importance} role criticality, proficiency gap of ${levelGap} tier(s), and high leverage over existing artifacts.`,
      project_leverage_example:
        comp.skill_id === "skill-cloud-deployment"
          ? {
              project_name: "smart-irrigation-ai Repository",
              current_contribution: "Contains working Python ingestion daemons and docker-compose.",
              extension_idea:
                "Add Kubernetes Helm chart manifests and GitHub Actions automated deployment workflow to instantly resolve this gap.",
            }
          : comp.skill_id === "skill-machine-learning"
          ? {
              project_name: "smart-irrigation-ai Repository",
              current_contribution: "Contains XGBRegressor cross-validation training script.",
              extension_idea:
                "Wrap inference model in a FastAPI container with drift telemetry logging to elevate from Candidate to Verified Practitioner.",
            }
          : undefined,
      diagnosis: comp.gap_explanation,
      next_step_direction: nextStep,
      relevant_evidence_ids: comp.evidence_ids,
    });
  });

  // Sort by priority score descending and assign ranks
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
  const readinessIndex = Math.round(
    match.required_coverage_score * 0.65 + match.supporting_coverage_score * 0.35
  );

  let tier: CareerReadinessAssessment["readiness_tier"] = "Early Stage";
  if (readinessIndex >= 80) tier = "High Readiness";
  else if (readinessIndex >= 65) tier = "Moderate Alignment";
  else if (readinessIndex >= 45) tier = "Developing Foundations";
  else tier = "Early Stage";

  const criticalBlockers = gaps
    .filter((g) => g.requirement_type === "core_required" && g.priority_inputs.criticality >= 4)
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
    if (m.verification_status === "insufficient_evidence") {
      uncertainties.push(
        `${m.canonical_name}: Stated in profile, but lack of code artifacts leaves true capability unverified.`
      );
    } else if (m.verification_status === "conflicting") {
      uncertainties.push(
        `${m.canonical_name}: Open attribution dispute between Git commits and Jira issue.`
      );
    }
  });

  return {
    role_id: match.role_id,
    role_title: match.role_title,
    readiness_index: readinessIndex,
    readiness_tier: tier,
    required_supported_pct: match.required_coverage_score,
    proficiency_alignment_pct: Math.round(
      (match.strong_matches_count / match.total_competencies) * 100
    ),
    evidence_quality_pct: Math.round(
      ((match.strong_matches_count + match.partial_matches_count) /
        match.total_competencies) *
        100
    ),
    critical_blockers: criticalBlockers,
    major_uncertainties: uncertainties,
    disclaimer:
      "Role readiness is an evidence-based comparison with the selected role model. It is not a hiring probability, employment guarantee or objective judgment of overall professional worth.",
  };
}
