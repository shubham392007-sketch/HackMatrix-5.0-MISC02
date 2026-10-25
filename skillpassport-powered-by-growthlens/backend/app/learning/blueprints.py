"""
Canonical Domain Blueprints and Diagnostic Question Bank for Learn & Grow.
"""

from typing import List, Dict, Any

CANONICAL_BLUEPRINTS: List[Dict[str, Any]] = [
    {
        "domain_id": "dist-sys",
        "title": "Distributed Systems & Event Streaming",
        "version": "v1.0",
        "status": "active",
        "description": "Architecting resilient, distributed systems, event-driven streaming with Kafka, fault-tolerant message queues, and consensus protocols.",
        "target_mastery": 85,
        "estimated_hours": 14,
        "learning_objectives": [
            "Design partition-tolerant distributed state machines and consensus loops",
            "Implement high-throughput event streaming pipelines with Apache Kafka",
            "Mitigate partial network partitions and cascading failures using circuit breakers",
        ],
        "modules": [
            {
                "id": "mod-dist-1",
                "title": "Distributed Messaging & Stream Topologies",
                "description": "Partitioning, log offsets, and consumer group rebalancing.",
                "topics": [
                    {
                        "id": "topic-kafka-partitions",
                        "title": "Kafka Partitioning & Ordering Guarantees",
                        "description": "Deep dive into consumer group scaling, partition rebalancing protocols, and key hashing.",
                        "difficulty": "Intermediate",
                        "estimated_minutes": 45,
                        "learning_objective": "Configure partition keys and consumer group protocols for strict message ordering.",
                        "prerequisites": [],
                        "related_skill_id": "5873a582-0487-4035-bf6d-30a06b5a301f",
                        "current_mastery": 0,
                        "target_mastery": 80,
                        "status": "available",
                    },
                    {
                        "id": "topic-eventual-consistency",
                        "title": "Eventual Consistency & Conflict Resolution",
                        "description": "CRDTs, vector clocks, and saga patterns across asynchronous microservices.",
                        "difficulty": "Advanced",
                        "estimated_minutes": 60,
                        "learning_objective": "Implement an asynchronous orchestration saga with compensating transactions.",
                        "prerequisites": ["topic-kafka-partitions"],
                        "related_skill_id": "5873a582-0487-4035-bf6d-30a06b5a301f",
                        "current_mastery": 0,
                        "target_mastery": 85,
                        "status": "locked",
                    },
                ],
            },
            {
                "id": "mod-dist-2",
                "title": "Resilience & Fault Tolerance Patterns",
                "description": "Dead letter queues, idempotent consumer semantics, and backpressure handling.",
                "topics": [
                    {
                        "id": "topic-idempotent-processing",
                        "title": "Idempotent Consumers & Deduplication Strategies",
                        "description": "Handling at-least-once message delivery using distributed lock deduplication.",
                        "difficulty": "Intermediate",
                        "estimated_minutes": 50,
                        "learning_objective": "Construct an idempotent message consumer with atomic deduplication keys.",
                        "prerequisites": ["topic-kafka-partitions"],
                        "related_skill_id": "5873a582-0487-4035-bf6d-30a06b5a301f",
                        "current_mastery": 0,
                        "target_mastery": 80,
                        "status": "locked",
                    }
                ],
            },
        ],
    },
    {
        "domain_id": "data-eng",
        "title": "Relational Data Modeling & PostgreSQL",
        "version": "v1.0",
        "status": "active",
        "description": "Advanced relational schema design, indexing strategies (B-Tree, GIN, BRIN), query optimization, and transaction isolation levels.",
        "target_mastery": 85,
        "estimated_hours": 12,
        "learning_objectives": [
            "Construct normalized schemas with high-efficiency indexing strategies",
            "Diagnose sequential scan bottlenecks and tune multi-column query execution plans",
            "Safeguard ACID guarantees across concurrent isolation levels",
        ],
        "modules": [
            {
                "id": "mod-data-1",
                "title": "PostgreSQL Indexing & Query Execution Plans",
                "description": "EXPLAIN ANALYZE deep dive, composite indexes, and index bloat mitigation.",
                "topics": [
                    {
                        "id": "topic-postgres-explain",
                        "title": "EXPLAIN ANALYZE & Query Optimization",
                        "description": "Interpreting PostgreSQL query planner cost estimates, heap scans, and buffer cache hits.",
                        "difficulty": "Intermediate",
                        "estimated_minutes": 45,
                        "learning_objective": "Eliminate expensive table scans using targeted composite index definitions.",
                        "prerequisites": [],
                        "related_skill_id": "046377b2-6953-4aba-99e0-a8164be7e97d",
                        "current_mastery": 0,
                        "target_mastery": 80,
                        "status": "available",
                    }
                ],
            }
        ],
    },
    {
        "domain_id": "cloud-infra",
        "title": "Cloud Infrastructure & DevOps",
        "version": "v1.0",
        "status": "active",
        "description": "Container orchestration, CI/CD pipelines, Infrastructure as Code with Terraform, and observability.",
        "target_mastery": 80,
        "estimated_hours": 10,
        "learning_objectives": [
            "Provision immutable cloud infrastructure using declarative Terraform patterns",
            "Deploy and scale resilient container workloads on Kubernetes",
            "Establish continuous automated deployment gates with canary verification",
        ],
        "modules": [
            {
                "id": "mod-cloud-1",
                "title": "Kubernetes Orchestration & Ingress",
                "description": "Pod lifecycles, readiness probes, service meshes, and autoscaling.",
                "topics": [
                    {
                        "id": "topic-k8s-probes",
                        "title": "Kubernetes Health Checks & Zero-Downtime Deployments",
                        "description": "Configuring liveness, readiness, and startup probes to avoid traffic blackholing.",
                        "difficulty": "Intermediate",
                        "estimated_minutes": 40,
                        "learning_objective": "Configure rolling update strategies with deterministic readiness probes.",
                        "prerequisites": [],
                        "related_skill_id": "024e9309-ac90-4451-8a0d-054aa3e49b3d",
                        "current_mastery": 0,
                        "target_mastery": 80,
                        "status": "available",
                    }
                ],
            }
        ],
    },
    {
        "domain_id": "domain-data-preprocessing",
        "title": "Data Preprocessing & Feature Engineering",
        "version": "v1.0",
        "status": "active",
        "description": "Core data quality, missingness imputation, outlier handling, robust scaling, categorical encoding, and leakage prevention in production ML systems.",
        "target_mastery": 85,
        "estimated_hours": 18,
        "learning_objectives": [
            "Diagnose and impute missing values using statistical and model-based strategies",
            "Detect and cap multivariate outliers using IQR, Z-scores, and Winsorization",
            "Apply Robust and Standard scaling without inducing target leakage",
            "Encapsulate transformations into reproducible Scikit-Learn pipelines",
        ],
        "modules": [
            {
                "id": "mod-cleaning",
                "title": "Data Cleaning & Missing Value Imputation",
                "description": "Statistical imputation, missingness mechanisms (MCAR, MAR, MNAR), and deduplication.",
                "topics": [
                    {
                        "id": "topic-missing-values",
                        "title": "Missing Values & Imputation",
                        "description": "Identifying MCAR, MAR, MNAR and applying mean, median, KNN, and iterative imputation.",
                        "difficulty": "Beginner",
                        "estimated_minutes": 45,
                        "learning_objective": "Implement statistical and model-based missing value imputation in pandas.",
                        "prerequisites": [],
                        "related_skill_id": "skill-python",
                        "current_mastery": 0,
                        "target_mastery": 85,
                        "status": "available",
                    },
                    {
                        "id": "topic-duplicate-records",
                        "title": "Duplicate Records & Deduplication",
                        "description": "Exact vs fuzzy match deduplication across relational tables.",
                        "difficulty": "Beginner",
                        "estimated_minutes": 30,
                        "learning_objective": "Detect and resolve redundant entity records while preserving lineage.",
                        "prerequisites": ["topic-missing-values"],
                        "related_skill_id": "skill-python",
                        "current_mastery": 0,
                        "target_mastery": 85,
                        "status": "locked",
                    },
                ],
            },
            {
                "id": "mod-outliers",
                "title": "Outlier Handling & Robust Statistics",
                "description": "Distribution inspection, IQR bounds, Z-score limits, and percentile capping.",
                "topics": [
                    {
                        "id": "topic-outlier-iqr",
                        "title": "Interquartile Range (IQR) Bounds",
                        "description": "Boxplot statistics, quartile calculations, and fence filtering.",
                        "difficulty": "Intermediate",
                        "estimated_minutes": 45,
                        "learning_objective": "Calculate Q1, Q3, and 1.5x IQR boundaries to isolate anomalous observations.",
                        "prerequisites": ["topic-missing-values"],
                        "related_skill_id": "skill-machine-learning",
                        "current_mastery": 0,
                        "target_mastery": 85,
                        "status": "available",
                    },
                    {
                        "id": "topic-outlier-winsorization",
                        "title": "Winsorization & Percentile Capping",
                        "description": "Replacing extreme tail values with predefined percentiles instead of dropping rows.",
                        "difficulty": "Intermediate",
                        "estimated_minutes": 60,
                        "learning_objective": "Implement percentile-based outlier capping using Python and pandas.",
                        "prerequisites": ["topic-outlier-iqr"],
                        "related_skill_id": "skill-python",
                        "current_mastery": 0,
                        "target_mastery": 85,
                        "status": "available",
                    },
                ],
            },
            {
                "id": "mod-validation",
                "title": "Pipeline Encapsulation & Leakage Prevention",
                "description": "Preventing cross-validation train/test leakage with ColumnTransformer and Pipeline.",
                "topics": [
                    {
                        "id": "topic-pipeline-leakage",
                        "title": "Data Leakage Prevention using Scikit-Learn Pipelines",
                        "description": "Preventing test data contamination across cross-validation folds.",
                        "difficulty": "Advanced",
                        "estimated_minutes": 50,
                        "learning_objective": "Build end-to-end ColumnTransformer pipelines with zero data leakage.",
                        "prerequisites": ["topic-outlier-iqr"],
                        "related_skill_id": "skill-data-preprocessing",
                        "current_mastery": 0,
                        "target_mastery": 85,
                        "status": "available",
                    }
                ],
            },
        ],
    },
]

