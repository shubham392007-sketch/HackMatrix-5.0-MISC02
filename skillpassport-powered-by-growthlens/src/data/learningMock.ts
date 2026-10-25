import {
  DomainBlueprint,
  DiagnosticQuestion,
  LearningRoadmap,
  LearningStepPacket,
  LearningResource,
  PracticeExercise,
  KnowledgeAssessment,
  MiniProject,
  RemediationSession,
  LearningHistoryEvent,
  CandidateLearningEvidence,
} from "@/types/learning";
import { generatePersonalizedRoadmap } from "@/lib/learningCalculations";

export const INITIAL_BLUEPRINTS: DomainBlueprint[] = [
  {
    domain_id: "gap-skill-api-integration",
    title: "API Integration & Messaging",
    version: "v2026.1-TARGET-GAP",
    status: "active",
    description:
      "Production API integration, asynchronous messaging, webhook ingestion, exponential backoff, and distributed service communication.",
    target_mastery: 85,
    estimated_hours: 16,
    learning_objectives: [
      "Construct idempotent HTTP API consumers with exponential backoff and jitter",
      "Implement event-driven asynchronous messaging patterns with message queues",
      "Design robust webhook ingestion pipelines with cryptographic signature validation",
      "Handle distributed partial network failures using circuit breakers",
    ],
    modules: [
      {
        id: "mod-api-1",
        title: "1. REST & HTTP Client Engineering",
        description: "HTTP semantics, connection pooling, and retry policies.",
        topics: [
          {
            id: "topic-http-resilience",
            title: "Exponential Backoff & Idempotency",
            description: "Handling transient network errors and duplicate HTTP submissions with Idempotency-Key headers.",
            difficulty: "Intermediate",
            estimated_minutes: 45,
            learning_objective: "Implement an idempotent HTTP client with jittered exponential retry loops.",
            prerequisites: [],
            related_skill_id: "skill-api-integration",
            knowledge_signal: 70,
            practice_signal: 65,
            assessment_signal: 60,
            project_signal: 50,
            current_mastery: 62,
            target_mastery: 85,
            status: "available",
          },
          {
            id: "topic-webhook-ingestion",
            title: "Webhook Ingestion & Signature Verification",
            description: "HMAC SHA-256 signature validation and asynchronous event dispatching.",
            difficulty: "Intermediate",
            estimated_minutes: 40,
            learning_objective: "Verify webhook authenticity and process payloads asynchronously.",
            prerequisites: ["topic-http-resilience"],
            related_skill_id: "skill-api-integration",
            knowledge_signal: 60,
            practice_signal: 55,
            assessment_signal: 50,
            project_signal: 40,
            current_mastery: 52,
            target_mastery: 85,
            status: "available",
          },
        ],
      },
      {
        id: "mod-api-2",
        title: "2. Event-Driven Messaging & Queues",
        description: "Message brokers, at-least-once delivery, and dead-letter queues.",
        topics: [
          {
            id: "topic-message-queues",
            title: "Message Broker Patterns & Dead-Letter Queues",
            description: "Designing persistent message queues with dead-letter queue routing for failed messages.",
            difficulty: "Advanced",
            estimated_minutes: 55,
            learning_objective: "Build resilient producer-consumer pipelines with DLQ fallback.",
            prerequisites: ["topic-http-resilience"],
            related_skill_id: "skill-api-integration",
            knowledge_signal: 50,
            practice_signal: 40,
            assessment_signal: 30,
            project_signal: 20,
            current_mastery: 36,
            target_mastery: 85,
            status: "available",
          },
        ],
      },
    ],
  },
  {
    domain_id: "gap-skill-fastapi",
    title: "FastAPI Web Framework",
    version: "v2026.1-TARGET-GAP",
    status: "active",
    description:
      "Production API engineering with FastAPI, Pydantic schemas, dependency injection, async concurrency, and automated testing.",
    target_mastery: 80,
    estimated_hours: 14,
    learning_objectives: [
      "Design robust asynchronous RESTful endpoints with FastAPI and Starlette",
      "Implement reusable request validation and authentication with Depends()",
      "Enforce strict schema validation and data serialization using Pydantic v2",
      "Write integration tests with Pytest and FastAPI TestClient",
    ],
    modules: [
      {
        id: "mod-fastapi-1",
        title: "1. Core Routing & Pydantic Validation",
        description: "Path parameters, query parameters, request bodies, and Pydantic models.",
        topics: [
          {
            id: "topic-fastapi-routes",
            title: "FastAPI Route Handlers & Status Codes",
            description: "Configuring typed route signatures, query parameters, and HTTP response codes.",
            difficulty: "Beginner",
            estimated_minutes: 40,
            learning_objective: "Build RESTful route handlers with explicit response models and status codes.",
            prerequisites: [],
            related_skill_id: "skill-fastapi",
            knowledge_signal: 75,
            practice_signal: 70,
            assessment_signal: 65,
            project_signal: 55,
            current_mastery: 67,
            target_mastery: 80,
            status: "available",
          },
          {
            id: "topic-pydantic-schemas",
            title: "Pydantic v2 Schemas & Data Constraints",
            description: "Defining input validation rules, Field constraints, and nested schemas.",
            difficulty: "Intermediate",
            estimated_minutes: 45,
            learning_objective: "Enforce request payload contracts with Pydantic v2 validators.",
            prerequisites: ["topic-fastapi-routes"],
            related_skill_id: "skill-fastapi",
            knowledge_signal: 65,
            practice_signal: 60,
            assessment_signal: 55,
            project_signal: 45,
            current_mastery: 57,
            target_mastery: 80,
            status: "available",
          },
        ],
      },
      {
        id: "mod-fastapi-2",
        title: "2. Dependency Injection & Testing",
        description: "Reusable dependencies, database sessions, and Pytest TestClient.",
        topics: [
          {
            id: "topic-fastapi-depends",
            title: "Depends() & Database Session Injection",
            description: "Injecting database sessions, configuration objects, and authentication credentials.",
            difficulty: "Intermediate",
            estimated_minutes: 50,
            learning_objective: "Implement hierarchical dependency injection with yield generators.",
            prerequisites: ["topic-fastapi-routes"],
            related_skill_id: "skill-fastapi",
            knowledge_signal: 55,
            practice_signal: 50,
            assessment_signal: 45,
            project_signal: 35,
            current_mastery: 47,
            target_mastery: 80,
            status: "available",
          },
          {
            id: "topic-fastapi-testing",
            title: "Integration Testing with TestClient",
            description: "Testing asynchronous endpoints, overriding dependencies, and verifying JSON responses.",
            difficulty: "Intermediate",
            estimated_minutes: 45,
            learning_objective: "Write automated test suites for FastAPI routes using Pytest fixtures.",
            prerequisites: ["topic-fastapi-depends"],
            related_skill_id: "skill-fastapi",
            knowledge_signal: 50,
            practice_signal: 45,
            assessment_signal: 40,
            project_signal: 30,
            current_mastery: 42,
            target_mastery: 80,
            status: "available",
          },
        ],
      },
    ],
  },
  {
    domain_id: "gap-skill-system-architecture",
    title: "Distributed System Architecture",
    version: "v2026.1-TARGET-GAP",
    status: "active",
    description:
      "Designing high-scale, partition-tolerant distributed architectures, consensus protocols, horizontal sharding, and resilience patterns.",
    target_mastery: 85,
    estimated_hours: 16,
    learning_objectives: [
      "Evaluate architectural trade-offs using CAP theorem and PACELC principles",
      "Design horizontal sharding topologies with consistent hashing",
      "Implement leader election and consensus mechanisms",
      "Architect zero-downtime distributed failover strategies",
    ],
    modules: [
      {
        id: "mod-arch-1",
        title: "1. Distributed State & Consensus",
        description: "Partition tolerance, leader election, and consensus protocols.",
        topics: [
          {
            id: "topic-cap-tradeoffs",
            title: "CAP & PACELC Architectural Trade-offs",
            description: "Analyzing consistency vs latency and availability across distributed service boundaries.",
            difficulty: "Intermediate",
            estimated_minutes: 45,
            learning_objective: "Formulate architecture design RFCs balancing consistency and availability.",
            prerequisites: [],
            related_skill_id: "skill-system-architecture",
            knowledge_signal: 60,
            practice_signal: 55,
            assessment_signal: 50,
            project_signal: 40,
            current_mastery: 52,
            target_mastery: 85,
            status: "available",
          },
          {
            id: "topic-consistent-hashing",
            title: "Consistent Hashing & Partitioning Topologies",
            description: "Virtual node distribution and minimal key relocation during cluster scaling.",
            difficulty: "Advanced",
            estimated_minutes: 55,
            learning_objective: "Construct a distributed hash ring with virtual node replication.",
            prerequisites: ["topic-cap-tradeoffs"],
            related_skill_id: "skill-system-architecture",
            knowledge_signal: 45,
            practice_signal: 40,
            assessment_signal: 35,
            project_signal: 25,
            current_mastery: 37,
            target_mastery: 85,
            status: "available",
          },
        ],
      },
    ],
  },
  {
    domain_id: "gap-skill-application-security-&-devsecops",
    title: "Application Security & DevSecOps",
    version: "v2026.1-TARGET-GAP",
    status: "active",
    description:
      "Securing production applications, threat modeling, JWT authentication verification, vulnerability scanning, and secure CI/CD gates.",
    target_mastery: 85,
    estimated_hours: 16,
    learning_objectives: [
      "Implement cryptographically verified token handling and key rotation",
      "Mitigate OWASP Top 10 vulnerabilities in modern web APIs",
      "Automate dependency vulnerability scanning in CI/CD pipelines",
      "Enforce least-privilege role-based access control (RBAC)",
    ],
    modules: [
      {
        id: "mod-appsec-1",
        title: "1. Authentication & Cryptographic Tokens",
        description: "JWT signatures, replay attacks, and token validation.",
        topics: [
          {
            id: "topic-jwt-security",
            title: "JWT Token Validation & Cryptographic Verification",
            description: "Signature verification, token expiry, and asymmetric key rotation.",
            difficulty: "Intermediate",
            estimated_minutes: 50,
            learning_objective: "Validate RS256 token claims with strict public key pinning.",
            prerequisites: [],
            related_skill_id: "skill-application-security-&-devsecops",
            knowledge_signal: 65,
            practice_signal: 60,
            assessment_signal: 55,
            project_signal: 45,
            current_mastery: 57,
            target_mastery: 85,
            status: "available",
          },
        ],
      },
    ],
  },
  {
    domain_id: "gap-046377b2-6953-4aba-99e0-a8164be7e97d",
    title: "Relational Data Modeling & PostgreSQL",
    version: "v2026.1-RELEASE",
    status: "active",
    description:
      "Advanced relational schema design, indexing strategies, query plan optimization, and transaction isolation in PostgreSQL for production architectures.",
    target_mastery: 85,
    estimated_hours: 18,
    learning_objectives: [
      "Design normalized third-normal-form and dimensional schemas with referential integrity constraints",
      "Analyze query execution plans using EXPLAIN ANALYZE to identify sequential scan bottlenecks",
      "Construct multi-column B-tree, GIN, and BRIN indexes tailored to complex query predicates",
      "Manage transaction isolation levels and concurrency control to prevent deadlocks and race conditions",
    ],
    modules: [
      {
        id: "mod-relational-modeling",
        title: "1. Relational Schema Design & Integrity",
        description: "Normalization, composite foreign keys, constraint design, and partitioning strategies.",
        topics: [
          {
            id: "topic-schema-normalization",
            title: "Schema Normalization & BCNF Design",
            description: "Eliminating update anomalies and designing maintainable relational boundaries.",
            difficulty: "Intermediate",
            estimated_minutes: 45,
            learning_objective: "Construct 3NF/BCNF schemas that eliminate functional dependency redundancies.",
            prerequisites: [],
            related_skill_id: "046377b2-6953-4aba-99e0-a8164be7e97d",
            knowledge_signal: 70,
            practice_signal: 65,
            assessment_signal: 60,
            project_signal: 55,
            current_mastery: 63,
            target_mastery: 85,
            status: "available",
          },
          {
            id: "topic-indexing-plans",
            title: "PostgreSQL Indexing & EXPLAIN Execution Plans",
            description: "Understanding index scans, bitmap heap scans, filter costs, and covering indexes.",
            difficulty: "Advanced",
            estimated_minutes: 55,
            learning_objective: "Diagnose slow queries using EXPLAIN (ANALYZE, BUFFERS) and design optimal B-tree and composite indexes.",
            prerequisites: ["topic-schema-normalization"],
            related_skill_id: "046377b2-6953-4aba-99e0-a8164be7e97d",
            knowledge_signal: 60,
            practice_signal: 50,
            assessment_signal: 50,
            project_signal: 40,
            current_mastery: 52,
            target_mastery: 85,
            status: "available",
          },
        ],
      },
      {
        id: "mod-transactions",
        title: "2. Concurrency, Locking & Performance",
        description: "MVCC mechanics, row-level locks, advisory locks, and connection pooling.",
        topics: [
          {
            id: "topic-concurrency-locks",
            title: "MVCC & Transaction Isolation Levels",
            description: "Read Committed vs Repeatable Read vs Serializable anomalies and row lock contention.",
            difficulty: "Advanced",
            estimated_minutes: 50,
            learning_objective: "Prevent write skews, dirty reads, and deadlock cascades in high-throughput database transactions.",
            prerequisites: ["topic-indexing-plans"],
            related_skill_id: "046377b2-6953-4aba-99e0-a8164be7e97d",
            knowledge_signal: 65,
            practice_signal: 55,
            assessment_signal: 50,
            project_signal: 45,
            current_mastery: 56,
            target_mastery: 85,
            status: "available",
          },
        ],
      },
    ],
  },
  {
    domain_id: "gap-024e9309-ac90-4451-8a0d-054aa3e49b3d",
    title: "Cloud Infrastructure & DevOps",
    version: "v2026.1-RELEASE",
    status: "active",
    description: "Production cloud infrastructure automation, container orchestration, CI/CD pipelines, and infrastructure as code.",
    target_mastery: 85,
    estimated_hours: 20,
    learning_objectives: [
      "Provision reproducible cloud infrastructure with state-locked Terraform templates",
      "Containerize microservices with hardened multi-stage Docker builds",
      "Implement automated continuous integration and continuous deployment pipelines",
    ],
    modules: [
      {
        id: "mod-cloud-iac",
        title: "1. Infrastructure as Code & Terraform",
        description: "State management, remote backends, module design, and immutable infrastructure.",
        topics: [
          {
            id: "topic-terraform-state",
            title: "Terraform State Locking & Remote Backends",
            description: "Managing concurrent team operations and zero-drift cloud environments.",
            difficulty: "Intermediate",
            estimated_minutes: 45,
            learning_objective: "Configure S3/DynamoDB remote state locking with zero drift.",
            prerequisites: [],
            related_skill_id: "024e9309-ac90-4451-8a0d-054aa3e49b3d",
            knowledge_signal: 70,
            practice_signal: 65,
            assessment_signal: 60,
            project_signal: 55,
            current_mastery: 64,
            target_mastery: 85,
            status: "available",
          },
        ],
      },
    ],
  },
  {
    domain_id: "gap-602d5bcb-7e3f-4d8d-8381-d60f8e803ac0",
    title: "Python Programming",
    version: "v2026.1-RELEASE",
    status: "active",
    description: "High-performance Python programming, concurrency with asyncio, strict type typing, and architectural design patterns.",
    target_mastery: 85,
    estimated_hours: 18,
    learning_objectives: [
      "Implement asynchronous event-driven network services with Python asyncio",
      "Enforce type safety with strict typing annotations and Pydantic runtime validation",
      "Structure modular, scalable Python packages complying with modern engineering standards",
    ],
    modules: [
      {
        id: "mod-py-concurrency",
        title: "1. Asynchronous Concurrency & Runtime Types",
        description: "Event loops, coroutines, tasks, and runtime schema validation.",
        topics: [
          {
            id: "topic-py-asyncio",
            title: "Asyncio Event Loops & Non-Blocking I/O",
            description: "Structuring concurrent task execution without event loop starvation.",
            difficulty: "Advanced",
            estimated_minutes: 50,
            learning_objective: "Build high-throughput async services with task cancellation and executor offloading.",
            prerequisites: [],
            related_skill_id: "602d5bcb-7e3f-4d8d-8381-d60f8e803ac0",
            knowledge_signal: 75,
            practice_signal: 70,
            assessment_signal: 65,
            project_signal: 60,
            current_mastery: 69,
            target_mastery: 85,
            status: "available",
          },
        ],
      },
    ],
  },
];

