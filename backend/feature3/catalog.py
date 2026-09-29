from typing import Dict, List, Optional
from backend.feature3.schemas import (
    CatalogRule,
    DeficiencyLevel,
    InterventionType,
    RecommendationPriority,
)

# Standard taxonomy mapping for GrowthLens
COMPETENCY_TAXONOMY: Dict[str, str] = {
    "C01": "Backend Engineering & API Development",
    "C02": "Data Processing & Analytics",
    "C03": "Database Systems & Storage",
    "C04": "DevOps & Cloud Infrastructure",
    "C05": "Quality Assurance & Testing",
    "C06": "Technical Communication & Collaboration",
    # UUID aliases
    "88149640-d265-4cb6-941b-7977d3ccd147": "Backend Engineering & API Development",
    "b8046f9a-737c-4572-b11d-ac4b1df1329b": "Data Processing & Analytics",
    "5c5ecbed-76b0-451b-8963-d8f55a6470d4": "Database Systems & Storage",
    "d801e4e1-fd6e-411e-aa14-fb6880cc0d44": "DevOps & Cloud Infrastructure",
    "42b81402-e327-4952-bd41-ada40ee34c5f": "Quality Assurance & Testing",
    "b675d718-0e4f-48ef-a73b-b3ca3abe6993": "Technical Communication & Collaboration",
}


def normalize_competency_name(cid_or_name: str) -> str:
    """Resolve competency ID or raw string to canonical name."""
    if cid_or_name in COMPETENCY_TAXONOMY:
        return COMPETENCY_TAXONOMY[cid_or_name]
    low = cid_or_name.lower()
    if "backend" in low or "api" in low:
        return "Backend Engineering & API Development"
    if "database" in low or "storage" in low or "sql" in low:
        return "Database Systems & Storage"
    if "data" in low or "analytics" in low:
        return "Data Processing & Analytics"
    if "devops" in low or "cloud" in low or "infra" in low:
        return "DevOps & Cloud Infrastructure"
    if "test" in low or "qa" in low or "quality" in low:
        return "Quality Assurance & Testing"
    if "comm" in low or "collab" in low or "lead" in low:
        return "Technical Communication & Collaboration"
    return cid_or_name


