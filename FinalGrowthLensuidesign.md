# GrowthLens – Complete UI Design Document

## 1. Product Overview

| Property                      | Specification                                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Product**                   | GrowthLens                                                                                                                        |
| **Category**                  | Continuous Talent Intelligence Platform                                                                                           |
| **Primary purpose**           | Track how employee competencies change over time using evidence from projects, assessments, training, feedback, and other sources |
| **Primary users**             | Employees and Managers/Talent Viewers                                                                                             |
| **Visual direction**          | Warm editorial, human, premium, experimental, approachable                                                                        |
| **Reference design**          | Provided Moonwood UI screenshot and design document                                                                               |
| **Primary viewport**          | Responsive mobile-first design                                                                                                    |
| **Supported devices**         | Mobile, tablet, laptop, desktop, large desktop                                                                                    |
| **Primary interaction model** | Evidence → competency trajectory → recommended action → growth intelligence                                                       |
| **Design principle**          | Data-heavy functionality presented through an editorial visual system rather than a conventional enterprise SaaS dashboard        |

GrowthLens should visually inherit the **design language** of the provided Moonwood reference while replacing its creative-agency content with talent-intelligence functionality.

The result should not look like Moonwood with different text. It should look like a distinct GrowthLens product that uses the same visual grammar.

---

# 2. Core Product Architecture

GrowthLens consists of four connected capabilities.

### Feature 01 – Evidence Intelligence

Answers:

> **What evidence do we have about an employee's capabilities?**

Handles:

* Evidence ingestion
* GitHub evidence
* Jira/project evidence
* Assessments
* Training results
* Project outcomes
* Manager feedback
* Peer feedback
* KPI evidence
* Automated skill tagging
* Evidence normalization
* Semantic retrieval
* Evidence provenance

---

### Feature 02 – Competency Trajectory

Answers:

> **How is each competency changing over time?**

Handles:

* Longitudinal competency history
* Assessment cycles
* Trend classification
* Confidence
* Insufficient evidence
* Trajectory visualization
* What-if learning path simulation
* Improving/stagnating/declining states

---

### Feature 03 – Growth Action Engine

Answers:

> **What should the employee do next?**

Handles:

* Next-action recommendations
* Micro-learning
* Targeted learning resources
* YouTube resource routing
* Transcript-based timestamp discovery
* Internal mentorship matching
* Mentorship requests
* Recommendation evidence

---

### Feature 04 – Growth Intelligence

Answers:

> **Why did this change, how reliable is the conclusion, and what does it mean?**

Handles:

* Growth narrative
* Evidence-linked explanations
* Peer-percentile benchmarking
* Evidence staleness
* Confidence decay
* Manager team skill heatmap
* Aggregate team intelligence

---

# 3. Design Philosophy

GrowthLens should follow five visual principles.

### 3.1 Editorial rather than corporate

The interface should feel like a thoughtfully designed editorial publication rather than an HR management system.

Avoid:

* generic corporate blue
* excessive cards
* dashboard-template layouts
* neon gradients
* dense enterprise tables
* excessive glassmorphism
* excessive shadows
* overly technical visual language

Use:

* typography
* whitespace
* organic shapes
* asymmetrical compositions
* subtle borders
* editorial hierarchy
* warm colors
* carefully placed visual accents

---

### 3.2 Humanize the data

Competency information should feel understandable to an employee.

Instead of:

> `competency_score = 0.7432`

show:

> **Python**
> Improving
> 74% capability estimate
> High confidence

Then allow the user to inspect why.

---

### 3.3 Evidence must remain visible

GrowthLens should never make a major claim without allowing the user to inspect the evidence behind it.

Every major analytical statement should have an interaction such as:

**View evidence**

which opens the supporting evidence.

---

### 3.4 One visual language across all roles

Employees and managers have different information access, but they should not have completely different designs.

Employee interface:

> Personal growth

Manager interface:

> Team growth intelligence

Both use the same:

* typography
* colors
* navigation philosophy
* buttons
* cards
* charts
* organic shapes
* motion
* footer
* header

---

### 3.5 Data density should increase only when necessary