export const INITIAL_DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: "diag-q1",
    question_text: "Which mechanism of missingness implies that missing values are related to the unobserved values themselves?",
    domain_id: "domain-data-preprocessing",
    module_id: "mod-cleaning",
    topic_id: "topic-missing-values",
    category: "concept",
    options: [
      "Missing Completely at Random (MCAR)",
      "Missing at Random (MAR)",
      "Missing Not at Random (MNAR)",
      "Informative Censoring",
    ],
    correct_index: 2,
    explanation: "MNAR occurs when the probability of a missing value depends on the unobserved value itself (e.g., individuals with high incomes refusing to report income).",
  },
  {
    id: "diag-q2",
    question_text: "In Tukey's boxplot rule, what are the exact lower and upper fences defined for potential outlier detection?",
    domain_id: "domain-data-preprocessing",
    module_id: "mod-outliers",
    topic_id: "topic-outlier-iqr",
    category: "concept",
    options: [
      "Q1 - 1.5 × IQR and Q3 + 1.5 × IQR",
      "Mean - 2 × Std and Mean + 2 × Std",
      "Q1 - 3.0 × IQR and Q3 + 3.0 × IQR",
      "Median - 1.5 × MAD and Median + 1.5 × MAD",
    ],
    correct_index: 0,
    explanation: "Standard Tukey IQR fences are defined as Q1 - 1.5×IQR for the lower threshold and Q3 + 1.5×IQR for the upper threshold.",
  },
  {
    id: "diag-q3",
    question_text: "Why is Winsorization often preferred over hard row trimming (deletion) when preparing data for linear or distance-based models?",
    domain_id: "domain-data-preprocessing",
    module_id: "mod-outliers",
    topic_id: "topic-outlier-winsorization",
    category: "reasoning",
    options: [
      "It completely eliminates the variance of the underlying feature",
      "It preserves overall sample size (degrees of freedom) while capping catastrophic leverage points",
      "It transforms any skewed distribution directly into a Gaussian normal distribution",
      "It automatically imputes missing values at the same time",
    ],
    correct_index: 1,
    explanation: "Winsorization replaces values beyond percentiles (e.g. 1st and 99th) with those percentile boundary values, retaining all rows while bounding extreme leverage.",
  },
  {
    id: "diag-q4",
    question_text: "Examine the following pandas code for 99th percentile capping. What subtle bug or inefficiency is present?",
    domain_id: "domain-data-preprocessing",
    module_id: "mod-outliers",
    topic_id: "topic-outlier-winsorization",
    category: "implementation",
    code_snippet: `def cap_outliers(df, col):\n    p99 = df[col].quantile(0.99)\n    df[col] = df[col].apply(lambda x: p99 if x > p99 else x)\n    return df`,
    options: [
      "The quantile calculation is mathematically incorrect in pandas",
      "Using apply(lambda) is significantly slower and less idiomatic than df[col].clip(upper=p99)",
      "It erroneously drops values below 0.01",
      "The quantile function fails on float series",
    ],
    correct_index: 1,
    explanation: "Series.clip(upper=p99) is vectorized in Cython, avoiding costly Python bytecode overhead inherent to .apply(lambda).",
  },
  {
    id: "diag-q5",
    question_text: "When should RobustScaler be selected instead of StandardScaler?",
    domain_id: "domain-data-preprocessing",
    module_id: "mod-scaling",
    topic_id: "topic-scaling-robust",
    category: "reasoning",
    options: [
      "Only when all features are binary categories",
      "When the dataset contains severe outliers that would distort sample mean and variance",
      "When gradient descent algorithms require inputs bounded strictly in [0, 1]",
      "When using decision trees that depend strictly on monotonic rank order",
    ],
    correct_index: 1,
    explanation: "StandardScaler relies on mean and standard deviation, which are heavily distorted by extreme values. RobustScaler centers with the median and scales by IQR.",
  },
  {
    id: "diag-q6",
    question_text: "What major risk occurs if Target Encoding is applied to high-cardinality features without out-of-fold regularization or smoothing?",
    domain_id: "domain-data-preprocessing",
    module_id: "mod-encoding",
    topic_id: "topic-encoding-onehot",
    category: "concept",
    options: [
      "Severe target leakage and extreme overfitting on rare category levels",
      "The resulting matrix becomes completely sparse",
      "Gradient boosting estimators will refuse to split on floating point columns",
      "Numerical underflow in floating point arithmetic",
    ],
    correct_index: 0,
    explanation: "Rare categories with only 1-2 occurrences will directly mirror target values, causing severe overfitting and leakage if unsmoothed.",
  },
  {
    id: "diag-q7",
    question_text: "Which of the following pipeline designs causes data leakage during cross-validation?",
    domain_id: "domain-data-preprocessing",
    module_id: "mod-validation",
    topic_id: "topic-pipeline-leakage",
    category: "application",
    options: [
      "Fitting a StandardScaler only on X_train, then using transform on X_test",
      "Calling scaler.fit_transform(X) on the entire dataset prior to train_test_split()",
      "Wrapping both imputer and estimator inside a sklearn.pipeline.Pipeline",
      "Using KFold cross-validation inside an automated grid search",
    ],
    correct_index: 1,
    explanation: "Fitting transforms on the entire dataset incorporates test-set distribution moments (mean, variance) into training statistics, constituting explicit data leakage.",
  },
  {
    id: "diag-q8",
    question_text: "In a heavily skewed positive distribution (e.g. server latency spikes), why can the standard Z-score (Mean ± 3σ) fail to identify true anomalies?",
    domain_id: "domain-data-preprocessing",
    module_id: "mod-outliers",
    topic_id: "topic-outlier-zscore",
    category: "reasoning",
    options: [
      "Extreme outliers inflate the sample standard deviation, masking their own anomaly score (the masking effect)",
      "Z-scores cannot be calculated on positive numbers",
      "The Z-score formula only applies to discrete integer counts",
      "Median values always equal 0 in latency distributions",
    ],
    correct_index: 0,
    explanation: "The masking effect occurs because extreme outliers pull the mean towards themselves and drastically inflate standard deviation, artificially reducing calculated Z-scores.",
  },
  {
    id: "diag-q9",
    question_text: "Complete the idiomatic Scikit-Learn pipeline to cap outliers and scale features without leakage:",
    domain_id: "domain-data-preprocessing",
    module_id: "mod-validation",
    topic_id: "topic-pipeline-leakage",
    category: "implementation",
    code_snippet: `from sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import RobustScaler\n# pipeline = Pipeline([('scaler', RobustScaler()), ('model', model)])`,
    options: [
      "Pipeline fits each step sequentially on the training fold during cross_val_score",
      "Pipeline applies transforms to y_train automatically",
      "Pipeline requires manually calling fit on validation folds",
      "Pipeline cannot handle multiple preprocessing steps",
    ],
    correct_index: 0,
    explanation: "Sklearn Pipeline guarantees that fit() is executed strictly on training folds during cross-validation, preventing information bleed into validation folds.",
  },
  {
    id: "diag-q10",
    question_text: "You are given a dataset where 4% of customer transaction values exceed $50,000 in an otherwise sub-$100 distribution. How should you treat these values for an XGBoost Regressor vs a Ridge Regression model?",
    domain_id: "domain-data-preprocessing",
    module_id: "mod-outliers",
    topic_id: "topic-outlier-winsorization",
    category: "application",
    options: [
      "Drop all rows above $100 for both models",
      "Ridge regression requires Winsorization or log transformation to prevent gradient distortion; XGBoost is rank-invariant to monotonic feature scaling but still benefits from target bounding",
      "Do nothing for Ridge, but aggressively trim for XGBoost",
      "Replace all 4% of values with the column mean for both models",
    ],
    correct_index: 1,
    explanation: "Linear models (Ridge) minimize squared loss and suffer severe leverage penalties from extreme values. Tree models (XGBoost) split on rank thresholds, making feature scale invariant, but extreme target outliers still destabilize gradient statistics.",
  },
];

