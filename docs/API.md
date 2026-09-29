# GrowthLens REST API Specification

This document provides the authoritative API reference for all endpoints exposed by the GrowthLens FastAPI backend server (`http://localhost:8000`).

---

## 1. Global Conventions & Standards

- **Base URL**: `http://localhost:8000` (or reverse-proxied via Next.js `/api/*`)
- **Data Exchange Format**: `application/json; charset=utf-8`
- **Authentication**: Bearer Token (`Authorization: Bearer <supabase_jwt>`) passed in request headers.
- **Error Response Standard**:
  ```json
  {
    "error": "error_code_string",
    "message": "Human-readable explanation of error",
    "details": {
      "field": "Validation or context metadata"
    }
  }
  ```
- **Standard HTTP Status Codes**:
  - `200 OK`: Request succeeded.
  - `201 Created`: Resource successfully registered or created.
  - `400 Bad Request`: Validation failure or malformed payload.
  - `401 Unauthorized`: Missing or invalid bearer token.
  - `403 Forbidden`: Tenant isolation violation or cross-employee access denied.
  - `404 Not Found`: Employee, competency, or evidence record not found.
  - `422 Unprocessable Entity`: Schema mismatch or missing required identity mapping.
  - `502 Bad Gateway`: Upstream integration failure (e.g., GitHub / Jira rate limit).
  - `503 Service Unavailable`: Local AI model service (Ollama) or Supabase down.

---

## 2. Health & System Diagnostics

### 2.1 Full Service Health Check
- **Path**: `GET /api/health`
- **Tags**: `Health`
- **Description**: Inspects connectivity across Supabase PostgreSQL, Ollama Local LLM, and ChromaDB vector store.
- **Response `200 OK`**:
  ```json
  {
    "status": "healthy",
    "app": "GrowthLens",
    "version": "0.1.0",
    "services": {
      "supabase": {
        "status": "healthy",
        "connected": true
      },
      "ollama": {
        "status": "healthy",
        "connected": true,
        "model_available": true,
        "target_model": "qwen3:8b"
      },
      "chromadb": {
        "status": "healthy",
        "connected": true
      }
    }
  }
  ```

---

## 3. Evidence Layer & RAG Pipelines (Feature 1)

### 3.1 List Evidence for Employee
- **Path**: `GET /api/evidence`
- **Query Parameters**:
  - `employee_id` (string, required): Unique UUID or employee ID.
  - `source` (string, optional): Filter by `github`, `jira`, `assessment`, `project_outcome`, `course_completion`.
  - `limit` (integer, default: 50): Number of records to return.
  - `offset` (integer, default: 0): Pagination offset.
- **Response `200 OK`**:
  ```json
  [
    {
      "id": "evd_9821a7c",
      "employee_id": "emp_01",
      "source": "github",
      "title": "Optimized Distributed Cache Eviction in Redis cluster",
      "content": "Refactored LRU cache invalidation logic using Redis streams...",
      "occurred_at": "2026-09-15T14:22:00Z",
      "evidence_strength": 0.88,
      "skill_tags": ["Distributed Systems", "Redis", "Performance Optimization"]
    }
  ]
  ```

### 3.2 Semantic RAG Query over Engineering Telemetry
- **Path**: `POST /api/evidence/query`
- **Description**: Embeds user query using `nomic-embed-text`, searches ChromaDB vector store, and returns semantically ranked evidence chunks with relevance scores.
- **Request Body**:
  ```json
  {
    "employee_id": "emp_01",
    "query": "Kubernetes cluster security and namespace isolation",
    "top_k": 5
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "query": "Kubernetes cluster security and namespace isolation",
    "results_count": 3,
    "matches": [
      {
        "evidence_id": "evd_5431",
        "content": "Merged PR #142: Implemented Kyverno admission controller policies...",
        "similarity_score": 0.892,
        "source": "github",
        "occurred_at": "2026-08-20T10:14:00Z"
      }
    ]
  }
  ```

### 3.3 Trigger Manual Evidence Extraction
- **Path**: `POST /api/evidence/extract`
- **Description**: Triggers LLM-assisted competency parsing on raw text or ingested commits.
- **Request Body**:
  ```json
  {
    "raw_text": "Designed high-throughput Kafka ingestion pipeline handling 50k events/sec.",
    "source_type": "github",
    "employee_id": "emp_01"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "extracted_competencies": ["Apache Kafka", "Event-Driven Architecture", "Throughput Tuning"],
    "evidence_strength": 0.92,
    "evidence_id": "evd_7891"
  }
  ```

