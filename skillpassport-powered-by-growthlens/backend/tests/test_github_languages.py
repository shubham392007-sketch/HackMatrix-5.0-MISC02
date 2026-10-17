import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch, MagicMock
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import app
from backend.app.db.session import SessionLocal
from backend.app.api.dependencies import get_current_user, AuthenticatedUser
from backend.app.models.connection import ConnectedSource, SelectedResource
from backend.app.models.language import RepositoryLanguageSnapshot, RepositoryLanguageBreakdown
from backend.app.models.evidence import EvidenceItem
from backend.app.models.sync_run import SourceSyncRun
from backend.app.core.security import encrypt_credential
from backend.app.integrations.github.client import GitHubClient
from backend.app.integrations.github.language_service import (
    calculate_repository_percentages,
    calculate_aggregate_languages,
    sync_repository_languages,
    get_repository_languages_response,
    get_user_languages_summary,
)

client = TestClient(app)


# -----------------------------------------------------------------------------
# Scenario 1: Repository with multiple languages
# -----------------------------------------------------------------------------
def test_scenario_01_repository_with_multiple_languages():
    raw_languages = {
        "TypeScript": 50000,
        "Python": 30000,
        "HTML": 20000,
    }
    total_bytes, breakdowns = calculate_repository_percentages(raw_languages)

    assert total_bytes == 100000
    assert len(breakdowns) == 3
    # Verify sorted descending by byte count
    assert breakdowns[0]["language_name"] == "TypeScript"
    assert breakdowns[0]["byte_count"] == 50000
    assert breakdowns[0]["percentage"] == 50.0

    assert breakdowns[1]["language_name"] == "Python"
    assert breakdowns[1]["byte_count"] == 30000
    assert breakdowns[1]["percentage"] == 30.0

    assert breakdowns[2]["language_name"] == "HTML"
    assert breakdowns[2]["byte_count"] == 20000
    assert breakdowns[2]["percentage"] == 20.0


# -----------------------------------------------------------------------------
# Scenario 2: Repository with single language
# -----------------------------------------------------------------------------
def test_scenario_02_repository_with_single_language():
    raw_languages = {"Rust": 42000}
    total_bytes, breakdowns = calculate_repository_percentages(raw_languages)

    assert total_bytes == 42000
    assert len(breakdowns) == 1
    assert breakdowns[0]["language_name"] == "Rust"
    assert breakdowns[0]["byte_count"] == 42000
    assert breakdowns[0]["percentage"] == 100.0


# -----------------------------------------------------------------------------
# Scenario 3: Empty language response ({})
# -----------------------------------------------------------------------------
def test_scenario_03_empty_language_response():
    total_bytes, breakdowns = calculate_repository_percentages({})
    assert total_bytes == 0
    assert breakdowns == []


# -----------------------------------------------------------------------------
# Scenario 4: Zero-total byte count ({"Lang": 0})
# -----------------------------------------------------------------------------
def test_scenario_04_zero_total_byte_count():
    raw_languages = {"Python": 0, "Ruby": 0}
    total_bytes, breakdowns = calculate_repository_percentages(raw_languages)
    assert total_bytes == 0
    assert breakdowns == []


# -----------------------------------------------------------------------------
# Scenario 5: Correct percentage calculation (exact formula (bytes / total) * 100)
# -----------------------------------------------------------------------------
def test_scenario_05_correct_percentage_calculation():
    raw_languages = {"LanguageA": 1, "LanguageB": 2}
    total_bytes, breakdowns = calculate_repository_percentages(raw_languages)

    assert total_bytes == 3
    assert len(breakdowns) == 2
    # LanguageB has 2 bytes -> 66.6666...%
    # LanguageA has 1 byte -> 33.3333...%
    pct_b = breakdowns[0]["percentage"]
    pct_a = breakdowns[1]["percentage"]
    assert pytest.approx(pct_b, 1e-4) == (2.0 / 3.0) * 100.0
    assert pytest.approx(pct_a, 1e-4) == (1.0 / 3.0) * 100.0
    assert pytest.approx(pct_a + pct_b, 1e-4) == 100.0


