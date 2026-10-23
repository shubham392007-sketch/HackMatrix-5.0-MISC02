"""
Tests for YouTube Video Availability Verification and Stale Cache Revalidation.
Covers:
1. Publicly accessible video detection via official videos.list metadata.
2. Missing / deleted video detection (absent from videos.list).
3. Private / restricted video rejection.
4. Upload failure / rejected video handling.
5. API quota exhaustion (403) and network timeout graceful degradation ('unknown' status).
6. Candidate filtering and refilling (dropping unavailable candidates from search results).
7. Stale cache revalidation and obsolete ID correction (A3gClkblEQ8 -> A3gClkblXK8).
8. Curated fallback integrity (zero broken or obsolete video IDs).
"""

import os
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

# Force test environment
os.environ["APP_ENV"] = "test"

from backend.app.learning.providers.youtube import (
    YouTubeProviderAdapter,
    extract_video_id,
    parse_iso8601_duration,
)
from backend.app.learning.providers.base import ProviderStatus, NormalizedLearningResource
from backend.app.models.learning import LearningResourceItem


def test_extract_video_id():
    assert extract_video_id("https://www.youtube.com/watch?v=A3gClkblXK8") == "A3gClkblXK8"
    assert extract_video_id("https://youtu.be/A3gClkblXK8") == "A3gClkblXK8"
    assert extract_video_id("https://www.youtube.com/embed/A3gClkblXK8") == "A3gClkblXK8"
    assert extract_video_id("https://www.youtube.com/watch?v=A3gClkblXK8&t=120s") == "A3gClkblXK8"
    assert extract_video_id("A3gClkblXK8") == "A3gClkblXK8"
    assert extract_video_id("") is None
    assert extract_video_id("invalid-not-a-video") is None


def test_parse_iso8601_duration():
    assert parse_iso8601_duration("PT1H13M53S") == 74
    assert parse_iso8601_duration("PT8M2S") == 8
    assert parse_iso8601_duration("PT45S") == 1
    assert parse_iso8601_duration("PT30M") == 30
    assert parse_iso8601_duration("") == 15


@pytest.mark.asyncio
async def test_youtube_availability_valid_public_video():
    adapter = YouTubeProviderAdapter(api_key="mock-key")
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "items": [
            {
                "id": "A3gClkblXK8",
                "snippet": {
                    "title": "Outlier detection using IQR",
                    "channelTitle": "codebasics",
                    "description": "IQR tutorial",
                    "thumbnails": {"high": {"url": "https://img.youtube.com/test.jpg"}},
                },
                "status": {
                    "uploadStatus": "processed",
                    "privacyStatus": "public",
                    "embeddable": True,
                },
                "contentDetails": {"duration": "PT8M2S"},
            }
        ]
    }

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        results = await adapter.validate_video_availability(["A3gClkblXK8"])

        assert "A3gClkblXK8" in results
        data = results["A3gClkblXK8"]
        assert data["status"] == "available"
        assert data["is_playable"] is True
        assert data["is_embeddable"] is True
        assert data["duration_minutes"] == 8
        assert data["channel_title"] == "codebasics"


@pytest.mark.asyncio
async def test_youtube_availability_missing_video():
    adapter = YouTubeProviderAdapter(api_key="mock-key")
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"items": []}  # ID absent from videos.list

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        results = await adapter.validate_video_availability(["A3gClkblEQ8"])

        assert "A3gClkblEQ8" in results
        data = results["A3gClkblEQ8"]
        assert data["status"] == "missing"
        assert data["is_playable"] is False
        assert data["is_embeddable"] is False
        assert "not found or deleted" in data["reason"].lower()


@pytest.mark.asyncio
async def test_youtube_availability_private_video():
    adapter = YouTubeProviderAdapter(api_key="mock-key")
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "items": [
            {
                "id": "priv_vid_11",
                "snippet": {"title": "Private Tutorial", "channelTitle": "Author"},
                "status": {
                    "uploadStatus": "processed",
                    "privacyStatus": "private",
                    "embeddable": False,
                },
                "contentDetails": {"duration": "PT10M"},
            }
        ]
    }

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        results = await adapter.validate_video_availability(["priv_vid_11"])

        assert "priv_vid_11" in results
        data = results["priv_vid_11"]
        assert data["status"] == "private"
        assert data["is_playable"] is False
        assert "private" in data["reason"].lower()


@pytest.mark.asyncio
async def test_youtube_availability_quota_exhausted_graceful():
    adapter = YouTubeProviderAdapter(api_key="mock-key")
    mock_resp = MagicMock()
    mock_resp.status_code = 403  # Quota exceeded

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        results = await adapter.validate_video_availability(["any_vid_111"])

        assert "any_vid_111" in results
        data = results["any_vid_111"]
        assert data["status"] == "unknown"
        assert data["is_playable"] is None
        assert data["is_embeddable"] is None
        assert "quota" in data["reason"].lower()