export const INITIAL_STEP_PACKETS: Record<string, LearningStepPacket> = {
  "step-topic-outlier-winsorization": {
    step_id: "step-topic-outlier-winsorization",
    topic_id: "topic-outlier-winsorization",
    title: "Winsorization & Percentile Capping",
    learning_objective: "Implement percentile-based outlier capping using Python and pandas.",
    why_this_matters:
      "Your diagnostic assessment identified a weakness in outlier thresholding (score: 50%). Extreme values severely distort machine learning estimators, yet dropping rows deletes valuable real-world samples. Winsorization solves this by bounding tails.",
    what_is_it:
      "Winsorization is the statistical transformation of capping extreme values at specified percentiles (commonly the 1st and 99th, or 5th and 95th). Unlike truncation, all observations are retained, but extreme leverage is neutralized.",
    why_and_when:
      "Use Winsorization when: (1) You cannot afford sample size reduction; (2) Extreme values are valid measurements rather than corrupted sensor errors; (3) You are training estimators sensitive to magnitude (Linear Models, SVMs, Neural Nets).",
    worked_example: {
      title: "Pandas Vectorized Capping with Series.clip()",
      explanation:
        "Using pandas quantile() to compute lower and upper bounds, followed by .clip() for zero-overhead Cython execution:",
      code: `import pandas as pd
import numpy as np

def winsorize_series(s: pd.Series, lower_q: float = 0.01, upper_q: float = 0.99) -> pd.Series:
    """Caps values outside lower and upper quantiles without dropping rows."""
    lower_bound = s.quantile(lower_q)
    upper_bound = s.quantile(upper_q)
    return s.clip(lower=lower_bound, upper=upper_bound)

# Example demonstration
data = pd.Series([12, 14, 15, 13, 16, 14, 4500, 15, 12, -800])
cleaned = winsorize_series(data)
print("Before max:", data.max(), "-> After max:", cleaned.max())`,
      visual_note: "Notice how 4500 is replaced by the 99th percentile boundary (~445) while preserving index alignment.",
    },
    common_mistakes: [
      "Computing quantiles on the full dataset before train/test split (Causes data leakage!)",
      "Using iterative .apply(lambda x: ...) loops instead of vectorized .clip()",
      "Blindly applying symmetric capping (e.g., 5% on both ends) to naturally skewed zero-bounded distributions like telemetry latency",
    ],
    implementation_steps: [
      "1. Calculate lower quantile (e.g. 0.01) and upper quantile (e.g. 0.99) strictly on training data",
      "2. Store boundaries as pipeline parameters",
      "3. Apply .clip(lower, upper) to test and production inference inputs",
      "4. Verify post-treatment variance and summary statistics",
    ],
    knowledge_check: [
      {
        question: "What is the primary operational difference between trimming and Winsorization?",
        options: [
          "Trimming deletes rows; Winsorization caps extreme values at boundary thresholds",
          "Trimming works only on integers; Winsorization works only on floats",
          "Winsorization deletes columns; trimming deletes rows",
          "There is no difference; they are synonymous terms",
        ],
        correct_index: 0,
        explanation: "Trimming removes rows entirely from the dataset, decreasing N. Winsorization replaces values beyond bounds with the bound values, preserving N.",
      },
      {
        question: "To prevent data leakage, when should Winsorization quantile boundaries be computed?",
        options: [
          "On the full combined dataset prior to splitting",
          "Strictly on training folds, then applied to validation/test folds",
          "On validation folds separately",
          "After model hyperparameter tuning is complete",
        ],
        correct_index: 1,
        explanation: "Quantiles must be estimated solely from training data so no future distribution signals bleed into evaluation data.",
      },
      {
        question: "Why is pandas Series.clip() preferred over iterative lambda or for-loops when capping values?",
        options: [
          "Series.clip() is compiled in Cython/C, executing vectorized operations without Python bytecode loop overhead",
          "Series.clip() deletes extreme rows automatically",
          "Loops cannot operate on float arrays in Python",
          "Series.clip() converts numeric data to strings",
        ],
        correct_index: 0,
        explanation: "Vectorized Series.clip() operates directly on contiguous memory buffers in C/Cython, running up to 50x faster than row-by-row apply loops.",
      },
      {
        question: "When should Winsorization NOT be used on a skewed numeric distribution?",
        options: [
          "When true anomalies represent the primary signal of interest (e.g. fraud detection, intrusion alerts)",
          "When training linear regression models",
          "When sample sizes are small",
          "When working with float columns",
        ],
        correct_index: 0,
        explanation: "In fraud detection or security telemetry, extreme tail values are the true positive targets; capping them destroys the very signal the model must detect.",
      },
    ],
    source_attribution: "Scikit-Learn Documentation & NIST Engineering Statistics Handbook (Section 1.3.5.17)",
  },
  "step-topic-gap-skill-docker-core": {
    step_id: "step-topic-gap-skill-docker-core",
    topic_id: "topic-gap-skill-docker-core",
    title: "Multi-Stage Dockerfile Construction & Layer Optimization",
    learning_objective: "Construct a multi-stage Dockerfile that discards build toolchains and runs under an unprivileged user.",
    why_this_matters: "Production cloud deployments demand minimal container image size and defense-in-depth isolation. Monolithic Docker images leak build tools (compilers, package managers) and run as root by default, introducing critical vulnerability exposure and slow container startup times.",
    what_is_it: "Multi-stage Docker builds use multiple FROM directives in a single Dockerfile. An intermediate builder stage compiles source code, installs dependencies, and generates static wheels. The final production stage starts from a minimal, unprivileged base image (e.g., python:3.12-slim or distroless), copying only required runtime artifacts and discarding all compiler toolchains.",
    why_and_when: "Use multi-stage builds whenever deploying containerized web services, microservices, or batch workers to container registries (Docker Hub, AWS ECR, GCP Artifact Registry) where pull latency, storage costs, and CIS benchmark compliance are required.",
    worked_example: {
      title: "Hardened Multi-Stage Dockerfile for Python / FastAPI",
      explanation: "Separates compilation dependencies from runtime artifacts and enforces unprivileged UID 10001 execution with container healthchecks:",
      code: `# Stage 1: Build & wheels compilation stage
FROM python:3.12-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \\
    build-essential gcc libpq-dev \\
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Hardened runtime stage
FROM python:3.12-slim AS runner

WORKDIR /app

# Create unprivileged system group and user (UID 10001)
RUN groupadd -g 10001 appgroup && \\
    useradd -u 10001 -g appgroup -s /bin/false appuser && \\
    apt-get update && apt-get install -y --no-install-recommends \\
    libpq5 curl \\
    && rm -rf /var/lib/apt/lists/*

# Copy installed python dependencies from builder
COPY --from=builder /root/.local /home/appuser/.local
COPY --chown=appuser:appgroup src/ /app/src/

ENV PATH=/home/appuser/.local/bin:$PATH \\
    PYTHONUNBUFFERED=1 \\
    PYTHONDONTWRITEBYTECODE=1

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]`,
      visual_note: "Image size drops from 850MB to 110MB with zero compiler binaries present in the shipping artifact.",
    },
    common_mistakes: [
      "Running containers as default root (UID 0), granting potential container breakouts host root permissions",
      "Placing 'COPY . .' before dependency installation, invalidating Docker's layer cache on every code change",
      "Omitting a .dockerignore file, accidentally baking .git history, credentials, or node_modules into the image",
      "Leaving build compilers (gcc, make) inside the shipping runtime image",
    ],
    implementation_steps: [
      "1. Create a minimal .dockerignore excluding .git, __pycache__, .env, and local test files",
      "2. Define the builder stage with FROM ... AS builder and install build dependencies into ~/.local",
      "3. Define the final runtime stage with FROM ... AS runner and create a dedicated non-root user (UID 10001)",
      "4. Copy only the compiled dependencies using COPY --from=builder",
      "5. Configure explicit HEALTHCHECK and EXPOSE directives and activate USER appuser before CMD",
    ],
    knowledge_check: [
      {
        question: "Why should dependency manifests (requirements.txt) be copied and installed before copying application source code in a Dockerfile?",
        options: [
          "To maximize layer cache hits so package re-installation is skipped when only source code edits occur",
          "Because pip requires code to exist before installing dependencies",
          "To compress the image archive during export",
          "Because Linux kernels require sequential file writes",
        ],
        correct_index: 0,
        explanation: "Docker caches instructions sequentially. If requirements.txt has not changed, Docker reuses the existing cached layer, speeding up CI builds from minutes to seconds.",
      },
      {
        question: "What security risk is mitigated by specifying an explicit non-root USER in production Dockerfiles?",
        options: [
          "Container escape exploits from escalating to host-level root control",
          "Network packet sniffing on local bridge networks",
          "Database deadlock conditions during batch transactions",
          "DNS spoofing during external API calls",
        ],
        correct_index: 0,
        explanation: "Running as an unprivileged user ensures that even if an attacker achieves remote code execution within the container, they cannot modify host root files or escape namespace boundaries as UID 0.",
      },
    ],
    source_attribution: "Docker Official Best Practices Guide & CIS Docker Benchmark v1.6.0",
  },
  "step-topic-gap-skill-docker-compose": {
    step_id: "step-topic-gap-skill-docker-compose",
    topic_id: "topic-gap-skill-docker-compose",
    title: "Docker Compose Multi-Container Orchestration",
    learning_objective: "Define declarative service topologies with condition-based depends_on and isolated networks.",
    why_this_matters: "Modern architectures rely on multiple coordinated containers (API, Database, Cache). Manual container linking causes race conditions on startup and insecure host port exposure.",
    what_is_it: "Docker Compose is a declarative specification (compose.yaml) defining multi-container environments with isolated bridge networks, named persistent storage volumes, and service startup healthcheck dependencies.",
    why_and_when: "Use Docker Compose for local microservice development, CI integration testing, and single-host production deployments.",
    worked_example: {
      title: "Coordinated Web, PostgreSQL & Redis Topology with Healthchecks",
      explanation: "Uses depends_on condition: service_healthy to prevent connection crashes on cold boots:",
      code: `services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://app:secret@db:5432/appdb
      - REDIS_URL=redis://cache:6379/0
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_healthy
    networks:
      - backend-net

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=appdb
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d appdb"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - backend-net

  cache:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - backend-net

volumes:
  pgdata:

networks:
  backend-net:
    driver: bridge`,
      visual_note: "The web application waits until the PostgreSQL database and Redis pass their readiness probes.",
    },
    common_mistakes: [
      "Using plain depends_on without healthcheck conditions, causing the web app to crash before PostgreSQL is initialized",
      "Binding internal database ports to 0.0.0.0 on public interfaces",
      "Omitting named persistent volumes for database containers",
    ],
    implementation_steps: [
      "1. Define service declarations for all stack components",
      "2. Implement robust healthcheck directives using database CLI utilities",
      "3. Use depends_on with condition: service_healthy",
      "4. Isolate inter-service traffic on a user-defined bridge network",
    ],
    knowledge_check: [
      {
        question: "Why is 'condition: service_healthy' necessary when specifying depends_on for a database service in Docker Compose?",
        options: [
          "Because a database container reports 'running' before the database daemon is ready to accept socket connections",
          "Because Docker Compose does not support databases without it",
          "To force Docker to download the image again",
          "It is only required for legacy MySQL databases",
        ],
        correct_index: 0,
        explanation: "Container runtime startup is instantaneous, but database initialization and WAL replay take several seconds. Healthchecks verify the service is truly listening for connections.",
      },
    ],
    source_attribution: "Docker Compose Specification & CNCF Cloud Native Reference Guide",
  },
  "step-topic-fastapi-routes": {
    step_id: "step-topic-fastapi-routes",
    topic_id: "topic-fastapi-routes",
    title: "FastAPI Route Handlers & Status Codes",
    learning_objective: "Build RESTful route handlers with explicit response models and status codes.",
    why_this_matters: "APIs lacking explicit status codes and response schemas leak internal models and violate standard HTTP REST semantics.",
    what_is_it: "FastAPI is a modern, high-performance web framework for building APIs with Python 3.8+ based on standard Python type hints and Pydantic schema validation.",
    why_and_when: "Use FastAPI route handlers with explicit status codes and response models when building robust microservice interfaces and public developer APIs.",
    worked_example: {
      title: "Typed RESTful Resource Creation Handler",
      explanation: "Enforces 201 Created on insertion and validates duplicate conflict states:",
      code: `from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, EmailStr

router = APIRouter(prefix="/users", tags=["Users"])

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate):
    if payload.email == "exists@example.com":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists."
        )
    return UserResponse(id="usr_123", email=payload.email, full_name=payload.full_name)`,
      visual_note: "Automatically documents schema, status codes, and error models in OpenAPI docs.",
    },
    common_mistakes: [
      "Returning 200 OK for POST creation endpoints instead of 201 CREATED",
      "Catching exceptions and returning dicts instead of raising typed HTTPException",
      "Omitting response_model, allowing password hashes or internal fields to leak",
    ],
    implementation_steps: [
      "1. Define typed request and response Pydantic models",
      "2. Annotate route with @router.post and status_code=201",
      "3. Raise HTTPException with explicit status codes for validation failures",
      "4. Return schema-conforming dictionary or Pydantic instance",
    ],
    knowledge_check: [
      {
        question: "What is the primary role of the response_model parameter in FastAPI route decorators?",
        options: [
          "To filter and serialize output data, preventing unauthorized model fields from leaking to clients",
          "To encrypt the response payload with AES-256",
          "To speed up network round-trips by disabling TCP handshakes",
          "To convert Python objects into CSV format",
        ],
        correct_index: 0,
        explanation: "response_model filters the returned data through the Pydantic schema, ensuring internal database columns or sensitive fields are not serialized.",
      },
    ],
    source_attribution: "FastAPI Documentation (Response Model & Status Codes)",
  },
};

