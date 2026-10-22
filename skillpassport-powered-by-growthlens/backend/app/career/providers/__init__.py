from backend.app.career.providers.base import (
    BaseJobSearchAdapter,
    JobSearchResult,
    generate_canonical_dedupe_key,
)
from backend.app.career.providers.jsearch import JSearchAdapter
from backend.app.career.providers.theirstack import TheirStackAdapter
from backend.app.career.providers.fantastic_jobs import FantasticJobsAdapter

__all__ = [
    "BaseJobSearchAdapter",
    "JobSearchResult",
    "generate_canonical_dedupe_key",
    "JSearchAdapter",
    "TheirStackAdapter",
    "FantasticJobsAdapter",
]