# ──────────────────────────────────────────────────────────────────────────────
# CAREER INTELLIGENCE DYNAMIC GAP BLUEPRINTS
# Directly aligns Learn & Grow domains to verified career skill gaps
# ──────────────────────────────────────────────────────────────────────────────

CAREER_GAP_BLUEPRINTS: Dict[str, Dict[str, Any]] = {
    "gap-skill-api-integration": {
        "domain_id": "gap-skill-api-integration",
        "title": "API Integration & Messaging",
        "version": "v2026.1-TARGET-GAP",
        "status": "active",
        "description": "Designing and integrating robust APIs, event streaming, webhook ingestion, rate-limiting, and resilient messaging architectures.",
        "target_mastery": 85,
        "estimated_hours": 16,
        "learning_objectives": [
            "Construct idempotent HTTP API consumers with exponential backoff and jitter",
            "Implement event-driven asynchronous messaging patterns with message queues",
            "Design robust webhook ingestion pipelines with cryptographic signature validation",
            "Handle distributed partial network failures using circuit breakers",
        ],
        "modules": [
            {
                "id": "mod-api-1",
                "title": "REST & HTTP Client Engineering",
                "description": "HTTP semantics, connection pooling, and retry policies.",
                "topics": [
                    {
                        "id": "topic-http-resilience",
                        "title": "Exponential Backoff & Idempotency",
                        "description": "Handling transient network errors and duplicate HTTP submissions with Idempotency-Key headers.",
                        "difficulty": "Intermediate",
                        "estimated_minutes": 45,
                        "learning_objective": "Implement an idempotent HTTP client with jittered exponential retry loops.",
                        "prerequisites": [],
                        "related_skill_id": "skill-api-integration",
                        "current_mastery": 0,
                        "target_mastery": 85,
                        "status": "available",
                    },
                    {
                        "id": "topic-webhook-ingestion",
                        "title": "Webhook Ingestion & Signature Verification",
                        "description": "HMAC SHA-256 signature validation and asynchronous event dispatching.",
                        "difficulty": "Intermediate",
                        "estimated_minutes": 40,
                        "learning_objective": "Verify webhook authenticity and process payloads asynchronously.",
                        "prerequisites": ["topic-http-resilience"],
                        "related_skill_id": "skill-api-integration",
                        "current_mastery": 0,
                        "target_mastery": 85,
                        "status": "available",
                    },
                ],
            },
            {
                "id": "mod-api-2",
                "title": "Event-Driven Messaging & Queues",
                "description": "Message brokers, at-least-once delivery, and dead-letter queues.",
                "topics": [
                    {
                        "id": "topic-message-queues",
                        "title": "Message Broker Patterns & Dead-Letter Queues",
                        "description": "Designing persistent message queues with dead-letter queue routing for failed messages.",
                        "difficulty": "Advanced",
                        "estimated_minutes": 55,
                        "learning_objective": "Build resilient producer-consumer pipelines with DLQ fallback.",
                        "prerequisites": ["topic-http-resilience"],
                        "related_skill_id": "skill-api-integration",
                        "current_mastery": 0,
                        "target_mastery": 85,
                        "status": "available",
                    },
                ],
            },
        ],
    },
    "gap-skill-fastapi": {
        "domain_id": "gap-skill-fastapi",
        "title": "FastAPI Web Framework",
        "version": "v2026.1-TARGET-GAP",
        "status": "active",
        "description": "Production API engineering with FastAPI, Pydantic schemas, dependency injection, async concurrency, and automated testing.",
        "target_mastery": 80,
        "estimated_hours": 14,
        "learning_objectives": [
            "Design robust asynchronous RESTful endpoints with FastAPI and Starlette",
            "Implement reusable request validation and authentication with Depends()",
            "Enforce strict schema validation and data serialization using Pydantic v2",
            "Write integration tests with Pytest and FastAPI TestClient",
        ],
        "modules": [
            {
                "id": "mod-fastapi-1",
                "title": "Core Routing & Pydantic Validation",
                "description": "Path parameters, query parameters, request bodies, and Pydantic models.",
                "topics": [
                    {
                        "id": "topic-fastapi-routes",
                        "title": "FastAPI Route Handlers & Status Codes",
                        "description": "Configuring typed route signatures, query parameters, and HTTP response codes.",
                        "difficulty": "Beginner",
                        "estimated_minutes": 40,
                        "learning_objective": "Build RESTful route handlers with explicit response models and status codes.",
                        "prerequisites": [],
                        "related_skill_id": "skill-fastapi",
                        "current_mastery": 0,
                        "target_mastery": 80,
                        "status": "available",
                    },
                    {
                        "id": "topic-pydantic-schemas",
                        "title": "Pydantic v2 Schemas & Data Constraints",
                        "description": "Defining input validation rules, Field constraints, and nested schemas.",
                        "difficulty": "Intermediate",
                        "estimated_minutes": 45,
                        "learning_objective": "Enforce request payload contracts with Pydantic v2 validators.",
                        "prerequisites": ["topic-fastapi-routes"],
                        "related_skill_id": "skill-fastapi",
                        "current_mastery": 0,
                        "target_mastery": 80,
                        "status": "available",
                    },
                ],
            },
            {
                "id": "mod-fastapi-2",
                "title": "Dependency Injection & Middleware",
                "description": "Reusable dependencies, security schemes, and middleware.",
                "topics": [
                    {
                        "id": "topic-fastapi-depends",
                        "title": "Depends() & Database Session Injection",
                        "description": "Injecting database sessions, configuration objects, and authentication credentials.",
                        "difficulty": "Intermediate",
                        "estimated_minutes": 50,
                        "learning_objective": "Implement hierarchical dependency injection with yield generators.",
                        "prerequisites": ["topic-fastapi-routes"],
                        "related_skill_id": "skill-fastapi",
                        "current_mastery": 0,
                        "target_mastery": 80,
                        "status": "available",
                    },
                    {
                        "id": "topic-fastapi-testing",
                        "title": "Integration Testing with TestClient",
                        "description": "Testing asynchronous endpoints, overriding dependencies, and verifying JSON responses.",
                        "difficulty": "Intermediate",
                        "estimated_minutes": 45,
                        "learning_objective": "Write automated test suites for FastAPI routes using Pytest fixtures.",
                        "prerequisites": ["topic-fastapi-depends"],
                        "related_skill_id": "skill-fastapi",
                        "current_mastery": 0,
                        "target_mastery": 80,
                        "status": "available",
                    },
                ],
            },
        ],
    },
    "gap-skill-machine-learning": {
        "domain_id": "gap-skill-machine-learning",
        "title": "Machine Learning (Supervised)",
        "version": "v2026.1-TARGET-GAP",
        "status": "active",
        "description": "Supervised machine learning algorithms, model training pipelines, cross-validation, hyperparameter tuning, and metric evaluation.",
        "target_mastery": 85,
        "estimated_hours": 18,
        "learning_objectives": [
            "Train and optimize supervised regression and classification models",
            "Implement rigorous cross-validation without data leakage",
            "Tune gradient boosting hyperparameters (learning rate, depth, regularization)",
            "Benchmark models using ROC-AUC, PR-AUC, F1-score, and calibration curves",
        ],
        "modules": [
            {
                "id": "mod-ml-1",
                "title": "Supervised Estimators & Loss Optimization",
                "description": "Loss functions, gradient descent, and regularization.",
                "topics": [
                    {
                        "id": "topic-loss-regularization",
                        "title": "Loss Functions & Regularization (L1/L2)",
                        "description": "MSE, Binary Cross-Entropy, and preventing overfitting with Ridge and Lasso penalties.",
                        "difficulty": "Intermediate",
                        "estimated_minutes": 50,
                        "learning_objective": "Select and optimize loss functions with appropriate regularization.",
                        "prerequisites": [],
                        "related_skill_id": "skill-machine-learning",
                        "current_mastery": 0,
                        "target_mastery": 85,
                        "status": "available",
                    },
                    {
                        "id": "topic-tree-ensembles",
                        "title": "Tree Ensembles & Gradient Boosting",
                        "description": "Random Forests, XGBoost, and LightGBM architectures.",
                        "difficulty": "Intermediate",
                        "estimated_minutes": 60,
                        "learning_objective": "Train and tune XGBoost models with early stopping.",
                        "prerequisites": ["topic-loss-regularization"],
                        "related_skill_id": "skill-machine-learning",
                        "current_mastery": 0,
                        "target_mastery": 85,
                        "status": "available",
                    },
                ],
            },
            {
                "id": "mod-ml-2",
                "title": "Model Evaluation & Diagnostics",
                "description": "Cross-validation, bias-variance analysis, and ROC-AUC metrics.",
                "topics": [
                    {
                        "id": "topic-cv-leakage-prevention",
                        "title": "Cross-Validation & Metric Diagnostics",
                        "description": "Stratified K-fold cross-validation and evaluation across precision-recall curves.",
                        "difficulty": "Advanced",
                        "estimated_minutes": 55,
                        "learning_objective": "Diagnose model generalization using cross-validated learning curves.",
                        "prerequisites": ["topic-tree-ensembles"],
                        "related_skill_id": "skill-machine-learning",
                        "current_mastery": 0,
                        "target_mastery": 85,
                        "status": "available",
                    },
                ],
            },
        ],
    },
    "gap-skill-system-architecture": {
        "domain_id": "gap-skill-system-architecture",
        "title": "Distributed System Architecture",
        "version": "v2026.1-TARGET-GAP",
        "status": "active",
        "description": "Designing high-scale, partition-tolerant distributed architectures, consensus protocols, horizontal sharding, and resilience patterns.",
        "target_mastery": 85,
        "estimated_hours": 16,
        "learning_objectives": [
            "Evaluate architectural trade-offs using CAP theorem and PACELC principles",
            "Design horizontal sharding topologies with consistent hashing",
            "Implement leader election and consensus mechanisms",
            "Architect zero-downtime distributed failover strategies",
        ],
        "modules": [
            {
                "id": "mod-arch-1",
                "title": "Distributed State & Consensus",
                "description": "Partition tolerance, leader election, and consensus protocols.",
                "topics": [
                    {
                        "id": "topic-cap-tradeoffs",
                        "title": "CAP & PACELC Architectural Trade-offs",
                        "description": "Analyzing consistency vs latency and availability across distributed service boundaries.",
                        "difficulty": "Intermediate",
                        "estimated_minutes": 45,
                        "learning_objective": "Formulate architecture design RFCs balancing consistency and availability.",
                        "prerequisites": [],
                        "related_skill_id": "skill-system-architecture",
                        "current_mastery": 0,
                        "target_mastery": 85,
                        "status": "available",
                    },
                    {
                        "id": "topic-consistent-hashing",
                        "title": "Consistent Hashing & Partitioning Topologies",
                        "description": "Virtual node distribution and minimal key relocation during cluster scaling.",
                        "difficulty": "Advanced",
                        "estimated_minutes": 55,
                        "learning_objective": "Construct a distributed hash ring with virtual node replication.",
                        "prerequisites": ["topic-cap-tradeoffs"],
                        "related_skill_id": "skill-system-architecture",
                        "current_mastery": 0,
                        "target_mastery": 85,
                        "status": "available",
                    },
                ],
            },
        ],
    },
    "gap-skill-docker": {
        "domain_id": "gap-skill-docker",
        "title": "Docker Containerization & Production Workflows",
        "version": "v2026.1-TARGET-GAP",
        "status": "active",
        "description": "Production container engineering: writing minimal multi-stage Dockerfiles, optimizing layer caching, securing containers with non-root privileges, managing volume persistence, and orchestrating multi-container services with Docker Compose.",
        "target_mastery": 85,
        "estimated_hours": 14,
        "learning_objectives": [
            "Author secure, minimal multi-stage Dockerfiles utilizing slim base images and non-root execution",
            "Optimize Docker build cache hit ratios via .dockerignore and deterministic dependency ordering",
            "Configure isolated container networking topologies and bridge network interfaces",
            "Orchestrate multi-service applications using Docker Compose with declarative healthchecks and volume mounts",
        ],
        "modules": [
            {
                "id": "mod-docker-1",
                "title": "Multi-Stage Builds & Container Security",
                "description": "Constructing lean, hardened container images ready for production deployment.",
                "topics": [
                    {
                        "id": "topic-gap-skill-docker-core",
                        "title": "Multi-Stage Dockerfile Construction & Layer Optimization",
                        "description": "Separating compilation dependencies from runtime artifacts to minimize attack surface and image size.",
                        "difficulty": "Intermediate",
                        "estimated_minutes": 45,
                        "learning_objective": "Construct a multi-stage Dockerfile that discards build toolchains and runs under an unprivileged user.",
                        "prerequisites": [],
                        "related_skill_id": "skill-docker",
                        "current_mastery": 0,
                        "target_mastery": 85,
                        "status": "available",
                    },
                    {
                        "id": "topic-docker-layer-caching",
                        "title": "Layer Caching Strategies & .dockerignore Best Practices",
                        "description": "Structuring instructions to maximize cache reuse during continuous integration pipelines.",
                        "difficulty": "Intermediate",
                        "estimated_minutes": 40,
                        "learning_objective": "Prevent cache invalidation by isolating dependency manifests from application source code.",
                        "prerequisites": ["topic-gap-skill-docker-core"],
                        "related_skill_id": "skill-docker",
                        "current_mastery": 0,
                        "target_mastery": 85,
                        "status": "available",
                    },
                ],
            },
            {
                "id": "mod-docker-2",
                "title": "Docker Compose Orchestration & Storage",
                "description": "Multi-service environment configuration, volume lifecycle, and service discovery.",
                "topics": [
                    {
                        "id": "topic-gap-skill-docker-compose",
                        "title": "Docker Compose Multi-Container Orchestration",
                        "description": "Coordinating web services, relational databases, and background workers with healthchecks and dependencies.",
                        "difficulty": "Advanced",
                        "estimated_minutes": 50,
                        "learning_objective": "Define declarative service topologies with condition-based depends_on and isolated networks.",
                        "prerequisites": ["topic-gap-skill-docker-core"],
                        "related_skill_id": "skill-docker",
                        "current_mastery": 0,
                        "target_mastery": 85,
                        "status": "available",
                    },
                ],
            },
        ],
    },
    "gap-skill-postgresql": {
        "domain_id": "gap-skill-postgresql",
        "title": "PostgreSQL & Relational Data Engineering",
        "version": "v2026.1-TARGET-GAP",
        "status": "active",
        "description": "Advanced relational engineering with PostgreSQL: ACID transaction semantics, MVCC concurrency, index design (B-tree, GIN), query plan analysis, and connection pooling.",
        "target_mastery": 85,
        "estimated_hours": 16,
        "learning_objectives": [
            "Analyze and resolve transaction concurrency anomalies across standard isolation levels",
            "Design optimal B-Tree and GIN indexing strategies for high-throughput relational queries",
            "Profile and optimize slow queries using EXPLAIN (ANALYZE, BUFFERS)",
            "Configure connection pooling and connection limits for production resilience",
        ],
        "modules": [
            {
                "id": "mod-postgres-1",
                "title": "Transaction Isolation & Indexing Topologies",
                "description": "Concurrency safety, deadlocks, and high-performance indexing.",
                "topics": [
                    {
                        "id": "topic-sql-indexing",
                        "title": "B-Tree vs GIN Index Selection & Covering Indexes",
                        "description": "Selecting optimal index types for equality, range, and JSONB containment filters.",
                        "difficulty": "Intermediate",
                        "estimated_minutes": 45,
                        "learning_objective": "Eliminate sequential table scans on multi-million row tables using covering indexes.",
                        "prerequisites": [],
                        "related_skill_id": "skill-postgresql",
                        "current_mastery": 0,
                        "target_mastery": 85,
                        "status": "available",
                    },
                    {
                        "id": "topic-acid-isolation",
                        "title": "ACID Isolation Levels & MVCC Concurrency",
                        "description": "Preventing dirty reads, non-repeatable reads, and serialization anomalies under high load.",
                        "difficulty": "Advanced",
                        "estimated_minutes": 55,
                        "learning_objective": "Implement safe optimistic and pessimistic locking protocols preventing double-write hazards.",
                        "prerequisites": ["topic-sql-indexing"],
                        "related_skill_id": "skill-postgresql",
                        "current_mastery": 0,
                        "target_mastery": 85,
                        "status": "available",
                    },
                ],
            },
        ],
    },
    "gap-skill-cloud-devops": {
        "domain_id": "gap-skill-cloud-devops",
        "title": "Cloud Infrastructure & DevOps CI/CD",
        "version": "v2026.1-TARGET-GAP",
        "status": "active",
        "description": "Production DevOps automation: Infrastructure as Code, CI/CD pipeline design, secret management, and distributed telemetry with Prometheus and OpenTelemetry.",
        "target_mastery": 85,
        "estimated_hours": 15,
        "learning_objectives": [
            "Construct declarative CI/CD delivery pipelines with automated testing and security gates",
            "Manage infrastructure state and immutable deployments with IaC tooling",
            "Implement secret rotation and zero-trust credential distribution",
            "Instrument distributed services with Prometheus metrics and structured JSON logging",
        ],
        "modules": [
            {
                "id": "mod-devops-1",
                "title": "Continuous Delivery & Pipeline Automation",
                "description": "Automated build-test-deploy lifecycles with security scans.",
                "topics": [
                    {
                        "id": "topic-cicd-pipelines",
                        "title": "Automated CI/CD Delivery & Release Gates",
                        "description": "Building continuous integration workflows that enforce static analysis, unit tests, and artifact signing.",
                        "difficulty": "Intermediate",
                        "estimated_minutes": 50,
                        "learning_objective": "Configure an end-to-end delivery pipeline that halts deployment on test regression or security alert.",
                        "prerequisites": [],
                        "related_skill_id": "skill-cloud-devops",
                        "current_mastery": 0,
                        "target_mastery": 85,
                        "status": "available",
                    },
                ],
            },
        ],
    },
    "gap-skill-appsec": {
        "domain_id": "gap-skill-appsec",
        "title": "Application Security & OWASP Defense",
        "version": "v2026.1-TARGET-GAP",
        "status": "active",
        "description": "Defensive application engineering: asymmetric cryptographic token validation (RS256 JWT), role-based access control (RBAC), SQL/SSRF injection defense, and rate-limiting middleware.",
        "target_mastery": 85,
        "estimated_hours": 14,
        "learning_objectives": [
            "Validate asymmetric RS256 JWT signatures and enforce fine-grained scope claims",
            "Implement defensive sanitization guarding against OWASP Top 10 vulnerabilities",
            "Deploy Redis token-bucket rate limiting to mitigate denial of service attacks",
            "Audit application endpoints for Server-Side Request Forgery (SSRF) risks",
        ],
        "modules": [
            {
                "id": "mod-appsec-1",
                "title": "Cryptographic Authentication & Scope Enforcement",
                "description": "Asymmetric token validation, claims verification, and defense-in-depth.",
                "topics": [
                    {
                        "id": "topic-jwt-security",
                        "title": "Asymmetric JWT Validation & Scope Verification",
                        "description": "Validating RS256 signed public key certificates, checking expiration, issuer, and claim entitlements.",
                        "difficulty": "Intermediate",
                        "estimated_minutes": 45,
                        "learning_objective": "Write a secure JWT validation middleware rejecting unsigned tokens and revoked signing algorithms.",
                        "prerequisites": [],
                        "related_skill_id": "skill-appsec",
                        "current_mastery": 0,
                        "target_mastery": 85,
                        "status": "available",
                    },
                ],
            },
        ],
    },
}


