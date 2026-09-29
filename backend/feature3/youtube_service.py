import os
import re
import urllib.parse
from typing import Any, Dict, List, Optional
import httpx
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound

from backend.core.config import get_settings
from backend.core.logging import get_logger
from backend.feature3.schemas import ResourceDeepLink

logger = get_logger("feature3.youtube")

# In-memory resource cache to preserve API quota
_RESOURCE_CACHE: Dict[str, ResourceDeepLink] = {}

# High-quality verified public tutorials for fallback when YouTube API key is missing or quota is exceeded
CURATED_FALLBACK_RESOURCES: Dict[str, Dict[str, Any]] = {
    "backend": {
        "video_id": "77Xm8jZtqXQ",
        "title": "FastAPI Full Course - Building High Performance Production APIs",
        "channel": "freeCodeCamp.org",
        "url": "https://www.youtube.com/watch?v=77Xm8jZtqXQ",
        "thumbnail": "https://img.youtube.com/vi/77Xm8jZtqXQ/hqdefault.jpg",
    },
    "database": {
        "video_id": "clv4QJ3Hk4g",
        "title": "PostgreSQL Indexing & Performance Optimization Complete Guide",
        "channel": "Hussein Nasser",
        "url": "https://www.youtube.com/watch?v=clv4QJ3Hk4g",
        "thumbnail": "https://img.youtube.com/vi/clv4QJ3Hk4g/hqdefault.jpg",
    },
    "data": {
        "video_id": "r-uOLxNrNk8",
        "title": "Pandas & Polars Data Processing Performance Optimization",
        "channel": "Corey Schafer",
        "url": "https://www.youtube.com/watch?v=r-uOLxNrNk8",
        "thumbnail": "https://img.youtube.com/vi/r-uOLxNrNk8/hqdefault.jpg",
    },
    "devops": {
        "video_id": "fqMOX6JJhGo",
        "title": "Docker & Kubernetes Containerization Architecture Complete Guide",
        "channel": "TechWorld with Nana",
        "url": "https://www.youtube.com/watch?v=fqMOX6JJhGo",
        "thumbnail": "https://img.youtube.com/vi/fqMOX6JJhGo/hqdefault.jpg",
    },
    "quality": {
        "video_id": "byaxg00Gf9I",
        "title": "Automated Testing with Pytest: Fixtures, Mocks & Async Testing",
        "channel": "ArjanCodes",
        "url": "https://www.youtube.com/watch?v=byaxg00Gf9I",
        "thumbnail": "https://img.youtube.com/vi/byaxg00Gf9I/hqdefault.jpg",
    },
    "communication": {
        "video_id": "r8bWq4k6aI8",
        "title": "Engineering Communication: Writing RFCs and Impactful PR Reviews",
        "channel": "Google TechTalks",
        "url": "https://www.youtube.com/watch?v=r8bWq4k6aI8",
        "thumbnail": "https://img.youtube.com/vi/r8bWq4k6aI8/hqdefault.jpg",
    },
}


