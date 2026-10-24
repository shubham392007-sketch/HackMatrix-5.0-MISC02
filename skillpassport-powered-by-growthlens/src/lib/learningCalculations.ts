import {
  DomainBlueprint,
  DiagnosticQuestion,
  DiagnosticResult,
  LearningRoadmap,
  RoadmapStep,
  LearningTopic,
  KnowledgeAssessment,
  AssessmentAttempt,
  MiniProject,
  MiniProjectAttempt,
  CandidateLearningEvidence,
} from "@/types/learning";
import { EvidenceItem } from "@/types/evidence";

/**
 * Deterministic formula specified in PRD/TRD:
 * Mastery = 0.30 × Knowledge + 0.25 × Practice + 0.20 × Assessment + 0.25 × Project
 */
export function calculateTopicMastery(
  knowledge: number,
  practice: number,
  assessment: number,
  project: number
): number {
  const score =
    0.3 * Math.min(100, Math.max(0, knowledge)) +
    0.25 * Math.min(100, Math.max(0, practice)) +
    0.2 * Math.min(100, Math.max(0, assessment)) +
    0.25 * Math.min(100, Math.max(0, project));
  return Math.round(score);
}

/**
 * Check if all prerequisites for a topic are satisfied (mastery >= 60%)
 */
export function arePrerequisitesMet(
  prerequisiteIds: string[],
  allTopics: LearningTopic[]
): boolean {
  if (!prerequisiteIds || prerequisiteIds.length === 0) return true;
  return prerequisiteIds.every((prereqId) => {
    const prereqTopic = allTopics.find((t) => t.id === prereqId);
    if (!prereqTopic) return true;
    return prereqTopic.current_mastery >= 60;
  });
}

/**
 * Evaluate diagnostic test submissions
 */
export function evaluateDiagnostic(
  answers: Record<string, number>,
  questions: DiagnosticQuestion[],
  domainId: string
): DiagnosticResult {
  let totalCorrect = 0;
  const categoryScores: Record<string, { correct: number; total: number }> = {
    concept: { correct: 0, total: 0 },
    reasoning: { correct: 0, total: 0 },
    implementation: { correct: 0, total: 0 },
    application: { correct: 0, total: 0 },
  };

  const topicScores: Record<string, { correct: number; total: number }> = {};

  questions.forEach((q) => {
    const selected = answers[q.id];
    const isCorrect = selected === q.correct_index;
    if (isCorrect) totalCorrect++;

    // Category breakdown
    if (categoryScores[q.category]) {
      categoryScores[q.category].total++;
      if (isCorrect) categoryScores[q.category].correct++;
    }

    // Topic breakdown
    if (!topicScores[q.topic_id]) {
      topicScores[q.topic_id] = { correct: 0, total: 0 };
    }
    topicScores[q.topic_id].total++;
    if (isCorrect) topicScores[q.topic_id].correct++;
  });

  const overallScore = Math.round((totalCorrect / questions.length) * 100);
  const conceptScore = categoryScores.concept.total > 0
    ? Math.round((categoryScores.concept.correct / categoryScores.concept.total) * 100)
    : 70;
  const reasoningScore = categoryScores.reasoning.total > 0
    ? Math.round((categoryScores.reasoning.correct / categoryScores.reasoning.total) * 100)
    : 60;
  const implementationScore = categoryScores.implementation.total > 0
    ? Math.round((categoryScores.implementation.correct / categoryScores.implementation.total) * 100)
    : 40;
  const applicationScore = categoryScores.application.total > 0
    ? Math.round((categoryScores.application.correct / categoryScores.application.total) * 100)
    : 50;

  const finalTopicScores: Record<string, number> = {};
  const strongTopics: string[] = [];
  const weakTopics: string[] = [];

  Object.entries(topicScores).forEach(([tId, stat]) => {
    const pct = Math.round((stat.correct / stat.total) * 100);
    finalTopicScores[tId] = pct;
    if (pct >= 75) {
      strongTopics.push(tId);
    } else {
      weakTopics.push(tId);
    }
  });

  return {
    attempt_id: `diag-attempt-${Date.now()}`,
    domain_id: domainId,
    completed_at: "Just now",
    overall_score: overallScore,
    concept_score: conceptScore,
    reasoning_score: reasoningScore,
    implementation_score: implementationScore,
    application_score: applicationScore,
    topic_scores: finalTopicScores,
    strong_topics: strongTopics,
    weak_topics: weakTopics,
    prerequisite_weaknesses: weakTopics.slice(0, 2),
    recommended_focus: [
      "Threshold-based Outlier Capping (Percentile/Winsorization)",
      "Standardization vs Robust Scaling under non-normal distributions",
      "Leakage Prevention in Preprocessing Pipelines",
    ],
  };
}

