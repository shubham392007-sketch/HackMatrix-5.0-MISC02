# GrowthLens Product Requirements Document (PRD)

**Product:** GrowthLens
**Track:** MISC02 – Continuous Talent Intelligence & Skill Growth
**Hackathon:** HackMatrix 5.0
**Product Type:** AI-powered continuous talent intelligence and skill-growth platform
**Primary Users:** Employees/Learners and Managers/Mentors
**Document Purpose:** Product definition for the complete GrowthLens prototype

This PRD consolidates the HackMatrix 5.0 rulebook, the MISC02 GrowthLens solution blueprint, the GrowthLens Skill Decay report, the advanced-features roadmap, and the current four-feature direction established for the project. Where the source documents describe optional/advanced functionality, it is explicitly identified rather than treated as a mandatory MISC02 requirement.

---

## 1. Product Vision

GrowthLens is designed around a simple distinction:

> **A skill profile tells you where someone is. GrowthLens tells you where that skill is going, why it is going there, and what evidence supports that conclusion.**

The MISC02 problem is fundamentally longitudinal. Traditional assessments produce disconnected snapshots such as course completions, assessment scores, or project outcomes. GrowthLens combines those time-ordered evidence points into a competency trajectory and classifies each competency as **improving, stagnating, or declining**, together with a confidence level and evidence trail. 

The platform should therefore avoid becoming a conventional "skill score dashboard". The source blueprint explicitly identifies the core distinction as genuine time-ordered evidence fusion, trend classification, confidence, and evidence-linked recommendations. 

---

# 2. Problem Statement

Organizations often know that an employee has demonstrated a competency, but do not have a continuous view of whether that competency is:

* improving,
* remaining approximately stable,
* declining,
* becoming supported by insufficient or stale evidence.

The problem is not merely measuring a skill. It is **understanding its trajectory**.

For example:

An employee may have demonstrated strong Python capability six months ago. Since then, they may have completed a course, contributed to several projects, received positive code-review feedback, or alternatively stopped producing relevant evidence.

A static skill profile could still say:

> Python: Advanced

GrowthLens instead asks:

> What evidence has appeared over time, what direction does that evidence indicate, how confident is that interpretation, and what should happen next?

The blueprint describes this as the difference between disconnected assessment snapshots and a longitudinal picture of capability. 

---

# 3. Product Objectives

GrowthLens must satisfy the core MISC02 outcomes:

1. Create a **longitudinal skill and competency profile** for every employee.
2. Combine evidence from multiple sources.
3. Identify strengths and competency gaps.
4. Track competency trajectories over time.
5. Classify each competency independently as:

   * Improving
   * Stagnating
   * Declining
6. Provide concrete development actions.
7. Connect recommendations to the evidence that produced them.
8. Provide confidence around modelled conclusions.
9. Distinguish observed evidence from model-generated interpretations.
10. Make insufficient or stale evidence visible rather than presenting an overconfident conclusion.

These outcomes are explicitly listed in the GrowthLens blueprint. 

---

# 4. Product Users

GrowthLens has two primary authenticated roles.

## 4.1 Employee / Learner

The employee uses GrowthLens to understand their own development.

The employee should be able to:

* view their competencies;
* see the trajectory of each competency;
* inspect supporting evidence;
* understand why a competency received its trend classification;
* see confidence;
* receive targeted development recommendations;
* access recommended learning resources;
* interact with the What-If Learning Path Simulator;
* view their generated growth narrative;
* optionally view privacy-safe peer-percentile information.

The employee should **not** automatically gain access to another employee's private evidence.

---

## 4.2 Manager / Mentor

The manager uses GrowthLens to understand team-level capability and support development conversations.

The manager should be able to:

* view employees belonging to their permitted team;
* inspect individual competency trajectories where authorized;
* review evidence behind conclusions;
* see evidence-linked recommendations;
* view aggregate team competency trends;
* identify team-wide stagnation or gaps through the Team Skill Heatmap;
* use generated growth narratives for development conversations;
* review mentorship recommendations where applicable.

The roadmap explicitly calls for role-based authentication for Learner and Manager users and RBAC restricting managers to their respective teams. 

---

# 5. Product Architecture at the Product Level

GrowthLens follows this conceptual flow:

```text
Evidence Sources
      ↓
Evidence Ingestion
      ↓
Evidence Extraction / Skill Tagging
      ↓
Evidence Normalization
      ↓
Longitudinal Evidence Store
      ↓
Competency Evidence Timeline
      ↓
Trend / Decay Analysis
      ↓
Confidence Calculation
      ↓
Improving / Stagnating / Declining
      ↓
Evidence-Linked Recommendations
      ↓
Development Action
      ↓
New Evidence
      ↓
Recalculation
```

The core blueprint describes the architecture as evidence ingestion, multi-source evidence fusion, an LSTM trend classifier, FastAPI services, and a Next.js dashboard. It also explicitly distinguishes observed evidence from modelled outputs. 

---

# 6. Four Core GrowthLens Features

The current product should be organized around four major feature groups.

| Feature   | Product Name                                   | Primary Purpose                                                                                              |
| --------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Feature 1 | **Evidence Intelligence Engine**               | Automatically ingest, extract, tag, search and justify evidence                                              |
| Feature 2 | **Skill Trajectory & Predictive Intelligence** | Determine competency direction and confidence over time                                                      |
| Feature 3 | **Next-Action Recommendation Engine**          | Turn detected gaps into targeted development actions                                                         |
| Feature 4 | **Growth Intelligence & Manager Insights**     | Turn trajectory intelligence into narratives, benchmarking, confidence visualization and team-level insights |

---

# 7. Feature 1 – Evidence Intelligence Engine

## 7.1 Purpose

Feature 1 is the evidence foundation of GrowthLens.

Instead of forcing users to manually enter every project outcome, the platform should support automated evidence ingestion and extraction from connected sources.

The advanced-feature roadmap specifically proposes automated skill tagging from systems such as GitHub and Jira/internal project-management tools, followed by an evidence-justification RAG layer. 

---

## 7.2 Evidence Sources

The product's evidence model should support:

* assessments;
* project outcomes;
* course completions;
* engineering/project activity where connected;
* GitHub activity;
* Jira/project-management activity;
* relevant feedback where supported by the product data model.

The core blueprint explicitly identifies assessments, project outcomes and course completions as the foundational evidence sources. 

---

## 7.3 Automated Evidence Extraction

For connected project sources, GrowthLens should extract information such as:

```text
Repository
    ↓
Commit
    ↓
Commit message
Changed files
Languages
Pull request
Review activity
Project
Issue / task
Outcome
Timestamp
    ↓
Skill tagging
```

The purpose is not simply to count commits.

The system needs to determine which evidence is relevant to which competency.

For example:

```text
Commit:
"Optimize PostgreSQL query for employee analytics"

Potential competency:
Database / SQL

Evidence:
Project contribution

Timestamp:
2026-09-15

Source:
GitHub

Evidence reference:
commit URL / identifier
```

The evidence then becomes part of the employee's longitudinal record.

---

## 7.4 RAG Evidence Justification

The RAG layer exists to answer:

> "Why did GrowthLens make this recommendation?"

The system retrieves the most relevant evidence associated with the competency.

For example:

```text
Detected:
SQL competency = Declining

Retrieved evidence:
• Last SQL-related PR: 87 days ago
• Recent SQL assessment: 61%
• Previous SQL assessment: 82%
• Recent project evidence: low
```

The LLM can then generate a contextual explanation based on retrieved evidence.

The important product rule is:

> **The LLM should explain evidence, not invent evidence.**

Every recommendation should retain an evidence reference. The blueprint explicitly recommends enforcing an `evidence_ref` field so generic recommendations cannot exist without evidence. 

---

# 8. Feature 2 – Skill Trajectory & Predictive Intelligence

This is the analytical core of GrowthLens.

## 8.1 Purpose

Feature 2 transforms evidence points into a longitudinal competency trajectory.

Instead of asking:

> "What is the employee's current score?"

it asks:

> "How has this competency changed over time?"

The system classifies each competency independently as:

**Improving / Stagnating / Declining**

The blueprint specifies an LSTM sequence classifier operating on time-ordered competency evidence. 

---

## 8.2 Evidence Sequence

For a competency:

```text
Python

Jan → 62
Feb → 66
Mar → 71
Apr → 76
May → 81
```

The model sees the sequence rather than only the latest number.

Another competency could show:

```text
Communication

Jan → 72
Feb → 74
Mar → 73
Apr → 72
May → 73
```