# -----------------------------------------------------------------------------
# Scenario 6: Correct weighted aggregate calculation across multiple repositories
# -----------------------------------------------------------------------------
def test_scenario_06_correct_weighted_aggregate_calculation():
    # Build two mock snapshots
    snap_a = MagicMock(spec=RepositoryLanguageSnapshot)
    snap_a.sync_status = "success"
    b1 = MagicMock(language_name="TypeScript", byte_count=80000)
    b2 = MagicMock(language_name="CSS", byte_count=20000)
    snap_a.breakdowns = [b1, b2]

    snap_b = MagicMock(spec=RepositoryLanguageSnapshot)
    snap_b.sync_status = "success"
    b3 = MagicMock(language_name="Python", byte_count=300000)
    b4 = MagicMock(language_name="TypeScript", byte_count=100000)
    snap_b.breakdowns = [b3, b4]

    agg = calculate_aggregate_languages([snap_a, snap_b])

    # Total bytes: 100,000 + 400,000 = 500,000
    assert agg["total_bytes"] == 500000
    langs = {item["name"]: item for item in agg["languages"]}

    # Python: 300,000 / 500,000 = 60.0%
    assert langs["Python"]["bytes"] == 300000
    assert pytest.approx(langs["Python"]["percentage"], 1e-4) == 60.0

    # TypeScript: (80,000 + 100,000) = 180,000 / 500,000 = 36.0%
    assert langs["TypeScript"]["bytes"] == 180000
    assert pytest.approx(langs["TypeScript"]["percentage"], 1e-4) == 36.0

    # CSS: 20,000 / 500,000 = 4.0%
    assert langs["CSS"]["bytes"] == 20000
    assert pytest.approx(langs["CSS"]["percentage"], 1e-4) == 4.0

    # Verify order: descending by bytes
    assert [item["name"] for item in agg["languages"]] == ["Python", "TypeScript", "CSS"]


# -----------------------------------------------------------------------------
# Scenario 7: Proof aggregate percentages sum bytes rather than averaging percentages
# -----------------------------------------------------------------------------
def test_scenario_07_aggregate_sums_bytes_not_averaging_percentages():
    # Tiny repo: 99 bytes TypeScript (99%), 1 byte Python (1%)
    snap_tiny = MagicMock(spec=RepositoryLanguageSnapshot)
    snap_tiny.sync_status = "success"
    b_t_ts = MagicMock(language_name="TypeScript", byte_count=99)
    b_t_py = MagicMock(language_name="Python", byte_count=1)
    snap_tiny.breakdowns = [b_t_ts, b_t_py]

    # Giant repo: 9801 bytes Python (~99%), 99 bytes TypeScript (~1%)
    snap_giant = MagicMock(spec=RepositoryLanguageSnapshot)
    snap_giant.sync_status = "success"
    b_g_py = MagicMock(language_name="Python", byte_count=9801)
    b_g_ts = MagicMock(language_name="TypeScript", byte_count=99)
    snap_giant.breakdowns = [b_g_py, b_g_ts]

    agg = calculate_aggregate_languages([snap_tiny, snap_giant])

    # If it naively averaged percentages: (99% + 1%)/2 = 50% TypeScript, (1% + 99%)/2 = 50% Python
    # But correct byte weighting: Total = 10,000 bytes.
    # Python = 9,802 bytes (98.02%), TypeScript = 198 bytes (1.98%)
    assert agg["total_bytes"] == 10000
    langs = {item["name"]: item for item in agg["languages"]}

    assert langs["Python"]["bytes"] == 9802
    assert pytest.approx(langs["Python"]["percentage"], 1e-4) == 98.02
    assert langs["TypeScript"]["bytes"] == 198
    assert pytest.approx(langs["TypeScript"]["percentage"], 1e-4) == 1.98
    # Confirms it did NOT calculate 50/50 naive average
    assert abs(langs["Python"]["percentage"] - 50.0) > 40.0