The landing page should be visually spacious.

The employee dashboard can be moderately information-dense.

The manager analytics pages can be more data-dense.

However, every screen should retain the editorial aesthetic.

---

# 4. Color System

The Moonwood palette becomes the foundational GrowthLens palette.

| Token      |       Hex | GrowthLens usage                        |
| ---------- | --------: | --------------------------------------- |
| Lime       | `#DFE968` | Primary navigation and selected accents |
| Cream      | `#FBF1CF` | Top/background gradient                 |
| Blush      | `#F6C8D6` | Middle background gradient              |
| Peach      | `#F3A878` | Lower background gradient               |
| CTA Peach  | `#F6BB84` | Primary buttons                         |
| Ink        | `#1C1C1C` | Text, borders, icons                    |
| Card Cream | `#FBF6DF` | Highlight cards and evidence panels     |

### Global background

Use one continuous vertical gradient:

```css
background: linear-gradient(
  180deg,
  #FBF1CF 0%,
  #F6C8D6 52%,
  #F3A878 100%
);
```

The gradient should belong to the page rather than being independently restarted inside every section.

This is one of the defining characteristics of the visual system.

---

# 5. Semantic Trend Colors

Trend information requires additional semantic treatment.

These should remain restrained and should never turn the interface into a rainbow dashboard.

### Improving

Use a muted green derived carefully from the warm palette.

### Stagnating

Use neutral ink/gray.

### Declining

Use a muted warm red.

### Insufficient Evidence

Use neutral gray with a visual warning indicator.

The interface must never depend only on color.

For example:

```text
↑ Improving
→ Stagnating
↓ Declining
? Insufficient evidence
```

This allows trend meaning to remain understandable for users with color-vision differences.

---

# 6. Typography

### Primary font

**Poppins**

Use for:

* headings
* body
* navigation
* labels
* buttons
* analytics
* forms

Suggested weights:

| Usage           |  Weight |
| --------------- | ------: |
| Large heading   | 700–800 |
| Section heading | 600–700 |
| Body            |     500 |
| Navigation      | 600–700 |
| Metadata        |     500 |
| Buttons         | 600–700 |

---

### Decorative font

**Yellowtail** or an equivalent loose script font.

The script should be used as a visual interruption inside normal sentences.

Example:

> Track your **growth**, not just your score.

Another:

> See the evidence behind your **progress**.

Do not use script for:

* tables
* error messages
* long paragraphs
* technical values
* accessibility-critical information

---

# 7. Typography Scale

For mobile:

| Element         | Approximate size |
| --------------- | ---------------: |
| Logo            |          52–64px |
| Hero heading    |          36–46px |
| Page heading    |          28–36px |
| Section heading |          20–24px |
| Body            |          15–17px |
| Small body      |          13–14px |
| Navigation      |        10–11.5px |
| Metadata        |          10–12px |
| Button          |          10–12px |

Desktop sizes should scale moderately rather than becoming excessively large.

---

# 8. Logo

The GrowthLens logo should use the same basic typographic concept as the reference:

**Growth** in script-inspired typography + **Lens** in strong Poppins.

Possible visual treatment:

> Growth**Lens**

The logo should be text-first rather than a complex icon.

A small lens/trajectory visual can optionally be integrated into the wordmark, but it should remain subtle.

---

# 9. Global Layout

The page should use:

* centered content
* responsive maximum width
* generous whitespace
* 20–24px mobile padding
* approximately 32–48px desktop padding
* thin ink borders
* organic shapes
* limited shadows

Suggested desktop content width:

```text
1200–1400px
```

Mobile content width:

```text
100% - 40–48px
```

---

# 10. Global Header

The header should visually resemble the reference's lime navigation strip.

### Public navigation

```text
GROWTHLENS

ABOUT     FEATURES     HOW IT WORKS     SIGN IN
```

The header should be compact.

Use uppercase labels with slightly increased letter spacing.

---

### Employee navigation

```text
OVERVIEW     EVIDENCE     SKILLS     GROWTH     ACTIONS
```

A small profile/control area can appear on the right on desktop.

Mobile should use a compact menu.

---