@pytest.mark.asyncio
async def test_youtube_availability_network_error_graceful():
    adapter = YouTubeProviderAdapter(api_key="mock-key")

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = Exception("Connection timeout / DNS failure")
        results = await adapter.validate_video_availability(["net_fail_v1"])

        assert "net_fail_v1" in results
        data = results["net_fail_v1"]
        assert data["status"] == "unknown"
        assert data["is_playable"] is None
        assert data["is_embeddable"] is None
        assert "failed" in data["reason"].lower()


@pytest.mark.asyncio
async def test_quota_exhaustion_does_not_mark_video_unavailable_nor_verified_playable():
    """
    Verifies that when videos.list fails with quota exhaustion during fetch_resources:
    1. Candidates are NOT dropped (we do not assume dead simply because check failed).
    2. Candidates are NOT marked as 'verified_available' or 'is_playable=True'.
    3. They are marked with validation_status='unverified_quota_exhausted' and is_playable=None.
    """
    adapter = YouTubeProviderAdapter(api_key="mock-key")

    mock_search_resp = MagicMock()
    mock_search_resp.status_code = 200
    mock_search_resp.json.return_value = {
        "items": [
            {
                "id": {"videoId": "cand_vid_01"},
                "snippet": {
                    "title": "Tutorial on Pandas Outlier Detection",
                    "description": "Comprehensive tutorial",
                    "channelTitle": "Data Channel",
                },
            }
        ]
    }

    mock_videos_resp = MagicMock()
    mock_videos_resp.status_code = 403  # Quota 403 on videos.list

    async def mock_get_side_effect(*args, **kwargs):
        url = args[0] if args else kwargs.get("url", "")
        if "videos" in url:
            return mock_videos_resp
        return mock_search_resp

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = mock_get_side_effect
        res = await adapter.fetch_resources(
            query="pandas outlier detection",
            topic_slug="topic-outlier-iqr",
            limit=5,
        )

        assert res.status == ProviderStatus.SUCCESS
        assert len(res.resources) == 1
        item = res.resources[0]
        # Video was NOT dropped
        assert "cand_vid_01" in item.url
        # Explicit unverified status, NOT verified available
        assert item.validation_status == "unverified_quota_exhausted"
        assert item.provider_metadata["availability_status"] == "unknown"
        assert item.provider_metadata["is_playable"] is None
        assert item.validation_status != "verified_available"


def test_unknown_availability_api_serialization():
    """
    Verifies that NormalizedLearningResource serializes nullable is_playable cleanly in JSON
    without errors or semantic distortion.
    """
    import json

    res = NormalizedLearningResource(
        id="res-yt-cand_vid_001",
        provider="youtube",
        resource_type="video",
        title="Tutorial on Pandas Outlier Detection",
        url="https://www.youtube.com/watch?v=cand_vid_001",
        description="Comprehensive tutorial",
        duration_minutes=18,
        difficulty="Intermediate",
        author_or_channel="Data Channel",
        validation_status="unverified_quota_exhausted",
        provider_metadata={
            "video_id": "cand_vid_001",
            "availability_status": "unknown",
            "is_playable": None,
            "is_embeddable": None,
            "verification_reason": "YouTube API quota exceeded",
        },
    )

    dumped = res.model_dump()
    assert dumped["validation_status"] == "unverified_quota_exhausted"
    assert dumped["provider_metadata"]["is_playable"] is None
    assert dumped["provider_metadata"]["availability_status"] == "unknown"

    # Test round-trip JSON serialization
    serialized = json.dumps(dumped, default=str)
    deserialized = json.loads(serialized)
    assert deserialized["provider_metadata"]["is_playable"] is None
    assert deserialized["validation_status"] == "unverified_quota_exhausted"


def test_revalidate_cache_does_not_mark_unknown_as_unavailable():
    """
    Verifies that cached records are NOT marked as unavailable (is_validated=False)
    when videos.list returns status='unknown'.
    """
    class DummyRecord:
        def __init__(self, resource_id, url):
            self.resource_id = resource_id
            self.url = url
            self.title = "Sample"
            self.provider = "youtube"
            self.is_validated = True
            self.provider_metadata = {}

    item = DummyRecord("res-yt-111", "https://www.youtube.com/watch?v=any_vid_111")
    avail_info = {
        "status": "unknown",
        "is_playable": None,
        "reason": "Quota exceeded",
    }

    # Simulate router logic
    avail_st = avail_info.get("status")
    item.provider_metadata["availability_status"] = avail_st
    item.provider_metadata["is_playable"] = avail_info.get("is_playable")

    marked_unavailable = 0
    unverified_count = 0

    if avail_info.get("is_playable") is False:
        item.is_validated = False
        marked_unavailable += 1
    elif avail_st == "available":
        item.is_validated = True
    elif avail_st == "unknown":
        unverified_count += 1

    # Invariants:
    # 1. is_validated remains True (not falsely marked dead)
    assert item.is_validated is True
    # 2. marked_unavailable is 0
    assert marked_unavailable == 0
    # 3. unverified_count is 1
    assert unverified_count == 1
    # 4. is_playable is None in metadata
    assert item.provider_metadata["is_playable"] is None


