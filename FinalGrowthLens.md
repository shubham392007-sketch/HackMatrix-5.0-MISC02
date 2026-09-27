# GrowthLens – Complete Technical Requirements Document (TRD)

**Project:** GrowthLens
**Hackathon:** HACK MATRIX 5.0
**Track:** MISC02 – Continuous Talent Intelligence & Skill Growth
**System Type:** AI-powered continuous talent intelligence and skill-growth platform
**Primary Users:** Employees/Learners and Managers
**Core Principle:** GrowthLens must not treat capability as a static score. It builds a longitudinal evidence trail, determines the direction of each competency, explains why that conclusion was reached, and recommends what should happen next.

This TRD consolidates the MISC02 blueprint, the Skill Decay ML report, the Feature 1 RAG design, the Feature 2 enhancements, the Feature 3 implementation, and the Feature 4 enhancements discussed for the current GrowthLens build. Where the original blueprint and later implementation decisions differ, the later project decisions are explicitly identified rather than silently merged.

---

## 1. Product Objective

GrowthLens addresses the central MISC02 problem:

> How can a system determine whether an employee is actually progressing, stagnating, or declining across individual competencies when evidence is continuously changing?

The system therefore needs to transform:

**Raw evidence → structured competency evidence → longitudinal trajectory → trend classification → confidence → explanation → recommended action → future evidence**

The official MISC02 blueprint identifies seven mandatory outcomes:

1. Longitudinal skill profile.
2. Multiple evidence sources.
3. Strength and skill-gap identification.
4. Competency trajectories over time.
5. Improving/stagnating/declining classification.
6. Evidence-backed development actions.
7. Confidence level attached to conclusions. 

GrowthLens should therefore never behave like a conventional skills dashboard containing only skill bars or static scores.

---

# 2. System-Level Architecture

The complete GrowthLens system is divided into four major product features.

```text
                         ┌─────────────────────────┐
                         │       GrowthLens        │
                         └────────────┬────────────┘
                                      │
                         Authentication / Authorization
                                      │
                  ┌───────────────────┴───────────────────┐
                  │                                       │
             EMPLOYEE                                  MANAGER
                  │                                       │
                  └───────────────────┬───────────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │      Feature 1          │
                         │ Evidence Intelligence   │
                         │ & RAG Pipeline          │
                         └────────────┬────────────┘
                                      │
                            Structured Evidence
                                      │
                         ┌────────────▼────────────┐
                         │      Feature 2          │
                         │ Skill Trajectory &      │
                         │ Decay Intelligence     │
                         └────────────┬────────────┘
                                      │
                         Trend + Confidence + Risk
                                      │
                         ┌────────────▼────────────┐
                         │      Feature 3          │
                         │ Next-Action             │
                         │ Recommendation Engine  │
                         └────────────┬────────────┘
                                      │
                              Recommended Action
                                      │
                         ┌────────────▼────────────┐
                         │      Feature 4          │
                         │ Growth Intelligence &   │
                         │ Planning Layer          │
                         └─────────────────────────┘
```

The source blueprint describes the central architecture as evidence ingestion, multi-source fusion, LSTM classification, FastAPI, and a trajectory dashboard, with observed evidence kept distinct from modelled interpretations. 

---

# 3. Four Feature Architecture

## Feature 1 – Evidence Intelligence & RAG Engine

### Purpose

Automatically collect, normalize, classify and retrieve evidence related to an employee's competencies.

This is the **evidence layer** of GrowthLens.

Instead of requiring managers to manually enter:

> "Employee is good at Python."

GrowthLens should collect evidence such as:

```text
GitHub commit
Pull request
Code review
Jira task
Project outcome
Assessment
Course completion
Feedback
```

and transform it into structured competency evidence.

### Main components

```text
External Sources
      │
      ├── GitHub
      ├── Jira
      ├── Assessments
      ├── Project records
      └── Course records
              │
              ▼
      Evidence Ingestion
              │
              ▼
      Evidence Extraction
              │
              ▼
      Skill / Competency Tagging
              │
              ▼
      Evidence Normalization
              │
              ├───────────────► PostgreSQL / Supabase
              │
              ▼
        Embedding Layer
              │
              ▼
           ChromaDB
              │
              ▼
       RAG Retrieval Layer
              │
              ▼
        Ollama Qwen 8B
```

The original blueprint treats individual assessment/project/course records as observed data, while trend labels, confidence and recommendations are modelled interpretations. That distinction must remain explicit in the implementation. 

### Current prototype decision

For the prototype:

* Users can provide their own GitHub credentials/token.
* Users can provide required Jira credentials/configuration.
* GitHub/Jira ingestion is therefore credential-based rather than requiring organization-wide OAuth infrastructure.
* Local Ollama is used for the LLM layer.
* The selected local model is **Qwen 8B through Ollama**.
* ChromaDB is used for semantic retrieval.
* Supabase is used for authentication and application database needs.

### Evidence object

Conceptually:

```text
Evidence
├── evidence_id
├── employee_id
├── source_type
├── source_id
├── timestamp
├── title
├── description
├── raw_content
├── extracted_content
├── competency_tags
├── evidence_score
├── metadata
├── source_url
└── embedding_reference
```