### Manager navigation

```text
OVERVIEW     TEAM     SKILLS     INSIGHTS     NARRATIVES
```

---

# 11. Header Behavior

Desktop:

* horizontal navigation
* fixed or sticky if appropriate
* lime background
* thin ink border

Mobile:

* compact header
* GrowthLens wordmark
* menu trigger
* accessible navigation drawer

Do not make the header excessively tall.

---

# 12. Global Footer

The footer should follow the visual spirit of the reference.

Instead of press logos, GrowthLens can use a compact set of platform categories.

Example:

```text
GROWTHLENS

Continuous Talent Intelligence

ABOUT
FEATURES
PRIVACY
TERMS
CONTACT
SIGN IN
```

The footer should maintain:

* warm gradient
* ink typography
* thin borders
* editorial spacing

Do not fabricate company partnerships or press mentions.

---

# 13. Landing Page

Route:

```text
/
```

The landing page should follow the reference composition closely.

---

## Hero

Visual structure:

```text
             GrowthLens

     Understand how capability
     changes over time.

     [ EXPLORE GROWTH → ]

                         [organic
                          visual]
```

The hero should use a two-column composition on desktop.

Left:

* headline
* supporting description
* CTA

Right:

* organic/blob-shaped visual

Mobile:

```text
GrowthLens

Understand how capability
changes over time.

[ EXPLORE GROWTH → ]

[visual]
```

---

# 14. Hero Messaging

The messaging should communicate the core problem.

Possible structure:

> Capability isn't static.
> Growth**Lens** shows how it changes.

Supporting text:

> Bring evidence together, understand competency trajectories, and turn skill gaps into targeted development actions.

Keep this concise.

---

# 15. Hero CTA

Primary:

```text
EXPLORE GROWTH →
```

Secondary:

```text
HOW IT WORKS
```

Primary button:

* peach background
* ink border
* pill shape
* arrow
* subtle hover lift

---

# 16. Hero Visual

The reference uses an organic blob image.

GrowthLens should use an equivalent organic visual.

Possible visual direction:

* abstract competency graph
* employee growth path
* evidence fragments
* document snippets
* skill nodes
* trajectory line

Do not make it look like a generic corporate stock photo.

---

# 17. Four-Feature Section

Reference structure:

> Here's how we do that

GrowthLens equivalent:

> Here's how GrowthLens **sees growth**

Display four major capabilities.

Because four items are required, the composition can use an asymmetric editorial arrangement instead of four equal SaaS cards.

Example:

```text
                 Evidence
                 Intelligence

      Competency              Growth Action
      Trajectory              Engine

                 Growth
                 Intelligence
```

On desktop, use an organic composition.

On mobile, stack them vertically.

---

# 18. Feature 01 Visual

### Evidence Intelligence

Visual:

documents / code / project evidence converging into skill nodes.

Caption:

> Evidence Intelligence

Supporting copy:

> Turn scattered work evidence into structured competency signals.

---

# 19. Feature 02 Visual

### Competency Trajectory

Visual:

an organic trajectory line moving through several competency points.

Caption:

> Competency Trajectory

Supporting copy:

> See whether individual competencies are improving, stagnating, or declining.

---

# 20. Feature 03 Visual

### Growth Action Engine

Visual:

trajectory → recommendation → learning action.

Caption:

> Growth Action Engine

Supporting copy:

> Turn detected skill gaps into targeted development actions.

---

# 21. Feature 04 Visual

### Growth Intelligence

Visual:

evidence → explanation → insight.

Caption:

> Growth Intelligence

Supporting copy:

> Understand why growth changed and how confident the system is.

---

# 22. Product Philosophy Section

A centered editorial statement.

Example:

> Growth isn't a number.
> It's a **trajectory**.

Supporting text:

> GrowthLens combines evidence across time so employees and managers can understand what is changing, why it is changing, and what can happen next.

This section acts as the visual break before the product workflow.

---

# 23. How It Works Section

Use a flowing visual sequence:

```text
EVIDENCE
   ↓
COMPETENCIES
   ↓
TRAJECTORIES
   ↓
ACTIONS
   ↓
GROWTH
```

