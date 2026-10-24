"""
Curated Mini-Project Catalogue for Learn & Grow (Phase 11).
Each entry maps a domain_id to a list of substantive, domain-specific project specifications.
These are expert-authored and labelled as curated_catalogue, never as AI-generated content.
"""
from typing import Dict, List, Any

CURATED_MINI_PROJECTS: Dict[str, List[Dict[str, Any]]] = {
    "version-control": [
        {
            "title": "Structured Git Branching, Rebase & Tested Feature-Branch Workflow",
            "difficulty": "Intermediate",
            "estimated_hours": 8,
            "problem_statement": (
                "Your engineering team experiences recurring mainline regressions and merge "
                "conflicts caused by undisciplined commit histories and ad-hoc branch merges. "
                "Design and demonstrate a structured Git workflow (Trunk-Based or GitFlow) featuring "
                "atomic commits, interactive rebase squashing, linear history preservation, and "
                "branch protection policies."
            ),
            "relevance_to_gap": (
                "Directly remediates diagnosed gaps in Version Control & Git Workflow Orchestration "
                "by verifying branch isolation, interactive rebasing, and linear commit discipline."
            ),
            "learning_objectives": [
                "Implement a deterministic branching strategy with feature, release, and hotfix branches",
                "Execute interactive rebases (git rebase -i) to squash and reword atomic commits",
                "Resolve complex three-way merge conflicts cleanly while maintaining test integrity",
                "Configure branch protection rules enforcing status checks and linear history",
                "Validate commit history cleanliness using git log graphs and automated linting",
            ],
            "expected_deliverables": [
                "GitHub/GitLab repository with branch protection rules configured",
                "Demonstration branch with clean, linear commit history (git log --oneline --graph)",
                "Documented conflict-resolution walkthrough showing diff analysis",
                "Workflow specification document (CONTRIBUTING.md and BRANCHING.md)",
            ],
            "implementation_requirements": [
                "All commit messages must adhere to Conventional Commits format",
                "Feature branches must be rebased onto main prior to merging",
                "No raw merge commits on mainline (enforce fast-forward or squash merge)",
                "Automated commit message linter (commitlint or pre-commit hook)",
            ],
            "milestones": [
                {
                    "step": 1,
                    "title": "Branching Model Setup & Hooks",
                    "description": "Configure repository structure, pre-commit hooks for commit message linting, and branch protection policies.",
                    "acceptance": "Pre-commit hook blocks non-conventional commit messages",
                },
                {
                    "step": 2,
                    "title": "Simulated Feature Development & Rebase",
                    "description": "Develop two parallel divergent feature branches that touch overlapping files; perform an interactive rebase.",
                    "acceptance": "Feature branch successfully rebased with zero lost changes and clean atomic commits",
                },
                {
                    "step": 3,
                    "title": "Mainline Merge & Verification",
                    "description": "Merge feature into main using fast-forward squash; verify history using git log graph.",
                    "acceptance": "Main branch contains a clean, linear, Bisect-friendly commit graph",
                },
            ],
            "acceptance_criteria": [
                "Commit history on mainline is completely linear with zero merge commits",
                "Every commit passes automated unit tests (git bisect safe)",
                "Branch protection requires passing CI before merge",
                "Documentation clearly outlines team branching guidelines",
            ],
            "rubric": [
                {"criterion": "Git History Cleanliness", "weight_pct": 35, "description": "Linear graph, atomic commits, conventional commit syntax"},
                {"criterion": "Conflict Resolution Rigor", "weight_pct": 35, "description": "Three-way rebase conflict handled without regressions"},
                {"criterion": "Automation & Branch Policies", "weight_pct": 20, "description": "Pre-commit hooks and branch protection configured"},
                {"criterion": "Documentation & Guidelines", "weight_pct": 10, "description": "CONTRIBUTING.md and BRANCHING.md completeness"},
            ],
            "submission_instructions": (
                "Submit a public GitHub repository URL demonstrating the branch structure, "
                "closed Pull Request with rebased commits, and CONTRIBUTING.md guidelines. "
                "Include a git log output snippet in your submission summary."
            ),
            "resources": [
                {"title": "Pro Git Book — Git Branching & Rebasing", "type": "documentation", "url_hint": "git-scm.com/book/en/v2/Git-Branching-Rebasing"},
                {"title": "Conventional Commits Specification", "type": "standard", "url_hint": "conventionalcommits.org"},
            ],
        },
        {
            "title": "Git Repository Contribution Workflow with Pull Requests, Code Review & CI Gates",
            "difficulty": "Intermediate",
            "estimated_hours": 10,
            "problem_statement": (
                "Establish a production-grade multi-collaborator repository contribution framework. "
                "Construct an automated pull request pipeline that executes automated testing, code "
                "quality linting, security vulnerability scanning, and enforces two-stage code review "
                "approvals before merge."
            ),
            "relevance_to_gap": (
                "Validates mastery of enterprise pull request lifecycle, collaborative review "
                "protocols, and continuous integration validation gates."
            ),
            "learning_objectives": [
                "Author pull request templates with structured checklists and context prompts",
                "Configure GitHub Actions CI workflows triggered on pull_request events",
                "Integrate automated linting (Ruff/ESLint) and unit tests as required status checks",
                "Conduct simulated code reviews leaving substantive actionable comments",
                "Enforce signed commits (GPG/SSH) and CODEOWNERS review delegation",
            ],
            "expected_deliverables": [
                "Repository with .github/PULL_REQUEST_TEMPLATE.md and CODEOWNERS",
                "GitHub Actions workflow file (.github/workflows/ci.yml) validating PRs",
                "Sample Pull Request demonstrating CI gate execution and review thread",
                "Review guidelines document (CODE_REVIEW.md)",
            ],
            "implementation_requirements": [
                "CI workflow must run on ubuntu-latest and complete in under 5 minutes",
                "PR template must require linked issue ID, change summary, and test plan",
                "CODEOWNERS must assign critical paths to designated reviewers",
                "Merge button must be disabled until all required checks pass and approvals are granted",
            ],
            "milestones": [
                {
                    "step": 1,
                    "title": "Template & CODEOWNERS Configuration",
                    "description": "Create PR and issue templates; configure CODEOWNERS rules for core modules.",
                    "acceptance": "Opening a new PR populates the structured template automatically",
                },
                {
                    "step": 2,
                    "title": "CI Gate Pipeline Construction",
                    "description": "Write GitHub Actions workflow validating syntax, running tests, and checking coverage.",
                    "acceptance": "CI workflow triggers on PR, blocks merge on failing test",
                },
                {
                    "step": 3,
                    "title": "Review Simulation & Signed Merge",
                    "description": "Simulate reviewer feedback on PR; push fixes with signed commits and merge.",
                    "acceptance": "PR merged with verified badge and green CI check marks",
                },
            ],
            "acceptance_criteria": [
                "Pull request cannot be merged without at least one approved review",
                "Failing CI test immediately blocks the merge button",
                "Commits on merged branch are cryptographically signed",
                "Review guidelines define severity tiers (nit, blocking, security)",
            ],
            "rubric": [
                {"criterion": "CI Gate Automation", "weight_pct": 35, "description": "Automated workflow reliably validates incoming changes"},
                {"criterion": "Review Governance & CODEOWNERS", "weight_pct": 30, "description": "Proper ownership routing and branch policy enforcement"},
                {"criterion": "PR Quality & Templates", "weight_pct": 20, "description": "Structured template with verifiable testing checklists"},
                {"criterion": "Security & Commit Signing", "weight_pct": 15, "description": "GPG/SSH signing and status check immutability"},
            ],
            "submission_instructions": (
                "Submit the URL to the GitHub repository and link to the merged Pull Request "
                "demonstrating CI checks, review approvals, and template usage."
            ),
            "resources": [
                {"title": "GitHub Docs — About protected branches", "type": "documentation", "url_hint": "docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository"},
                {"title": "Google Engineering Practices — Code Review Developer Guide", "type": "guide", "url_hint": "google.github.io/eng-practices/review"},
            ],
        },
        {
            "title": "Release-Management Pipeline with Semantic Versioning, Changelog & Rollback Runbook",
            "difficulty": "Advanced",
            "estimated_hours": 12,
            "problem_statement": (
                "Build an automated release-management pipeline implementing Semantic Versioning (SemVer), "
                "automated git tag creation, automated changelog generation from conventional commits, "
                "and an incident rollback runbook enabling verified 5-minute production rollbacks."
            ),
            "relevance_to_gap": (
                "Develops senior-level release engineering capabilities, release tagging hygiene, "
                "and emergency hotfix/rollback orchestration."
            ),
            "learning_objectives": [
                "Automate SemVer version increments (major, minor, patch) based on commit types",
                "Generate release changelogs grouped by feature, fix, and breaking change",
                "Publish annotated and signed Git tags linked to GitHub Releases",
                "Author a verified emergency rollback runbook (git revert vs deploy rollback)",
                "Test hotfix branch workflow for cherry-picking critical patches into maintenance releases",
            ],
            "expected_deliverables": [
                "Release automation workflow (Release Please or standard semantic-release)",
                "Published GitHub Release with version tag (e.g. v1.2.0) and release notes",
                "Incident Rollback Runbook (ROLLBACK.md) with step-by-step verification commands",
                "Demonstration of hotfix cherry-pick and patch release (v1.2.1)",
            ],
            "implementation_requirements": [
                "Version numbers must strictly follow SemVer 2.0.0 guidelines",
                "Changelog generation must parse Conventional Commits automatically",
                "Rollback runbook must include recovery time objectives (< 5 min) and drill instructions",
                "Hotfix workflow must demonstrate git cherry-pick without history corruption",
            ],
            "milestones": [
                {
                    "step": 1,
                    "title": "Release Automation Setup",
                    "description": "Configure semantic-release or Release Please workflow in GitHub Actions.",
                    "acceptance": "Merge to main automatically drafts a new release based on commit history",
                },
                {
                    "step": 2,
                    "title": "Tagging & Artifact Publishing",
                    "description": "Execute a release run producing an annotated tag, release notes, and build artifact.",
                    "acceptance": "Git tag v1.0.0 created with changelog markdown published",
                },
                {
                    "step": 3,
                    "title": "Rollback Drill & Runbook Validation",
                    "description": "Simulate a broken release; execute rollback runbook; verify system state recovery.",
                    "acceptance": "Clean git revert and rollback executed within target SLA",
                },
            ],
            "acceptance_criteria": [
                "Release version numbers bump deterministically according to commit conventions",
                "Changelog accurately reflects all closed issues and PRs",
                "Emergency rollback process is documented with copy-pasteable shell commands",
                "Rollback drill verified to restore prior stable tag without data loss",
            ],
            "rubric": [
                {"criterion": "SemVer Automation", "weight_pct": 35, "description": "Automated versioning and changelog accuracy from commits"},
                {"criterion": "Release Tagging & Packaging", "weight_pct": 25, "description": "Signed annotated tags and complete GitHub Releases"},
                {"criterion": "Rollback Runbook Completeness", "weight_pct": 25, "description": "Actionable, drill-tested rollback instructions and commands"},
                {"criterion": "Hotfix & Cherry-Pick Workflow", "weight_pct": 15, "description": "Clean cherry-pick patch demonstrated"},
            ],
            "submission_instructions": (
                "Submit GitHub repository URL showing the Releases tab with published tags, "
                "CHANGELOG.md, and ROLLBACK.md runbook."
            ),
            "resources": [
                {"title": "Semantic Versioning 2.0.0", "type": "standard", "url_hint": "semver.org"},
                {"title": "Release Please GitHub Action", "type": "tool", "url_hint": "github.com/google-github-actions/release-please-action"},
            ],
        },
    ],
    "docker": [
        {
            "title": "Multi-Stage Production Dockerfile & Container Security Hardening",
            "difficulty": "Intermediate",
            "estimated_hours": 10,
            "problem_statement": (
                "Your team needs to containerise a Python FastAPI service so it runs as a "
                "non-root user, exposes no build-time secrets in layers, and produces an image "
                "under 150 MB. The current single-stage Dockerfile embeds dev dependencies and "
                "runs as root, violating security policy."
            ),
            "relevance_to_gap": (
                "Closes the Docker container hardening gap by requiring a working multi-stage "
                "build, UID remapping, and documented layer-caching decisions."
            ),
            "learning_objectives": [
                "Write a multi-stage Dockerfile separating build and runtime stages",
                "Configure a non-root user and verify UID/GID at runtime",
                "Reduce final image size by pruning dev dependencies and using slim base images",
                "Implement a HEALTHCHECK instruction verified by docker inspect",
                "Pass docker scan with zero critical CVEs",
            ],
            "expected_deliverables": [
                "Dockerfile with documented multi-stage build",
                "docker-compose.yml for local development",
                "Build script producing an image ≤ 150 MB",
                "Security scan output (docker scout or trivy)",
                "README explaining each Dockerfile instruction's purpose",
            ],
            "implementation_requirements": [
                "Use an official slim Python base image (e.g. python:3.12-slim)",
                "Add USER directive with a dedicated non-root UID (e.g. 1001)",
                "Mount secrets via --secret flag or environment at runtime, never COPY",
                "Implement HEALTHCHECK using the FastAPI /health endpoint",
                "Pin all base-image digests for reproducibility",
            ],
            "milestones": [
                {
                    "step": 1,
                    "title": "Baseline Audit & Design",
                    "description": "Profile the existing single-stage image. Document layer sizes with docker history. Write the multi-stage design.",
                    "acceptance": "docker history output committed; design doc reviewed",
                },
                {
                    "step": 2,
                    "title": "Multi-Stage Build Implementation",
                    "description": "Implement builder and runtime stages, configure non-root user, and verify the service starts correctly.",
                    "acceptance": "docker build succeeds; docker run --user 1001 starts the API",
                },
                {
                    "step": 3,
                    "title": "Security Scan & Documentation",
                    "description": "Run trivy/docker scout against the final image. Fix any critical CVEs. Finalise README.",
                    "acceptance": "Zero critical CVEs; image ≤ 150 MB; HEALTHCHECK passes",
                },
            ],
            "acceptance_criteria": [
                "Final image is ≤ 150 MB (verified with docker image ls)",
                "Container starts as UID 1001, not root (verified with docker inspect)",
                "HEALTHCHECK returns healthy within 30 s",
                "No build secrets present in docker history output",
                "trivy scan reports zero CRITICAL vulnerabilities",
            ],
            "rubric": [
                {"criterion": "Multi-Stage Build Correctness", "weight_pct": 35, "description": "Builder and runtime stages correctly separated; dev dependencies absent in final image"},
                {"criterion": "Security Hardening", "weight_pct": 35, "description": "Non-root user, no secrets in layers, critical CVE count = 0"},
                {"criterion": "HEALTHCHECK & Observability", "weight_pct": 15, "description": "HEALTHCHECK instruction functional and tested"},
                {"criterion": "Documentation Quality", "weight_pct": 15, "description": "README explains every instruction and design decision"},
            ],
            "submission_instructions": (
                "Submit a public GitHub repository URL containing the Dockerfile, "
                "docker-compose.yml, build script, security scan output, and README. "
                "Include a brief summary of image-size and CVE reduction achieved."
            ),
            "resources": [
                {"title": "Docker Multi-stage builds documentation", "type": "documentation", "url_hint": "docs.docker.com/build/building/multi-stage"},
                {"title": "Trivy container scanner", "type": "tool", "url_hint": "trivy.dev"},
            ],
        },
        {
            "title": "Docker Compose Microservices Stack with Healthcheck Orchestration",
            "difficulty": "Intermediate",
            "estimated_hours": 12,
            "problem_statement": (
                "Compose a three-service local stack (API, worker, database) that starts "
                "deterministically in dependency order, supports hot-reload for the API, "
                "and gracefully handles service restarts without data loss."
            ),
            "relevance_to_gap": (
                "Validates multi-container orchestration skills essential for local "
                "development parity with Kubernetes deployments."
            ),
            "learning_objectives": [
                "Write a docker-compose.yml defining three services with explicit healthchecks",
                "Use depends_on with condition: service_healthy to enforce startup order",
                "Mount named volumes for database persistence and bind mounts for hot-reload",
                "Configure environment variables via .env file, not hard-coded values",
                "Test restart resilience by killing the worker and verifying auto-recovery",
            ],
            "expected_deliverables": [
                "docker-compose.yml with three services, healthchecks, and volumes",
                ".env.example with all required variables documented",
                "Script demonstrating deterministic startup sequence",
                "Restart resilience test report",
            ],
            "implementation_requirements": [
                "Use healthcheck: in every service definition",
                "Use depends_on with service_healthy condition for API and worker",
                "Use named volume for Postgres data directory",
                "Worker must reconnect automatically after database restart",
            ],
            "milestones": [
                {
                    "step": 1,
                    "title": "Single-Service Baseline",
                    "description": "Run each service independently and verify it starts correctly with a healthcheck.",
                    "acceptance": "docker compose up <service> healthy for each",
                },
                {
                    "step": 2,
                    "title": "Multi-Service Orchestration",
                    "description": "Compose all three services with depends_on conditions; verify startup order in logs.",
                    "acceptance": "All three services healthy in expected order",
                },
                {
                    "step": 3,
                    "title": "Resilience Testing",
                    "description": "Kill worker container; verify auto-restart and database reconnection without data loss.",
                    "acceptance": "Worker recovers within 30 s; no rows lost",
                },
            ],
            "acceptance_criteria": [
                "docker compose up -d results in all three services healthy within 60 s",
                "Startup order guaranteed by depends_on/service_healthy",
                "Named volume retains data across docker compose down/up cycle",
                "Worker reconnects automatically after database restart",
            ],
            "rubric": [
                {"criterion": "Healthcheck Implementation", "weight_pct": 30, "description": "All services have functional healthchecks with appropriate intervals"},
                {"criterion": "Startup Ordering & Dependencies", "weight_pct": 35, "description": "depends_on with service_healthy correctly enforces order"},
                {"criterion": "Persistence & Hot-Reload", "weight_pct": 20, "description": "Volumes preserve data; API hot-reloads on code change"},
                {"criterion": "Configuration Hygiene", "weight_pct": 15, "description": "No secrets hard-coded; .env.example complete"},
            ],
            "submission_instructions": (
                "Submit the repository with docker-compose.yml, .env.example, and a Markdown "
                "report describing startup sequence logs and resilience test results."
            ),
            "resources": [
                {"title": "Docker Compose healthcheck documentation", "type": "documentation", "url_hint": "docs.docker.com/compose"},
            ],
        },
        {
            "title": "Container Registry CI Pipeline with Automated Vulnerability Scanning",
            "difficulty": "Advanced",
            "estimated_hours": 14,
            "problem_statement": (
                "Automate the full container lifecycle: build a Docker image in CI, scan it "
                "for CVEs before push, publish to a registry only when scanning passes, and "
                "sign the image digest for supply-chain integrity."
            ),
            "relevance_to_gap": (
                "Demonstrates production-grade DevSecOps Docker pipeline skills matching "
                "senior engineer requirements in container-heavy environments."
            ),
            "learning_objectives": [
                "Write a GitHub Actions workflow that builds and tags Docker images on every PR",
                "Integrate trivy or grype CVE scanning as a blocking CI gate",
                "Push to a container registry (GHCR or Docker Hub) only on passing scans",
                "Sign the image using cosign or Docker Content Trust",
                "Publish a SBOM (Software Bill of Materials) as a CI artefact",
            ],
            "expected_deliverables": [
                "GitHub Actions workflow YAML for build/scan/push/sign pipeline",
                "Sample trivy scan report committed as CI artefact",
                "Signed image available on GHCR/Docker Hub",
                "README documenting pipeline stages and failure conditions",
            ],
            "implementation_requirements": [
                "CI must fail if CRITICAL or HIGH CVEs are present",
                "Image tags must include git SHA for immutability",
                "Signing must be verifiable with cosign verify",
                "SBOM must be generated using syft or docker buildx",
            ],
            "milestones": [
                {"step": 1, "title": "Build & Tag Pipeline", "description": "CI builds image and tags with git SHA on every PR.", "acceptance": "CI passes; image tagged correctly"},
                {"step": 2, "title": "CVE Scanning Gate", "description": "Integrate trivy; CI blocks push on CRITICAL/HIGH findings.", "acceptance": "Known vulnerable image fails CI gate"},
                {"step": 3, "title": "Sign & SBOM", "description": "Sign image with cosign; generate and attach SBOM.", "acceptance": "cosign verify succeeds; SBOM artefact present"},
            ],
            "acceptance_criteria": [
                "CI pipeline fails when a test image with CRITICAL CVE is submitted",
                "Published image has git-SHA tag and is signed",
                "cosign verify command succeeds against published image",
                "SBOM artefact is available in CI run artefacts",
            ],
            "rubric": [
                {"criterion": "CI Pipeline Correctness", "weight_pct": 30, "description": "Build, scan, push stages function correctly"},
                {"criterion": "CVE Gate Enforcement", "weight_pct": 35, "description": "Pipeline correctly blocks on CRITICAL/HIGH CVEs"},
                {"criterion": "Image Signing & SBOM", "weight_pct": 25, "description": "cosign verify succeeds; SBOM is present"},
                {"criterion": "Documentation", "weight_pct": 10, "description": "README explains all pipeline stages and failure modes"},
            ],
            "submission_instructions": "Submit the repository URL with workflow YAML, README, and a screenshot or log of a successful pipeline run including the signed image digest.",
            "resources": [
                {"title": "GitHub Actions Docker build and push", "type": "documentation", "url_hint": "docs.github.com/en/actions"},
                {"title": "cosign image signing", "type": "documentation", "url_hint": "docs.sigstore.dev/cosign"},
            ],
        },
    ],

    "postgresql": [
        {
            "title": "Index Optimisation & Query Plan Analysis for High-Traffic API",
            "difficulty": "Intermediate",
            "estimated_hours": 8,
            "problem_statement": (
                "A production PostgreSQL-backed API has slow p99 response times (>500 ms) on "
                "user order-history queries. Profile the queries, design targeted composite "
                "indexes, and verify improvement using EXPLAIN (ANALYZE, BUFFERS)."
            ),
            "relevance_to_gap": (
                "Directly targets the PostgreSQL query optimisation gap; requires hands-on "
                "use of EXPLAIN ANALYZE, index strategy, and buffer-hit-rate measurement."
            ),
            "learning_objectives": [
                "Use pg_stat_statements to identify top slow queries",
                "Read EXPLAIN (ANALYZE, BUFFERS) output and identify Seq Scan hot spots",
                "Design and create composite B-Tree indexes with INCLUDE columns",
                "Measure before/after buffer hit ratio and execution time",
                "Document index trade-offs for write-heavy workloads",
            ],
            "expected_deliverables": [
                "SQL file with all CREATE INDEX statements and EXPLAIN outputs",
                "Before/after query plan comparison document",
                "Benchmark results showing latency reduction",
                "Written trade-off analysis for each index decision",
            ],
            "implementation_requirements": [
                "Use CREATE INDEX CONCURRENTLY in all migration scripts",
                "Target at least three distinct query patterns",
                "Verify index is used with EXPLAIN (no forced index hints allowed)",
                "Measure using pg_stat_user_indexes to confirm index scans",
            ],
            "milestones": [
                {"step": 1, "title": "Query Profiling", "description": "Identify top 3 slow queries using pg_stat_statements.", "acceptance": "Slow queries documented with current execution plans"},
                {"step": 2, "title": "Index Design & Implementation", "description": "Create targeted indexes; verify with EXPLAIN ANALYZE.", "acceptance": "All queries switch from Seq Scan to Index Scan"},
                {"step": 3, "title": "Benchmarking & Documentation", "description": "Run load tests to measure latency improvement; write trade-off analysis.", "acceptance": "Measurable latency reduction documented"},
            ],
            "acceptance_criteria": [
                "All three target queries show Index Scan (not Seq Scan) in EXPLAIN output",
                "Buffer hit ratio ≥ 95% after index implementation",
                "Trade-off analysis documents write overhead for each index",
            ],
            "rubric": [
                {"criterion": "Query Plan Analysis", "weight_pct": 35, "description": "Correct reading and documentation of EXPLAIN ANALYZE output"},
                {"criterion": "Index Design Quality", "weight_pct": 40, "description": "Appropriate index type, column order, and INCLUDE usage"},
                {"criterion": "Benchmarking & Trade-off Analysis", "weight_pct": 25, "description": "Measurable before/after results; write overhead documented"},
            ],
            "submission_instructions": "Submit a GitHub repository with SQL migration files, EXPLAIN output screenshots, and a written benchmark report.",
            "resources": [
                {"title": "PostgreSQL EXPLAIN documentation", "type": "documentation", "url_hint": "postgresql.org/docs/current/sql-explain"},
            ],
        },
    ],

    "data-preprocessing": [
        {
            "title": "Leakage-Free Scikit-Learn Preprocessing Pipeline with Pytest Coverage",
            "difficulty": "Intermediate",
            "estimated_hours": 10,
            "problem_statement": (
                "Build a production-safe scikit-learn Pipeline that handles missing values, "
                "outlier capping, and categorical encoding without leaking statistics from "
                "the test split. The pipeline must be serialisable with joblib."
            ),
            "relevance_to_gap": (
                "Targets the data preprocessing gap by requiring correct fit/transform "
                "isolation and a verifiable pytest test suite."
            ),
            "learning_objectives": [
                "Implement a custom TransformerMixin for percentile-based outlier capping",
                "Compose SimpleImputer, custom capper, and OneHotEncoder in a Pipeline",
                "Verify zero data leakage using only training-split statistics",
                "Serialise and deserialise the pipeline with joblib.dump/load",
                "Achieve 100% branch coverage on the custom transformer",
            ],
            "expected_deliverables": [
                "Python module with custom transformer and assembled Pipeline",
                "Pytest test suite verifying fit/transform isolation",
                "joblib serialisation test with round-trip validation",
                "README with usage example",
            ],
            "implementation_requirements": [
                "Custom transformer must inherit from BaseEstimator and TransformerMixin",
                "Quantiles for capping must be computed in .fit() and stored as attributes",
                ".transform() must raise ValueError if .fit() was not called first",
                "Pipeline must produce deterministic output given the same random seed",
            ],
            "milestones": [
                {"step": 1, "title": "Custom Transformer Implementation", "description": "Implement and unit-test the PercentileCapper transformer.", "acceptance": "All unit tests pass; no leakage in fit/transform split"},
                {"step": 2, "title": "Full Pipeline Assembly", "description": "Compose all steps into a Pipeline; verify end-to-end on sample data.", "acceptance": "Pipeline transforms training and test sets correctly"},
                {"step": 3, "title": "Serialisation & Coverage", "description": "Add joblib round-trip test; achieve 100% branch coverage.", "acceptance": "pytest --cov shows 100%; joblib test passes"},
            ],
            "acceptance_criteria": [
                "Pipeline applies training-split statistics to test split without refitting",
                "100% branch coverage on custom transformer",
                "joblib round-trip produces identical output",
                "ValueError raised when transform() called before fit()",
            ],
            "rubric": [
                {"criterion": "Leakage-Free Implementation", "weight_pct": 40, "description": "Statistics fit only on training split; correctly applied to test split"},
                {"criterion": "Custom Transformer Quality", "weight_pct": 30, "description": "Correct BaseEstimator/TransformerMixin API; fit attributes stored"},
                {"criterion": "Test Coverage & Quality", "weight_pct": 30, "description": "100% branch coverage; meaningful assertions"},
            ],
            "submission_instructions": "Submit GitHub repository URL with the Python module, test suite, coverage report, and README.",
            "resources": [
                {"title": "Scikit-learn Pipeline documentation", "type": "documentation", "url_hint": "scikit-learn.org/stable/modules/pipeline"},
            ],
        },
    ],

    "machine-learning": [
        {
            "title": "Cross-Validated XGBoost Model with Bayesian Hyperparameter Tuning",
            "difficulty": "Advanced",
            "estimated_hours": 14,
            "problem_statement": (
                "Train an XGBoost regression model on a real tabular dataset using stratified "
                "k-fold cross-validation and Optuna Bayesian optimisation. Produce a learning "
                "curve that demonstrates generalisation without overfitting."
            ),
            "relevance_to_gap": "Validates core supervised ML skills including cross-validation discipline and hyperparameter tuning methodology.",
            "learning_objectives": [
                "Configure an Optuna study with a well-defined objective function",
                "Use StratifiedKFold or KFold with consistent random seeds",
                "Plot training vs validation loss curves for each CV fold",
                "Apply early stopping to prevent overfitting",
                "Evaluate on a held-out test set and report RMSE and MAE",
            ],
            "expected_deliverables": [
                "Jupyter notebook or Python script with reproducible training pipeline",
                "Optuna visualisation plots (importance, contour)",
                "Learning curve plots per fold",
                "Final test RMSE/MAE with confidence interval",
            ],
            "implementation_requirements": [
                "Use Optuna for hyperparameter search (min 50 trials)",
                "Apply early stopping with XGBoost's eval_metric and early_stopping_rounds",
                "Report per-fold validation RMSE in addition to mean",
                "Set random seeds for full reproducibility",
            ],
            "milestones": [
                {"step": 1, "title": "Data Preparation & Baseline", "description": "Load, split, and train a baseline XGBoost model with default params.", "acceptance": "Baseline RMSE established"},
                {"step": 2, "title": "Bayesian Tuning", "description": "Run Optuna study with 50+ trials; select best params.", "acceptance": "Best params improve baseline by ≥5% RMSE"},
                {"step": 3, "title": "Learning Curves & Reporting", "description": "Plot training/validation curves; evaluate on held-out test set.", "acceptance": "Curves show convergence; test metrics reported"},
            ],
            "acceptance_criteria": [
                "Optuna study runs ≥ 50 trials reproducibly",
                "Tuned model improves baseline RMSE by at least 5%",
                "Learning curves demonstrate convergence, not overfitting",
                "Test evaluation uses held-out data not seen during tuning",
            ],
            "rubric": [
                {"criterion": "Tuning Rigour", "weight_pct": 40, "description": "Optuna objective well-defined; search space appropriate"},
                {"criterion": "Cross-Validation Discipline", "weight_pct": 35, "description": "Correct CV strategy; no data leakage"},
                {"criterion": "Analysis & Reporting", "weight_pct": 25, "description": "Learning curves and final metrics clearly documented"},
            ],
            "submission_instructions": "Submit GitHub repository with notebook/script, Optuna plots, learning curves, and a brief results summary.",
            "resources": [
                {"title": "Optuna documentation", "type": "documentation", "url_hint": "optuna.readthedocs.io"},
                {"title": "XGBoost Python API", "type": "documentation", "url_hint": "xgboost.readthedocs.io"},
            ],
        },
    ],

    "fastapi-backend": [
        {
            "title": "Production FastAPI Service with JWT Auth, Async SQLAlchemy & OpenTelemetry",
            "difficulty": "Advanced",
            "estimated_hours": 16,
            "problem_statement": (
                "Build a production-grade REST API with FastAPI that supports JWT-based "
                "authentication, async database operations using SQLAlchemy 2.0, request "
                "tracing with OpenTelemetry, and a full pytest integration test suite."
            ),
            "relevance_to_gap": "Validates senior FastAPI competency including async patterns, observability, and security.",
            "learning_objectives": [
                "Implement JWT token creation and validation with python-jose",
                "Use async SQLAlchemy 2.0 with async_sessionmaker and AsyncSession",
                "Instrument FastAPI endpoints with OpenTelemetry spans",
                "Write pytest fixtures using httpx.AsyncClient for integration tests",
                "Configure rate limiting with slowapi",
            ],
            "expected_deliverables": [
                "FastAPI application with authentication and CRUD endpoints",
                "Async database models and migrations (Alembic)",
                "OpenTelemetry configuration exporting to Jaeger or OTLP",
                "Integration test suite with ≥ 80% coverage",
            ],
            "implementation_requirements": [
                "Use httpx.AsyncClient for all test HTTP calls (not TestClient)",
                "JWT tokens must expire and return 401 when expired",
                "All DB operations must use async/await",
                "Span names must identify the endpoint and operation",
            ],
            "milestones": [
                {"step": 1, "title": "Auth & Data Layer", "description": "Implement JWT auth, async SQLAlchemy models, and Alembic migrations.", "acceptance": "Token generation and validation tested"},
                {"step": 2, "title": "API Endpoints", "description": "Build authenticated CRUD endpoints with rate limiting.", "acceptance": "All endpoints respond correctly in integration tests"},
                {"step": 3, "title": "Observability & Coverage", "description": "Add OTel spans; reach ≥ 80% test coverage.", "acceptance": "Traces visible in Jaeger; coverage report ≥ 80%"},
            ],
            "acceptance_criteria": [
                "Expired JWT returns 401 (not 200)",
                "All database operations are async (no sync DB calls in event loop)",
                "OpenTelemetry spans captured for all endpoints",
                "pytest coverage ≥ 80%",
            ],
            "rubric": [
                {"criterion": "Auth Implementation", "weight_pct": 30, "description": "JWT correctly issued, validated, and expired"},
                {"criterion": "Async Architecture", "weight_pct": 35, "description": "Correct async SQLAlchemy 2.0 usage throughout"},
                {"criterion": "Observability", "weight_pct": 20, "description": "OTel spans cover all endpoints"},
                {"criterion": "Test Coverage", "weight_pct": 15, "description": "≥ 80% line coverage with meaningful assertions"},
            ],
            "submission_instructions": "Submit repository URL with application code, tests, coverage report, and a screenshot of Jaeger UI showing traces.",
            "resources": [
                {"title": "FastAPI documentation", "type": "documentation", "url_hint": "fastapi.tiangolo.com"},
                {"title": "SQLAlchemy 2.0 async guide", "type": "documentation", "url_hint": "docs.sqlalchemy.org/en/20/orm/extensions/asyncio"},
            ],
        },
    ],

    "api-integration": [
        {
            "title": "Resilient Third-Party API Client with Retry, Circuit Breaker & Caching",
            "difficulty": "Intermediate",
            "estimated_hours": 10,
            "problem_statement": (
                "Build a production-grade Python HTTP client for a public REST API that handles "
                "transient failures with exponential backoff, implements a circuit breaker to "
                "prevent cascading failures, and caches successful responses with TTL validation."
            ),
            "relevance_to_gap": "Targets the API integration reliability gap by requiring correct implementation of all three production resilience patterns.",
            "learning_objectives": [
                "Implement exponential backoff with jitter using tenacity",
                "Build a circuit breaker with configurable failure threshold and half-open state",
                "Cache API responses using Redis or an in-memory TTL cache",
                "Write integration tests using responses or httpretty to mock the API",
                "Instrument client calls with structured logging and latency metrics",
            ],
            "expected_deliverables": [
                "Python API client module with retry, circuit breaker, and caching",
                "Unit and integration tests with mocked HTTP responses",
                "Benchmark showing cache hit latency vs cache miss latency",
                "README documenting configuration and failure scenarios",
            ],
            "implementation_requirements": [
                "Circuit breaker must enter open state after 5 consecutive failures",
                "Retry must use jitter to prevent thundering herd",
                "Cache TTL must be configurable and respected correctly",
                "All requests must include correlation ID header",
            ],
            "milestones": [
                {"step": 1, "title": "Base Client & Retry", "description": "Implement HTTP client with tenacity retry and exponential backoff.", "acceptance": "Retry behaviour verified with mocked 500 responses"},
                {"step": 2, "title": "Circuit Breaker & Caching", "description": "Add circuit breaker and TTL cache.", "acceptance": "Circuit opens after 5 failures; cache hit verified"},
                {"step": 3, "title": "Testing & Benchmarking", "description": "Complete test suite and cache latency benchmark.", "acceptance": "All tests pass; cache hit ≥10x faster than miss"},
            ],
            "acceptance_criteria": [
                "Circuit breaker enters open state after 5 consecutive failures",
                "Retry uses jitter (random delay component verified in tests)",
                "Cache returns stale data correctly before TTL expiry",
                "All integration tests pass with mocked HTTP backend",
            ],
            "rubric": [
                {"criterion": "Retry & Circuit Breaker", "weight_pct": 45, "description": "Correct failure thresholds, backoff strategy, and open/half-open state transitions"},
                {"criterion": "Caching Implementation", "weight_pct": 30, "description": "TTL respected; cache hit/miss logic correct"},
                {"criterion": "Test Coverage & Benchmarks", "weight_pct": 25, "description": "Mocked tests cover failure scenarios; benchmark present"},
            ],
            "submission_instructions": "Submit GitHub repository with client module, tests, and a README covering the circuit breaker state machine and cache configuration.",
            "resources": [
                {"title": "tenacity retry library", "type": "documentation", "url_hint": "tenacity.readthedocs.io"},
            ],
        },
    ],

    "system-architecture": [
        {
            "title": "Event-Driven Order Processing System with CQRS & Saga Pattern",
            "difficulty": "Advanced",
            "estimated_hours": 20,
            "problem_statement": (
                "Design and implement a simplified event-driven order processing system "
                "using CQRS (Command Query Responsibility Segregation) and a Saga pattern "
                "to coordinate distributed state changes across Order, Inventory, and "
                "Payment services without distributed transactions."
            ),
            "relevance_to_gap": "Validates senior system architecture skills requiring correct distributed systems pattern application.",
            "learning_objectives": [
                "Implement separate command and query models for order processing",
                "Publish domain events to an event bus (Redis Streams or in-memory)",
                "Implement compensating transactions for saga rollback scenarios",
                "Write architecture decision records (ADRs) for each major choice",
                "Achieve exactly-once semantic delivery for critical events",
            ],
            "expected_deliverables": [
                "Three service modules (Order, Inventory, Payment) with event publishing",
                "Saga orchestrator or choreography implementation",
                "ADR documents for CQRS and Saga design decisions",
                "Integration tests demonstrating successful and rollback scenarios",
            ],
            "implementation_requirements": [
                "Commands must not query state; queries must not mutate state (CQRS boundary)",
                "Saga must implement at least one compensating transaction",
                "Events must be immutable and include correlation IDs",
                "Architecture decision must be documented before implementation",
            ],
            "milestones": [
                {"step": 1, "title": "ADR & Architecture Design", "description": "Write ADRs for CQRS model, event schema, and saga strategy.", "acceptance": "ADRs reviewed and design approved"},
                {"step": 2, "title": "Service Implementation", "description": "Implement all three services with event publishing.", "acceptance": "Happy-path integration test passes end-to-end"},
                {"step": 3, "title": "Saga & Failure Testing", "description": "Implement compensating transactions; test rollback path.", "acceptance": "Payment failure triggers order and inventory rollback"},
            ],
            "acceptance_criteria": [
                "Happy path: Order placed → Inventory reserved → Payment processed",
                "Failure path: Payment failure → Inventory released → Order cancelled",
                "Commands and queries are strictly separated (no cross-boundary calls)",
                "ADR explains trade-offs between orchestration and choreography",
            ],
            "rubric": [
                {"criterion": "CQRS Boundary Correctness", "weight_pct": 30, "description": "Command and query models strictly separated"},
                {"criterion": "Saga Implementation", "weight_pct": 40, "description": "Compensating transactions correctly roll back on failure"},
                {"criterion": "ADR Quality", "weight_pct": 20, "description": "Decisions documented with alternatives and trade-offs"},
                {"criterion": "Test Coverage", "weight_pct": 10, "description": "Both happy-path and failure-path tested"},
            ],
            "submission_instructions": "Submit repository URL with service modules, ADR documents, and test suite demonstrating both success and rollback scenarios.",
            "resources": [
                {"title": "CQRS Pattern — Microsoft Azure Architecture Center", "type": "documentation", "url_hint": "learn.microsoft.com/azure/architecture/patterns/cqrs"},
            ],
        },
    ],

    "cloud-devops": [
        {
            "title": "Zero-Downtime Kubernetes Rolling Deployment with Horizontal Pod Autoscaler",
            "difficulty": "Advanced",
            "estimated_hours": 16,
            "problem_statement": (
                "Deploy a containerised service to a local Kubernetes cluster (minikube or "
                "kind) with a rolling update strategy, liveness/readiness probes, and a "
                "Horizontal Pod Autoscaler targeting 60% CPU utilisation."
            ),
            "relevance_to_gap": "Validates Kubernetes deployment operations including probe configuration, HPA behaviour, and zero-downtime rolling updates.",
            "learning_objectives": [
                "Write a Deployment manifest with rolling update strategy (maxUnavailable=0)",
                "Configure liveness and readiness probes on the application health endpoint",
                "Create an HPA targeting CPU utilisation with min/max replicas",
                "Simulate load with k6 or hey and verify HPA scales up and down",
                "Verify zero dropped requests during rolling update using k6 continuous load test",
            ],
            "expected_deliverables": [
                "Kubernetes manifests (Deployment, Service, HPA, ConfigMap)",
                "Load test script showing zero errors during rolling update",
                "kubectl describe output showing HPA scaling events",
                "README explaining probe configuration choices",
            ],
            "implementation_requirements": [
                "maxUnavailable: 0 and maxSurge: 1 in rolling update strategy",
                "Readiness probe must prevent traffic until service is ready",
                "HPA must trigger scale-up when CPU > 60% for ≥ 15 s",
                "All manifests must use explicit resource requests and limits",
            ],
            "milestones": [
                {"step": 1, "title": "Deployment & Probes", "description": "Deploy service with liveness and readiness probes.", "acceptance": "Pods reach Running state; probes healthy"},
                {"step": 2, "title": "HPA Configuration", "description": "Create HPA; verify scaling under simulated load.", "acceptance": "HPA scales up to maxReplicas under load"},
                {"step": 3, "title": "Zero-Downtime Verification", "description": "Trigger rolling update under continuous load; verify zero errors.", "acceptance": "k6 load test shows 0 failed requests during update"},
            ],
            "acceptance_criteria": [
                "Rolling update completes with zero dropped requests (verified by k6)",
                "HPA scales pods up under CPU load and back down when load stops",
                "Readiness probe prevents pod receiving traffic before health endpoint responds",
            ],
            "rubric": [
                {"criterion": "Probe Configuration", "weight_pct": 30, "description": "Liveness and readiness probes configured correctly and tested"},
                {"criterion": "HPA Behaviour", "weight_pct": 35, "description": "Scale-up and scale-down verified with load test evidence"},
                {"criterion": "Zero-Downtime Proof", "weight_pct": 35, "description": "k6 report shows 0 errors during rolling update"},
            ],
            "submission_instructions": "Submit repository with Kubernetes manifests, k6 load test script, and a Markdown report with HPA scaling event logs and k6 results.",
            "resources": [
                {"title": "Kubernetes Deployments documentation", "type": "documentation", "url_hint": "kubernetes.io/docs/concepts/workloads/controllers/deployment"},
            ],
        },
    ],

    "appsec": [
        {
            "title": "OWASP Top 10 Security Audit & Hardening of a FastAPI Application",
            "difficulty": "Advanced",
            "estimated_hours": 14,
            "problem_statement": (
                "Audit a deliberately vulnerable FastAPI application for OWASP Top 10 "
                "vulnerabilities (SQL injection, broken auth, SSRF, insecure deserialization). "
                "Document each finding with a PoC and implement verified fixes."
            ),
            "relevance_to_gap": "Validates application security skills by requiring both attack identification and remediation with evidence.",
            "learning_objectives": [
                "Identify and exploit a SQL injection vulnerability using sqlmap or manual testing",
                "Find and fix a broken authentication flow (missing token expiry or weak secret)",
                "Identify an SSRF vulnerability and implement URL allowlist validation",
                "Apply Content Security Policy and HSTS security headers",
                "Document all findings in a structured security report",
            ],
            "expected_deliverables": [
                "Security audit report documenting each vulnerability with CVSS score",
                "Git diff showing all security fixes",
                "Proof-of-concept for at least two vulnerabilities",
                "Automated test suite verifying fixes prevent exploits",
            ],
            "implementation_requirements": [
                "Use parameterised queries to fix SQL injection (no ORM bypass allowed)",
                "JWT tokens must have configurable expiry and be validated on every request",
                "SSRF fix must use an allowlist, not a blocklist",
                "Security report must follow OWASP vulnerability description format",
            ],
            "milestones": [
                {"step": 1, "title": "Vulnerability Discovery", "description": "Audit app for OWASP Top 10; document findings with severity.", "acceptance": "At least 3 findings documented with PoC"},
                {"step": 2, "title": "Fix Implementation", "description": "Implement all fixes; write regression tests that would catch the vulnerabilities.", "acceptance": "All PoCs fail against patched app"},
                {"step": 3, "title": "Security Report", "description": "Write structured security report with CVSS scores and fix verification.", "acceptance": "Report covers all findings with evidence"},
            ],
            "acceptance_criteria": [
                "SQL injection PoC fails against patched application",
                "Expired JWT returns 401 consistently",
                "SSRF fix correctly blocks external domain requests",
                "Security report contains CVSS scores for each finding",
            ],
            "rubric": [
                {"criterion": "Vulnerability Identification", "weight_pct": 35, "description": "Correct identification of vulnerabilities with PoC evidence"},
                {"criterion": "Fix Implementation Quality", "weight_pct": 40, "description": "Fixes are correct, minimal-diff, and do not break functionality"},
                {"criterion": "Security Report", "weight_pct": 25, "description": "Clear, structured report with CVSS scores and evidence"},
            ],
            "submission_instructions": "Submit repository with audit report, fix diff, PoC scripts, and regression test suite.",
            "resources": [
                {"title": "OWASP Top 10", "type": "documentation", "url_hint": "owasp.org/Top10"},
            ],
        },
    ],
}
