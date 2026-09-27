"""Repository for storing and caching generated Growth Narratives."""
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from uuid import uuid4

# In-memory fast cache with optional Supabase persistence
_NARRATIVE_CACHE: Dict[str, Dict[str, Any]] = {}


class NarrativeRepository:
    """Manages persistence and retrieval of generated narratives."""

    @staticmethod
    def _make_cache_key(learner_id: str, start_date: str, end_date: str) -> str:
        return f"{learner_id}_{start_date}_{end_date}"

    @classmethod
    def get_narrative(
        cls,
        learner_id: str,
        start_date: str,
        end_date: str
    ) -> Optional[Dict[str, Any]]:
        """Retrieve existing cached narrative for learner and evaluation period."""
        key = cls._make_cache_key(learner_id, start_date, end_date)
        return _NARRATIVE_CACHE.get(key)

    @classmethod
    def save_narrative(
        cls,
        learner_id: str,
        start_date: str,
        end_date: str,
        narrative_data: Dict[str, Any]
    ) -> str:
        """Persists generated narrative in memory cache."""
        key = cls._make_cache_key(learner_id, start_date, end_date)
        narrative_id = f"GN-{uuid4().hex[:8]}"
        record = {
            "narrative_id": narrative_id,
            "learner_id": learner_id,
            "start_date": start_date,
            "end_date": end_date,
            "created_at": datetime.now(timezone.utc).isoformat(),
            **narrative_data
        }
        _NARRATIVE_CACHE[key] = record
        return narrative_id

    @classmethod
    def clear_cache(cls):
        """Clears narrative cache for testing."""
        _NARRATIVE_CACHE.clear()