/**
 * Generate or adapt a personalized roadmap based on blueprint, diagnostic, and preferences
 */
export function generatePersonalizedRoadmap(
  blueprint: DomainBlueprint,
  diagnostic?: DiagnosticResult,
  options?: {
    studyHours?: number;
    preference?: "text-first" | "video-first" | "practice-first";
    pace?: "standard" | "fast_track";
  }
): LearningRoadmap {
  const allTopics: LearningTopic[] = blueprint.modules.flatMap((m) => m.topics);
  const pace = options?.pace || "standard";
  const hours = options?.studyHours || 6;
  const preference = options?.preference || "practice-first";

  // Build steps in topological / module order
  const steps: RoadmapStep[] = [];

  blueprint.modules.forEach((mod) => {
    mod.topics.forEach((topic) => {
      // Diagnostic check: If fast track and student scored >= 85% on diagnostic, can skip or mark mastered
      const diagScore = diagnostic?.topic_scores[topic.id];
      const isDemonstrated = diagScore !== undefined && diagScore >= 85 && pace === "fast_track";

      const prereqsMet = arePrerequisitesMet(topic.prerequisites, allTopics);

      let stepStatus: RoadmapStep["status"] = "available";
      if (!prereqsMet) {
        stepStatus = "locked";
      } else if (isDemonstrated) {
        stepStatus = "completed";
      } else if (topic.current_mastery > 0 && topic.current_mastery < topic.target_mastery) {
        stepStatus = "in_progress";
      } else if (topic.current_mastery >= topic.target_mastery) {
        stepStatus = "completed";
      }

      let reason = `Essential topic in ${mod.title}. Target mastery is ${topic.target_mastery}%.`;
      if (diagScore !== undefined && diagScore < 60) {
        reason = `Diagnosed weak area (${diagScore}% diagnostic score). Prioritized before advanced modules.`;
      } else if (!prereqsMet) {
        reason = `Locked pending prerequisite completion: ${topic.prerequisites.join(", ")}.`;
      } else if (isDemonstrated) {
        reason = `Diagnosed strong baseline (${diagScore}%). Fast-track enabled you to accelerate past intro review.`;
      }

      steps.push({
        step_id: `step-${topic.id}`,
        topic_id: topic.id,
        module_id: mod.id,
        title: topic.title,
        learning_objective: topic.learning_objective,
        difficulty: topic.difficulty,
        estimated_minutes: pace === "fast_track" ? Math.round(topic.estimated_minutes * 0.75) : topic.estimated_minutes,
        current_mastery: topic.current_mastery,
        target_mastery: topic.target_mastery,
        prerequisite_ids: topic.prerequisites,
        prerequisites_met: prereqsMet,
        status: stepStatus,
        recommendation_reason: reason,
        recommended_resource_ids: [`res-${topic.id}-01`, `res-${topic.id}-02`],
        practice_exercise_ids: [`prac-${topic.id}-01`],
        assessment_id: `assessment-${blueprint.domain_id}`,
        project_id: topic.id.includes("outlier") ? "proj-outlier-pipeline" : undefined,
      });
    });
  });

  // Calculate overall baseline and current mastery
  const totalMastery = allTopics.reduce((acc, t) => acc + t.current_mastery, 0);
  const currentOverall = Math.round(totalMastery / allTopics.length);

  return {
    path_id: `roadmap-${blueprint.domain_id}`,
    domain_id: blueprint.domain_id,
    domain_title: blueprint.title,
    blueprint_version: blueprint.version,
    baseline_mastery: 48,
    current_mastery: currentOverall,
    target_mastery: blueprint.target_mastery,
    study_hours_per_week: hours,
    preference: preference,
    pace: pace,
    steps: steps,
    created_at: "2026-03-20",
    updated_at: "Today, Just now",
  };
}

/**
 * Evaluate assessment submission
 */
