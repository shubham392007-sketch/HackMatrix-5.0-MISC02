# GrowthLens Qwen3 8B Feature Integration Guide

## 1. Feature 1: Evidence Intelligence & Ingestion
- **Module**: `backend.services.ingestion.EvidenceIngestionService`, `backend.rag.generator.CompetencyJustificationGenerator`
- **Method**: `QwenService.extract_evidence`, `QwenService.justify_competency`
- **Behavior**:
  - Pulls commits, PRs, and Jira issues.
  - Passes raw work descriptions encapsulated in `<RETRIEVED_EVIDENCE>` tags.
  - Extracts competencies, observable outcomes, and evidence strength.
  - Short-circuits with `insufficient_evidence` when 0 verified records are retrieved.

## 2. Feature 2: Competency Trajectory & Retention Decay
- **Module**: `routers.retention.explain_retention_trajectory` (`GET /api/v1/learner/{learner_id}/retention/explain`)
- **Method**: `QwenService.explain_trend`
- **Behavior**:
  - Receives deterministic Weibull survival curves, decay probabilities, and velocity.
  - Produces narrative explanations of why proficiency is decaying or accelerating.
  - **Invariant**: The LLM NEVER overrides the calculated mathematical trend (re-asserted in `result.trend = trend`).

## 3. Feature 3: Next-Action Recommendation Engine
- **Module**: `routers.recommendations.get_recommendations` (`GET /api/v1/learner/{learner_id}/recommendations?explain=true`)
- **Method**: `QwenService.explain_recommendation`
- **Behavior**:
  - Explains why a specific action (e.g. YouTube tutorial or peer mentorship) was selected.
  - Grounds explanation in recent declining competency signals.
  - **Invariant**: Preserves exact action titles and types from catalog rules.

## 4. Feature 4: Longitudinal Growth Narrative
- **Module**: `feature-4.backend.services.narrative_service.NarrativeService`
- **Method**: `QwenService.generate_growth_narrative`
- **Behavior**:
  - Synthesizes quarterly trajectory claims and multi-source evidence into an executive briefing.
  - Every factual statement includes verified evidence citation markers (e.g., `[E001]`).
  - Generates manager briefing sections: `key_improvements`, `stagnating_areas`, and `suggested_focus`.