That could represent a stagnating trajectory.

A third:

```text
SQL

Jan → 84
Feb → 81
Mar → 76
Apr → 70
May → 64
```

could indicate decline.

The key requirement is that these are **per-competency trajectories**, not one overall employee score.

---

# 9. Trend Classification

Each competency receives:

```text
Trend:
Improving
Stagnating
Declining
```

Together with:

```text
Confidence:
High / Medium / Low
```

The exact confidence calculation should remain tied to evidence quality, recency and volume rather than simply exposing the model's raw probability. The blueprint specifically explains that recent evidence should carry more confidence than stale evidence. 

---

# 10. Evidence vs Modelled Interpretation

GrowthLens must visually and conceptually distinguish:

### Observed

Things that actually happened:

```text
Assessment = 78%
Course completed
PR merged
Project outcome
Peer feedback
```

### Modelled

Things GrowthLens infers:

```text
Improving
Declining
Stagnating
Confidence
Decay risk
Recommended action
```

The blueprint explicitly defines individual evidence points as observed data and trend labels, confidence and recommendations as modelled interpretations. 

This distinction is critical to the product's credibility.

---

# 11. Skill Decay / Freshness Intelligence

GrowthLens should also be able to identify when evidence supporting a competency is becoming stale.

This does **not** mean:

> "The employee has forgotten the skill."

Instead:

> "Current evidence supporting this competency is becoming stale or less frequent."

The dedicated Skill Decay report explicitly states that lack of telemetry can result from changed projects, confidential work, a skill not currently being required, or activity occurring outside connected systems. Therefore decay should be presented as a risk/freshness signal rather than proof of lost ability. 

---

# 12. Skill Freshness

The system may maintain a freshness indicator based on:

* time since last relevant evidence;
* recent evidence volume;
* historical evidence frequency;
* relevant engineering/project activity;
* current competency confidence.

The Skill Decay report defines freshness as an indicator of how recently and consistently a competency is supported by evidence, not a direct measure of human ability. 

---

# 13. What-If Learning Path Simulator

This is one of GrowthLens' interactive analytical extensions.

A learner selects a hypothetical action:

```text
Complete Advanced SQL Course
```

or:

```text
Complete two peer-review sessions
```

GrowthLens constructs a counterfactual evidence sequence and reruns the trajectory model.

Conceptually:

```text
Current Evidence
      ↓
Current Trajectory
      ↓
Add Hypothetical Evidence
      ↓
Counterfactual Sequence
      ↓
Trajectory Model
      ↓
Projected Trajectory
      ↓
Projected Trend
```

The blueprint specifies this exact counterfactual LSTM concept. 

The output should clearly be presented as a **projection**, not a guaranteed future result.

---

# 14. Feature 3 – Next-Action Recommendation Engine

Feature 3 converts analytical results into action.

The fundamental flow is:

```text
Skill Gap / Decline
       ↓
Evidence
       ↓
Recommendation Rules
       ↓
Candidate Action
       ↓
Relevant Resource / Mentor
       ↓
Employee Action
       ↓
New Evidence
```

The advanced roadmap specifically describes micro-learning routing and internal mentorship matching. 

---

## 14.1 Recommendation Trigger

Example:

```text
Competency:
Python

Trend:
Declining

Confidence:
High

Supporting evidence:
Recent assessment decline
+
Reduced project activity
+
No recent relevant engineering evidence
```

This triggers the recommendation engine.

---

# 15. Micro-Learning Recommendation

The system should identify an appropriate learning action for the competency.

For example:

```text
Detected Gap:
SQL Query Optimization

Recommended:
Complete a targeted SQL optimization tutorial
```

The advanced Feature 3 implementation discussed for GrowthLens routes users toward targeted external learning resources and can use timestamp-level resource discovery where available.

The recommendation should contain:

```text
Action
Why it was recommended
Target competency
Supporting evidence
Resource
Expected development purpose
```

---

# 16. Internal Mentorship Matching

If the required intervention is better suited to human support, GrowthLens can identify another employee whose relevant competency is improving or has high proficiency.

Conceptually:

```text
Employee A
SQL → Declining

        ↓

Search eligible peers

        ↓

Employee B
SQL → Improving

        ↓

Potential mentorship pairing
```

The roadmap explicitly proposes finding another employee with an improving/high-proficiency label in the same competency. 