# -----------------------------------------------------------------------------
# Scenario 8: Safe rounding and formatting
# -----------------------------------------------------------------------------
def test_scenario_08_safe_rounding_and_formatting():
    db = SessionLocal()
    user_id = uuid.uuid4()
    conn_id = uuid.uuid4()
    res_id = uuid.uuid4()
    snap_id = uuid.uuid4()

    try:
        conn = ConnectedSource(
            id=conn_id,
            owner_user_id=user_id,
            provider="github",
            account_identity="test_user_round",
            connection_status="connected",
            encrypted_credentials=encrypt_credential("ghp_test_round_12345"),
            credential_key_version="v1",
        )
        db.add(conn)

        res = SelectedResource(
            id=res_id,
            connection_id=conn_id,
            external_resource_id="org/rounding-test",
            name="rounding-test",
            is_selected=True,
        )
        db.add(res)

        # 1 byte vs 2 bytes -> 33.333333% and 66.666667%
        snap = RepositoryLanguageSnapshot(
            id=snap_id,
            owner_user_id=user_id,
            selected_resource_id=res_id,
            repo_full_name="org/rounding-test",
            connection_id=conn_id,
            total_bytes=3,
            retrieval_timestamp=datetime.now(timezone.utc),
            sync_status="success",
            is_current=True,
        )
        db.add(snap)

        b1 = RepositoryLanguageBreakdown(
            id=uuid.uuid4(),
            snapshot_id=snap_id,
            language_name="Python",
            byte_count=2,
            percentage=66.6666666667,
        )
        b2 = RepositoryLanguageBreakdown(
            id=uuid.uuid4(),
            snapshot_id=snap_id,
            language_name="Rust",
            byte_count=1,
            percentage=33.3333333333,
        )
        db.add(b1)
        db.add(b2)
        db.commit()

        # Query response
        resp = get_repository_languages_response(db, user_id, str(res_id))
        assert resp is not None
        assert resp["languages"][0]["percentage"] == 66.67
        assert resp["languages"][1]["percentage"] == 33.33

        summary = get_user_languages_summary(db, user_id)
        assert summary["total_bytes"] == 3
        assert summary["aggregate_languages"][0]["percentage"] == 66.67
        assert summary["aggregate_languages"][1]["percentage"] == 33.33
    finally:
        db.query(RepositoryLanguageBreakdown).filter(RepositoryLanguageBreakdown.snapshot_id == snap_id).delete()
        db.query(RepositoryLanguageSnapshot).filter(RepositoryLanguageSnapshot.id == snap_id).delete()
        db.query(SelectedResource).filter(SelectedResource.id == res_id).delete()
        db.query(ConnectedSource).filter(ConnectedSource.id == conn_id).delete()
        db.commit()
        db.close()


