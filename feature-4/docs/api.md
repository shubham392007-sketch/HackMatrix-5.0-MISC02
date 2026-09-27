# Feature 4 REST API Specification

Base Route Prefix: `/api/v1/feature4`

---

## 1. Growth Narrative API

### `POST /api/v1/feature4/narrative`
Generates or retrieves a concise, evidence-linked growth narrative for a learner over an evaluation period.

#### Request Body
```json
{
  "learner_id": "L000001",
  "evaluation_period": {
    "start_date": "2026-04-01",
    "end_date": "2026-06-30"
  },
  "competency_ids": ["C01", "C05"],
  "focus_mode": "manager_1on1"
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "learner_id": "L000001",
  "evaluation_period": {
    "start_date": "2026-04-01",
    "end_date": "2026-06-30",
    "label": "Q2 2026"
  },
  "narrative": "Priya's Python Programming improved steadily, driven by two high-impact pull requests in May and June, while Communication stagnated despite completing an executive workshop.",
  "claims": [
    {
      "claim_id": "CLM-001",
      "competency_id": "C01",
      "competency_name": "Python Programming",
      "claim_text": "Python Programming improved steadily, driven by two high-impact pull requests",
      "trend": "improving",
      "evidence_ids": ["E004", "E005"],
      "verified": true
    },
    {
      "claim_id": "CLM-002",
      "competency_id": "C05",
      "competency_name": "Communication",
      "claim_text": "Communication stagnated despite completing an executive workshop",
      "trend": "stagnating",
      "evidence_ids": ["E001"],
      "verified": true
    }
  ],
  "manager_briefing": {
    "key_improvements": ["Strong production code velocity in Python Programming"],
    "stagnating_areas": ["Communication shows limited recent practice"],
    "suggested_focus": ["Pair on upcoming cross-functional architecture presentations"]
  },
  "confidence_score": 0.82,
  "evidence_coverage": "high",
  "limitations": [
    "Evaluated strictly against verified telemetry logged within Q2 2026.",
    "Unconnected work activities are excluded from claim analysis."
  ]
}
```

---

## 2. Peer-Percentile Growth Benchmark API

### `GET /api/v1/feature4/benchmark/{learner_id}/{competency_id}`
Calculates aggregate, privacy-safe peer growth percentiles.

#### Query Parameters
- `start_date`: e.g. `2026-04-01`
- `end_date`: e.g. `2026-06-30`

#### Response (`200 OK` - Sufficient Cohort)
```json
{
  "available": true,
  "learner_id": "L000001",
  "competency_id": "C01",
  "competency_name": "Python Programming",
  "evaluation_period": {
    "start_date": "2026-04-01",
    "end_date": "2026-06-30"
  },
  "starting_level_group": "Intermediate (70-85)",
  "growth_percentile": 82,
  "relative_tier": "top 20%",
  "cohort_size_bucket": "10-25 peers",
  "privacy_safe": true,
  "methodology": "Empirical cumulative distribution over starting-level normalized growth rates in active period.",
  "disclaimer": "Percentile represents aggregate growth velocity among comparable peers; it is not an employee evaluation rank."
}
```

#### Response (`200 OK` - Small Cohort Suppression)
```json
{
  "available": false,
  "learner_id": "L000001",
  "competency_id": "C03",
  "competency_name": "Cloud Deployment",
  "privacy_safe": false,
  "reason": "Not enough comparable peers to provide a privacy-safe benchmark (k-anonymity threshold not met)."
}
```

---

## 3. Evidence Staleness & Confidence Decay API

### `GET /api/v1/feature4/confidence/{learner_id}/{competency_id}`
Returns the longitudinal confidence timeline, recency decay curve, and uncertainty band coordinates.

#### Response (`200 OK`)
```json
{
  "learner_id": "L000001",
  "competency_id": "C01",
  "competency_name": "Python Programming",
  "current_trend": "improving",
  "current_confidence": 0.84,
  "days_since_last_evidence": 22,
  "freshness_percentage": 87.8,
  "freshness_state": "Fresh",
  "last_evidence_timestamp": "2026-09-05",
  "timeline": [
    {
      "timestamp": "2026-08-01",
      "score": 88.0,
      "confidence": 0.88,
      "band_upper": 91.0,
      "band_lower": 85.0,
      "freshness": 100.0,
      "is_observed": true
    },
    {
      "timestamp": "2026-09-05",
      "score": 92.0,
      "confidence": 0.84,
      "band_upper": 96.0,
      "band_lower": 88.0,
      "freshness": 87.8,
      "is_observed": true
    },
    {
      "timestamp": "2026-10-15",
      "score": 92.0,
      "confidence": 0.62,
      "band_upper": 101.5,
      "band_lower": 82.5,
      "freshness": 58.2,
      "is_observed": false,
      "staleness_note": "Projected uncertainty widening due to 40 days without new evidence."
    }
  ],
  "methodology": {
    "uses_existing_confidence_model": true,
    "source": "Weibull AFT Feature Pipeline (Volume, Diversity, Recency, Stability)"
  }
}
```

---

## 4. Manager Team Skill Heatmap API

### `GET /api/v1/feature4/team-heatmap`
Returns the team-wide competency matrix, aggregate trend distributions, and dominant gap insights.

#### Query Parameters
- `team_id`: Optional (defaults to manager's authorized department, e.g. `Engineering`)
- `evaluation_period`: Optional (`current`, `last_quarter`)
- `competency_filter`: Optional (comma-separated competency IDs)

#### Response (`200 OK`)
```json
{
  "team_id": "Engineering",
  "team_name": "Core Engineering Team",
  "total_members": 5,
  "competencies": [
    {"competency_id": "C01", "competency_name": "Python Programming"},
    {"competency_id": "C03", "competency_name": "Cloud Deployment"},
    {"competency_id": "C04", "competency_name": "SQL & Databases"},
    {"competency_id": "C05", "competency_name": "Communication"}
  ],
  "matrix": [
    {
      "employee_id": "L000001",
      "display_name": "Priya Sharma",
      "role": "Software Engineer",
      "cells": {
        "C01": {"trend": "improving", "icon": "↑", "confidence": 0.84, "freshness": "Fresh"},
        "C03": {"trend": "stagnating", "icon": "→", "confidence": 0.58, "freshness": "Aging"},
        "C04": {"trend": "declining", "icon": "↓", "confidence": 0.72, "freshness": "Fresh"},
        "C05": {"trend": "improving", "icon": "↑", "confidence": 0.75, "freshness": "Fresh"}
      }
    }
  ],
  "team_aggregates": {
    "C01": {"improving": 4, "stagnating": 1, "declining": 0, "dominant_trend": "improving"},
    "C03": {"improving": 1, "stagnating": 3, "declining": 1, "dominant_trend": "stagnating"},
    "C04": {"improving": 0, "stagnating": 2, "declining": 3, "dominant_trend": "declining"},
    "C05": {"improving": 3, "stagnating": 2, "declining": 0, "dominant_trend": "improving"}
  },
  "team_insights": [
    {
      "competency_id": "C04",
      "insight_type": "skill_gap",
      "summary": "Decline is the dominant observed trajectory for SQL & Databases across 60% of the team.",
      "actionable_suggestion": "Schedule team-wide SQL performance indexing workshop."
    },
    {
      "competency_id": "C03",
      "insight_type": "stagnation",
      "summary": "Stagnation is the dominant observed trend for Cloud Deployment across 60% of the team.",
      "actionable_suggestion": "Rotate engineers onto active cloud infrastructure deployment tickets."
    }
  ]
}
```