Privacy and authorization must remain part of the implementation. A manager should not receive unrestricted access to another employee's private evidence merely because the matching algorithm uses it.

---

# 17. Evidence-Linked Recommendations

Every recommendation must answer:

### What should I do?

```text
Complete SQL Query Optimization module
```

### Why?

```text
SQL trajectory has declined across the last four
evidence points.
```

### What evidence supports it?

```text
Assessment: 62%
Recent SQL activity: low
Last SQL project evidence: 74 days ago
```

This is a core product principle.

The GrowthLens blueprint explicitly says recommendations should never be free-floating advice and should link back to the evidence that justified them. 

---

# 18. Feature 4 – Growth Intelligence & Manager Insights

Feature 4 is the higher-level interpretation layer.

It turns the underlying trajectory data into artifacts that people can actually use.

The current Feature 4 scope consists of:

1. Auto-Generated Growth Narrative
2. Peer-Percentile Growth Benchmarking
3. Evidence Staleness & Confidence Decay Visualization
4. Manager Team Skill Heatmap

These correspond directly to Sections 8.3–8.6 of the GrowthLens blueprint. 

---

# 19. Auto-Generated Growth Narrative

At the end of an evaluation period, GrowthLens generates a short natural-language summary.

Example structure:

```text
Python improved steadily during the evaluation period,
supported by two strong project outcomes.

Communication remained relatively stable despite
completion of one communication course.

SQL showed a declining evidence trajectory,
primarily due to reduced recent project activity.
```

Each factual claim must connect back to supporting evidence.

The purpose is to give a manager a usable artifact for a development conversation rather than forcing them to interpret multiple charts manually. The blueprint describes exactly this use case. 

---

# 20. Peer-Percentile Growth Benchmarking

This is an optional privacy-preserving comparison mechanism.

Instead of showing:

```text
Employee B scored 82
Employee C scored 79
```

GrowthLens can show:

```text
Your growth rate in Data Analysis:
Top 20% among comparable peers
```

The source proposal specifies that the calculation should be aggregate and should not expose another employee's identity or raw score. 

This feature should only appear where there is sufficient comparison data.

If there are too few eligible peers, GrowthLens should say:

```text
Benchmark unavailable

Not enough comparable peer data is available.
```

It should not manufacture a percentile.

---

# 21. Evidence Staleness & Confidence Decay Visualization

Confidence should not be static.

Suppose:

```text
Python
Improving
Confidence: High
```

was established yesterday.

That is different from:

```text
Python
Improving
Confidence: High
```

based on evidence from three months ago with no recent supporting evidence.

GrowthLens should visually communicate this difference.

The blueprint proposes a confidence band that becomes wider/lighter as evidence becomes stale. 

The product should therefore display:

```text
Current trend
+
Confidence
+
Evidence freshness
+
Trajectory
```

rather than showing an isolated trend badge.

---

# 22. Manager Team Skill Heatmap

The manager receives an aggregate team-level view.

Example:

| Employee   | Python    | SQL       | Cloud     | Communication |
| ---------- | --------- | --------- | --------- | ------------- |
| Employee A | Improving | Declining | Stable    | Improving     |
| Employee B | Improving | Improving | Declining | Stable        |
| Employee C | Stable    | Declining | Declining | Improving     |

The heatmap allows a manager to identify patterns such as:

```text
Cloud Deployment
↓
Most of team is stagnating
```

The source specification explicitly describes this as an aggregate-only view designed to identify team-wide skill gaps without requiring a manager to drill into an individual's evidence. 

---

# 23. Optional Advanced Feature – Ask GrowthLens

The blueprint separately defines **Ask GrowthLens**.

A user can ask:

> "Who on my team improved in Data Analysis this quarter?"

or:

> "Which of my competencies declined after March?"

The LLM translates the natural-language question into a structured query against evidence and trajectory data. 

This should be treated as an advanced/cross-feature capability rather than replacing the core dashboards.

---

# 24. Authentication & Authorization Requirements

GrowthLens requires role-aware authentication.

The authentication flow should establish:

```text
Sign Up / Login
      ↓
Role
      ↓
Employee or Manager
      ↓
Role-specific profile
      ↓
Role-specific dashboard
```

### Employee account

Required information can include:

* name;
* email;
* password/authentication credential;
* organization;
* role;
* department/team;
* job role;
* relevant profile information required by the product.

### Manager account

Required information can include:

* name;
* email;
* password/authentication credential;
* organization;
* manager role;
* department/team;
* team association.

The exact authentication fields should not be unnecessarily expanded beyond what is needed for authorization and product functionality.

---

# 25. Role-Based Access Control

The system must enforce permissions at the backend, not merely hide UI elements.

### Employee

Can access:

```text
Own profile
Own evidence
Own competencies
Own trajectories
Own recommendations
Own growth narrative
Own what-if simulations
```

### Manager

Can access:

```text
Authorized team
Aggregate team intelligence
Authorized employee trajectories
Evidence required for permitted review
Recommendations
Growth narratives
Team heatmap
```

### System administrator

If implemented, administrative access should be explicitly separated from normal manager access.

---

# 26. Main User Journey – Employee

```text
Login
 ↓
Employee Dashboard
 ↓
Competency Grid
 ↓
Select Competency
 ↓
Trajectory Detail
 ↓
Inspect Evidence
 ↓
Understand Trend + Confidence
 ↓
View Recommendation
 ↓
Inspect Recommendation Evidence
 ↓
Take Action
 ↓
New Evidence Appears
 ↓
Future Recalculation
```

This reflects the continuous feedback loop described in the Skill Decay report: collect → extract → predict → detect → alert → recommend → re-evaluate. 

---

# 27. Main User Journey – Manager

```text
Login
 ↓
Manager Dashboard
 ↓
Team Skill Overview
 ↓
Team Skill Heatmap
 ↓
Identify Competency Pattern
 ↓
Select Authorized Employee
 ↓
View Trajectory
 ↓
Inspect Evidence
 ↓
Review Recommendation
 ↓
Open Growth Narrative
 ↓
Use in Development Conversation
```

---

# 28. Primary Dashboard Requirements

The primary GrowthLens dashboard should contain:

### Competency Grid

Maximum approximately six visible competency cards in the primary view.

Each card should include:

```text
Competency name
Sparkline
Current trend
Confidence
```

The blueprint specifically recommends keeping the competency grid to six cards maximum and showing trend and confidence together. 

---

## Competency Card

Example:

```text
Python

╭──────────────────────╮
│  ╱╲    ╱╲           │
│ ╱  ╲╱╲╱  ╲          │
│                      │
│ ↑ Improving          │
│ Confidence: 91%     │
╰──────────────────────╯
```

The icon must reinforce the label so the system does not depend solely on colour. The blueprint specifically recommends up/flat/down iconography. 

---

# 29. Competency Detail Page

Selecting a competency opens:

```text
Competency Name
Current Trend
Confidence

Full Trajectory Chart

Evidence Markers
       ↓
Evidence Details

Freshness / Confidence
       ↓
Recommended Actions
       ↓
Evidence References
```

The trajectory chart must allow the user to inspect individual evidence points.

---

# 30. Evidence Detail

Clicking an evidence point should expose information such as:

```text
Evidence Type
Source
Date
Competency
Observed Value
Project / Assessment
Relevant Metadata
Source Reference
```

Example:

```text
Assessment
SQL Optimization Test

Date:
12 Sept 2026

Result:
62%

Competency:
SQL

Source:
Internal Assessment
```

This makes the modelled interpretation auditable.

---

# 31. Recommendation Card

Every recommendation card should include:

```text
Recommended Action
Target Competency
Why This Action
Supporting Evidence
Resource / Mentor
Action Button
```

Example:

```text
Improve SQL Query Optimization

Why:
Recent SQL evidence has weakened.

Evidence:
• Assessment: 62%
• Last SQL project evidence: 74 days ago
• Recent SQL activity: low

[Open Learning Resource]
[View Evidence]
```

---

# 32. Growth Narrative Page

The generated narrative should provide:

```text
Evaluation Period

Overall Growth Summary

Improving Competencies

Stagnating Competencies

Declining Competencies

Supporting Evidence

Recommended Development Focus
```

The system must not create unsupported claims.

---

# 33. Manager Team Intelligence Page

Manager view:

```text
Team Overview

Team Skill Heatmap

Competency Distribution

Team-wide Trends

Growth Narratives

Development Actions
```

The heatmap remains aggregate-first.

---

# 34. UI/UX Product Direction