export const INITIAL_RESOURCES: LearningResource[] = [
  // API Integration & Messaging
  {
    id: "res-api-01",
    title: "Building Resilient REST APIs with Exponential Backoff and Retries",
    resource_type: "article",
    provider: "DEV.to",
    duration_minutes: 15,
    difficulty: "Intermediate",
    domain_id: "gap-skill-api-integration",
    topic_id: "topic-http-resilience",
    learning_objective: "Implement an idempotent HTTP client with jittered exponential retry loops.",
    relevance_score: 95,
    selection_explanation: "Essential architectural patterns for resilient API consumers and microservice communication.",
    concepts_covered: ["Exponential backoff", "Jitter", "Idempotency keys", "HTTP 429 & 503"],
    concepts_not_covered: [],
    roadmap_position: "Step 1 in API Integration",
    url: "https://dev.to/aws-builders/resilient-api-design-patterns-4flk",
  },
  {
    id: "res-api-02",
    title: "Event-Driven Architecture & Message Queues with RabbitMQ and Kafka",
    resource_type: "video",
    provider: "YouTube",
    duration_minutes: 28,
    difficulty: "Advanced",
    domain_id: "gap-skill-api-integration",
    topic_id: "topic-message-queues",
    learning_objective: "Build resilient producer-consumer pipelines with DLQ fallback.",
    relevance_score: 92,
    selection_explanation: "Visual walkthrough of dead-letter queues, at-least-once delivery semantics, and consumer rebalancing.",
    concepts_covered: ["Dead-letter queues", "Pub/Sub", "Message acknowledgment"],
    concepts_not_covered: [],
    roadmap_position: "Step 2 in API Integration",
    url: "https://www.youtube.com/watch?v=oUJbuFMyBDk",
  },
  {
    id: "res-api-03",
    title: "Secure Webhook Ingestion & HMAC SHA256 Signature Verification",
    resource_type: "article",
    provider: "FreeCodeCamp",
    duration_minutes: 20,
    difficulty: "Intermediate",
    domain_id: "gap-skill-api-integration",
    topic_id: "topic-webhook-ingestion",
    learning_objective: "Verify webhook authenticity and process payloads asynchronously.",
    relevance_score: 90,
    selection_explanation: "Practical guide to webhook payload authenticity verification and replay attack prevention.",
    concepts_covered: ["HMAC SHA-256", "Timing attack prevention", "Webhook retries"],
    concepts_not_covered: [],
    roadmap_position: "Step 2 in API Integration",
    url: "https://www.freecodecamp.org/news/what-are-webhooks-and-how-to-use-them/",
  },

  // FastAPI Web Framework
  {
    id: "res-fastapi-01",
    title: "Python FastAPI Tutorial: Build a REST API in 15 Minutes",
    resource_type: "video",
    provider: "YouTube",
    duration_minutes: 20,
    difficulty: "Beginner",
    domain_id: "gap-skill-fastapi",
    topic_id: "topic-fastapi-routes",
    learning_objective: "Build RESTful route handlers with explicit response models and status codes.",
    relevance_score: 96,
    selection_explanation: "Clear, production-focused tutorial covering route definitions, Pydantic schemas, and Swagger docs.",
    concepts_covered: ["FastAPI routing", "Path & query params", "Automatic OpenAPI docs"],
    concepts_not_covered: [],
    roadmap_position: "Step 1 in FastAPI Framework",
    url: "https://www.youtube.com/watch?v=iWS9ogMPOI0",
  },
  {
    id: "res-fastapi-02",
    title: "FastAPI Dependency Injection & Database Sessions with Depends()",
    resource_type: "official_docs",
    provider: "FastAPI Official Docs",
    duration_minutes: 25,
    difficulty: "Intermediate",
    domain_id: "gap-skill-fastapi",
    topic_id: "topic-fastapi-depends",
    learning_objective: "Implement hierarchical dependency injection with yield generators.",
    relevance_score: 98,
    selection_explanation: "Comprehensive reference on yielding generators for atomic database sessions and clean cleanup.",
    concepts_covered: ["Depends()", "Yield dependencies", "Context managers", "OAuth2 schemes"],
    concepts_not_covered: [],
    roadmap_position: "Step 2 in FastAPI Framework",
    url: "https://fastapi.tiangolo.com/tutorial/dependencies/",
  },
  {
    id: "res-fastapi-03",
    title: "FastAPI Production Codebase: GitHub Repository Reference",
    resource_type: "tutorial",
    provider: "GitHub",
    duration_minutes: 30,
    difficulty: "Advanced",
    domain_id: "gap-skill-fastapi",
    topic_id: "topic-fastapi-testing",
    learning_objective: "Write automated test suites for FastAPI routes using Pytest fixtures.",
    relevance_score: 94,
    selection_explanation: "Official open source framework repository with 100k+ stars demonstrating standard test fixture patterns.",
    concepts_covered: ["TestClient", "Pytest fixtures", "Async tests"],
    concepts_not_covered: [],
    roadmap_position: "Step 3 in FastAPI Framework",
    url: "https://github.com/fastapi/fastapi",
  },

  // Distributed System Architecture
  {
    id: "res-arch-01",
    title: "Consistent Hashing Explained with Interactive Visualizations",
    resource_type: "article",
    provider: "DEV.to",
    duration_minutes: 20,
    difficulty: "Advanced",
    domain_id: "gap-skill-system-architecture",
    topic_id: "topic-consistent-hashing",
    learning_objective: "Construct a distributed hash ring with virtual node replication.",
    relevance_score: 96,
    selection_explanation: "Deep dive into hash rings, virtual nodes, and minimal cache churn during horizontal node scaling.",
    concepts_covered: ["Hash rings", "Virtual nodes", "Data partitioning", "Chord DHT"],
    concepts_not_covered: [],
    roadmap_position: "Step 1 in Distributed Architecture",
    url: "https://dev.to/coderbyte/a-guide-to-consistent-hashing-4d0g",
  },

  // Data Preprocessing (Existing)
  {
    id: "res-yt-iqr-outliers",
    title: "Interquartile Range (IQR) Outlier Detection with Python & Boxplots",
    resource_type: "video",
    provider: "YouTube (freeCodeCamp.org)",
    duration_minutes: 18,
    difficulty: "Intermediate",
    domain_id: "domain-data-preprocessing",
    topic_id: "topic-outlier-iqr",
    learning_objective: "Calculate Q1, Q3, and 1.5x IQR boundaries to isolate anomalous observations.",
    relevance_score: 95,
    selection_explanation: "Verified visual walkthrough explaining distribution spreads and robust outlier boundaries.",
    concepts_covered: ["Quartiles", "IQR formula", "Boxplot bounds", "Pandas quantile"],
    concepts_not_covered: ["Multivariate Mahalanobis distances"],
    roadmap_position: "Step 1 in Outlier Handling Module",
    url: "https://www.youtube.com/watch?v=A3gClkblXK8",
    thumbnail_url: "https://img.youtube.com/vi/A3gClkblXK8/hqdefault.jpg",
    author_or_channel: "freeCodeCamp.org",
    validation_status: "verified_available",
  },
  {
    id: "res-yt-missing-imputation",
    title: "Handling Missing Values: Mean vs Median vs KNN Imputation in Scikit-Learn",
    resource_type: "video",
    provider: "YouTube (StatQuest with Josh Starmer)",
    duration_minutes: 12,
    difficulty: "Intermediate",
    domain_id: "domain-data-preprocessing",
    topic_id: "topic-missing-values",
    learning_objective: "Implement KNN and median imputation strategies to eliminate data sparsity.",
    relevance_score: 94,
    selection_explanation: "Clear statistical guide on choosing between simple imputation and nearest-neighbor interpolation.",
    concepts_covered: ["KNN Imputer", "SimpleImputer", "Missingness mechanisms (MCAR/MAR)"],
    concepts_not_covered: ["Matrix factorization"],
    roadmap_position: "Step 2 in Missing Values Module",
    url: "https://www.youtube.com/watch?v=m_KAaS9F4eU",
    thumbnail_url: "https://img.youtube.com/vi/m_KAaS9F4eU/hqdefault.jpg",
    author_or_channel: "StatQuest with Josh Starmer",
    validation_status: "verified_available",
  },
  {
    id: "res-yt-pipeline-leakage",
    title: "Build Clean, Data-Leak-Proof ML Pipelines in Scikit-Learn | Tutorial",
    resource_type: "video",
    provider: "YouTube (Dimension Zero - SS)",
    duration_minutes: 14,
    difficulty: "Advanced",
    domain_id: "domain-data-preprocessing",
    topic_id: "topic-pipeline-leakage",
    learning_objective: "Build end-to-end ColumnTransformer pipelines with zero data leakage.",
    relevance_score: 96,
    selection_explanation: "Preventing cross-validation contamination by encapsulating transformations strictly inside pipeline folds.",
    concepts_covered: ["Pipeline", "ColumnTransformer", "Cross-validation folds", "Data leakage prevention"],
    concepts_not_covered: ["Distributed streaming transforms"],
    roadmap_position: "Step 3 in Production Pipeline Module",
    url: "https://www.youtube.com/watch?v=zm-uHpIZF6c",
    thumbnail_url: "https://img.youtube.com/vi/zm-uHpIZF6c/hqdefault.jpg",
    author_or_channel: "Dimension Zero - SS",
    validation_status: "verified_available",
  },
  {
    id: "res-yt-feature-scaling",
    title: "Feature Scaling and Normalization in Python - StandardScaler vs RobustScaler",
    resource_type: "video",
    provider: "YouTube (StatQuest with Josh Starmer)",
    duration_minutes: 15,
    difficulty: "Intermediate",
    domain_id: "domain-data-preprocessing",
    topic_id: "topic-feature-scaling",
    learning_objective: "Select appropriate feature scaling strategies based on distribution skewness.",
    relevance_score: 94,
    selection_explanation: "Comparing z-score standardization, min-max scaling, and outlier-resistant robust scaling.",
    concepts_covered: ["StandardScaler", "RobustScaler", "MinMaxScaler", "Distribution skewness"],
    concepts_not_covered: ["Quantile transformation"],
    roadmap_position: "Step 4 in Normalization Module",
    url: "https://www.youtube.com/watch?v=02fAiLw23lE",
    thumbnail_url: "https://img.youtube.com/vi/02fAiLw23lE/hqdefault.jpg",
    author_or_channel: "StatQuest with Josh Starmer",
    validation_status: "verified_available",
  },
  {
    id: "res-yt-categorical-encoding",
    title: "Categorical Encoding in Python: One-Hot, Ordinal & Target Encoding",
    resource_type: "video",
    provider: "YouTube (Keith Galli)",
    duration_minutes: 14,
    difficulty: "Intermediate",
    domain_id: "domain-data-preprocessing",
    topic_id: "topic-categorical-encoding",
    learning_objective: "Convert discrete textual features into numeric tensors without high-cardinality explosion.",
    relevance_score: 93,
    selection_explanation: "Tutorial covering OneHotEncoder, OrdinalEncoder, and TargetEncoder with smoothing.",
    concepts_covered: ["One-hot encoding", "Target encoding", "Curse of dimensionality", "Category encodings"],
    concepts_not_covered: ["Entity embeddings"],
    roadmap_position: "Step 5 in Feature Engineering Module",
    url: "https://www.youtube.com/watch?v=68ABAU_V8qI",
    thumbnail_url: "https://img.youtube.com/vi/68ABAU_V8qI/hqdefault.jpg",
    author_or_channel: "Keith Galli",
    validation_status: "verified_available",
  },
  {
    id: "res-yt-sql-indexing",
    title: "PostgreSQL Indexing Deep Dive: B-Tree vs GIN Index Selection",
    resource_type: "video",
    provider: "YouTube (Hussein Nasser)",
    duration_minutes: 25,
    difficulty: "Advanced",
    domain_id: "domain-data-preprocessing",
    topic_id: "topic-sql-indexing",
    learning_objective: "Choose optimal index structures to eliminate sequential table scans.",
    relevance_score: 97,
    selection_explanation: "Understanding index-only scans, composite order, and JSONB gin_trgm indexing in relational engines.",
    concepts_covered: ["B-Tree", "GIN index", "Index-only scan", "Query planner explain analyze"],
    concepts_not_covered: ["BRIN indexing"],
    roadmap_position: "Step 6 in Database Performance Module",
    url: "https://www.youtube.com/watch?v=clvir_bKipA",
    thumbnail_url: "https://img.youtube.com/vi/clvir_bKipA/hqdefault.jpg",
    author_or_channel: "Hussein Nasser",
    validation_status: "verified_available",
  },
  {
    id: "res-topic-outlier-winsorization-01",
    title: "Handling Outliers with Winsorization and Trimming in Python",
    resource_type: "article",
    provider: "Real Python",
    duration_minutes: 18,
    difficulty: "Intermediate",
    domain_id: "domain-data-preprocessing",
    topic_id: "topic-outlier-winsorization",
    learning_objective: "Implement percentile-based outlier capping using Python and pandas.",
    relevance_score: 96,
    selection_explanation:
      "Highly specific to your diagnosed gap in percentile capping. Demonstrates scipy.stats.mstats.winsorize and pandas clip implementations.",
    concepts_covered: ["Percentile selection", "Pandas clip()", "Preserving degrees of freedom"],
    concepts_not_covered: ["Multivariate Mahalanobis distances"],
    roadmap_position: "Step 2 in Outlier Handling Module",
    url: "https://realpython.com/pandas-outliers/",
  },
  {
    id: "res-topic-outlier-winsorization-02",
    title: "Data Preprocessing for Machine Learning: Robust Statistics & Capping",
    resource_type: "video",
    provider: "DeepLearning.AI",
    duration_minutes: 24,
    difficulty: "Intermediate",
    domain_id: "domain-data-preprocessing",
    topic_id: "topic-outlier-winsorization",
    learning_objective: "Implement percentile-based outlier capping using Python and pandas.",
    relevance_score: 92,
    selection_explanation:
      "Visual walkthrough explaining how linear regression weights are destabilized by high leverage points and how capping restores parameter stability.",
    concepts_covered: ["Leverage points", "Cost function sensitivity", "Pipeline integration"],
    concepts_not_covered: ["Deep autoencoder anomaly detection"],
    roadmap_position: "Step 2 in Outlier Handling Module",
    url: "https://www.youtube.com/watch?v=A3gClkblXK8",
  },
  {
    id: "res-topic-outlier-iqr-01",
    title: "Tukey Boxplots and Interquartile Range Filtering",
    resource_type: "official_docs",
    provider: "Scikit-Learn Guide",
    duration_minutes: 15,
    difficulty: "Beginner",
    domain_id: "domain-data-preprocessing",
    topic_id: "topic-outlier-iqr",
    learning_objective: "Calculate Q1, Q3, and 1.5x IQR boundaries to isolate anomalous observations.",
    relevance_score: 88,
    selection_explanation:
      "Foundational prerequisite for understanding distribution spreads before attempting Winsorization.",
    concepts_covered: ["Quartiles", "IQR formula", "Boxplot bounds"],
    concepts_not_covered: ["Parametric normal assumptions"],
    roadmap_position: "Step 1 in Outlier Handling Module",
    url: "https://scikit-learn.org/stable/modules/preprocessing.html#robust-scaling",
  },
];