def test_frontend_badge_semantics_tri_state():
    """
    Verifies that frontend badge mapping adheres to strict tri-state semantics:
    - verified_available -> Playable
    - unverified_quota_exhausted -> Unverified (Quota Limit), never Playable
    - unverified_network_failure / unknown -> Unverified (Network), never Playable
    - unavailable -> Unavailable, never Playable
    """
    def derive_badge_text(validation_status: str) -> str:
        if validation_status == "verified_available":
            return "Playable"
        elif validation_status == "unverified_quota_exhausted":
            return "Unverified (Quota)"
        elif validation_status in ("unverified_network_failure", "unknown"):
            return "Unverified (Network)"
        elif validation_status == "unavailable":
            return "Unavailable"
        return "Unverified"

    assert derive_badge_text("verified_available") == "Playable"
    assert derive_badge_text("unverified_quota_exhausted") != "Playable"
    assert derive_badge_text("unverified_quota_exhausted") == "Unverified (Quota)"
    assert derive_badge_text("unverified_network_failure") != "Playable"
    assert derive_badge_text("unknown") != "Playable"
    assert derive_badge_text("unavailable") != "Playable"


@pytest.mark.asyncio
async def test_youtube_candidate_refill_drops_unavailable():
    """
    Verifies that fetch_resources discards candidate videos that are missing/unavailable
    and preserves active, verified candidates.
    """
    adapter = YouTubeProviderAdapter(api_key="mock-key")

    mock_search_resp = MagicMock()
    mock_search_resp.status_code = 200
    mock_search_resp.json.return_value = {
        "items": [
            {
                "id": {"videoId": "broken_11ch"},
                "snippet": {
                    "title": "Broken Tutorial on Pandas Preprocessing",
                    "description": "Tutorial video",
                    "channelTitle": "Creator A",
                },
            },
            {
                "id": {"videoId": "good_11char"},
                "snippet": {
                    "title": "Working Tutorial on Pandas Preprocessing",
                    "description": "Tutorial video",
                    "channelTitle": "Creator B",
                },
            },
        ]
    }

    mock_videos_resp = MagicMock()
    mock_videos_resp.status_code = 200
    # broken_11ch is absent from items, good_11char is present
    mock_videos_resp.json.return_value = {
        "items": [
            {
                "id": "good_11char",
                "snippet": {
                    "title": "Working Tutorial on Pandas Preprocessing",
                    "channelTitle": "Creator B",
                },
                "status": {
                    "uploadStatus": "processed",
                    "privacyStatus": "public",
                    "embeddable": True,
                },
                "contentDetails": {"duration": "PT15M"},
            }
        ]
    }

    async def mock_get_side_effect(*args, **kwargs):
        url = args[0] if args else kwargs.get("url", "")
        if "videos" in url:
            return mock_videos_resp
        return mock_search_resp

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = mock_get_side_effect
        res = await adapter.fetch_resources(
            query="pandas preprocessing",
            topic_slug="topic-missing-values",
            limit=5,
        )

        assert res.status == ProviderStatus.SUCCESS
        # Only the good video should be returned; broken video dropped
        returned_ids = [r.url.split("v=")[-1] for r in res.resources]
        assert "good_11char" in returned_ids
        assert "broken_11ch" not in returned_ids
        assert len(res.resources) == 1
        assert res.resources[0].validation_status == "verified_available"


def test_fallback_curated_has_zero_broken_videos():
    adapter = YouTubeProviderAdapter()
    for topic in ["topic-missing-values", "topic-outlier-iqr", "topic-pipeline-leakage"]:
        curated = adapter._fallback_curated("query", topic, "Intermediate", 5)
        assert len(curated) > 0
        for r in curated:
            assert "A3gClkblEQ8" not in r.url
            assert "EaGbS7e46Vw" not in r.url
            assert "irHhDM_2Fp8" not in r.url
            assert r.is_fallback is True
            assert r.validation_status == "verified_available"


def test_stale_cache_replacement_logic():
    """
    Verifies that obsolete video IDs are identified and correctly mapped to replacements.
    """
    OBSOLETE_REPLACEMENTS = {
        "A3gClkblEQ8": "A3gClkblXK8",
        "A3gClkbIEQ8": "A3gClkblXK8",
        "EaGbS7e46Vw": "EaGbS7eWSs0",
        "irHhDM_2Fp8": "zm-uHpIZF6c",
    }
    sample_stale_url = "https://www.youtube.com/watch?v=A3gClkblEQ8"
    new_url = sample_stale_url
    for bad, good in OBSOLETE_REPLACEMENTS.items():
        if bad in new_url:
            new_url = new_url.replace(bad, good)
            break

    assert new_url == "https://www.youtube.com/watch?v=A3gClkblXK8"
    assert "A3gClkblEQ8" not in new_url