Do not use a conventional five-column SaaS process diagram.

Use organic connecting lines and editorial labels.

---

# 24. Authentication

Routes:

```text
/login
/signup
/auth
```

Authentication should be role-aware.

---

# 25. Login Page

Visual structure:

```text
GrowthLens

See your growth
with more context.

[ Email ]

[ Password ]

[ SIGN IN → ]

Forgot password?

────────────

Don't have an account?
Create one
```

Use the same warm gradient.

Use an organic visual alongside the form on desktop.

Mobile:

form first, visual below/above.

---

# 26. Registration

Registration must collect information necessary for the selected role.

Common:

* Full name
* Email
* Password

Role:

```text
I am joining as:

○ Employee
○ Manager / Talent Viewer
```

Additional organization/team information should only be requested where required by the application.

Do not create an unnecessarily long onboarding form.

---

# 27. Role-Aware Authentication

After authentication:

Employee:

```text
/employee/dashboard
```

Manager:

```text
/manager/dashboard
```

The backend must verify the user's role.

Do not rely solely on frontend route hiding.

---

# 28. Employee Dashboard

Route:

```text
/employee/dashboard
```

The dashboard should feel like a personal editorial growth journal.

Top section:

```text
GOOD MORNING, PRIYA

Your capability is changing.
Here's what the evidence says.
```

Then show a compact overview.

---

# 29. Employee Competency Overview

Instead of generic rectangular cards, use organic competency tiles.

Example:

```text
PYTHON

↑ IMPROVING

74
capability estimate

Confidence
HIGH
```

Another:

```text
COMMUNICATION

→ STAGNATING

71

Confidence
MEDIUM
```

Another:

```text
CLOUD

↓ DECLINING

64

Confidence
HIGH
```

---

# 30. Employee Growth Summary

A large editorial statement:

> Your **Python** trajectory is moving upward.

Then:

```text
Why?

2 project outcomes
1 assessment improvement
3 relevant evidence items
```

Button:

```text
VIEW EVIDENCE →
```

---

# 31. Employee Evidence Page

Route:

```text
/employee/evidence
```

Purpose:

Allow employees to inspect the evidence that contributes to their competency profile.

Top:

```text
YOUR EVIDENCE
```

Filters:

```text
ALL
GITHUB
JIRA
ASSESSMENTS
TRAINING
PROJECTS
FEEDBACK
KPI
```

---

# 32. Evidence Item Design

Each evidence item should display:

```text
GitHub

Repository / Project
Commit or activity

"Refactored preprocessing pipeline"

Python
Data Engineering

12 MAY 2026

[VIEW SOURCE →]
```

Evidence cards should have thin borders and warm cream backgrounds.

---

# 33. Evidence Detail

When opened:

```text
EVIDENCE

Source
GitHub

Date
12 May 2026

Project
Data Pipeline

Detected competencies
Python
Data Engineering

Evidence summary
...

Why it matters
...

[VIEW ORIGINAL SOURCE]
```

The system must preserve provenance.

---

# 34. Skill Explorer

Route:

```text
/employee/skills
```

Heading:

> Your **capabilities**

Each competency appears as an editorial object.

Example:

```text
PYTHON
↑ IMPROVING

Current estimate
74

Evidence
12 items

Confidence
82%

[EXPLORE →]
```

---

# 35. Competency Detail

Route:

```text
/employee/skills/[skill]
```

Display:

```text
PYTHON

↑ IMPROVING
82% confidence
```

Then the trajectory chart.

---

# 36. Trajectory Visualization

Chart should show:

```text
Capability
 80 |                       ●
 70 |                ●
 60 |        ●
 50 |  ●
    +-------------------------
       C1     C2     C3     C4
```

The visual should be editorial rather than resembling a stock analytics dashboard.

Show:

* historical points
* trend direction
* evidence markers
* confidence band
* evaluation periods

---

# 37. Confidence Visualization

Confidence should be visually separate from the competency trajectory.

Example:

```text
TREND
↑ IMPROVING

CONFIDENCE
████████░░ 82%

Evidence freshness
● Recent
```