---

## 4. Competency Trajectory & ML Engine (Feature 2)

### 4.1 Get Employee Trajectories
- **Path**: `GET /api/v1/trajectories/{employee_id}`
- **Description**: Returns all competency trajectories for an employee, computed by the PyTorch `CompetencyLSTM` model.
- **Response `200 OK`**:
  ```json
  {
    "employee_id": "emp_01",
    "competencies": [
      {
        "competency_id": "comp_python",
        "competency_name": "Python & Backend Systems",
        "current_score": 84.5,
        "trend": "improving",
        "confidence": 0.89,
        "freshness_status": "fresh",
        "class_probabilities": {
          "declining": 0.02,
          "stagnating": 0.08,
          "improving": 0.90
        },
        "evidence_count": 9,
        "last_observed_date": "2026-09-20T11:00:00Z"
      }
    ]
  }
  ```

### 4.2 Single Competency Trajectory Detail
- **Path**: `GET /api/v1/trajectories/{employee_id}/{competency_id}`
- **Description**: Returns deep trajectory breakdown including temporal attention weights, historical timeline, and evidence citations.
- **Response `200 OK`**:
  ```json
  {
    "employee_id": "emp_01",
    "competency_id": "comp_python",
    "competency_name": "Python & Backend Systems",
    "trend": "improving",
    "confidence": 0.89,
    "attention_weights": [0.03, 0.05, 0.07, 0.12, 0.18, 0.25, 0.30],
    "evidence_timeline": [
      {
        "date": "2026-06-01",
        "score": 68.0,
        "evidence_id": "evd_101",
        "title": "Initial Backend Assessment"
      },
      {
        "date": "2026-09-20",
        "score": 84.5,
        "evidence_id": "evd_9821",
        "title": "Redis Cluster Optimization PR"
      }
    ]
  }
  ```

### 4.3 What-If Counterfactual Simulator
- **Path**: `POST /api/v1/trajectories/simulate`
- **Description**: Executes transient, non-mutating trajectory projection through the PyTorch LSTM and Weibull survival model.
- **Request Body**:
  ```json
  {
    "employee_id": "emp_01",
    "competency_id": "comp_system_design",
    "action_type": "assessment",
    "simulated_score": 92.0
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "competency_id": "comp_system_design",
    "baseline": {
      "trend": "stagnating",
      "risk_level": "medium",
      "half_life_days": 78.4,
      "confidence": 0.62
    },
    "projected": {
      "trend": "improving",
      "risk_level": "low",
      "half_life_days": 134.2,
      "confidence": 0.81
    },
    "deltas": {
      "risk_score_delta": -0.28,
      "half_life_days_delta": +55.8,
      "confidence_delta": +0.19
    },
    "is_counterfactual": true
  }
  ```

### 4.4 Model Status & Evaluation Report
- **Path**: `GET /api/v1/model/status`
- **Path**: `GET /api/v1/model/evaluation`
- **Description**: Inspects active model parameter count, device placement (CPU/CUDA), test accuracy, macro F1, and confusion matrix.

---

## 5. Retention & Parametric Survival Modeling

### 5.1 Skill Retention & Decay Assessment
- **Path**: `GET /api/retention/assess`
- **Query Parameters**:
  - `employee_id` (string, required)
  - `competency_id` (string, optional)
- **Description**: Evaluates empirical survival probability using the trained `WeibullAFTFitter`.
- **Response `200 OK`**:
  ```json
  {
    "employee_id": "emp_01",
    "competency_id": "comp_k8s",
    "survival_probabilities": {
      "day_30": 0.942,
      "day_60": 0.815,
      "day_90": 0.641,
      "day_180": 0.389
    },
    "half_life_days": 112.5,
    "risk_level": "medium",
    "hazard_rate": 0.0084,
    "concordance_index": 0.7939
  }
  ```

---

## 6. Recommendations & Mentorship Pairing (Feature 3)