class YouTubeDiscoveryService:
    """Discovers validated learning resources and performs transcript timestamp deep-linking."""

    def __init__(self, api_key: Optional[str] = None):
        settings = get_settings()
        self.api_key = api_key or settings.youtube_api_key or os.getenv("YOUTUBE_API_KEY", "")

    def discover_resource(
        self,
        query: str,
        target_topics: Optional[List[str]] = None,
        competency_name: str = "",
    ) -> ResourceDeepLink:
        """Search YouTube for tutorial, extract transcript, and find deep link timestamp."""
        cache_key = f"{query}_{','.join(target_topics or [])}".strip().lower()
        if cache_key in _RESOURCE_CACHE:
            logger.info(f"Returning cached YouTube resource for query '{query}'")
            return _RESOURCE_CACHE[cache_key]

        video_info = None

        # 1. Attempt YouTube Data API v3 Search if API key is configured
        if self.api_key and len(self.api_key) > 10:
            try:
                video_info = self._search_youtube_api(query)
            except Exception as e:
                logger.warning(f"YouTube Data API search failed: {e}. Falling back to curated video pool.")

        # 2. Fallback to curated verified technical tutorials if API failed or no key
        if not video_info:
            video_info = self._get_fallback_video(competency_name, query)

        video_id = video_info["video_id"]
        base_url = f"https://www.youtube.com/watch?v={video_id}"

        # 3. Transcript Extraction & Semantic Timestamp Matching
        deep_link, timestamp_sec, snippet, topic = self._match_transcript_timestamp(
            video_id, target_topics or [query]
        )

        formatted_ts = None
        has_timestamp = False
        if timestamp_sec is not None and timestamp_sec > 0:
            minutes = timestamp_sec // 60
            seconds = timestamp_sec % 60
            formatted_ts = f"{minutes:02d}:{seconds:02d}"
            has_timestamp = True
            deep_link_url = f"{base_url}&t={timestamp_sec}s"
        else:
            deep_link_url = base_url
            formatted_ts = "Timestamp unavailable for this resource"

        resource = ResourceDeepLink(
            video_id=video_id,
            video_url=base_url,
            deep_link_url=deep_link_url,
            title=video_info["title"],
            channel_title=video_info.get("channel", "Technical Educator"),
            thumbnail_url=video_info.get("thumbnail") or f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
            timestamp_seconds=timestamp_sec if has_timestamp else None,
            timestamp_formatted=formatted_ts,
            matched_topic=topic or (target_topics[0] if target_topics else "Skill Overview"),
            matched_snippet=snippet,
            timestamp_available=has_timestamp,
        )

        _RESOURCE_CACHE[cache_key] = resource
        return resource

    def _search_youtube_api(self, query: str) -> Dict[str, Any]:
        """Perform search query against YouTube Data API v3."""
        endpoint = "https://www.googleapis.com/youtube/v3/search"
        params = {
            "part": "snippet",
            "type": "video",
            "maxResults": 4,
            "q": f"{query} full tutorial",
            "videoCaption": "closedCaption",  # Prioritize videos with transcripts
            "key": self.api_key,
        }
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(endpoint, params=params)
            items = []
            if resp.status_code == 200:
                items = resp.json().get("items", [])
            if not items:
                # Retry without videoCaption constraint for wider pool
                params.pop("videoCaption", None)
                resp = client.get(endpoint, params=params)
                resp.raise_for_status()
                items = resp.json().get("items", [])

            if not items:
                raise ValueError("No video results found in YouTube search API")
            top = items[0]
            vid = top["id"]["videoId"]
            snippet = top["snippet"]
            return {
                "video_id": vid,
                "title": snippet["title"],
                "channel": snippet.get("channelTitle", "Verified Instructor"),
                "thumbnail": snippet.get("thumbnails", {}).get("high", {}).get("url")
                or snippet.get("thumbnails", {}).get("medium", {}).get("url")
                or f"https://img.youtube.com/vi/{vid}/hqdefault.jpg",
            }

    def _get_fallback_video(self, competency_name: str, query: str) -> Dict[str, Any]:
        """Map query or competency name to a curated, high-quality technical video."""
        low = (competency_name + " " + query).lower()
        if "backend" in low or "api" in low or "fastapi" in low:
            return CURATED_FALLBACK_RESOURCES["backend"]
        if "database" in low or "storage" in low or "postgres" in low or "sql" in low:
            return CURATED_FALLBACK_RESOURCES["database"]
        if "data" in low or "analytics" in low or "pandas" in low:
            return CURATED_FALLBACK_RESOURCES["data"]
        if "devops" in low or "cloud" in low or "docker" in low or "kubernetes" in low:
            return CURATED_FALLBACK_RESOURCES["devops"]
        if "test" in low or "qa" in low or "quality" in low or "pytest" in low:
            return CURATED_FALLBACK_RESOURCES["quality"]
        return CURATED_FALLBACK_RESOURCES["communication"]

    def _match_transcript_timestamp(
        self,
        video_id: str,
        target_topics: List[str],
    ) -> tuple[Optional[str], Optional[int], Optional[str], Optional[str]]:
        """Retrieve transcript using youtube-transcript-api and locate relevant section."""
        transcript_list = []
        try:
            yta = YouTubeTranscriptApi()
            fetched = yta.fetch(video_id, languages=["en", "en-US", "en-GB"])
            transcript_list = [{"text": getattr(s, "text", ""), "start": getattr(s, "start", 0)} for s in fetched]
        except Exception:
            try:
                raw = YouTubeTranscriptApi.get_transcript(video_id, languages=["en", "en-US", "en-GB"])
                transcript_list = [{"text": r.get("text", ""), "start": r.get("start", 0)} for r in raw]
            except Exception as e:
                logger.info(f"Transcript unavailable for video {video_id}: {e}")
                return None, None, None, None

        if not transcript_list:
            return None, None, None, None

        # Build candidate keyword tokens
        topic_tokens = set()
        for t in target_topics:
            for word in re.findall(r"\w+", t.lower()):
                if len(word) > 2 and word not in {"and", "the", "for", "with", "tutorial", "guide"}:
                    topic_tokens.add(word)

        best_score = 0
        best_entry = None
        best_matched_topic = None

        for entry in transcript_list:
            text = entry.get("text", "").lower()
            # Count token occurrences
            score = sum(1 for token in topic_tokens if token in text)
            if score > best_score:
                best_score = score
                best_entry = entry
                for t in target_topics:
                    if any(tok in t.lower() for tok in topic_tokens if tok in text):
                        best_matched_topic = t
                        break

        # If a relevant entry was found
        if best_entry and best_score >= 1:
            timestamp_sec = int(best_entry.get("start", 0))
            snippet = best_entry.get("text", "").strip()
            deep_link = f"https://www.youtube.com/watch?v={video_id}&t={timestamp_sec}s"
            logger.info(f"Found transcript match for video {video_id} at {timestamp_sec}s: '{snippet}'")
            return deep_link, timestamp_sec, snippet, best_matched_topic

        # If no specific keyword matched, default to start without fake timestamp
        return None, None, None, None