# Seed catalog rules mapping competency + deficiency level to targeted action
CATALOG_RULES: List[CatalogRule] = [
    # 1. Backend Engineering & API Development
    CatalogRule(
        id="RULE-BE-HIGH",
        competency_id="C01",
        competency_name="Backend Engineering & API Development",
        deficiency_level=DeficiencyLevel.HIGH,
        action_type=InterventionType.MICRO_LEARNING,
        priority=RecommendationPriority.HIGH,
        action_title_template="Review Python & FastAPI Exception Handling and Backpressure",
        action_description_template="High deficiency observed in backend error recovery. Review production patterns for async error handling, backpressure queues, and request timeouts.",
        search_keyword_template="Python FastAPI exception handling error middleware tutorial",
        target_topics=["exception handling", "middleware", "async error", "backpressure", "timeouts"],
    ),
    CatalogRule(
        id="RULE-BE-MOD",
        competency_id="C01",
        competency_name="Backend Engineering & API Development",
        deficiency_level=DeficiencyLevel.MODERATE,
        action_type=InterventionType.INTERNAL_MENTORSHIP,
        priority=RecommendationPriority.MEDIUM,
        action_title_template="Peer Code Walkthrough on API Concurrency Patterns",
        action_description_template="Moderate drift in backend implementation speed. Connect with an improving peer to review asynchronous programming patterns and connection pooling.",
        search_keyword_template="Python asyncio concurrency event loop tutorial",
        target_topics=["asyncio", "concurrency", "connection pool", "task group"],
    ),

    # 2. Data Processing & Analytics
    CatalogRule(
        id="RULE-DA-HIGH",
        competency_id="C02",
        competency_name="Data Processing & Analytics",
        deficiency_level=DeficiencyLevel.HIGH,
        action_type=InterventionType.MICRO_LEARNING,
        priority=RecommendationPriority.HIGH,
        action_title_template="Vector & Batch Data Transformation Optimization",
        action_description_template="High deceleration in analytics data pipeline commits. Deep dive into pandas/polars vectorized processing and batch transformation performance.",
        search_keyword_template="Polars Pandas vectorized operations data transformation tutorial",
        target_topics=["vectorized", "batch processing", "dataframe optimization", "memory efficiency"],
    ),
    CatalogRule(
        id="RULE-DA-MOD",
        competency_id="C02",
        competency_name="Data Processing & Analytics",
        deficiency_level=DeficiencyLevel.MODERATE,
        action_type=InterventionType.INTERNAL_MENTORSHIP,
        priority=RecommendationPriority.MEDIUM,
        action_title_template="Mentorship Session on Data Validation & Schema Integrity",
        action_description_template="Moderate drift in data ingestion quality. Consult an internal mentor with strong data pipeline momentum on Pydantic validation and schema contracts.",
        search_keyword_template="Pydantic data validation ETL schema contracts tutorial",
        target_topics=["schema validation", "pydantic", "data pipeline contracts"],
    ),

    # 3. Database Systems & Storage
    CatalogRule(
        id="RULE-DB-HIGH",
        competency_id="C03",
        competency_name="Database Systems & Storage",
        deficiency_level=DeficiencyLevel.HIGH,
        action_type=InterventionType.MICRO_LEARNING,
        priority=RecommendationPriority.HIGH,
        action_title_template="Master PostgreSQL Index Selectivity & EXPLAIN ANALYZE",
        action_description_template="Observed query latency degradation. Complete a focused micro-learning module on query planning, composite index optimization, and dead-lock prevention.",
        search_keyword_template="PostgreSQL index selectivity EXPLAIN ANALYZE tuning tutorial",
        target_topics=["index", "explain analyze", "btree", "query plan", "deadlock"],
    ),
    CatalogRule(
        id="RULE-DB-MOD",
        competency_id="C03",
        competency_name="Database Systems & Storage",
        deficiency_level=DeficiencyLevel.MODERATE,
        action_type=InterventionType.INTERNAL_MENTORSHIP,
        priority=RecommendationPriority.MEDIUM,
        action_title_template="Peer Architecture Review of Database Schema & Migrations",
        action_description_template="Stagnating database evidence. Pair with an internal senior engineer to review safe schema migration patterns and transactional integrity.",
        search_keyword_template="PostgreSQL safe schema migrations zero downtime tutorial",
        target_topics=["migrations", "lock timeout", "foreign keys", "isolation"],
    ),

    # 4. DevOps & Cloud Infrastructure
    CatalogRule(
        id="RULE-DO-HIGH",
        competency_id="C04",
        competency_name="DevOps & Cloud Infrastructure",
        deficiency_level=DeficiencyLevel.HIGH,
        action_type=InterventionType.MICRO_LEARNING,
        priority=RecommendationPriority.HIGH,
        action_title_template="Hands-On Docker & Kubernetes Health Checks & CI/CD",
        action_description_template="Observed instability in deployment pipeline evidence. Review container multi-stage build caching, liveness/readiness probes, and GitHub Actions workflows.",
        search_keyword_template="Docker multi-stage builds Kubernetes health probes GitHub actions tutorial",
        target_topics=["docker", "probes", "github actions", "ci cd pipeline", "kubernetes"],
    ),
    CatalogRule(
        id="RULE-DO-MOD",
        competency_id="C04",
        competency_name="DevOps & Cloud Infrastructure",
        deficiency_level=DeficiencyLevel.MODERATE,
        action_type=InterventionType.INTERNAL_MENTORSHIP,
        priority=RecommendationPriority.MEDIUM,
        action_title_template="Infrastructure Pairing on Secret Management & Observability",
        action_description_template="Moderate plateau in cloud infrastructure tasks. Pair with a DevOps mentor to review secret rotation, Prometheus metrics, and OpenTelemetry instrumentation.",
        search_keyword_template="Docker Prometheus OpenTelemetry observability tutorial",
        target_topics=["opentelemetry", "prometheus", "secret management", "logging"],
    ),

    # 5. Quality Assurance & Testing
    CatalogRule(
        id="RULE-QA-HIGH",
        competency_id="C05",
        competency_name="Quality Assurance & Testing",
        deficiency_level=DeficiencyLevel.HIGH,
        action_type=InterventionType.MICRO_LEARNING,
        priority=RecommendationPriority.HIGH,
        action_title_template="Automated Pytest Fixtures, Mocking, and Async Test Suite",
        action_description_template="High decline in testing velocity and test coverage. Complete a targeted tutorial on pytest async fixtures, monkeypatching, and integration test setup.",
        search_keyword_template="pytest fixtures mocking async test suite python tutorial",
        target_topics=["fixtures", "mock", "async test", "parametrize", "coverage"],
    ),
    CatalogRule(
        id="RULE-QA-MOD",
        competency_id="C05",
        competency_name="Quality Assurance & Testing",
        deficiency_level=DeficiencyLevel.MODERATE,
        action_type=InterventionType.INTERNAL_MENTORSHIP,
        priority=RecommendationPriority.MEDIUM,
        action_title_template="Test Strategy Alignment with Internal QA Champion",
        action_description_template="Testing evidence shows stagnating coverage. Connect with an improving QA peer to establish regression test suites and end-to-end automation.",
        search_keyword_template="automated testing pyramid regression test suite tutorial",
        target_topics=["test pyramid", "regression", "end to end testing", "assertions"],
    ),

    # 6. Technical Communication & Collaboration
    CatalogRule(
        id="RULE-TC-HIGH",
        competency_id="C06",
        competency_name="Technical Communication & Collaboration",
        deficiency_level=DeficiencyLevel.HIGH,
        action_type=InterventionType.INTERNAL_MENTORSHIP,
        priority=RecommendationPriority.HIGH,
        action_title_template="Technical Mentorship on Cross-Functional RFCs & PR Reviews",
        action_description_template="Evidence indicates declining collaboration and PR review feedback. Schedule a mentorship session on structuring RFCs, writing constructive code reviews, and architectural decision records.",
        search_keyword_template="effective technical communication code review best practices",
        target_topics=["code review", "rfc", "documentation", "feedback", "adr"],
    ),
    CatalogRule(
        id="RULE-TC-MOD",
        competency_id="C06",
        competency_name="Technical Communication & Collaboration",
        deficiency_level=DeficiencyLevel.MODERATE,
        action_type=InterventionType.MICRO_LEARNING,
        priority=RecommendationPriority.LOW,
        action_title_template="Mastering Architectural Decision Records (ADRs) and Technical Writing",
        action_description_template="Moderate plateau in technical documentation. Complete a 15-minute guide on documenting engineering tradeoffs and clear system documentation.",
        search_keyword_template="architectural decision records ADR technical writing tutorial",
        target_topics=["adr", "technical writing", "tradeoffs", "design doc"],
    ),
]


class RecommendationCatalogService:
    """Manages deterministic lookup of recommendation rules by competency and deficiency."""

    def __init__(self, rules: Optional[List[CatalogRule]] = None):
        self.rules = rules or CATALOG_RULES

    def find_rule(
        self,
        competency_id_or_name: str,
        deficiency_level: DeficiencyLevel,
        prefer_action: Optional[InterventionType] = None,
    ) -> Optional[CatalogRule]:
        canonical_name = normalize_competency_name(competency_id_or_name)
        
        # 1. Exact match by competency name & deficiency
        for r in self.rules:
            if r.competency_name.lower() == canonical_name.lower() and r.deficiency_level == deficiency_level:
                if prefer_action is None or r.action_type == prefer_action:
                    return r

        # 2. Match by competency name alone
        for r in self.rules:
            if r.competency_name.lower() == canonical_name.lower():
                if prefer_action is None or r.action_type == prefer_action:
                    return r

        # 3. Match by partial keyword
        for r in self.rules:
            if any(term in canonical_name.lower() for term in r.competency_name.lower().split()):
                return r

        return None

    def list_rules(self) -> List[CatalogRule]:
        return self.rules