If evidence becomes stale:

```text
CONFIDENCE
██████░░░░ 61%

Evidence freshness
○ Older evidence

No recent evidence detected
```

---

# 38. Insufficient Evidence State

This is a first-class state.

Example:

```text
COMMUNICATION

? INSUFFICIENT EVIDENCE

GrowthLens doesn't have enough recent
evidence to determine a reliable trajectory.

[SEE AVAILABLE EVIDENCE]
```

Do not manufacture a trend.

---

# 39. What-If Simulator

Route:

```text
/employee/simulator
```

Heading:

> What could **change**?

Subheading:

> Explore how a development action could affect your projected trajectory.

Action selector:

```text
Choose an action

[ Complete Advanced SQL Course ▼ ]
```

Then:

```text
CURRENT
→ Stagnating

PROJECTED
→ Improving
```

Chart:

```text
Observed trajectory ──────
                         /
Projected trajectory ----/
```

---

# 40. Simulator Explanation

Show:

```text
PROJECTED EFFECT

Competency:
SQL

Current trajectory:
Stagnating

Projected trajectory:
Improving

Action:
Complete Advanced SQL Course

Projection confidence:
Moderate
```

Clearly label this as a simulation.

Never display it as an observed result.

---

# 41. Recommendation Page

Route:

```text
/employee/recommendations
```

Heading:

> Your next **moves**

Each recommendation must explain why it exists.

---

# 42. Recommendation Card

Example:

```text
PYTHON
↓ DECLINING

Recommended action

Review advanced Python data-processing patterns.

WHY THIS ACTION?

Your recent evidence indicates difficulty
around data-processing tasks.

Supporting evidence
2 evidence items

[START LEARNING →]
```

---

# 43. Micro-Learning Recommendation

For YouTube-powered recommendations:

```text
LEARN

Advanced Python Data Processing

Relevant topic:
DataFrame optimization

Recommended starting point:
08:42

Why:
Matches the identified development area.

[WATCH FROM 08:42 →]
```

The timestamp should be generated from the transcript when available.

---

# 44. Mentorship Recommendation

Example:

```text
MENTORSHIP

Build stronger Cloud Deployment skills.

GrowthLens found an eligible internal
peer with an improving trajectory in
this competency.

[REQUEST MENTORSHIP →]
```

Do not expose unnecessary private information.

---

# 45. Mentorship Status

Possible states:

```text
REQUESTED
PENDING
ACCEPTED
DECLINED
COMPLETED
CANCELLED
```

The visual treatment should remain consistent with the rest of the platform.

---

# 46. Growth Narrative

Route:

```text
/employee/narrative
```

Heading:

> Your growth **story**

Display a generated narrative.

Example:

> Your Python competency improved steadily during the evaluation period, supported by recent project evidence and assessment activity, while Communication remained relatively stable.

Each claim should have an evidence interaction.

For example:

```text
Python competency improved steadily [2]

[2] Supporting evidence
```

Clicking opens the evidence.

---

# 47. Peer-Percentile Benchmark

Only display when sufficient privacy-safe cohort data exists.

Example:

```text
YOUR GROWTH

Data Analysis

Top 20%

among employees who started
at a similar level
```

Include:

```text
Comparison group:
Employees with comparable starting level

Cohort:
Enough participants for privacy-safe comparison
```

Do not reveal other employees.

---

# 48. Benchmark Insufficient State

If the cohort is too small:

```text
PEER BENCHMARK

Not available yet.

There isn't enough comparable data
to provide a privacy-safe benchmark.
```

Do not display a misleading percentile.

---

# 49. Manager Dashboard

Route:

```text
/manager/dashboard
```

The manager dashboard should answer:

> What is happening across my team's capabilities?

Hero:

```text
TEAM GROWTH

See where capability is moving
across your team.
```

---

# 50. Manager Team Overview

Show aggregate information.

Example:

```text
TEAM SNAPSHOT

12
employees

18
competencies tracked

7
showing improvement

5
showing stagnation

3
showing decline
```

These should be presented as editorial metrics, not giant enterprise KPI tiles.

---

# 51. Manager Skill Heatmap