### 6.1 Personalized Action Recommendations
- **Path**: `GET /api/v1/recommendations/{employee_id}`
- **Description**: Generates prioritized intervention recommendations combining micro-courses, timestamped YouTube videos, and peer mentorship pairings.
- **Response `200 OK`**:
  ```json
  {
    "employee_id": "emp_01",
    "recommendations": [
      {
        "id": "rec_01",
        "competency_id": "comp_cloud_native",
        "action_type": "learning",
        "title": "Mastering Kubernetes Pod Security Standards",
        "description": "Targeted tutorial addressing container hardening gaps observed in PR #214.",
        "external_link": "https://www.youtube.com/watch?v=mock_video_id&t=145s",
        "timestamp_seconds": 145,
        "priority": "high",
        "urgency_score": 0.86
      },
      {
        "id": "rec_02",
        "competency_id": "comp_graph_databases",
        "action_type": "peer_mentorship",
        "title": "Peer Mentorship: Neo4j Query Optimization",
        "mentor_suggestion": {
          "mentor_id": "emp_04",
          "mentor_name": "Siddhesh Birewar",
          "matching_score": 0.94,
          "overlap_domain": "Knowledge Graphs & Cypher"
        }
      }
    ]
  }
  ```

### 6.2 Record Feedback on Recommendation
- **Path**: `POST /api/recommendations/feedback`
- **Request Body**:
  ```json
  {
    "recommendation_id": "rec_01",
    "action": "completed",
    "helpful": true,
    "user_notes": "Great deep-dive into seccomp profiles."
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "status": "recorded",
    "recommendation_id": "rec_01"
  }
  ```

---

## 7. Growth Intelligence & Manager Heatmaps (Feature 4)

### 7.1 Growth Narrative & Manager Executive Briefing
- **Path**: `GET /api/intelligence/narrative`
- **Query Parameters**:
  - `employee_id` (string, required)
- **Description**: Invokes Qwen 2.5 8B to synthesize longitudinal evidence and trajectory state into a coherent, executive narrative with evidentiary citations.
- **Response `200 OK`**:
  ```json
  {
    "employee_id": "emp_01",
    "narrative": "Over Q3 2026, employee demonstrated accelerated mastery in Cloud-Native Architecture [EVD-9821] while maintaining consistent velocity in backend systems...",
    "manager_briefing": {
      "key_improvements": [
        "Transitioned Redis caching to clustered architecture with 35% latency drop",
        "Authored 14 peer reviews with high technical rigor"
      ],
      "stagnating_areas": [
        "Limited commit velocity in front-end micro-services over the past 45 days"
      ],
      "suggested_focus": [
        "Reinforce Next.js server actions before upcoming sprint migration"
      ]
    },
    "evidence_citations": ["EVD-9821", "EVD-5431", "EVD-101"]
  }
  ```

### 7.2 Team Skill Heatmap & Organizational Analytics
- **Path**: `GET /api/intelligence/team-heatmap`
- **Query Parameters**:
  - `team_id` (string, required)
- **Response `200 OK`**:
  ```json
  {
    "team_id": "team_core_eng",
    "competency_names": ["Python", "Kubernetes", "PostgreSQL", "React", "System Design"],
    "members": [
      {
        "employee_id": "emp_01",
        "employee_name": "Shubham Pokale",
        "scores": {
          "Python": { "score": 84.5, "trend": "improving" },
          "Kubernetes": { "score": 76.0, "trend": "stagnating" }
        }
      }
    ],
    "patterns": [
      {
        "type": "skill_gap",
        "competency": "Kubernetes",
        "severity": "medium",
        "description": "3 of 5 team members have not committed infrastructure code in >60 days."
      }
    ]
  }
  ```

### 7.3 Privacy-Preserving Peer Benchmark
- **Path**: `GET /api/intelligence/benchmark`
- **Query Parameters**:
  - `employee_id` (string, required)
  - `competency_id` (string, required)
- **Description**: Returns k-anonymized cohort benchmark percentile without disclosing peer identities.
- **Response `200 OK`**:
  ```json
  {
    "employee_id": "emp_01",
    "competency_id": "comp_python",
    "benchmark_available": true,
    "percentile": 82.5,
    "cohort_size": 24,
    "summary": "Performing in the top 18% among engineers with comparable tenure."
  }
  ```