### Example

GitHub PR:

```text
Source:
GitHub

Title:
Optimize Kafka consumer partition balancing

Extracted competency:
Kafka
Distributed Systems
Problem Solving

Evidence:
Employee modified partition assignment logic,
added tests and resolved rebalance failures.

Date:
2026-08-21
```

The system does **not** immediately say:

> "Employee is an expert in Kafka."

It records the event as evidence.

Feature 2 later interprets the sequence of such evidence.

---

# 4. Feature 1 – RAG Justification Engine

The RAG component answers:

> "Why did GrowthLens reach this conclusion?"

For example:

```text
Employee:
Priya

Competency:
Python

Trend:
Declining

Confidence:
81%
```

The system should retrieve evidence such as:

```text
PR #184
Last Python-related commit: 46 days ago

Code review:
2 Python reviews in previous quarter

Project:
No recent Python implementation activity

Assessment:
Latest Python assessment: 62%
```

The LLM then generates a grounded explanation.

```text
Python is currently classified as declining with 81%
confidence because recent Python-related engineering activity
has decreased. The latest relevant PR was 46 days ago and
the employee has had fewer Python code-review activities
compared with the previous period.
```

Every factual claim must be connected to retrievable evidence.

This follows the blueprint's requirement that recommendations be traceable to evidence rather than generic advice. 

---

# 5. Feature 2 – Skill Trajectory & Decay Intelligence

This is the **analytical/ML layer**.

Its job is to determine:

```text
Improving
Stagnating
Declining
```

for every competency independently.

It should not produce one overall employee score and infer everything from it.

The blueprint explicitly specifies an LSTM sequence classifier operating on time-ordered evidence for each competency. 

---

## 5.1 Input

For a competency such as Python:

```text
Employee
   ↓
Python competency
   ↓
Chronological evidence
   ↓

January     58
February    61
March       65
April       70
May         74
June        78
```

Another competency could simultaneously be:

```text
Communication

January     76
February    75
March       75
April       74
May         75
June        74
```

Result:

```text
Python         → Improving
Communication  → Stagnating
```

This per-competency approach is central to MISC02. 

---

# 6. Feature 2 ML Architecture

The documented baseline is:

```text
LSTM
1 layer
32 units
Sequence length = 8
Learning rate = 0.001
Epochs = 30
Batch size = 16
Loss = Cross Entropy
```

The expected evaluation target in the blueprint is greater than 85% accuracy on the held-out synthetic trajectory set. 

### Input

```text
[evidence_1,
 evidence_2,
 evidence_3,
 ...
 evidence_8]
```

### Output

```json
{
  "trend": "declining",
  "confidence": 0.81
}
```

---

# 7. Feature 2 – Skill Decay Intelligence

Skill decay is different from saying:

> "The employee lost the skill."

The provided Skill Decay report explicitly states that the model measures the freshness and confidence of supporting evidence rather than directly measuring human ability. 

The system can use:

```text
Days since last signal
Recent signal count
Historical signal frequency
PR activity
Code review activity
RFC / architecture activity
Incident activity
Activity trend
Signal freshness
Current competency confidence
```

These are documented signals for the decay model. 

Conceptually:

```text
Decay Risk =
f(
  Recency,
  Activity Frequency,
  Activity Trend,
  Historical Evidence,
  Current Confidence,
  Signal Freshness
)
```



---

# 8. Skill Freshness

GrowthLens can maintain a separate freshness indicator.

Example:

```text
Python
────────────────────────
Trend:        Improving
Confidence:   91%
Freshness:    High
Last Evidence:
2 days ago
```

versus:

```text
Kafka
────────────────────────
Trend:        Improving
Confidence:   64%
Freshness:    Low
Last Evidence:
94 days ago
```

The second employee may still possess the skill. The system is saying the **evidence supporting the skill is becoming stale**.

The source report explicitly warns against interpreting decay as proof that the employee has lost a skill. 

---

# 9. Feature 3 – Next-Action Recommendation Engine

This is the **prescriptive/action layer**.

Feature 2 says:

> "Python is declining."

Feature 3 asks:

> "What should the employee do next?"

The implementation supplied for Feature 3 defines the pipeline as:

```text
Trigger
   ↓
Recommendation Catalog
   ↓
Action Selection
   ↓
Precision Execution
```

---

## 9.1 Trigger

Feature 3 receives:

```json
{
  "employee_id": "EMP-102",
  "competency": "Python",
  "trend": "declining",
  "confidence": 0.81,
  "evidence_ref": "E-104"
}
```

---

## 9.2 Recommendation Catalog

The PostgreSQL recommendation catalog contains possible interventions.

Conceptually:

```text
tbl_recommendation_catalog

competency
deficiency_level
action_type
action
priority
```

Possible action categories:

```text
Micro-learning
Peer mentorship
Engineering practice
Review activity
Project activity
```

---

# 10. Feature 3 – Micro-Learning Routing

For a learning intervention:

```text
Declining competency
       ↓
Recommendation catalog
       ↓
YouTube Data API
       ↓
Find relevant tutorial
       ↓
Retrieve transcript
       ↓
Search transcript
       ↓
Identify relevant timestamp
       ↓
Generate deep link
```

Example:

```text
Skill:
Kafka Partition Rebalancing

Problem:
Partition rebalancing evidence is declining.

Recommended resource:
"Kafka Consumer Rebalancing Explained"

Relevant section:
08:42

Action:
Watch from 08:42
```

The Feature 3 design uses:

* YouTube Data API v3
* `youtube-transcript-api`
* timestamp/deep-link generation

---

# 11. Feature 3 – Internal Mentorship

If the recommendation requires human intervention:

```text
Declining employee
        ↓
Competency = Python
        ↓
Search employees with Python
        ↓
Find improving trajectory
        ↓
Create mentorship pairing
        ↓
Learner request
        ↓
Manager / learner workflow
```

The system should identify a potential peer based on the competency trajectory rather than simply selecting someone arbitrarily.

Conceptually:

```text
Candidate A → Python → Improving
Candidate B → Python → Stagnating
Candidate C → Python → Declining
```

Candidate A becomes eligible for the mentorship matching workflow.

The implementation creates a mentorship pairing record and exposes a mentorship request action.

---

# 12. Feature 3 Database Objects

The implementation specifies:

```text
tbl_recommendation_catalog
tbl_mentorship_pairings
```

The recommendation record should retain:

```text
employee
competency
action
evidence_ref
recommendation type
status
```

This is important because the GrowthLens blueprint explicitly recommends structurally enforcing an `evidence_ref` so that generic, unsupported recommendations cannot be produced. 

---

# 13. Feature 4 – Growth Intelligence & Planning

Feature 4 is the **decision-support and planning layer**.

It contains the enhancements that turn GrowthLens from a dashboard into an interactive talent-intelligence system.

It includes:

1. What-If Learning Path Simulator.
2. Auto-Generated Growth Narrative.
3. Peer-Percentile Growth Benchmarking.
4. Evidence Staleness & Confidence Decay Visualization.
5. Manager Team Skill Heatmap.
6. Natural-language "Ask GrowthLens" capability from the original blueprint.

The original blueprint defines the first five of these as differentiation features and describes the natural-language query capability separately as Section 8.1. 

---

# 14. What-If Learning Path Simulator

The learner selects a candidate action.

Example:

```text
Current:
Python → Declining

Action:
Complete Advanced Python course
```

GrowthLens creates a counterfactual evidence sequence:

```text
Historical Evidence
       +
Simulated New Evidence
       ↓
Same LSTM Model
       ↓
Projected Trajectory
       ↓
Projected Trend
```

Example UI:

```text
CURRENT

Python
╲
 ╲
  ╲
   ╲
    ╲

Declining
81% confidence


WHAT IF

Complete Advanced Python Course

╱
 ╱
╱
╱

Projected:
Improving
```

The blueprint specifically defines the simulator as re-running the same LSTM against a counterfactual evidence sequence. 

The result must be labelled **projected/counterfactual**, not actual employee performance.

---

# 15. Auto-Generated Growth Narrative

At the end of an evaluation period, GrowthLens generates a plain-language summary.

Example:

> Priya's Python competency improved steadily, supported by two strong project outcomes in March and April, while Communication remained largely stagnant despite one completed course.

Every factual claim must point back to evidence.

The blueprint explicitly describes this feature as a manager-ready artifact with claims linked to supporting evidence. 

The narrative should therefore have:

```text
Claim
 ↓
Evidence Reference
 ↓
Source
 ↓
Date
```

---

# 16. Peer-Percentile Growth Benchmarking

This feature should not expose another employee's raw performance.

Example:

```text
Data Analysis

Your growth:
Top 20%

Comparison group:
Employees who started at a similar level
```

The original design specifies privacy-safe aggregate statistics and no exposure of another person's identity or raw score. 

The system therefore needs:

```text
Employee
Baseline competency level
Growth rate
Comparison cohort
Aggregate percentile
```

It should avoid displaying a percentile when the comparison group is too small to produce a meaningful privacy-safe aggregate.

---

# 17. Evidence Staleness & Confidence Decay

Confidence should not remain static forever.

Example:

```text
Day 1

Improving
Confidence 91%
█████████
```

Later:

```text
Day 60

Improving
Confidence 73%
███████
```

Later:

```text
Day 120

Improving
Confidence 52%
█████
```

The trajectory visualization should communicate this through the confidence band.

The original specification describes a widening/lightening confidence band when supporting evidence becomes older. 

---

# 18. Manager Team Skill Heatmap

This is the organization-level view.

Example:

| Employee   | Python | SQL | Cloud | Communication |
| ---------- | ------ | --- | ----- | ------------- |
| Employee A | ↑      | →   | ↓     | ↑             |
| Employee B | ↑      | ↑   | →     | ↓             |
| Employee C | →      | ↑   | ↓     | ↑             |
| Employee D | ↑      | →   | ↓     | →             |

The purpose is not to expose detailed employee evidence.

It identifies aggregate patterns.

For example:

```text
Cloud Deployment
↓
Most of the team is stagnating
↓
Manager identifies team-level development need
```