def synthesize_gap_blueprint(
    skill_id: str,
    canonical_name: str,
    expected_level: str = "Practitioner",
    diagnosis: str = "",
) -> Dict[str, Any]:
    """
    Returns a pre-authored blueprint if known, or deterministically synthesizes
    a high-quality DomainBlueprint with 2 modules and 4 topics for any skill gap.
    """
    clean_id = skill_id.lower().replace(" ", "-")
    domain_id = clean_id if clean_id.startswith("gap-") else f"gap-{clean_id}"

    if domain_id in CAREER_GAP_BLUEPRINTS:
        return CAREER_GAP_BLUEPRINTS[domain_id]

    # Check by raw skill ID without prefix
    for gid, bp in CAREER_GAP_BLUEPRINTS.items():
        if gid.replace("gap-", "") == clean_id.replace("gap-", ""):
            return bp

    # Domain alias normalization checking both ID and canonical name
    id_lower = clean_id.lower()
    name_lower = (canonical_name or "").lower()

    def matches(*keys):
        return any(k in id_lower or k in name_lower for k in keys)

    matched_bp = None
    if matches("docker", "container", "containerization"):
        matched_bp = CAREER_GAP_BLUEPRINTS["gap-skill-docker"]
    elif matches("postgres", "postgresql", "sql", "relational", "rdbms", "database"):
        matched_bp = CAREER_GAP_BLUEPRINTS["gap-skill-postgresql"]
    elif matches("fastapi", "asgi", "starlette"):
        matched_bp = CAREER_GAP_BLUEPRINTS["gap-skill-fastapi"]
    elif matches("api-integration", "rest-client", "http-resilience", "microservice", "api integration"):
        matched_bp = CAREER_GAP_BLUEPRINTS["gap-skill-api-integration"]
    elif matches("system-architecture", "distributed", "consensus", "partitioning", "system architecture"):
        matched_bp = CAREER_GAP_BLUEPRINTS["gap-skill-system-architecture"]
    elif matches("machine-learning", "machine learning", "scikit", "xgboost", "model-training", "deep learning"):
        matched_bp = CAREER_GAP_BLUEPRINTS["gap-skill-machine-learning"]
    elif matches("cloud", "devops", "aws", "infrastructure", "ci-cd", "kubernetes"):
        matched_bp = CAREER_GAP_BLUEPRINTS["gap-skill-cloud-devops"]
    elif matches("appsec", "security", "owasp", "oauth", "jwt"):
        matched_bp = CAREER_GAP_BLUEPRINTS["gap-skill-appsec"]

    if matched_bp:
        res = dict(matched_bp)
        res["domain_id"] = domain_id
        if canonical_name:
            res["title"] = canonical_name
        return res

    # Deterministic synthesis for custom or arbitrary skills
    target_mastery = 85 if expected_level in ("Practitioner", "Advanced", "Expert") else 75
    clean_title = canonical_name or skill_id.replace("skill-", "").replace("gap-", "").replace("-", " ").title()

    return {
        "domain_id": domain_id,
        "title": clean_title,
        "version": "v2026.1-TARGET-GAP",
        "status": "active",
        "description": diagnosis or f"Targeted skill remediation for {clean_title} to achieve {expected_level} proficiency in production environments.",
        "target_mastery": target_mastery,
        "estimated_hours": 14,
        "learning_objectives": [
            f"Deconstruct core primitives, lifecycle management, and architectural boundaries in {clean_title}",
            f"Implement production-grade code patterns, error handling, and performance optimization for {clean_title}",
            f"Design end-to-end integration workflows and automated test suites validating {clean_title}",
            f"Audit failure scenarios, security boundaries, and telemetry instrumentation for {clean_title}",
        ],
        "modules": [
            {
                "id": f"mod-{clean_id}-1",
                "title": f"1. Foundations & Implementation Patterns",
                "description": f"Core syntax, API contracts, and practical implementations in {clean_title}.",
                "topics": [
                    {
                        "id": f"topic-{clean_id}-core",
                        "title": f"Core Principles & Implementation in {clean_title}",
                        "description": f"Essential patterns, idioms, and standard library conventions for {clean_title}.",
                        "difficulty": "Beginner",
                        "estimated_minutes": 45,
                        "learning_objective": f"Demonstrate foundational working knowledge of {clean_title}.",
                        "prerequisites": [],
                        "related_skill_id": skill_id,
                        "current_mastery": 0,
                        "target_mastery": target_mastery,
                        "status": "available",
                    },
                    {
                        "id": f"topic-{clean_id}-applied",
                        "title": f"Applied Engineering Patterns in {clean_title}",
                        "description": f"Practical architecture, error handling, and robust typing for {clean_title}.",
                        "difficulty": "Intermediate",
                        "estimated_minutes": 50,
                        "learning_objective": f"Construct reliable, maintainable modules using {clean_title}.",
                        "prerequisites": [f"topic-{clean_id}-core"],
                        "related_skill_id": skill_id,
                        "current_mastery": 0,
                        "target_mastery": target_mastery,
                        "status": "available",
                    },
                ],
            },
            {
                "id": f"mod-{clean_id}-2",
                "title": f"2. Production Optimization & Testing",
                "description": f"Scalability, performance tuning, and automated verification in {clean_title}.",
                "topics": [
                    {
                        "id": f"topic-{clean_id}-adv",
                        "title": f"Advanced Diagnostics & Optimization in {clean_title}",
                        "description": f"Benchmarking, throughput optimization, and edge-case mitigation in {clean_title}.",
                        "difficulty": "Advanced",
                        "estimated_minutes": 60,
                        "learning_objective": f"Optimize execution performance and diagnose failure modes in {clean_title}.",
                        "prerequisites": [f"topic-{clean_id}-applied"],
                        "related_skill_id": skill_id,
                        "current_mastery": 0,
                        "target_mastery": target_mastery,
                        "status": "available",
                    },
                ],
            },
        ],
    }