Route:

```text
/manager/heatmap
```

Core visualization:

```text
              PYTHON   CLOUD   SQL   COMMUNICATION

Employee A       ↑       →      ↑          →
Employee B       →       ↑      →          ↑
Employee C       ↓       →      ↓          →
```

However, the visual design should use:

* warm background
* thin borders
* semantic indicators
* subtle colors
* strong typography

rather than a typical BI heatmap.

---

# 52. Team-Level Skill Insight

Below the heatmap:

```text
TEAM PATTERN

Cloud Deployment

Most tracked employees are currently
showing limited movement in this competency.

[EXPLORE COMPETENCY →]
```

This allows managers to identify team-wide patterns.

---

# 53. Manager Employee Explorer

Route:

```text
/manager/employees
```

Display employees as editorial rows.

Example:

```text
PRIYA SHARMA

Python        ↑
Cloud         →
Communication ↓

Last evidence
12 May 2026

[VIEW PROFILE →]
```

Manager access must be enforced server-side.

---

# 54. Manager Employee Detail

Route:

```text
/manager/employees/[employeeId]
```

Display:

```text
PRIYA SHARMA

Competency trajectory
Evidence
Confidence
Growth narrative
Recommendations
```

The manager should see only information they are authorized to access.

---

# 55. Manager Competency Detail

Example:

```text
PYTHON

TEAM VIEW

Improving: 7
Stagnating: 3
Declining: 2
Insufficient evidence: 1
```

Then show aggregate evidence patterns.

---

# 56. Manager Narrative View

Managers can inspect employee growth narratives where authorized.

Structure:

```text
GROWTH NARRATIVE

Employee
Priya Sharma

Evaluation period
Q2 2026

Narrative
...

SUPPORTING EVIDENCE
...
```

---

# 57. Ingestion Runs

Feature 1 requires an ingestion monitoring page.

Employee/admin appropriate route depending on access model.

Example:

```text
INGESTION RUN

GitHub
Started
14:32

Evidence discovered
128

Competencies detected
14

Successfully processed
124

Needs review
4

STATUS
COMPLETED
```

---

# 58. Integrations UI

For integrations such as GitHub and Jira:

```text
CONNECT SOURCE

GitHub
Connect repository evidence

[CONNECT →]

Jira
Connect project evidence

[CONNECT →]
```

When credentials are required, explain what they are being used for.

Never display full secrets after submission.

---

# 59. Semantic Evidence Search

Feature 1 can include an evidence search interface.

Example:

```text
SEARCH YOUR EVIDENCE

[ Why is my Python competency declining? ]

[ SEARCH → ]
```

Result:

```text
RELEVANT EVIDENCE

1. GitHub
2. Assessment
3. Project outcome
```

Each result should retain source and date.

---

# 60. RAG Justification Interface

When GrowthLens generates an explanation:

```text
WHY THIS TREND?

Python is currently classified as
DECLINING.

Confidence: 82%

GrowthLens found:

• 2 recent project signals
• 1 assessment signal
• 1 related development issue

[VIEW SUPPORTING EVIDENCE]
```

The explanation should not appear as unsupported AI prose.

---

# 61. Feature Dependency Visualization

The product can visually communicate:

```text
EVIDENCE
    ↓
COMPETENCY
    ↓
TRAJECTORY
    ↓
ACTION
    ↓
GROWTH
```

This should be one of the signature visual motifs of GrowthLens.

---

# 62. Cards

Cards should not dominate every screen.

Use cards primarily when grouping information.

Card styling:

```text
background: #FBF6DF
border: 1px solid #1C1C1C
border-radius: 24–32px
```

Avoid:

* heavy shadows
* excessive borders
* dozens of cards on one page

---

# 63. Pill Buttons

Primary:

```text
border-radius: 999px;
border: 1.5px solid #1C1C1C;
background: #F6BB84;
```

Example:

```text
EXPLORE GROWTH →
```

Secondary:

```text
VIEW EVIDENCE →
```

Use compact uppercase labels.

---

# 64. Input Fields

Inputs should use pill styling:

```text
border-radius: 999px;
border: 1px solid #1C1C1C;
background: transparent;
```

Example:

```text
EMAIL ADDRESS
```

Focus state must be clearly visible.

---

# 65. Organic Shapes

The reference's blob visual should become a recurring GrowthLens design element.

Use for:

* hero illustrations
* feature visuals
* employee profile visuals
* competency highlights
* empty states

Example:

```css
border-radius:
58% 42% 55% 45%
/
45% 55% 45% 55%;
```

Avoid perfect circles everywhere.

---

# 66. Scalloped Panels

Use scalloped/wavy edges for major editorial panels.

Good uses:

* landing page CTA
* growth narrative
* feature introduction
* major employee insight

Do not use scallops on every card.

That would destroy the visual hierarchy.

---

# 67. Empty States

Empty states should feel intentional.

Example:

```text
NO EVIDENCE YET

Your competency profile will become
more informative as evidence arrives.

[CONNECT A SOURCE →]
```

Use an organic illustration.

---

# 68. Loading States

Avoid generic spinning loaders.

Use subtle editorial loading states.

Example:

```text
GATHERING YOUR EVIDENCE
···
```

or animated dots/lines.

Loading animation should be restrained.

---

# 69. Error States

Example:

```text
WE COULDN'T COMPLETE THIS INGESTION

The connected source could not be reached.

Check the connection and try again.

[TRY AGAIN →]
```

Do not expose technical stack traces.

---

# 70. Motion Design

Motion should support the editorial feel.

Use:

* fade-up
* slight slide
* staggered feature reveals
* trajectory line animation
* subtle button lift
* organic image movement

Recommended stagger:

```text
80ms
```

between sequential elements.

Avoid:

* constant background animation
* excessive parallax
* spinning dashboards
* distracting animations

---

# 71. Page Transition

Page transitions should be subtle.

Suggested:

```text
opacity: 0 → 1
transform: translateY(8px) → 0
```

Fast enough that navigation never feels sluggish.

---

# 72. Chart Design

Charts should use the editorial visual system.

Avoid:

* heavy grid lines
* 3D charts
* gradients everywhere
* unnecessary legends

Use:

* thin trajectory lines
* clear labels
* evidence markers
* confidence bands
* simple axes

---

# 73. Evidence Marker

On trajectory charts, evidence events can appear as small markers.

Example:

```text
              ●
             / \
       ●----/   ●
      /
  ●
```

Clicking a marker should open the associated evidence.

This creates a direct relationship between:

**trajectory → evidence**

---

# 74. Confidence Band

A trajectory can visually show uncertainty.

Example concept:

```text
       ╭────── projected
   ────╯
  ───────── actual
```

The band should widen when confidence decreases.

This directly communicates evidence quality.

---

# 75. Staleness Visualization

A competency with fresh evidence:

```text
↑ IMPROVING
Confidence: 86%
Evidence: 4 days ago
```

Older:

```text
↑ IMPROVING
Confidence: 61%
Evidence: 92 days ago
```

The UI must make this distinction obvious.

---

# 76. Accessibility

The platform must support:

* keyboard navigation
* visible focus states
* semantic HTML
* accessible labels
* adequate contrast
* screen-reader-friendly controls
* non-color trend indicators
* readable chart labels
* accessible dialogs

Script typography must never be the only carrier of meaning.

---

# 77. Responsive Design

### Mobile

Target widths:

```text
320px
375px
390px
414px
```

Characteristics:

* one-column layout
* compact navigation
* stacked content
* horizontally scrollable chart only when absolutely necessary
* large touch targets
* simplified heatmap
* collapsible evidence details

---

### Tablet

Target:

```text
768px
```

Use two-column compositions where appropriate.

---

### Laptop

Target:

```text
1024px
1280px
```

Use full application navigation and two/three-column layouts.

---

### Desktop

Target:

```text
1440px+
```

Increase whitespace rather than simply increasing every font size.

---

# 78. Mobile Manager Heatmap

A desktop heatmap may be wide.

On mobile, convert it into employee/competency sections or a horizontally scrollable data region with preserved accessibility.

Do not shrink the heatmap until it becomes unreadable.

