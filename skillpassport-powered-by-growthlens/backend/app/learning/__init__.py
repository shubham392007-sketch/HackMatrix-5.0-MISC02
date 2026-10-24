"""
Learn & Grow Domain Package.
Provides adaptive learning journeys, deterministic skill gap prioritization,
isolated multi-provider resource discovery, and local AI curriculum advising.
"""

from backend.app.learning.contracts import (
    ProficiencyTier,
    RequirementType,
    ImportanceLevel,
    GapClassification,
    VerificationState,
    TrajectoryTrend,
    SkillIntelligenceRecord,
    EvidenceReference,
    RoleContext,
    CompetencyHeader,
    CapabilityState,
    GovernanceEvidenceState,
    LongitudinalSignal,
    CareerIntelligenceGapRecord,
    UpstreamGapTrigger,
    StudentLearningState,
)
from backend.app.learning.prioritizer import (
    PrioritizationReasonCode,
    SuggestedNextAction,
    PrioritizationResult,
    SkillGapPrioritizer,
)
from backend.app.learning.ai_advisor import (
    LearningStageRecommendation,
    LearningPathRecommendation,
    ResourceSelectionExplanation,
    PracticeBrief,
    LearningAIAdvisor,
)
from backend.app.learning.providers.base import (
    NormalizedLearningResource,
    ProviderStatus,
    ProviderSearchResult,
    AggregationResult,
    BaseResourceProvider,
)
from backend.app.learning.providers.youtube import YouTubeProviderAdapter
from backend.app.learning.providers.devto import DevToProviderAdapter
from backend.app.learning.providers.github import GitHubProviderAdapter
from backend.app.learning.providers.aggregator import ResourceAggregator

__version__ = "1.0.0"

__all__ = [
    # Contracts
    "ProficiencyTier",
    "RequirementType",
    "ImportanceLevel",
    "GapClassification",
    "VerificationState",
    "TrajectoryTrend",
    "SkillIntelligenceRecord",
    "EvidenceReference",
    "RoleContext",
    "CompetencyHeader",
    "CapabilityState",
    "GovernanceEvidenceState",
    "LongitudinalSignal",
    "CareerIntelligenceGapRecord",
    "UpstreamGapTrigger",
    "StudentLearningState",
    # Prioritizer
    "PrioritizationReasonCode",
    "SuggestedNextAction",
    "PrioritizationResult",
    "SkillGapPrioritizer",
    # AI Advisor
    "LearningStageRecommendation",
    "LearningPathRecommendation",
    "ResourceSelectionExplanation",
    "PracticeBrief",
    "LearningAIAdvisor",
    # Providers
    "NormalizedLearningResource",
    "ProviderStatus",
    "ProviderSearchResult",
    "AggregationResult",
    "BaseResourceProvider",
    "YouTubeProviderAdapter",
    "DevToProviderAdapter",
    "GitHubProviderAdapter",
    "ResourceAggregator",
]