The source specification describes this as an aggregate-only manager view. 

---

# 19. Ask GrowthLens

The original blueprint also defines a natural-language evidence query layer.

Example:

```text
User:
Who improved in Data Analysis this quarter?
```

The system converts the request into a structured query and returns chart-ready results. 

Another example:

```text
Show every competency that declined after March.
```

The system should translate:

```text
Natural Language
       ↓
Structured Query
       ↓
Evidence / Trajectory Database
       ↓
Result
       ↓
Chart / Table
```

This should not allow the LLM to directly execute arbitrary SQL.

---

# 20. Authentication & Authorization

GrowthLens has two primary roles.

```text
EMPLOYEE
MANAGER
```

The authentication system must determine the role during account setup/login and route the user to the appropriate product experience.

The current implementation direction is Supabase for authentication and application database functionality.

---

## Employee

Employee access includes:

```text
Personal Dashboard
My Competencies
My Evidence
Skill Trajectories
Recommendations
What-If Simulator
Growth Narrative
Personal Benchmarking
Connected Integrations
Profile / Settings
```

An employee should primarily see their own detailed evidence.

---

## Manager

Manager access includes:

```text
Manager Dashboard
Team Competency Overview
Team Skill Heatmap
Employee Profiles
Trajectory Analysis
Evidence
Recommendations
Growth Narratives
Team-Level Trends
```

Manager access must respect employee-level access boundaries.

The manager heatmap is aggregate-oriented, while detailed employee evidence should be accessed only through the appropriate authorized workflow.

---

# 21. Authentication Flow

### Registration

```text
Create Account
      ↓
Name
Email
Password / Auth Provider
Role
      ↓
Employee OR Manager
      ↓
Role-specific onboarding
```

### Employee onboarding

```text
Employee
   ↓
Basic profile
   ↓
Competencies / role information
   ↓
Connect evidence sources
   ↓
GitHub token
Jira credentials
   ↓
Start ingestion
```

### Manager onboarding

```text
Manager
   ↓
Basic profile
   ↓
Organization/team context
   ↓
Team access configuration
   ↓
Manager dashboard
```

Credentials should never be stored in frontend code or committed to GitHub.

---

# 22. Database Architecture

The system requires several logical data domains.

```text
Supabase PostgreSQL
│
├── Users
├── Roles
├── Employees
├── Managers
├── Teams
├── Competencies
├── Evidence
├── Evidence Sources
├── Trajectories
├── Trend Predictions
├── Confidence Records
├── Recommendations
├── Mentorship Pairings
├── Learning Actions
├── Narratives
├── Benchmark Aggregates
└── Integration Credentials
```

The original blueprint separates the time-series evidence layer and recommendation storage, describing PostgreSQL + TimescaleDB for evidence and PostgreSQL for recommendations. 

For the current application architecture, the database implementation should preserve the same logical separation even if the deployment uses the project's selected PostgreSQL/Supabase setup.

---

# 23. Core Data Relationships

```text
User
 │
 ├──── Employee
 │       │
 │       ├──── Competencies
 │       │        │
 │       │        └──── Evidence
 │       │                 │
 │       │                 └──── Embedding
 │       │
 │       ├──── Trajectories
 │       │
 │       ├──── Predictions
 │       │
 │       └──── Recommendations
 │
 └──── Manager
          │
          └──── Team
                   │
                   └──── Employees
```

---

# 24. Evidence Lifecycle

Every evidence item should follow:

```text
INGEST
   ↓
VALIDATE
   ↓
NORMALIZE
   ↓
EXTRACT
   ↓
TAG
   ↓
STORE
   ↓
EMBED
   ↓
INDEX
   ↓
RETRIEVE
   ↓
ANALYZE
```

This gives GrowthLens a clean separation between observed data and modelled conclusions.

---

# 25. API Architecture

FastAPI is the primary backend service layer documented by the project blueprint. 

Suggested logical API groups:

```text
/api/v1/auth
/api/v1/users
/api/v1/employees
/api/v1/managers
/api/v1/competencies
/api/v1/evidence
/api/v1/ingestion
/api/v1/trajectory
/api/v1/predictions
/api/v1/recommendations
/api/v1/rag
/api/v1/simulator
/api/v1/narratives
/api/v1/benchmarks
/api/v1/heatmap
/api/v1/mentorship
```

---

# 26. Core Existing API Contract

The blueprint defines these core endpoints:

```text
GET /api/v1/learner/{id}/competencies

GET /api/v1/learner/{id}/trajectory/{competency}

GET /api/v1/learner/{id}/evidence/{competency}

GET /api/v1/learner/{id}/recommendations

GET /api/v1/learner/{id}/summary
```

The documented responses include competency lists, trajectory points, trend, confidence, evidence records, evidence-linked recommendations, strengths and gaps. 

---

# 27. Evidence API

Example:

```http
POST /api/v1/evidence/ingest
```

Input:

```json
{
  "employee_id": "EMP-001",
  "source": "github",
  "source_id": "PR-184",
  "timestamp": "2026-09-20T10:30:00Z",
  "content": "Implemented Kafka partition balancing..."
}
```