The supplied Moonwood reference is being adapted as the visual language for GrowthLens, not as its original content.

The design specification defines:

* warm editorial aesthetic;
* continuous cream → blush → peach gradient;
* lime navigation accent;
* Poppins for primary typography;
* script typography for selective emphasis;
* organic image/blob shapes;
* rounded pill controls;
* scalloped/wavy surfaces;
* restrained motion;
* mobile-first composition. 

For GrowthLens, the content and information architecture must remain professional and suitable for a talent-intelligence product while retaining that visual language.

The reference design uses a single continuous gradient rather than separate hard section backgrounds. 

---

# 35. Visual Design Requirements

Core design tokens from the supplied reference:

```text
Lime:       #DFE968
Cream:      #FBF1CF
Blush:      #F6C8D6
Peach:      #F3A878
CTA:        #F6BB84
Ink:        #1C1C1C
Card Cream: #FBF6DF
```

Typography:

```text
Primary:
Poppins

Script emphasis:
Yellowtail or equivalent

Logo:
Script + Poppins
```

The original reference specifies Poppins weights 500–800 and decorative script at 400. 

---

# 36. Landing Page

The landing page should communicate:

```text
GrowthLens

Continuous Talent Intelligence

Understand where skills are heading,
why they are heading there,
and what evidence supports the next step.

[Explore GrowthLens]
[Sign In]
```

The page should then introduce:

```text
Evidence Intelligence
Skill Trajectory
Next Actions
Growth Intelligence
```

The visual composition should follow the supplied reference's editorial structure rather than becoming a conventional SaaS dashboard.

---

# 37. Required Website Pages

GrowthLens should contain at minimum:

```text
/
Landing Page

/about
About GrowthLens

/features
Feature Overview

/features/evidence
Evidence Intelligence Engine

/features/trajectory
Skill Trajectory & Predictive Intelligence

/features/actions
Next-Action Recommendation Engine

/features/growth
Growth Intelligence & Manager Insights

/login
Authentication

/signup
Authentication / Registration

/dashboard
Role-aware Dashboard

/employee
Employee Dashboard

/manager
Manager Dashboard

/competencies/:id
Competency Detail

/recommendations
Recommendations

/narrative
Growth Narrative

/heatmap
Manager Team Heatmap

/settings
Account / Integration Settings
```

The exact route naming can change during implementation, but the product capabilities should remain.

---

# 38. Integration Management

For automated evidence ingestion, users may need to connect external systems.

The integration area should support the project's chosen evidence sources.

For prototype purposes, credentials/tokens supplied by users must be:

* securely stored;
* never exposed to the frontend unnecessarily;
* never committed to Git;
* never rendered in logs;
* scoped to the required integration;
* revocable.

The product should clearly indicate:

```text
Connected
Not Connected
Connection Error
Last Synced
```

---

# 39. Data Requirements

The product needs a conceptual data model containing at least:

```text
User
Organization
Team
Role
Competency
Evidence
Evidence Source
Evidence-Competency Mapping
Trajectory
Trend Classification
Confidence
Recommendation
Recommendation Evidence
Learning Resource
Mentorship Pairing
Growth Narrative
Benchmark
Integration
Ingestion Run
```

The blueprint's implementation plan specifically identifies users, skills, evidence sources and logs as foundational schema concepts. 

---

# 40. Longitudinal Evidence Requirements

Each evidence record should retain temporal information.

Conceptually:

```text
employee_id
competency_id
evidence_type
source
observed_value
timestamp
metadata
source_reference
confidence/quality metadata
```

The timestamp is essential because the entire product depends on longitudinal ordering.

Without temporal ordering, GrowthLens becomes another static skill dashboard.

---

# 41. Synthetic Data Requirements

Synthetic data is appropriate for the prototype and model validation.

The source blueprint explicitly calls for a synthetic longitudinal evidence generator containing:

* at least one clearly improving trajectory;
* at least one clearly declining trajectory;
* at least one stagnating trajectory.



The data should also contain realistic noise and at least one ambiguous/borderline trajectory so the model is not tested only against trivial patterns. 

Synthetic data should be clearly identified as demo/test data.

---

# 42. Confidence Requirements

Confidence must not be treated as decorative UI.

The system should account for:

```text
Evidence Recency
+
Evidence Volume
+
Evidence Quality
+
Evidence Consistency
```