export const INITIAL_PRACTICE_EXERCISES: PracticeExercise[] = [
  // API Integration & Messaging
  {
    id: "prac-api-idempotency-01",
    topic_id: "topic-http-resilience",
    domain_id: "gap-skill-api-integration",
    title: "Idempotent Webhook Request Handler with Deduplication",
    difficulty: "Intermediate",
    estimated_minutes: 20,
    learning_objective: "Implement an idempotent HTTP client with jittered exponential retry loops.",
    format: "code_completion",
    prompt:
      "Complete the `process_idempotent_event` handler to verify if an event's `event_id` has already been processed within the last 3600 seconds. Return cached result if already seen, otherwise process and atomically record the key.",
    starter_code: `async def process_idempotent_event(redis_client, event_id: str, payload: dict) -> dict:
    # 1. Check if event_id already exists as processed key
    # 2. If already processed, return status: 'duplicate_ignored'
    # 3. Else, mark key with TTL=3600 and return status: 'processed'
    exists = await redis_client.get(f"evt:{event_id}")
    if exists:
        return {"status": "duplicate_ignored", "event_id": event_id}
    await redis_client.setex(f"evt:{event_id}", 3600, "1")
    return {"status": "processed", "event_id": event_id}`,
    solution_explanation:
      "Idempotency keys prevent duplicate execution when network drops cause upstream clients to retry HTTP POST payloads.",
    completed: false,
  },
  {
    id: "prac-api-backoff-01",
    topic_id: "topic-http-resilience",
    domain_id: "gap-skill-api-integration",
    title: "Exponential Backoff with Full Jitter",
    difficulty: "Intermediate",
    estimated_minutes: 15,
    learning_objective: "Implement an idempotent HTTP client with jittered exponential retry loops.",
    format: "applied_scenario",
    prompt:
      "A downstream payment API rate-limits clients during peak load (HTTP 429). Implement the delay calculation for attempt `i` using exponential backoff with full randomized jitter to prevent the thundering herd problem.",
    starter_code: `import random

def calculate_jittered_delay(attempt: int, base_delay: float = 0.5, max_delay: float = 30.0) -> float:
    # Calculate exponential ceiling: min(max_delay, base_delay * (2 ** attempt))
    # Full jitter selects uniform random between 0 and exponential ceiling
    ceiling = min(max_delay, base_delay * (2 ** attempt))
    return random.uniform(0, ceiling)`,
    solution_explanation:
      "Full jitter spreads retry traffic uniformly across the retry window, preventing synchronized traffic spikes that overwhelm recovering services.",
    completed: true,
    score: 95,
  },

  // FastAPI Web Framework
  {
    id: "prac-fastapi-depends-01",
    topic_id: "topic-fastapi-depends",
    domain_id: "gap-skill-fastapi",
    title: "Database Session Injection with Depends() and Yield",
    difficulty: "Intermediate",
    estimated_minutes: 15,
    learning_objective: "Implement hierarchical dependency injection with yield generators.",
    format: "code_completion",
    prompt:
      "Implement the `get_db_session` dependency generator using Python's `yield` statement. Ensure the database session is closed in a `finally` block even if the request raises an exception.",
    starter_code: `from fastapi import Depends
from sqlalchemy.orm import Session

def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()`,
    solution_explanation:
      "FastAPI's dependency injection runs code after `yield` as exit teardown, guaranteeing connection pool exhaustion is prevented.",
    completed: false,
  },
  {
    id: "prac-fastapi-pydantic-01",
    topic_id: "topic-pydantic-schemas",
    domain_id: "gap-skill-fastapi",
    title: "Pydantic v2 Schema with Field Constraints & Validators",
    difficulty: "Beginner",
    estimated_minutes: 15,
    learning_objective: "Enforce request payload contracts with Pydantic v2 validators.",
    format: "code_completion",
    prompt:
      "Define a Pydantic `UserRegistrationRequest` model with an email string, username (min length 3, max length 30), and password (min length 8).",
    starter_code: `from pydantic import BaseModel, EmailStr, Field

class UserRegistrationRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=8)`,
    solution_explanation:
      "Pydantic v2 enforces schema validation prior to route handler execution, generating RFC 7807 422 Unprocessable Entity responses for malformed bodies.",
    completed: false,
  },
  {
    id: "prac-fastapi-testclient-01",
    topic_id: "topic-fastapi-testing",
    domain_id: "gap-skill-fastapi",
    title: "Route Integration Testing with TestClient",
    difficulty: "Intermediate",
    estimated_minutes: 18,
    learning_objective: "Write automated test suites for FastAPI routes using Pytest fixtures.",
    format: "applied_scenario",
    prompt:
      "Write a pytest function `test_create_item_success` using FastAPI's `TestClient` to verify that `POST /api/v1/items` returns HTTP 201 with the created object's title.",
    starter_code: `def test_create_item_success(client):
    payload = {"title": "Production Server", "priority": "high"}
    response = client.post("/api/v1/items", json=payload)
    assert response.status_code == 201
    assert response.json()["title"] == "Production Server"`,
    solution_explanation:
      "FastAPI TestClient leverages Starlette and HTTPX under the hood, running requests in-process without binding external sockets.",
    completed: true,
    score: 100,
  },

  // Distributed System Architecture
  {
    id: "prac-arch-consistent-hashing-01",
    topic_id: "topic-consistent-hashing",
    domain_id: "gap-skill-system-architecture",
    title: "Consistent Hash Ring with Virtual Node Lookup",
    difficulty: "Advanced",
    estimated_minutes: 25,
    learning_objective: "Construct a distributed hash ring with virtual node replication.",
    format: "code_completion",
    prompt:
      "Complete `get_node_for_key` on the `ConsistentHashRing` to find the next clock-wise server in the sorted ring using binary search (`bisect`).",
    starter_code: `import bisect

class ConsistentHashRing:
    def __init__(self, nodes: list, vnodes: int = 100):
        self.ring = []
        self.vnode_map = {}
        for node in nodes:
            for i in range(vnodes):
                h = hash(f"{node}#vnode{i}")
                self.ring.append(h)
                self.vnode_map[h] = node
        self.ring.sort()

    def get_node(self, key: str) -> str:
        if not self.ring:
            return None
        k_hash = hash(key)
        idx = bisect.bisect_right(self.ring, k_hash)
        if idx == len(self.ring):
            idx = 0
        return self.vnode_map[self.ring[idx]]`,
    solution_explanation:
      "Consistent hashing ensures that adding or removing a cache node only relocates K/N keys rather than invalidating the entire cluster.",
    completed: false,
  },

  // Existing Data Preprocessing exercises
  {
    id: "prac-topic-outlier-winsorization-01",
    topic_id: "topic-outlier-winsorization",
    domain_id: "domain-data-preprocessing",
    title: "Vectorized Outlier Capping with pandas .clip()",
    difficulty: "Intermediate",
    estimated_minutes: 15,
    learning_objective: "Implement percentile-based outlier capping using Python and pandas.",
    format: "code_completion",
    prompt:
      "Complete the function `cap_percentiles` to cap all elements in `df['sensor_reading']` below the 5th percentile and above the 95th percentile using vectorized `.clip()`.",
    starter_code: `def cap_percentiles(df: pd.DataFrame, col: str) -> pd.DataFrame:
    # 1. Calculate lower (0.05) and upper (0.95) quantiles
    # 2. Clip column values in-place and return the updated DataFrame
    q_low = df[col].quantile(0.05)
    q_high = df[col].quantile(0.95)
    df[col] = df[col].clip(lower=q_low, upper=q_high)
    return df`,
    solution_explanation:
      "Vectorized clipping with .clip(lower, upper) executes in Cython, avoiding costly Python row-by-row lambda iterations. It enforces strict bounds while preserving original index integrity.",
    completed: false,
  },
  {
    id: "prac-topic-outlier-iqr-01",
    topic_id: "topic-outlier-iqr",
    domain_id: "domain-data-preprocessing",
    title: "Tukey IQR Bound Calculation & Anomaly Mask",
    difficulty: "Beginner",
    estimated_minutes: 12,
    learning_objective: "Calculate Q1, Q3, and 1.5x IQR boundaries to isolate anomalous observations.",
    format: "applied_scenario",
    prompt:
      "You are auditing credit card transaction values with Q1=$25.00, Q3=$125.00. Write the logic to determine the Tukey upper fence and generate an outlier boolean mask.",
    starter_code: `def calculate_tukey_mask(s: pd.Series) -> pd.Series:
    # Calculate IQR and upper bound (Q3 + 1.5 * IQR)
    q1 = s.quantile(0.25)
    q3 = s.quantile(0.75)
    iqr = q3 - q1
    upper_fence = q3 + 1.5 * iqr
    lower_fence = q1 - 1.5 * iqr
    return (s < lower_fence) | (s > upper_fence)`,
    solution_explanation:
      "The 1.5x multiplier corresponds to ~99.3% coverage under an ideal Gaussian distribution. Observations outside these fences represent candidate anomalies requiring domain review.",
    completed: true,
    score: 95,
  },
  {
    id: "prac-topic-scaling-robust-01",
    topic_id: "topic-scaling-robust",
    domain_id: "domain-data-preprocessing",
    title: "Custom RobustScaler Transformer Implementation",
    difficulty: "Intermediate",
    estimated_minutes: 20,
    learning_objective: "Utilize RobustScaler on datasets with unresolved anomalies.",
    format: "code_completion",
    prompt:
      "Implement a custom transformer class that computes the median and IQR during `.fit()` and centers/scales numeric features during `.transform()`.",
    starter_code: `from sklearn.base import BaseEstimator, TransformerMixin

class CustomMedianIQR(BaseEstimator, TransformerMixin):
    def fit(self, X, y=None):
        self.median_ = np.median(X, axis=0)
        self.iqr_ = np.percentile(X, 75, axis=0) - np.percentile(X, 25, axis=0)
        # Avoid zero division
        self.iqr_[self.iqr_ == 0] = 1.0
        return self

    def transform(self, X):
        return (X - self.median_) / self.iqr_`,
    solution_explanation:
      "Fitting strictly stores learned medians and IQRs. Applying those fixed parameters in transform guarantees that test folds or production requests do not bias normalization statistics.",
    completed: false,
  },
  {
    id: "prac-topic-pipeline-leakage-01",
    topic_id: "topic-pipeline-leakage",
    domain_id: "domain-data-preprocessing",
    title: "Data Leakage Spotting in Model Cross-Validation",
    difficulty: "Advanced",
    estimated_minutes: 18,
    learning_objective: "Build end-to-end ColumnTransformer and Pipeline classes with zero test set leakage.",
    format: "error_identification",
    prompt:
      "Identify the critical flaw in this workflow:\n\n```python\nX_scaled = StandardScaler().fit_transform(X)\nscores = cross_val_score(model, X_scaled, y, cv=5)\n```",
    starter_code: `# Explain the exact line causing data leakage and provide the fix using sklearn Pipeline
# Flaw: StandardScaler was fit on the full X before CV splits were generated.
from sklearn.pipeline import Pipeline
leak_free_pipe = Pipeline([
    ('scaler', StandardScaler()),
    ('model', model)
])
scores = cross_val_score(leak_free_pipe, X, y, cv=5)`,
    solution_explanation:
      "Fitting a scaler before cross-validation allows validation test fold statistics (mean and variance) to influence the transform, artificially inflating cross-validation performance metrics.",
    completed: false,
  },
  {
    id: "prac-topic-encoding-onehot-01",
    topic_id: "topic-encoding-onehot",
    domain_id: "domain-data-preprocessing",
    title: "High-Cardinality Target Encoding Strategy",
    difficulty: "Intermediate",
    estimated_minutes: 15,
    learning_objective: "Balance curse-of-dimensionality against target leakage using empirical Bayes smoothing.",
    format: "multiple_choice",
    prompt:
      "When replacing 5,000 postal codes with target mean encoding in a churn prediction model, how do you prevent severe target leakage and overfitting on small categories?",
    options: [
      "Use One-Hot Encoding instead and ignore dimensionality",
      "Apply out-of-fold target calculation combined with empirical Bayes m-estimate smoothing toward the global mean",
      "Sort postal codes alphabetically and map to integers 1 to 5000",
      "Remove all postal code records with fewer than 100 observations",
    ],
    correct_index: 1,
    solution_explanation:
      "Out-of-fold calculation prevents the current row's label from influencing its own feature representation, while m-estimate smoothing anchors small sample counts to the prior global mean.",
    completed: false,
  },
];