Output:

```json
{
  "evidence_id": "E-184",
  "competencies": [
    "Kafka",
    "Distributed Systems"
  ],
  "status": "processed"
}
```

---

# 28. Trajectory API

```http
GET /api/v1/learner/EMP-001/trajectory/Python
```

Example:

```json
{
  "competency": "Python",
  "points": [
    {
      "date": "2026-06-01",
      "score": 60
    },
    {
      "date": "2026-07-01",
      "score": 68
    },
    {
      "date": "2026-08-01",
      "score": 64
    }
  ],
  "trend": "declining",
  "confidence": 0.81
}
```

---

# 29. Recommendation API

```http
GET /api/v1/learner/EMP-001/recommendations
```

Example:

```json
{
  "recommendations": [
    {
      "competency": "Python",
      "action_type": "micro_learning",
      "action": "Complete Python concurrency refresher",
      "evidence_ref": "E-184",
      "confidence": 0.81
    }
  ]
}
```

The evidence reference is mandatory.

---

# 30. RAG API

```http
POST /api/v1/rag/explain
```

Input:

```json
{
  "employee_id": "EMP-001",
  "competency": "Python",
  "question": "Why is Python classified as declining?"
}
```

Pipeline:

```text
Question
 ↓
Embedding
 ↓
ChromaDB
 ↓
Top relevant evidence
 ↓
Context assembly
 ↓
Ollama Qwen 8B
 ↓
Grounded explanation
```

Output:

```json
{
  "answer": "...",
  "evidence": [
    "E-184",
    "E-192",
    "E-203"
  ]
}
```

---

# 31. Frontend Architecture

The original GrowthLens UI blueprint calls for a competency grid, detailed trajectory, evidence, recommendations, heatmap and natural-language query bar. 

The current GrowthLens visual design uses the provided Moonwood reference as the design system.

Therefore the visual layer should **not look like a conventional enterprise HR SaaS dashboard**.

---

# 32. GrowthLens Visual Design System

### Background

Continuous:

```css
linear-gradient(
  180deg,
  #FBF1CF,
  #F6C8D6,
  #F3A878
)
```

The entire page uses one continuous warm gradient.

### Primary colors

```text
Lime       #DFE968
Cream      #FBF1CF
Blush      #F6C8D6
Peach      #F3A878
CTA        #F6BB84
Ink        #1C1C1C
Card       #FBF6DF
```

### Typography

```text
Primary:
Poppins

Script emphasis:
Yellowtail or equivalent

Logo:
Script + Poppins
```

The script font should only be used for emphasis.

---

# 33. Global UI Structure

```text
┌────────────────────────────────────┐
│ GROWTHLENS NAVIGATION              │
├────────────────────────────────────┤
│                                    │
│ HERO / PAGE INTRO                  │
│                                    │
├────────────────────────────────────┤
│                                    │
│ MAIN CONTENT                       │
│                                    │
├────────────────────────────────────┤
│                                    │
│ ACTION / CONVERSION SECTION        │
│                                    │
├────────────────────────────────────┤
│ FOOTER                             │
└────────────────────────────────────┘
```

The visual language should retain:

* warm gradient,
* thin dark borders,
* rounded pill controls,
* organic shapes,
* editorial typography,
* script emphasis,
* scalloped/wavy cards,
* restrained motion,
* asymmetrical compositions.

---

# 34. Required Pages

## Public pages

```text
/
 /about
 /features
 /features/evidence-intelligence
 /features/trajectory-intelligence
 /features/recommendations
 /features/growth-intelligence
 /contact
```

## Authentication

```text
/login
/register
/forgot-password
/reset-password
```

## Employee

```text
/app
/app/competencies
/app/competencies/[competency]
/app/evidence
/app/recommendations
/app/simulator
/app/narrative
/app/benchmarks
/app/integrations
/app/settings
```

## Manager

```text
/manager
/manager/team
/manager/team/heatmap
/manager/employees
/manager/employees/[employee]
/manager/competencies
/manager/narratives
/manager/recommendations
/manager/settings
```

---

# 35. Employee Dashboard

The employee dashboard should emphasize:

```text
Hello, Priya

Your Growth This Period
─────────────────────────

Python             ↑ Improving
SQL                → Stagnating
Cloud              ↓ Declining
Communication      ↑ Improving

Confidence
Evidence freshness
```

The competency grid should remain compact. The source blueprint specifically recommends keeping the grid around six cards maximum for the primary demo view and always showing trend and confidence together. 

---

# 36. Competency Detail Page

When the employee selects:

```text
Python
```

show:

```text
Python
Improving
91% confidence

────────────────────────
Trajectory Chart
────────────────────────

● Assessment
● Project
● GitHub
● Course

────────────────────────
Why this trend?
────────────────────────

Evidence explanation

────────────────────────
Supporting Evidence
────────────────────────

E-101
E-122
E-143

────────────────────────
Recommended Next Action
────────────────────────
```

---

# 37. Manager Dashboard

Manager view:

```text
TEAM GROWTH

12 Employees
8 Competencies

Team Skill Heatmap

Employee      Python   SQL   Cloud
-----------------------------------
A              ↑       →      ↓
B              ↑       ↑      →
C              →       ↑      ↓
D              ↑       →      →
```

Then:

```text
Team-level observations

Cloud Deployment
Most employees show stagnant
or declining evidence.
```

No unnecessary employee-level raw evidence should be exposed in the aggregate heatmap.

---

# 38. Responsive Requirements

The system must work across:

```text
Desktop
Laptop
Tablet
Mobile
```

### Desktop

Use the full multi-panel layout.

### Tablet

Convert multi-column sections to two-column layouts.

### Mobile

Convert:

```text
Grid → vertical cards
Trajectory + evidence → stacked
Heatmap → horizontally scrollable table
Navigation → compact menu
```

Charts must resize without losing evidence markers.

---

# 39. Confidence System

Confidence must be distinct from trend.

Bad:

```text
Python
Improving
```

Correct:

```text
Python

↑ Improving

Confidence: 91%

Evidence freshness: High
```

The system should explain that confidence reflects the available evidence and its freshness, not an absolute measurement of human ability.

This is especially important for Skill Decay, where the source report explicitly states that the model measures evidence freshness rather than proving skill loss. 

---

# 40. Observed vs Modelled Data

This distinction should exist throughout the product.

### Observed

```text
Assessment score = 74
PR merged = Yes
Course completed = Yes
Code review = 3
```

### Modelled

```text
Trend = Improving
Confidence = 87%
Decay risk = Moderate
Recommendation = Peer review practice
```

The original architecture explicitly requires this distinction. 

---

# 41. End-to-End Data Flow

The complete system becomes:

```text
             GitHub
                │
             Jira
                │
         Assessments
                │
        Project Outcomes
                │
       Course Completion
                │
                ▼
       ┌─────────────────┐
       │ Feature 1       │
       │ Evidence        │
       │ Intelligence    │
       └────────┬────────┘
                │
        Structured Evidence
                │
          ┌─────┴─────┐
          │           │
          ▼           ▼
       Database     ChromaDB
          │           │
          │           ▼
          │       RAG + Ollama
          │           │
          ▼           │
       Feature 2      │
       LSTM            │
          │           │
          ├───────────┘
          │
   Trend + Confidence
          │
          ▼
       Feature 3
   Recommendation Engine
          │
          ├── Learning
          ├── Practice
          └── Mentorship
          │
          ▼
       Feature 4
 Growth Intelligence
          │
          ├── What-If
          ├── Narrative
          ├── Benchmark
          ├── Confidence Decay
          └── Team Heatmap
```

This creates the continuous loop described in the Skill Decay report:

**Collect → Extract → Predict → Detect → Alert → Recommend → Re-evaluate.** 

---

# 42. Continuous Feedback Loop

The system should never terminate at the recommendation.

Example:

```text
Python declining
       ↓
Recommendation:
Complete Python concurrency exercise
       ↓
Employee completes activity
       ↓
New evidence
       ↓
Feature 1 ingests it
       ↓
Feature 2 recalculates trajectory
       ↓
Python changes from
Declining → Improving
       ↓
Confidence updated
       ↓
Recommendation state updated
```

That is the fundamental difference between GrowthLens and a static HR dashboard.

---

# 43. External Integrations

### Prototype integrations

```text
GitHub
Jira
YouTube Data API
YouTube Transcript API
Ollama
ChromaDB
Supabase
```

### GitHub

Used for:

```text
Commits
PRs
Reviews
Repositories
Project activity
```

### Jira

Used for:

```text
Tasks
Issues
Project activity
Completion information
```

### YouTube

Used by Feature 3 for targeted learning-resource discovery.

### Ollama

Used for local LLM operations, particularly Feature 1's contextual evidence reasoning.

### ChromaDB

Used for semantic retrieval of evidence.

### Supabase

Used for authentication and application persistence according to the current project implementation direction.

---

# 44. Environment Variables

Secrets must live outside source code.

Conceptually:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=

GITHUB_TOKEN=

JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=

YOUTUBE_API_KEY=

OLLAMA_BASE_URL=
OLLAMA_MODEL=

CHROMA_HOST=
CHROMA_PORT=
```

Employee-provided integration credentials must be isolated from other employees.

---

# 45. Security Requirements

The system must:

* Never expose API tokens in frontend JavaScript.
* Never commit `.env` files.
* Never place GitHub/Jira credentials in GitHub.
* Encrypt or securely store integration credentials where persistence is required.
* Apply role-based authorization to employee and manager routes.
* Ensure employees cannot access another employee's private evidence.
* Keep manager aggregate views appropriately scoped.
* Validate every external integration request.
* Sanitize retrieved evidence before sending it to an LLM.
* Prevent arbitrary SQL execution through Ask GrowthLens.
* Record evidence references for model-generated explanations.

---

# 46. AI/ML Explainability Requirements

GrowthLens must never display:

```text
Python – Declining
```

without an explanation path.

Instead:

```text
Python
↓ Declining
81% confidence

Why?

• Fewer Python PRs recently
• Last relevant implementation 46 days ago
• Reduced code-review activity