A competency with:

```text
many recent evidence points
```

should generally have more evidentiary support than one with:

```text
one old evidence point
```

The blueprint specifically ties confidence to evidence recency and volume rather than simply exposing the LSTM's raw softmax output. 

---

# 43. Insufficient Evidence State

GrowthLens should have a first-class state for insufficient evidence.

Example:

```text
Insufficient Evidence

GrowthLens does not currently have enough recent
evidence to confidently classify this competency.
```

The product should not force:

```text
Improving
```

or:

```text
Declining
```

when evidence does not support a reliable interpretation.

This is particularly important because the product's central promise is evidence-backed intelligence rather than artificial certainty.

---

# 44. Continuous Feedback Loop

GrowthLens should not terminate at prediction.

The intended loop is:

```text
Evidence
   ↓
Analysis
   ↓
Trend
   ↓
Recommendation
   ↓
Action
   ↓
New Evidence
   ↓
Re-analysis
```

The Skill Decay report explicitly describes this continuous feedback loop and states that new engineering activity should become fresh evidence capable of triggering recalculation. 

---

# 45. Product Safety and Interpretation Rules

GrowthLens must not communicate modelled results as unquestionable facts.

For example, avoid:

> "You lost your Python skill."

Prefer:

> "Recent evidence supporting Python has declined."

Likewise:

> "You are no longer proficient in SQL."

should become:

> "Current evidence indicates a declining SQL trajectory."

The Skill Decay report explicitly states that decay should not be interpreted as proof that an employee has lost a skill. 

Manager review should remain part of consequential decisions.

---

# 46. Non-Functional Product Requirements

## Performance

Dashboard data should load quickly enough for an interactive demo.

Heavy processing such as:

* ingestion;
* embedding;
* RAG retrieval;
* model inference;
* narrative generation

should not unnecessarily block the main dashboard.

## Reliability

Failed external integrations should not corrupt existing evidence.

The system should show:

```text
Last successful sync
Failure reason
Retry
```

## Security

Sensitive credentials must remain server-side.

No API key, access token or private integration credential should be exposed through frontend code or GitHub.

## Accessibility

The UI must not depend exclusively on colour.

Trend states should use:

```text
↑ Improving
→ Stagnating
↓ Declining
```

The source blueprint specifically recommends this icon-based differentiation. 

---

# 47. Mobile Requirements

The product must work on:

```text
Desktop
Laptop
Tablet
Mobile
```

On mobile:

```text
Navigation
↓
Competency cards
↓
Selected competency
↓
Trajectory
↓
Evidence
↓
Recommendation
```

The dashboard should become vertically stacked rather than trying to preserve a desktop multi-column grid.

The original supplied UI reference itself is mobile-first and specifies approximately 420px content width. 

---

# 48. HackMatrix 5.0 Product Constraints

The HackMatrix rulebook gives Round 01 the following evaluation distribution:

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



For Round 02, the rules additionally require a working end product and explicitly require proposed solutions to integrate AI & ML. 

---

# 49. Product Requirements Mapped to Evaluation

| Product capability              | Relevant objective                   |
| ------------------------------- | ------------------------------------ |
| Longitudinal evidence           | Problem understanding / solution fit |
| LSTM trajectory model           | AI/ML + tech stack                   |
| Evidence-linked recommendations | Solution fit                         |
| RAG evidence justification      | AI + innovativeness                  |
| What-If Simulator               | Innovativeness                       |
| Growth Narrative                | Social impact                        |
| Team Heatmap                    | Social impact                        |
| Editorial responsive UI         | UI/UX                                |
| Clear evidence trail            | Documentation / presentation         |
| Four-member contribution        | GitHub maintenance                   |

The blueprint specifically identifies trajectory classification, confidence and evidence-linked recommendations as the central differentiation rather than static skill scores. 

---

# 50. MVP Definition

The minimum convincing GrowthLens prototype should demonstrate this complete chain:

```text
Evidence
 ↓
Competency
 ↓
Trajectory
 ↓
Improving / Stagnating / Declining
 ↓
Confidence
 ↓
Supporting Evidence
 ↓
Recommendation
```

The blueprint's completion-level criterion similarly calls for a working demonstration covering evidence ingestion, trajectory dashboard, trend classification with confidence and recommendations. 

---