# -----------------------------------------------------------------------------
# Scenario 9: Repeated synchronization idempotency (no duplicate rows)
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_scenario_09_repeated_sync_idempotency_no_duplicates():
    db = SessionLocal()
    user_id = uuid.uuid4()
    conn_id = uuid.uuid4()
    res_id = uuid.uuid4()

    try:
        conn = ConnectedSource(
            id=conn_id,
            owner_user_id=user_id,
            provider="github",
            account_identity="test_idempotent",
            connection_status="connected",
            encrypted_credentials=encrypt_credential("ghp_idempotent_12345"),
            credential_key_version="v1",
        )
        db.add(conn)

        res = SelectedResource(
            id=res_id,
            connection_id=conn_id,
            external_resource_id="org/idempotent-repo",
            name="idempotent-repo",
            is_selected=True,
        )
        db.add(res)
        db.commit()

        # Mock client
        mock_client = MagicMock(spec=GitHubClient)

        # First sync: TypeScript 1000, Python 500
        mock_client.fetch_repository_languages = AsyncMock(return_value={
            "success": True,
            "languages": {"TypeScript": 1000, "Python": 500},
            "status_code": 200,
        })

        snap1, ok1 = await sync_repository_languages(db, user_id, conn, res, mock_client)
        assert ok1 is True
        assert snap1.total_bytes == 1500

        # Check rows in DB
        snaps = db.query(RepositoryLanguageSnapshot).filter(
            RepositoryLanguageSnapshot.selected_resource_id == res_id
        ).all()
        assert len(snaps) == 1

        breakdowns1 = db.query(RepositoryLanguageBreakdown).filter(
            RepositoryLanguageBreakdown.snapshot_id == snap1.id
        ).all()
        assert len(breakdowns1) == 2

        # Second sync: TypeScript 1200, Python 800, Go 500
        mock_client.fetch_repository_languages = AsyncMock(return_value={
            "success": True,
            "languages": {"TypeScript": 1200, "Python": 800, "Go": 500},
            "status_code": 200,
        })

        snap2, ok2 = await sync_repository_languages(db, user_id, conn, res, mock_client)
        assert ok2 is True
        assert snap2.id == snap1.id  # Same snapshot updated in-place!
        assert snap2.total_bytes == 2500

        # Verify still exactly 1 snapshot row
        snaps_after = db.query(RepositoryLanguageSnapshot).filter(
            RepositoryLanguageSnapshot.selected_resource_id == res_id
        ).all()
        assert len(snaps_after) == 1

        # Verify breakdowns replaced idempotently, not appended
        breakdowns2 = db.query(RepositoryLanguageBreakdown).filter(
            RepositoryLanguageBreakdown.snapshot_id == snap2.id
        ).all()
        assert len(breakdowns2) == 3
        b_names = {b.language_name for b in breakdowns2}
        assert b_names == {"TypeScript", "Python", "Go"}
    finally:
        snap = db.query(RepositoryLanguageSnapshot).filter(
            RepositoryLanguageSnapshot.selected_resource_id == res_id
        ).first()
        if snap:
            db.query(RepositoryLanguageBreakdown).filter(RepositoryLanguageBreakdown.snapshot_id == snap.id).delete()
            db.delete(snap)
        db.query(SelectedResource).filter(SelectedResource.id == res_id).delete()
        db.query(ConnectedSource).filter(ConnectedSource.id == conn_id).delete()
        db.commit()
        db.close()


# -----------------------------------------------------------------------------
# Scenario 10: Repository deletion / access loss handling (404)
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_scenario_10_repository_deletion_access_loss_handling():
    db = SessionLocal()
    user_id = uuid.uuid4()
    conn_id = uuid.uuid4()
    res_id = uuid.uuid4()

    try:
        conn = ConnectedSource(
            id=conn_id,
            owner_user_id=user_id,
            provider="github",
            account_identity="test_user_404",
            connection_status="connected",
            encrypted_credentials=encrypt_credential("ghp_test_404_token"),
            credential_key_version="v1",
        )
        db.add(conn)

        res = SelectedResource(
            id=res_id,
            connection_id=conn_id,
            external_resource_id="deleted-org/missing-repo",
            name="missing-repo",
            is_selected=True,
        )
        db.add(res)
        db.commit()

        mock_client = MagicMock(spec=GitHubClient)
        mock_client.fetch_repository_languages = AsyncMock(return_value={
            "success": False,
            "languages": {},
            "status_code": 404,
            "error": "Repository deleted-org/missing-repo not found or inaccessible.",
            "error_category": "NOT_FOUND",
        })

        snap, ok = await sync_repository_languages(db, user_id, conn, res, mock_client)
        assert ok is False
        assert snap.sync_status == "failed"
        assert "not found" in (snap.error_summary or "").lower()

        # Check DB state
        saved = db.query(RepositoryLanguageSnapshot).filter(
            RepositoryLanguageSnapshot.selected_resource_id == res_id
        ).first()
        assert saved is not None
        assert saved.sync_status == "failed"
    finally:
        snap = db.query(RepositoryLanguageSnapshot).filter(
            RepositoryLanguageSnapshot.selected_resource_id == res_id
        ).first()
        if snap:
            db.delete(snap)
        db.query(SelectedResource).filter(SelectedResource.id == res_id).delete()
        db.query(ConnectedSource).filter(ConnectedSource.id == conn_id).delete()
        db.commit()
        db.close()