Evidence:
E-184
E-192
E-203
```

This is directly aligned with the requirement that modelled conclusions remain visible alongside their underlying observed evidence. 

---

# 47. Insufficient Evidence State

The platform must explicitly handle insufficient evidence.

For example:

```text
Python

Insufficient Evidence

Confidence: 31%

Only two recent evidence points
are available to determine a reliable
trajectory.
```

It must **not invent a trend classification** merely to fill a UI card.

This is especially important because the problem statement requires confidence and the blueprint emphasizes evidence volume and recency in confidence determination. 

---

# 48. Error States

Every major workflow needs meaningful states.

### No evidence

```text
No evidence available yet.
Connect GitHub or Jira to begin.
```

### Integration failure

```text
GitHub connection failed.

Check the supplied token and try again.
```

### Insufficient evidence

```text
Not enough evidence to classify this competency.
```

### RAG failure

```text
GrowthLens could not retrieve sufficient
supporting evidence for this explanation.
```

### ML failure

```text
Trajectory analysis is temporarily unavailable.
Your evidence has been preserved.
```

---

# 49. Synthetic Dataset

Synthetic longitudinal data is required for the documented LSTM training/evaluation approach.

The blueprint specifies a dataset containing deliberately designed:

```text
Improving
Stagnating
Declining
```

trajectories. 

The dataset should include:

```text
Employee
Competency
Timestamp
Evidence source
Evidence score
Evidence type
Activity frequency
```

The blueprint also recommends realistic noise and at least one ambiguous/borderline trajectory rather than only perfectly separated examples. 

Synthetic data is primarily for **Feature 2 model training/testing**, not for pretending that fabricated evidence is real employee evidence.

---

# 50. ML Evaluation

The documented target is:

```text
Held-out synthetic trajectory set
        ↓
LSTM classifier
        ↓
Accuracy > 85%
```

But the UI should never claim that a model is reliable merely because it achieved a particular synthetic-dataset accuracy.

The production-style interface should still expose:

```text
Evidence count
Evidence freshness
Confidence
Trend
```

---

# 51. MLOps

The original architecture specifies MLflow for model tracking and monitoring. 

Model lifecycle:

```text
Dataset
 ↓
Training
 ↓
Validation
 ↓
MLflow Experiment
 ↓
Model Version
 ↓
Inference
 ↓
Trajectory Result
```

Model metadata should include:

```text
model version
training dataset version
training date
metrics
hyperparameters
sequence length
```

---

# 52. Deployment Architecture

The original blueprint identifies:

```text
Frontend → Vercel
API → Render
Database → PostgreSQL / TimescaleDB
```

as the hackathon deployment approach. 

The current project implementation can retain the same service separation while using the project's selected Supabase setup for authentication/application persistence.

Conceptually:

```text
                    Internet
                       │
                       ▼
                Next.js Frontend
                       │
                       ▼
                  FastAPI API
                 /      |      \
                /       |       \
               ▼        ▼        ▼
         PostgreSQL   ChromaDB   ML Service
               │                   │
               │                   ▼
               │                 LSTM
               │
               ▼
           Supabase/Auth

External:
GitHub
Jira
YouTube
Ollama
```

---

# 53. Non-Functional Requirements

## Performance

The UI should load the dashboard without waiting for expensive LLM operations.

Heavy operations such as:

```text
GitHub ingestion
Jira ingestion
embedding
LSTM inference
RAG generation
```

should be handled asynchronously where appropriate.

## Reliability

If an LLM call fails, previously ingested evidence must remain available.

If GitHub ingestion fails, the existing evidence history must not be deleted.

## Scalability

New evidence sources should be addable without rewriting the trajectory model architecture.

The original blueprint explicitly describes adding new evidence-source types without changing the trend-labelling architecture. 

---

# 54. Folder Architecture

A clean implementation can follow:

```text
growthlens/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── features/
│   │   ├── evidence/
│   │   ├── trajectory/
│   │   ├── recommendations/
│   │   └── growth-intelligence/
│   ├── lib/
│   └── styles/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── integrations/
│   │   │   ├── github/
│   │   │   ├── jira/
│   │   │   └── youtube/
│   │   ├── rag/
│   │   ├── recommendations/
│   │   └── auth/
│   └── main.py
│
├── ml/
│   ├── datasets/
│   ├── preprocessing/
│   ├── models/
│   ├── training/
│   ├── evaluation/
│   └── inference/
│
├── chroma/
│
├── database/
│   ├── migrations/
│   └── seeds/
│
├── docs/
│
└── .env.example
```

For your current four-feature development, each feature can additionally have an isolated implementation directory so that Feature 4 remains separate as previously requested.

---

# 55. Feature Ownership Boundaries

A critical architectural rule:

### Feature 1 owns

```text
Evidence collection
Evidence extraction
Skill tagging
Normalization
Embedding
RAG retrieval
Evidence justification
```

### Feature 2 owns

```text
Trajectory construction
LSTM
Trend classification
Confidence
Skill decay
Freshness
```

### Feature 3 owns

```text
Recommendation selection
Learning resources
Timestamp extraction
Mentorship matching
Recommendation workflow
```

### Feature 4 owns

```text
What-if simulation
Growth narratives
Peer benchmarking
Confidence visualization
Manager heatmap
Ask GrowthLens
```

This prevents feature logic from becoming tangled.

---

# 56. Complete Product Flow

A real user journey should look like:

```text
1. User registers
        ↓