# 51. Recommended Demo Scenario

The product should be capable of demonstrating a declining competency rather than only showing successful improvement.

Example:

```text
Employee: Priya

Competency: SQL

Current trend:
↓ Declining

Confidence:
High

Evidence:
Assessment decline
+
Reduced project evidence
+
Stale recent activity

↓
Recommendation

"Complete SQL Query Optimization learning activity"

↓
Evidence

"Recommended because..."

↓
What-If

Projected trajectory after hypothetical action

↓
Manager View

Team Heatmap
```

This follows the documented demo sequence of opening with multiple trend states, drilling into a declining competency, inspecting evidence, using the What-If Simulator and finally showing the Manager Heatmap. 

---

# 52. Product Success Criteria

GrowthLens is successful when a user can answer all of these questions from the product:

### "What are my competencies?"

Answered by the competency profile.

### "How are they changing?"

Answered by longitudinal trajectory.

### "Which are improving?"

Trend classification.

### "Which are stagnating?"

Trend classification.

### "Which are declining?"

Trend classification.

### "Why does GrowthLens think that?"

Evidence trail.

### "How confident is it?"

Confidence indicator.

### "Is the evidence recent?"

Freshness/confidence visualization.

### "What should I do?"

Recommendation engine.

### "Why that action?"

Evidence-linked recommendation.

### "What happens if I take that action?"

What-If Simulator.

### "How do I explain this development?"

Auto-generated Growth Narrative.

### "What does the team look like?"

Manager Team Skill Heatmap.

---

# 53. Product Principles

GrowthLens should follow these principles throughout implementation:

**Evidence before interpretation.**
Raw evidence should always remain accessible behind modelled conclusions.

**Trajectory over snapshot.**
A single score should never replace longitudinal analysis.

**Competency-level intelligence.**
One skill improving while another declines must be representable.

**Confidence over false certainty.**
Insufficient evidence should be visible.

**Recommendation with justification.**
Every recommendation must have supporting evidence.

**Action creates new evidence.**
The platform should form a continuous feedback loop.

**Employee and manager views are different.**
Employees need personal development intelligence; managers need authorized team intelligence.

**Privacy by design.**
Team-level insights should not unnecessarily expose individual evidence.

**Modelled outputs are interpretations.**
GrowthLens should never present predictions as unquestionable facts.

---

# 54. Final Product Definition

The complete GrowthLens system can therefore be represented as:

```text
                         GROWTHLENS
                             │
             ┌───────────────┴────────────────┐
             │                                │
       EVIDENCE LAYER                   USER LAYER
             │                                │
   ┌─────────┼──────────┐             ┌───────┴───────┐
   │         │          │             │               │
GitHub     Jira     Assessments   Employee         Manager
   │         │          │             │               │
   └─────────┴──────────┘             │               │
             │                        │               │
             ▼                        ▼               ▼
     FEATURE 1                    Personal       Team Intelligence
 Evidence Intelligence            Growth             │
     Engine                        │                 │
             │                     │                 │
             ▼                     ▼                 ▼
      Evidence Timeline     FEATURE 2          FEATURE 4
             │              Skill Trajectory    Growth Intelligence
             │              & Predictive        & Manager Insights
             ▼              Intelligence
       RAG / Evidence            │
       Justification             │
             │                   ▼
             │              Trend + Confidence
             │                   │
             └────────────┬──────┘
                          ▼
                    FEATURE 3
               Next-Action Engine
                          │
              ┌───────────┴──────────┐
              ▼                      ▼
        Micro-Learning          Mentorship
              │                      │
              └──────────┬───────────┘
                         ▼
                       ACTION
                         │
                         ▼
                    NEW EVIDENCE
                         │
                         └──────────────► RE-CALCULATION
```

That is the central product loop.

**GrowthLens is not fundamentally an employee scoring system. It is an evidence-to-trajectory-to-action system.** The score, trend, confidence, recommendation and narrative are all interpretations built on top of the longitudinal evidence layer. The supplied blueprint explicitly frames the system this way, with observed evidence kept separate from modelled trend, confidence and recommendations. 

One HackMatrix constraint is especially relevant to implementation planning: the Round 02 rules require the working prototype and state that all project work must be done during the hackathon. The official rulebook also requires all team members to contribute to the repository and says the repository must be made public before the Round 01 submission period concludes.  