# -----------------------------------------------------------------------------
# Scenario 11: Missing language metadata handling
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_scenario_11_missing_language_metadata_handling():
    gh = GitHubClient("test_token")
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "TypeScript": 100,
        "CorruptLang": -5,
        "BadVal": "not_an_int",
    }
    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        res = await gh.fetch_repository_languages("owner", "repo")
        assert res["success"] is True
        # Only valid non-negative ints kept
        assert res["languages"] == {"TypeScript": 100}


# -----------------------------------------------------------------------------
# Scenario 12: GitHub authentication failure handling (401/403)
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_scenario_12_github_auth_failure_handling():
    gh = GitHubClient("bad_pat_token")
    # 401 Unauthorized
    mock_resp_401 = MagicMock()
    mock_resp_401.status_code = 401
    mock_resp_401.headers = {}
    with patch("httpx.AsyncClient.get", return_value=mock_resp_401):
        res_401 = await gh.fetch_repository_languages("owner", "repo")
        assert res_401["success"] is False
        assert res_401["status_code"] == 401

    # 403 Forbidden without rate limit
    mock_resp_403 = MagicMock()
    mock_resp_403.status_code = 403
    mock_resp_403.headers = {}
    with patch("httpx.AsyncClient.get", return_value=mock_resp_403):
        res_403 = await gh.fetch_repository_languages("owner", "repo")
        assert res_403["success"] is False
        assert res_403["status_code"] == 403
        assert res_403["error_category"] == "FORBIDDEN"


# -----------------------------------------------------------------------------
# Scenario 13: Rate limiting and network error handling
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_scenario_13_rate_limiting_and_network_error_handling():
    gh = GitHubClient("test_token")
    # Rate limit (403 with x-ratelimit-remaining == 0)
    mock_resp_rl = MagicMock()
    mock_resp_rl.status_code = 403
    mock_resp_rl.headers = {"x-ratelimit-remaining": "0"}
    with patch("httpx.AsyncClient.get", return_value=mock_resp_rl):
        res_rl = await gh.fetch_repository_languages("owner", "repo")
        assert res_rl["success"] is False
        assert res_rl["error_category"] == "RATE_LIMITED"

    # Network error (httpx.RequestError)
    import httpx
    with patch("httpx.AsyncClient.get", side_effect=httpx.ConnectError("Connection refused")):
        res_net = await gh.fetch_repository_languages("owner", "repo")
        assert res_net["success"] is False
        assert res_net["error_category"] == "NETWORK_UNAVAILABLE"