---

# 79. Mobile Trajectory

Charts should remain readable.

Use:

* simplified axes
* touch interaction
* evidence tooltip
* horizontal space where necessary
* readable labels

---

# 80. Settings

Employee settings:

```text
PROFILE
CONNECTED SOURCES
NOTIFICATIONS
PRIVACY
ACCOUNT
```

Manager settings:

```text
PROFILE
TEAM ACCESS
NOTIFICATIONS
PRIVACY
ACCOUNT
```

Do not expose security-sensitive configuration unnecessarily.

---

# 81. Profile

Employee:

```text
NAME
ROLE
TEAM
COMPETENCIES
CONNECTED SOURCES
```

Manager:

```text
NAME
ROLE
TEAM / ORGANIZATION
ACCESS SCOPE
```

---

# 82. Notifications

Relevant notifications may include:

```text
New evidence processed

Python trajectory updated

New development recommendation

Mentorship request received

Evaluation period completed
```

Notifications should be concise.

---

# 83. Information Hierarchy

Every screen should answer three questions:

### 1. What happened?

Example:

> Python is declining.

### 2. Why?

Example:

> Recent evidence indicates weaker performance in relevant project activity.

### 3. What next?

Example:

> Review targeted Python data-processing material.

This should become a fundamental GrowthLens UI pattern.

---

# 84. Standard Insight Component

Create a reusable component:

```text
INSIGHT

WHAT
Python is declining.

WHY
3 recent evidence items indicate reduced
performance in related activities.

CONFIDENCE
82%

NEXT
Review advanced data-processing concepts.

[VIEW EVIDENCE] [TAKE ACTION]
```

This component can appear throughout the product.

---

# 85. Evidence Drawer

When the user selects "View Evidence", use a drawer/modal rather than navigating away whenever appropriate.

Example:

```text
SUPPORTING EVIDENCE

Python

GitHub
12 May 2026
Project repository

...

Assessment
08 May 2026
Advanced Python section

...

[VIEW ALL EVIDENCE]
```

---

# 86. Manager Privacy

Manager views must clearly distinguish:

* individual information
* aggregate information

Aggregate team insight:

```text
8 of 14 employees
show limited movement in Cloud.
```

Individual detail:

```text
Employee X
Cloud
Declining
```

Access to individual information must follow authorization rules.

---

# 87. Benchmarking Privacy

Peer benchmarking should not become a leaderboard.

The visual language should communicate context rather than competition.

Example:

```text
YOUR GROWTH

Top 20% of comparable starting-level peers
```

No names.

No raw peer scores.

No individual comparisons.

---

# 88. Design Tokens

Centralize design tokens.

Example:

```text
--color-lime
--color-cream
--color-blush
--color-peach
--color-cta
--color-ink
--color-card-cream

--font-primary
--font-script

--radius-pill
--radius-card
--radius-organic

--spacing-xs
--spacing-sm
--spacing-md
--spacing-lg
--spacing-xl
```

Do not scatter hex values throughout components.

---

# 89. Component Library

Build reusable components for:

```text
GlobalHeader
GlobalFooter
Logo
PillButton
PillInput
OrganicImage
ScallopedPanel
FeatureVisual
EvidenceCard
EvidenceDrawer
CompetencyCard
TrendBadge
ConfidenceBadge
TrajectoryChart
ConfidenceBand
InsightBlock
RecommendationCard
MentorshipCard
NarrativeBlock
BenchmarkCard
Heatmap
EmptyState
LoadingState
ErrorState
Modal
Drawer
Tabs
Filter
```

---

# 90. Final Visual Rule

The final interface should feel like:

> **An editorial growth journal powered by serious intelligence underneath.**

It should not feel like:

> another HR SaaS dashboard.

The reference image's strongest characteristics must remain visible throughout the application:

**warm continuous gradient + lime navigation + Poppins + selective script typography + black ink borders + organic shapes + scalloped panels + pill controls + generous whitespace + restrained motion.**

At the same time, the actual product must clearly communicate:

**evidence → competency → trajectory → action → growth.**

That is the core visual and functional identity of GrowthLens.
