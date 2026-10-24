"""
Resource Providers Package.
Contains isolated adapters for YouTube, DEV.to, GitHub, freeCodeCamp, and provider aggregation.
"""

from backend.app.learning.providers.base import NormalizedLearningResource, BaseResourceProvider
from backend.app.learning.providers.youtube import YouTubeProviderAdapter
from backend.app.learning.providers.devto import DevToProviderAdapter
from backend.app.learning.providers.github import GitHubProviderAdapter
from backend.app.learning.providers.freecodecamp import FreeCodeCampProviderAdapter
from backend.app.learning.providers.aggregator import ResourceAggregator

__all__ = [
    "NormalizedLearningResource",
    "BaseResourceProvider",
    "YouTubeProviderAdapter",
    "DevToProviderAdapter",
    "GitHubProviderAdapter",
    "FreeCodeCampProviderAdapter",
    "ResourceAggregator",
]