export const INITIAL_KNOWLEDGE_ASSESSMENT: KnowledgeAssessment = {
  id: "assessment-domain-data-preprocessing",
  domain_id: "domain-data-preprocessing",
  title: "Data Preprocessing Mastery Evaluation",
  time_limit_minutes: 25,
  passing_threshold: 75,
  questions: [
    {
      id: "ass-q1",
      text: "When capping outliers using a 1st/99th percentile Winsorization rule on training data, how should production inference outliers be handled?",
      topic_id: "topic-outlier-winsorization",
      category: "application",
      options: [
        "Recompute quantiles dynamically on each single incoming production request",
        "Clip inference inputs using the static thresholds pre-calculated on the training fold",
        "Throw a runtime exception and reject the payload",
        "Default the input value to 0.0",
      ],
      correct_index: 1,
      explanation: "Production inference must use the static threshold values learned during training to maintain pipeline determinism and prevent test-time distribution shift.",
    },
    {
      id: "ass-q2",
      text: "Why does RobustScaler divide centered data by the Interquartile Range (Q3 - Q1) instead of the standard deviation?",
      topic_id: "topic-scaling-robust",
      category: "concept",
      options: [
        "The standard deviation is quadratic, while IQR is linear",
        "IQR is based on percentiles (order statistics) and is resilient to arbitrary extreme magnitudes in the tails",
        "Dividing by standard deviation always results in negative values",
        "Scikit-learn cannot compute standard deviation on sparse matrices",
      ],
      correct_index: 1,
      explanation: "Order statistics like percentiles and medians have a 50% breakdown point, meaning up to 50% of the sample can be arbitrarily corrupted before the median breaks down.",
    },
    {
      id: "ass-q3",
      text: "What is the consequence of applying One-Hot Encoding to a categorical feature with 10,000 distinct unique postal codes?",
      topic_id: "topic-encoding-onehot",
      category: "concept",
      options: [
        "Extreme memory expansion, high dimensional sparsity, and potential tree partition starvation",
        "The estimator automatically converges 10x faster",
        "No consequence; modern algorithms ignore feature dimensionality",
        "Target values become corrupted",
      ],
      correct_index: 0,
      explanation: "High cardinality one-hot encoding creates extreme sparsity, massive matrix memory overhead, and dilutes tree split gains across thousands of binary columns.",
    },
    {
      id: "ass-q4",
      text: "Which Scikit-Learn class allows different preprocessing pipelines to be applied to distinct subsets of columns (e.g. numeric vs categorical)?",
      topic_id: "topic-pipeline-leakage",
      category: "application",
      options: [
        "ColumnTransformer",
        "FeatureUnion",
        "SelectKBest",
        "GridSearchCV",
      ],
      correct_index: 0,
      explanation: "ColumnTransformer routes specified column subsets to specific transformers (e.g. RobustScaler on floats, OneHotEncoder on strings) within a unified pipeline.",
    },
    {
      id: "ass-q5",
      text: "A telemetry dataset features a right-skewed response time distribution where 99% of requests complete in <200ms, but hardware timeouts reach 120,000ms. Which transformation preserves model ranking without discarding valid latency spikes?",
      topic_id: "topic-outlier-winsorization",
      category: "application",
      options: [
        "Hard row deletion of all rows > 200ms",
        "Logarithmic or Box-Cox power transform combined with upper 99.5% Winsorization",
        "Zero-filling missing timestamps",
        "StandardScaler with mean subtraction",
      ],
      correct_index: 1,
      explanation: "Log transforms compress exponentially spanning scales into additive intervals, and mild Winsorization bounds catastrophic timeout artifacts while retaining critical service load signals.",
    },
    {
      id: "ass-q6",
      text: "Why must imputer parameters (e.g., SimpleImputer strategy='median') never be fitted on the entire dataset prior to creating cross-validation folds?",
      topic_id: "topic-pipeline-leakage",
      category: "concept",
      options: [
        "Because Scikit-Learn will raise an immediate TypeError",
        "Because the test split medians bleed into the training folds, artificially deflating generalization error estimates",
        "Because SimpleImputer requires GPU memory to fit full batches",
        "Because medians cannot be computed across multi-core systems",
      ],
      correct_index: 1,
      explanation: "Information leakage occurs when any statistical parameter calculated using the validation/test set influences training preprocessing transforms, providing artificially optimistic test metrics.",
    },
  ],
};