export function evaluateAssessmentAttempt(
  assessment: KnowledgeAssessment,
  answers: Record<string, number>
): AssessmentAttempt {
  let correct = 0;
  let conceptCorrect = 0;
  let conceptTotal = 0;
  let appCorrect = 0;
  let appTotal = 0;

  const topicResults: Record<string, { correct: number; total: number }> = {};

  assessment.questions.forEach((q) => {
    const isCorrect = answers[q.id] === q.correct_index;
    if (isCorrect) correct++;

    if (q.category === "concept") {
      conceptTotal++;
      if (isCorrect) conceptCorrect++;
    } else {
      appTotal++;
      if (isCorrect) appCorrect++;
    }

    if (!topicResults[q.topic_id]) {
      topicResults[q.topic_id] = { correct: 0, total: 0 };
    }
    topicResults[q.topic_id].total++;
    if (isCorrect) topicResults[q.topic_id].correct++;
  });

  const totalScore = Math.round((correct / assessment.questions.length) * 100);
  const passed = totalScore >= assessment.passing_threshold;

  const objectiveResults = Object.entries(topicResults).map(([tId, stat]) => {
    const s = Math.round((stat.correct / stat.total) * 100);
    return {
      topic_id: tId,
      score: s,
      passed: s >= 70,
      feedback: s >= 70
        ? "Satisfied demonstration on knowledge check."
        : "Threshold not reached; targeted practice or remediation recommended.",
    };
  });

  const failedTopics = objectiveResults.filter((o) => !o.passed).map((o) => o.topic_id);

  return {
    attempt_id: `attempt-${Date.now()}`,
    assessment_id: assessment.id,
    timestamp: "Just now",
    total_score: totalScore,
    passed: passed,
    concept_score: conceptTotal > 0 ? Math.round((conceptCorrect / conceptTotal) * 100) : 70,
    application_score: appTotal > 0 ? Math.round((appCorrect / appTotal) * 100) : 60,
    objective_results: objectiveResults,
    feedback: passed
      ? "Assessment passed. Your objective signals have been updated across your learning path."
      : "Score is below passing threshold. A focused remediation session has been generated.",
    needs_remediation: !passed,
    failed_topic_ids: failedTopics,
  };
}

/**
 * Creates candidate evidence artifact from submitted mini-project
 */
export function createCandidateEvidenceFromProject(
  project: MiniProject,
  attempt: MiniProjectAttempt,
  authorName: string = "Learner"
): { candidateEvidence: CandidateLearningEvidence; evidenceItem: EvidenceItem } {
  const artifactId = `art-${Date.now()}`;
  const evidenceId = `ev-learning-${Date.now()}`;

  const candidateEvidence: CandidateLearningEvidence = {
    artifact_id: artifactId,
    evidence_id: evidenceId,
    title: `${project.title} — Applied Demonstration`,
    source_type: "LEARNING_PROJECT",
    domain_id: project.domain_id,
    topic_id: project.id,
    related_skill_id: `skill-${project.domain_id}`,
    project_id: project.id,
    submitted_at: attempt.submitted_at,
    provenance: `Submitted via SkillPassport Learning Mini-Project (${project.title}). Deliverable: ${attempt.github_repo_url}. Status: ${attempt.status}.`,
    evidence_state: "Candidate Evidence Created",
    verification_notes:
      "Awaiting peer or supervisor review in Verification Center. Deliverable repository recorded as candidate capability evidence.",
  };

  const evidenceItem: EvidenceItem = {
    id: evidenceId,
    title: `${project.title} (Learning Deliverable)`,
    description: `Applied mini-project deliverable submitted in Domain 5 Learning Intelligence. Repo: ${attempt.github_repo_url}. Notes: ${attempt.summary_notes}`,
    sourceType: "portfolio",
    sourceReference: attempt.github_repo_url,
    project: project.title,
    evidenceType: "Learning Mini-Project Deliverable",
    date: attempt.submitted_at,
    claimedContribution: attempt.summary_notes || `Authored ${project.title} deliverable.`,
    author: authorName,
    isCollaborative: false,
    evidenceStrength: "medium",
    extractionConfidence: 85,
    processingStatus: "ready_for_review",
    reviewStatus: "pending_review",
    extractedSummary: attempt.summary_notes || project.problem_statement || `${project.title} implementation deliverable.`,
    normalizedMetadata: {
      format: "GitHub Repository / Code Package",
      authorIdentified: authorName,
      commitCount: 1,
    },
    candidateSkills: [
      {
        id: `skill-${project.domain_id}`,
        name: project.title,
        category: "Engineering Deliverables",
        excerpt: attempt.summary_notes || `Applied implementation of ${project.title}.`,
        associationReason: "Direct code authoring in mini-project submission",
        status: "candidate",
        proficiencyLevel: "Practitioner",
      },
    ],
    processingHistory: [
      {
        stage: "Submission Ingestion",
        status: "completed",
        timestamp: "Just now",
        detail: "Learning deliverable recorded into evidence catalog.",
      },
      {
        stage: "Candidate Extraction",
        status: "completed",
        timestamp: "Just now",
        detail: "Detected candidate skill from engineering code deliverable.",
      },
      {
        stage: "Verification Gate",
        status: "pending",
        timestamp: "Pending",
        detail: "Requires explicit Human Review in Verification Center before passport promotion.",
      },
    ],
  };

  return { candidateEvidence, evidenceItem };
}