# -----------------------------------------------------------------------------
# Scenario 14: Cross-user authorization check
# -----------------------------------------------------------------------------
def test_scenario_14_cross_user_authorization_check():
    db = SessionLocal()
    user_a = uuid.uuid4()
    user_b = uuid.uuid4()
    conn_a = uuid.uuid4()
    res_a = uuid.uuid4()
    snap_a = uuid.uuid4()

    try:
        conn = ConnectedSource(
            id=conn_a,
            owner_user_id=user_a,
            provider="github",
            account_identity="usera",
            connection_status="connected",
            encrypted_credentials=encrypt_credential("ghp_user_a_token"),
            credential_key_version="v1",
        )
        db.add(conn)

        res = SelectedResource(
            id=res_a,
            connection_id=conn_a,
            external_resource_id="usera/private-vault",
            name="private-vault",
            is_selected=True,
        )
        db.add(res)

        snap = RepositoryLanguageSnapshot(
            id=snap_a,
            owner_user_id=user_a,
            selected_resource_id=res_a,
            repo_full_name="usera/private-vault",
            connection_id=conn_a,
            total_bytes=1000,
            sync_status="success",
            is_current=True,
        )
        db.add(snap)
        db.commit()

        # Service-level check: User B queries User A's repo -> returns None
        resp_user_b = get_repository_languages_response(db, user_b, str(res_a))
        assert resp_user_b is None

        # Summary check: User B's summary must NOT contain User A's repo or bytes
        summary_user_b = get_user_languages_summary(db, user_b)
        assert summary_user_b["total_bytes"] == 0
        assert summary_user_b["total_selected_repositories"] == 0
        assert len(summary_user_b["repositories"]) == 0

        # API-level check with dependency override for User B
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
            user_id=str(user_b), email="userb@test.com"
        )
        api_resp = client.get(f"/api/v1/connections/github/repositories/{res_a}/languages")
        assert api_resp.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        db.query(RepositoryLanguageSnapshot).filter(RepositoryLanguageSnapshot.id == snap_a).delete()
        db.query(SelectedResource).filter(SelectedResource.id == res_a).delete()
        db.query(ConnectedSource).filter(ConnectedSource.id == conn_a).delete()
        db.commit()
        db.close()


# -----------------------------------------------------------------------------
# Scenario 15: Partial outcome: failed language fetch while activity import succeeds
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_scenario_15_partial_outcome_failed_languages_with_activities():
    db = SessionLocal()
    user_id = uuid.uuid4()
    conn_id = uuid.uuid4()
    res_id = uuid.uuid4()

    try:
        conn = ConnectedSource(
            id=conn_id,
            owner_user_id=user_id,
            provider="github",
            account_identity="test_partial_user",
            connection_status="connected",
            encrypted_credentials=encrypt_credential("ghp_test_partial"),
            credential_key_version="v1",
        )
        db.add(conn)

        res = SelectedResource(
            id=res_id,
            connection_id=conn_id,
            external_resource_id="org/activity-repo",
            name="activity-repo",
            is_selected=True,
        )
        db.add(res)
        db.commit()

        # Language fails (e.g. rate limit)
        mock_client = MagicMock(spec=GitHubClient)
        mock_client.fetch_repository_languages = AsyncMock(return_value={
            "success": False,
            "languages": {},
            "status_code": 403,
            "error": "Rate limit exceeded",
            "error_category": "RATE_LIMITED",
        })

        snap, ok = await sync_repository_languages(db, user_id, conn, res, mock_client)
        assert ok is False
        assert snap.sync_status == "failed"

        # An activity evidence item is successfully recorded
        evidence = EvidenceItem(
            id=uuid.uuid4(),
            owner_user_id=user_id,
            source_provider="github",
            source_type="pull_request",
            external_record_id="pr_999",
            source_name="org/activity-repo",
            evidence_category="engineering",
            title="Fix high latency database connection leak",
            description="Merged PR #999 addressing pool starvation",
            extracted_excerpt="Configured pool_pre_ping and increased pool_size to 20",
            observed_timestamp=datetime.now(timezone.utc),
            contributor_identity="test_author",
            attribution_status="author",
            is_collaborative=False,
            project_name="activity-repo",
            evidence_strength="high",
            extraction_confidence=0.9,
            verification_status="unreviewed",
            processing_status="ready_for_review",
            content_hash=uuid.uuid4().hex,
        )
        db.add(evidence)
        db.commit()

        # Verify evidence remains intact even when language fetch failed
        saved_evidence = db.query(EvidenceItem).filter(EvidenceItem.id == evidence.id).first()
        assert saved_evidence is not None
        assert saved_evidence.title == "Fix high latency database connection leak"
    finally:
        db.rollback()
        snap = db.query(RepositoryLanguageSnapshot).filter(
            RepositoryLanguageSnapshot.selected_resource_id == res_id
        ).first()
        if snap:
            db.delete(snap)
        db.query(EvidenceItem).filter(EvidenceItem.owner_user_id == user_id).delete()
        db.query(SelectedResource).filter(SelectedResource.id == res_id).delete()
        db.query(ConnectedSource).filter(ConnectedSource.id == conn_id).delete()
        db.commit()
        db.close()