export const INITIAL_MINI_PROJECT: MiniProject = {
  id: "proj-relational-indexing",
  title: "PostgreSQL Schema Indexing & Query Plan Optimization",
  domain_id: "gap-046377b2-6953-4aba-99e0-a8164be7e97d",
  problem_statement:
    "Design and build an automated Python preprocessing module that ingests uncleaned industrial telemetry data, detects severe sensor anomalies, compares IQR versus Winsorization capping, and outputs a clean, leakage-free Scikit-Learn transformer.",
  relevance_to_gap:
    "Directly targets your diagnosed gap in Outlier Handling and Pipeline Architecture. Submitting this project creates candidate evidence that can be submitted to the Verification Center.",
  objectives: [
    "Load sample sensor telemetry dataset with extreme anomalous spikes",
    "Calculate and visualize Tukey IQR fences and percentile distributions",
    "Implement Winsorization capping using vectorized pandas routines",
    "Package the transformation as a custom Scikit-Learn BaseEstimator and TransformerMixin",
    "Provide automated unit tests verifying that zero rows are dropped and bounds are respected",
  ],
  required_steps: [
    "Step 1: Ingest `sensor_telemetry.csv` containing flow rate, temperature, and pressure readings.",
    "Step 2: Plot distribution histograms before treatment to inspect tail behavior.",
    "Step 3: Compare row-dropping (trimming) vs percentile capping (1st/99th percentiles).",
    "Step 4: Encapsulate the chosen treatment inside a custom `PercentileCapper` class implementing `.fit()` and `.transform()`.",
    "Step 5: Write pytest test cases validating that values outside bounds are capped and input dimensions remain constant.",
  ],
  dataset_description:
    "Sample IoT environmental telemetry dataset containing 50,000 rows with simulated transmission dropouts, electromagnetic spikes (up to 100x mean), and missing timestamps.",
  submission_requirements: [
    "Public or private GitHub repository URL containing the python module",
    "Brief implementation summary describing threshold selection rationale",
    "Proof of pytest test suite execution",
  ],
  rubric: [
    { criterion: "Dataset Handling & EDA", weight_pct: 10, description: "Correct loading, null checks, and shape preservation." },
    { criterion: "Correct Technique Application", weight_pct: 30, description: "Accurate mathematical quantile estimation and vectorized capping." },
    { criterion: "Reasoning & Explanation", weight_pct: 20, description: "Clear architectural rationale justifying Winsorization over deletion." },
    { criterion: "Implementation Quality & Architecture", weight_pct: 20, description: "Modular Scikit-Learn transformer with clean separation of fit/transform." },
    { criterion: "Result Interpretation & Test Coverage", weight_pct: 20, description: "Automated test suite verifying upper/lower boundary enforcement." },
  ],
  status: "not_started",
};