2. Selects Employee / Manager role
        ↓
3. Employee connects GitHub/Jira
        ↓
4. GrowthLens ingests evidence
        ↓
5. Evidence is tagged to competencies
        ↓
6. Evidence is stored + embedded
        ↓
7. Feature 2 builds chronological sequences
        ↓
8. LSTM evaluates trajectories
        ↓
9. GrowthLens determines:
       Improving
       Stagnating
       Declining
        ↓
10. Confidence calculated
        ↓
11. Evidence shown
        ↓
12. Feature 1 RAG explains conclusion
        ↓
13. Feature 3 recommends action
        ↓
14. Employee selects action
        ↓
15. Feature 4 can simulate outcome
        ↓
16. Employee performs action
        ↓
17. New evidence arrives
        ↓
18. Model recalculates
        ↓
19. GrowthLens updates trajectory
```

That is the actual **continuous talent intelligence loop**.

---

# 57. HackMatrix Compliance

The official Round 01 rubric allocates:

| Criterion                            |  Points |
| ------------------------------------ | ------: |
| Innovativeness                       |      10 |
| Problem Understanding & Solution Fit |      10 |
| Tech Stack                           |      15 |
| Presentation                         |      10 |
| UI/UX                                |      15 |
| GitHub Maintenance                   |      20 |
| Documentation                        |      10 |
| Social Impact                        |      10 |
| **Total**                            | **100** |



Round 01 requires a working prototype with at least 30–40% of the proposed solution demonstrable. 

Round 02 requires a working end product and explicitly requires AI/ML integration. 

---

# 58. GitHub Requirements

The official rules state that:

* The team leader creates the repository.
* Other members are collaborators.
* The repository starts private.
* All members must contribute.
* Meaningful commits are expected.
* ZIP files, binaries and large videos should not be committed.
* The repository must become public before the Round 01 submission period ends. 

The GrowthLens blueprint proposes:

```text
main
  ↑
dev
  ↑
feature-evidence-ingestion
feature-trajectory-model
feature-dashboard
feature-docs
```

with reviewed PRs rather than direct pushes to `main`. 

---

# 59. Documentation Requirements

The repository documentation should contain:

```text
README.md

1. Problem Statement
2. GrowthLens Overview
3. Architecture
4. Four Features
5. AI/ML Architecture
6. Evidence Weighting
7. Confidence Methodology
8. RAG Architecture
9. API Reference
10. Database Schema
11. Setup
12. Environment Variables
13. Synthetic Dataset
14. Model Evaluation
15. Limitations
16. Team & Roles
```

The source blueprint specifically calls for evidence-weighting and confidence methodology documentation because the reasoning behind confidence is important to the problem. 

---

# 60. Critical Product Safeguards

GrowthLens should **never** say:

> "You have lost Python."

Instead:

> "Recent evidence supporting your Python competency has decreased, and the current evidence indicates a declining trajectory."

Likewise:

> "Your skill is bad."

should never be generated.

The system is evaluating evidence and trajectories, not making an absolute judgment about a person's inherent ability.

The Skill Decay report explicitly establishes this distinction and warns that missing telemetry may occur because someone changed projects, worked on confidential systems, or performed relevant work outside connected tools. 

---

# 61. Final Technical Definition

GrowthLens can therefore be understood as four connected layers:

```text
┌─────────────────────────────────────────────┐
│ FEATURE 4                                   │
│ Growth Intelligence & Planning              │
│                                             │
│ What-If • Narrative • Benchmark • Heatmap   │
└───────────────────────▲─────────────────────┘
                        │
┌───────────────────────┴─────────────────────┐
│ FEATURE 3                                   │
│ Next-Action Recommendation Engine           │
│                                             │
│ Learning • Practice • Mentorship            │
└───────────────────────▲─────────────────────┘
                        │
┌───────────────────────┴─────────────────────┐
│ FEATURE 2                                   │
│ Skill Trajectory & Decay Intelligence      │
│                                             │
│ LSTM • Trend • Confidence • Freshness       │
└───────────────────────▲─────────────────────┘
                        │
┌───────────────────────┴─────────────────────┐
│ FEATURE 1                                   │
│ Evidence Intelligence & RAG Engine          │
│                                             │
│ GitHub • Jira • Extraction • RAG • Chroma   │
└───────────────────────▲─────────────────────┘
                        │
                 REAL EVIDENCE
```

The most important architectural principle is that **the four features are not four independent pages**. They form one evidence-to-growth loop:

**Evidence → Understanding → Trajectory → Decision → Action → New Evidence.**

That is what makes the system fit the MISC02 problem rather than becoming another static employee skill dashboard. The official blueprint itself identifies multi-source evidence fusion, explainable trajectory classification with confidence, and evidence-linked recommendations as the core mapping from GrowthLens to the mandatory outcomes. 