def get_user_augmented_blueprints(
    db: Any = None,
    user: Any = None,
) -> List[Dict[str, Any]]:
    """
    Returns an integrated list of domain blueprints:
    1. Prioritizes the user's active career skill gaps from their active target role.
    2. Includes any domains for which the user has generated an active LearningRoadmap.
    3. Follows with the canonical baseline blueprints.
    Guarantees no duplicate domain_id entries.
    """
    augmented: List[Dict[str, Any]] = []
    seen_ids: set[str] = set()

    # 1. Inspect user's active career target role and gaps
    if db is not None and user is not None:
        try:
            import uuid
            from backend.app.learning.upstream_adapter import CareerIntelligenceDbAdapter
            from backend.app.models.learning import LearningRoadmap

            adapter = CareerIntelligenceDbAdapter()
            owner_uuid = uuid.UUID(str(user.id))

            # Fetch active target role triggers
            triggers = adapter.fetch_upstream_triggers(db, str(owner_uuid))
            for t in triggers:
                gap_bp = synthesize_gap_blueprint(
                    skill_id=t.competency.canonical_skill_id,
                    canonical_name=t.competency.canonical_name,
                    expected_level=t.capability.target_proficiency_level.value if hasattr(t.capability.target_proficiency_level, "value") else str(t.capability.target_proficiency_level),
                    diagnosis=t.gap_diagnosis,
                )
                if gap_bp["domain_id"] not in seen_ids:
                    seen_ids.add(gap_bp["domain_id"])
                    augmented.append(gap_bp)

            # Also check existing user roadmaps in the database
            roadmaps = (
                db.query(LearningRoadmap)
                .filter(LearningRoadmap.owner_user_id == owner_uuid)
                .all()
            )
            for rm in roadmaps:
                if rm.domain_id and rm.domain_id not in seen_ids:
                    seen_ids.add(rm.domain_id)
                    # Create blueprint from roadmap metadata
                    bp = synthesize_gap_blueprint(
                        skill_id=rm.domain_id,
                        canonical_name=rm.domain_title or rm.domain_id,
                    )
                    augmented.append(bp)
        except Exception:
            pass

    # If no career gaps were loaded from DB, provide pre-authored career gap blueprints
    if not augmented:
        for gid, bp in CAREER_GAP_BLUEPRINTS.items():
            if gid not in seen_ids:
                seen_ids.add(gid)
                augmented.append(bp)

    # 2. Append canonical blueprints (avoiding duplicates)
    for cbp in CANONICAL_BLUEPRINTS:
        if cbp["domain_id"] not in seen_ids:
            seen_ids.add(cbp["domain_id"])
            augmented.append(cbp)

    return augmented