export const INITIAL_REMEDIATION_SESSION: RemediationSession = {
  session_id: "rem-session-01",
  attempt_id: "attempt-prior-failure",
  domain_id: "domain-data-preprocessing",
  failed_score: 52,
  failed_objectives: [
    "Percentile threshold selection under skewed distributions",
    "Vectorized capping with pandas Series.clip()",
  ],
  strong_objectives: [
    "Missing value imputation (Mean/Median)",
    "Duplicate record identification",
  ],
  concept_refresher:
    "In highly skewed distributions (e.g. telemetry spikes), symmetrical 5% capping removes real signal. Using asymmetrical percentiles (e.g., 0.5% lower, 99.5% upper) prevents unnecessary clipping while protecting linear weights.",
  worked_examples: [
    {
      title: "Threshold Calculation Rule",
      explanation: "Calculate the exact quantiles and verify they bound the target column:",
      code: `lower_limit = df['flow_rate'].quantile(0.005)\nupper_limit = df['flow_rate'].quantile(0.995)\ndf['flow_rate'] = df['flow_rate'].clip(lower_limit, upper_limit)`,
    },
  ],
  guided_exercise_id: "prac-topic-outlier-winsorization-01",
  micro_test: [
    {
      question: "If a feature is strictly positive and right-skewed, which percentile boundary is most likely to distort valid signals if set too aggressively?",
      options: ["Lower percentile (e.g. 10%)", "Upper percentile (e.g. 90%)", "Median", "Standard deviation"],
      correct_index: 1,
    },
    {
      question: "Which method prevents data leakage when scaling or capping features?",
      options: [
        "Fit thresholds on the training set only, then apply to test",
        "Fit thresholds on the full dataset before splitting",
        "Re-fit on the test set",
        "Ignore the test set",
      ],
      correct_index: 0,
    },
  ],
  status: "pending",
};

export const INITIAL_LEARNING_HISTORY: LearningHistoryEvent[] = [
  {
    id: "hist-01",
    timestamp: "Yesterday, 14:30",
    type: "diagnostic",
    title: "Completed Data Preprocessing Diagnostic Assessment",
    domain_id: "domain-data-preprocessing",
    detail: "Scored 58% overall. Identified Outlier Handling as highest priority focus area.",
    link_route: "/app/learning/domains/domain-data-preprocessing/diagnostic",
    score: 58,
  },
  {
    id: "hist-02",
    timestamp: "Yesterday, 15:10",
    type: "roadmap_adjusted",
    title: "Personalized Roadmap Generated (v2026.1)",
    domain_id: "domain-data-preprocessing",
    detail: "Roadmap sequenced 7 steps. Prioritized Winsorization and Robust Scaling before advanced pipelines.",
    link_route: "/app/learning/roadmaps/roadmap-domain-data-preprocessing",
  },
  {
    id: "hist-03",
    timestamp: "Today, 09:15",
    type: "step_completed",
    title: "Completed Step: Missing Values & Imputation",
    domain_id: "domain-data-preprocessing",
    topic_id: "topic-missing-values",
    detail: "Demonstrated statistical imputation techniques. Knowledge check passed (100%).",
    link_route: "/app/learning/steps/step-topic-missing-values",
    score: 100,
  },
  {
    id: "hist-04",
    timestamp: "Today, 10:45",
    type: "resource_viewed",
    title: "Viewed: Handling Outliers with Winsorization and Trimming",
    domain_id: "domain-data-preprocessing",
    topic_id: "topic-outlier-winsorization",
    detail: "Completed Real Python guide on pandas clip() implementations.",
    link_route: "/app/learning/resources/res-topic-outlier-winsorization-01",
  },
];

export const INITIAL_CANDIDATE_EVIDENCES: CandidateLearningEvidence[] = [
  {
    artifact_id: "art-initial-01",
    evidence_id: "ev-learning-demo-01",
    title: "Outlier Treatment Pipeline (Draft Module)",
    source_type: "LEARNING_PROJECT",
    domain_id: "domain-data-preprocessing",
    topic_id: "topic-outlier-winsorization",
    related_skill_id: "skill-python",
    project_id: "proj-outlier-pipeline",
    submitted_at: "2026-03-24",
    provenance: "Generated via Domain 5 Learning Mini-Project. Submitted by Alex Rivera.",
    evidence_state: "Candidate Evidence Created",
    verification_notes:
      "Awaiting review in Verification Center. Completing the learning project establishes candidate eligibility but does NOT grant verified skill status without human sign-off.",
  },
];