# -----------------------------------------------------------------------------
# Scenario 16: Language refresh without destroying existing verified evidence
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_scenario_16_language_refresh_preserves_verified_evidence():
    db = SessionLocal()
    user_id = uuid.uuid4()
    conn_id = uuid.uuid4()
    res_id = uuid.uuid4()
    evidence_id = uuid.uuid4()

    try:
        conn = ConnectedSource(
            id=conn_id,
            owner_user_id=user_id,
            provider="github",
            account_identity="test_refresh_user",
            connection_status="connected",
            encrypted_credentials=encrypt_credential("ghp_test_refresh"),
            credential_key_version="v1",
        )
        db.add(conn)

        res = SelectedResource(
            id=res_id,
            connection_id=conn_id,
            external_resource_id="org/verified-project",
            name="verified-project",
            is_selected=True,
        )
        db.add(res)

        # Existing verified evidence item
        evidence = EvidenceItem(
            id=evidence_id,
            owner_user_id=user_id,
            source_provider="github",
            source_type="commit",
            external_record_id="c_12345",
            source_name="org/verified-project",
            evidence_category="engineering",
            title="Implement resilient gRPC retries",
            description="Verified by engineering lead",
            extracted_excerpt="Implemented resilient retries with exponential backoff",
            observed_timestamp=datetime.now(timezone.utc),
            contributor_identity="lead_dev",
            attribution_status="author",
            is_collaborative=False,
            project_name="verified-project",
            evidence_strength="high",
            extraction_confidence=0.95,
            verification_status="verified",  # Explicitly verified
            processing_status="verified",
            content_hash=uuid.uuid4().hex,
        )
        db.add(evidence)
        db.commit()

        # Mock GitHub client returning updated languages
        mock_client = MagicMock(spec=GitHubClient)
        mock_client.fetch_repository_languages = AsyncMock(return_value={
            "success": True,
            "languages": {"Go": 85000, "Protocol Buffers": 15000},
            "status_code": 200,
        })

        # Run language sync (equivalent to refresh)
        snap, ok = await sync_repository_languages(db, user_id, conn, res, mock_client)
        assert ok is True
        assert snap.total_bytes == 100000

        # Assert verified evidence was not modified, deleted, or degraded
        ev_after = db.query(EvidenceItem).filter(EvidenceItem.id == evidence_id).first()
        assert ev_after is not None
        assert ev_after.verification_status == "verified"
        assert ev_after.processing_status == "verified"
        assert ev_after.title == "Implement resilient gRPC retries"
    finally:
        db.rollback()
        snap = db.query(RepositoryLanguageSnapshot).filter(
            RepositoryLanguageSnapshot.selected_resource_id == res_id
        ).first()
        if snap:
            db.query(RepositoryLanguageBreakdown).filter(RepositoryLanguageBreakdown.snapshot_id == snap.id).delete()
            db.delete(snap)
        db.query(EvidenceItem).filter(EvidenceItem.id == evidence_id).delete()
        db.query(SelectedResource).filter(SelectedResource.id == res_id).delete()
        db.query(ConnectedSource).filter(ConnectedSource.id == conn_id).delete()
        db.commit()
        db.close()