CANONICAL_DIAGNOSTICS: Dict[str, List[Dict[str, Any]]] = {
    "dist-sys": [
        {
            "id": "diag-dist-1",
            "domain_id": "dist-sys",
            "module_id": "mod-dist-1",
            "topic_id": "topic-kafka-partitions",
            "category": "concept",
            "question_text": "In Apache Kafka, what determines the ordering guarantees of messages consumed by a single consumer group?",
            "options": [
                "Messages are globally ordered across all topics and partitions",
                "Messages are strictly ordered only within a specific partition; messages across different partitions can be processed out of order",
                "Messages are ordered based on producer timestamp regardless of partition",
                "Kafka provides zero ordering guarantees; ordering must be resolved client-side",
            ],
            "correct_index": 1,
            "explanation": "Kafka provides strict total ordering within a single partition, but does not guarantee global ordering across multiple partitions in a topic.",
        },
        {
            "id": "diag-dist-2",
            "domain_id": "dist-sys",
            "module_id": "mod-dist-1",
            "topic_id": "topic-eventual-consistency",
            "category": "reasoning",
            "question_text": "Under network partitioning (the P in CAP theorem), which strategy best prevents split-brain anomalies in distributed consensus?",
            "options": [
                "Permit both partition sides to accept writes and merge them via Last-Write-Wins timestamps",
                "Require an absolute majority quorum (N/2 + 1) for write authorization; reject writes on minority partition",
                "Disable all consensus leases and switch to asynchronous eventual consistency",
                "Replicate writes immediately without waiting for acknowledgements",
            ],
            "correct_index": 1,
            "explanation": "Consensus algorithms like Raft and Paxos require strict majority quorums (N/2 + 1) to authorize state changes, preventing split-brain.",
        },
    ],
    "data-eng": [
        {
            "id": "diag-data-1",
            "domain_id": "data-eng",
            "module_id": "mod-data-1",
            "topic_id": "topic-postgres-explain",
            "category": "implementation",
            "question_text": "When running EXPLAIN ANALYZE on a query with WHERE tenant_id = 'x' AND created_at > '2026-01-01', you observe a 'Seq Scan'. Which index definition is optimal?",
            "options": [
                "CREATE INDEX idx_tenant ON table (tenant_id);",
                "CREATE INDEX idx_created ON table (created_at);",
                "CREATE INDEX idx_tenant_created ON table (tenant_id, created_at);",
                "CREATE INDEX idx_created_tenant ON table (created_at, tenant_id);",
            ],
            "correct_index": 2,
            "explanation": "In composite B-Tree indexes, equality filter columns (tenant_id) should precede range filter columns (created_at) for index scan efficiency.",
        }
    ],
    "domain-data-preprocessing": [
        {
            "id": "diag-q1",
            "domain_id": "domain-data-preprocessing",
            "module_id": "mod-cleaning",
            "topic_id": "topic-missing-values",
            "category": "concept",
            "question_text": "Which mechanism of missingness implies that missing values are related to the unobserved values themselves?",
            "options": [
                "Missing Completely at Random (MCAR)",
                "Missing at Random (MAR)",
                "Missing Not at Random (MNAR)",
                "Informative Censoring",
            ],
            "correct_index": 2,
            "explanation": "MNAR occurs when the probability of a missing value depends on the unobserved value itself.",
        },
        {
            "id": "diag-q2",
            "domain_id": "domain-data-preprocessing",
            "module_id": "mod-outliers",
            "topic_id": "topic-outlier-iqr",
            "category": "concept",
            "question_text": "In Tukey's boxplot rule, what are the exact lower and upper fences defined for potential outlier detection?",
            "options": [
                "Q1 - 1.5 × IQR and Q3 + 1.5 × IQR",
                "Mean - 2 × Std and Mean + 2 × Std",
                "Q1 - 3.0 × IQR and Q3 + 3.0 × IQR",
                "Median - 1.5 × MAD and Median + 1.5 × MAD",
            ],
            "correct_index": 0,
            "explanation": "Standard Tukey IQR fences are Q1 - 1.5×IQR and Q3 + 1.5×IQR.",
        },
        {
            "id": "diag-q3",
            "domain_id": "domain-data-preprocessing",
            "module_id": "mod-outliers",
            "topic_id": "topic-outlier-winsorization",
            "category": "reasoning",
            "question_text": "Why is Winsorization often preferred over hard row trimming (deletion) when preparing data for linear or distance-based models?",
            "options": [
                "It completely eliminates the variance of the underlying feature",
                "It preserves overall sample size (degrees of freedom) while capping catastrophic leverage points",
                "It transforms any skewed distribution directly into a Gaussian normal distribution",
                "It automatically imputes missing values at the same time",
            ],
            "correct_index": 1,
            "explanation": "Winsorization replaces values beyond percentiles with those boundary values, retaining all rows while bounding extreme leverage.",
        },
        {
            "id": "diag-q4",
            "domain_id": "domain-data-preprocessing",
            "module_id": "mod-outliers",
            "topic_id": "topic-outlier-winsorization",
            "category": "implementation",
            "question_text": "Examine the following pandas capping logic: df[col].apply(lambda x: p99 if x > p99 else x). What subtle bug or inefficiency is present?",
            "options": [
                "The quantile calculation is mathematically incorrect in pandas",
                "Using apply(lambda) is significantly slower and less idiomatic than df[col].clip(upper=p99)",
                "It erroneously drops values below 0.01",
                "The quantile function fails on float series",
            ],
            "correct_index": 1,
            "explanation": "Series.clip(upper=p99) is vectorized in Cython, avoiding costly Python bytecode overhead.",
        },
        {
            "id": "diag-q5",
            "domain_id": "domain-data-preprocessing",
            "module_id": "mod-scaling",
            "topic_id": "topic-scaling-robust",
            "category": "reasoning",
            "question_text": "When should RobustScaler be selected instead of StandardScaler?",
            "options": [
                "Only when all features are binary categories",
                "When the dataset contains severe outliers that would distort sample mean and variance",
                "When gradient descent algorithms require inputs bounded strictly in [0, 1]",
                "When using decision trees that depend strictly on monotonic rank order",
            ],
            "correct_index": 1,
            "explanation": "StandardScaler relies on mean and standard deviation. RobustScaler centers with the median and scales by IQR.",
        },
        {
            "id": "diag-q6",
            "domain_id": "domain-data-preprocessing",
            "module_id": "mod-encoding",
            "topic_id": "topic-encoding-onehot",
            "category": "concept",
            "question_text": "What major risk occurs if Target Encoding is applied to high-cardinality features without out-of-fold regularization or smoothing?",
            "options": [
                "Severe target leakage and extreme overfitting on rare category levels",
                "The resulting matrix becomes completely sparse",
                "Gradient boosting estimators will refuse to split on floating point columns",
                "Numerical underflow in floating point arithmetic",
            ],
            "correct_index": 0,
            "explanation": "Rare categories with only 1-2 occurrences will directly mirror target values, causing severe overfitting and leakage.",
        },
        {
            "id": "diag-q7",
            "domain_id": "domain-data-preprocessing",
            "module_id": "mod-validation",
            "topic_id": "topic-pipeline-leakage",
            "category": "application",
            "question_text": "Which of the following pipeline designs causes data leakage during cross-validation?",
            "options": [
                "Fitting a StandardScaler only on X_train, then using transform on X_test",
                "Calling scaler.fit_transform(X) on the entire dataset prior to train_test_split()",
                "Wrapping both imputer and estimator inside a sklearn.pipeline.Pipeline",
                "Using KFold cross-validation inside an automated grid search",
            ],
            "correct_index": 1,
            "explanation": "Fitting transforms on the entire dataset incorporates test-set distribution moments into training statistics.",
        },
    ],
}
