import uuid
import base64
import hashlib
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch, MagicMock
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.db.session import SessionLocal
from backend.app.api.dependencies import get_current_user, AuthenticatedUser
from backend.app.models.connection import ConnectedSource, SelectedResource
from backend.app.models.readme import RepositoryReadmeSnapshot
from backend.app.models.evidence import EvidenceItem
from backend.app.models.sync_run import SourceSyncRun
from backend.app.core.security import encrypt_credential
from backend.app.integrations.github.client import GitHubClient, parse_readme_sections
from backend.app.integrations.github.readme_service import (
    sync_repository_readme,
    get_repository_readme_response,
)

client = TestClient(app)


# -----------------------------------------------------------------------------
# Test 1: Markdown Heading Hierarchy Parsing
# -----------------------------------------------------------------------------
def test_parse_readme_sections():
    markdown = """# SkillPassport Project
A talent intelligence platform.

## Architecture
Microservices and FastAPI backend.

### Database Layer
PostgreSQL with SQLAlchemy and ChromaDB.

## Features & Implementation
- Evidence extraction
- RAG pipeline

### AI Engine
Qwen3 8B local model.
"""
    sections = parse_readme_sections(markdown)
    assert len(sections) == 5
    assert sections[0]["title"] == "SkillPassport Project"
    assert sections[0]["level"] == 1
    assert sections[1]["title"] == "Architecture"
    assert sections[1]["level"] == 2
    assert sections[2]["title"] == "Database Layer"
    assert sections[2]["level"] == 3
    assert sections[3]["title"] == "Features & Implementation"
    assert sections[3]["level"] == 2
    assert sections[4]["title"] == "AI Engine"
    assert sections[4]["level"] == 3


# -----------------------------------------------------------------------------
# Test 2: GitHubClient fetch_repository_readme success
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_github_client_fetch_readme_success():
    sample_text = "# Test Repo\n\nThis is a sample README file."
    b64_content = base64.b64encode(sample_text.encode("utf-8")).decode("utf-8")
    expected_sha = "abc123456789def"
    expected_hash = hashlib.sha256(sample_text.encode("utf-8")).hexdigest()

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "name": "README.md",
            "path": "README.md",
            "sha": expected_sha,
            "size": len(sample_text),
            "encoding": "base64",
            "content": b64_content,
            "html_url": "https://github.com/test-owner/test-repo/blob/main/README.md",
            "download_url": "https://raw.githubusercontent.com/test-owner/test-repo/main/README.md",
        }
        mock_get.return_value = mock_response

        gh = GitHubClient("valid_test_token_12345")
        result = await gh.fetch_repository_readme("test-owner", "test-repo")

        assert result["success"] is True
        assert result["status_code"] == 200
        assert result["content"] == sample_text
        assert result["sha"] == expected_sha
        assert result["content_hash"] == expected_hash
        assert len(result["sections"]) == 1
        assert result["sections"][0]["title"] == "Test Repo"
        assert result["error"] is None


# -----------------------------------------------------------------------------
# Test 3: GitHubClient fetch_repository_readme 404 Not Found
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_github_client_fetch_readme_not_found():
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response

        gh = GitHubClient("valid_test_token_12345")
        result = await gh.fetch_repository_readme("test-owner", "no-readme-repo")

        assert result["success"] is False
        assert result["status_code"] == 404
        assert result["error_category"] == "NOT_FOUND"
        assert "README" in result["error"]


# -----------------------------------------------------------------------------
# Test 4: GitHubClient fetch_repository_readme 403 Forbidden & Rate Limited
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_github_client_fetch_readme_forbidden():
    with patch("httpx.AsyncClient.get") as mock_get:
        # Standard 403 (Contents read permission missing)
        mock_response = MagicMock()
        mock_response.status_code = 403
        mock_response.headers = {"x-ratelimit-remaining": "50"}
        mock_get.return_value = mock_response

        gh = GitHubClient("valid_test_token_12345")
        result = await gh.fetch_repository_readme("test-owner", "private-repo")

        assert result["success"] is False
        assert result["status_code"] == 403
        assert result["error_category"] == "FORBIDDEN"

        # Rate limited 403
        mock_response.headers = {"x-ratelimit-remaining": "0"}
        result_rl = await gh.fetch_repository_readme("test-owner", "private-repo")
        assert result_rl["success"] is False
        assert result_rl["status_code"] == 403
        assert result_rl["error_category"] == "RATE_LIMITED"


# -----------------------------------------------------------------------------
# Test 5: GitHubClient list_all_repositories Multi-Page Discovery
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_github_client_list_all_repositories():
    with patch("httpx.AsyncClient.get") as mock_get:
        page1_response = MagicMock()
        page1_response.status_code = 200
        page1_response.json.return_value = [
            {"id": "1", "name": "repo-a", "full_name": "user/repo-a"},
            {"id": "2", "name": "repo-b", "full_name": "user/repo-b"},
        ]

        page2_response = MagicMock()
        page2_response.status_code = 200
        page2_response.json.return_value = [
            {"id": "3", "name": "repo-c", "full_name": "user/repo-c"},
        ]

        # Return page1 then page2
        mock_get.side_effect = [page1_response, page2_response]

        gh = GitHubClient("valid_test_token_12345")
        # With per_page=2, page 1 has 2 items so it fetches page 2. Page 2 has 1 item (< 2), so it stops!
        repos = await gh.list_all_repositories(max_pages=3, per_page=2)

        assert len(repos) == 3
        assert repos[0]["full_name"] == "user/repo-a"
        assert repos[1]["full_name"] == "user/repo-b"
        assert repos[2]["full_name"] == "user/repo-c"


# -----------------------------------------------------------------------------
# Test 6: sync_repository_readme Idempotency and Persistence
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_sync_repository_readme_idempotency_and_versioning():
    test_user_id = uuid.uuid4()
    test_conn_id = uuid.uuid4()
    test_res_id = uuid.uuid4()

    db = MagicMock()

    connection = ConnectedSource(
        id=test_conn_id,
        owner_user_id=test_user_id,
        provider="github",
        account_identity="octocat",
        encrypted_credentials="enc_token",
    )
    selected_res = SelectedResource(
        id=test_res_id,
        connection_id=test_conn_id,
        external_resource_id="octocat/hello-world",
        name="octocat/hello-world",
        is_selected=True,
    )

    client_mock = MagicMock()
    client_mock.fetch_repository_readme = AsyncMock(return_value={
        "success": True,
        "status_code": 200,
        "content": "# Hello World\nWelcome to our project.",
        "path": "README.md",
        "sha": "sha_v1",
        "size": 35,
        "html_url": "https://github.com/octocat/hello-world/blob/main/README.md",
        "content_hash": "hash_v1",
        "sections": [{"level": 1, "title": "Hello World"}],
        "error": None,
    })

    # Case A: First sync (no existing snapshot)
    db.query.return_value.filter.return_value.first.return_value = None

    with patch("backend.app.extraction.engine.extraction_engine.process_and_persist_evidence", new_callable=AsyncMock) as mock_extract:
        snap1, ok1 = await sync_repository_readme(
            db=db,
            user_id=test_user_id,
            connection=connection,
            selected_resource=selected_res,
            client=client_mock,
            trigger_extraction=True,
        )

        assert ok1 is True
        assert snap1.sync_status == "success"
        assert snap1.blob_sha == "sha_v1"
        assert db.add.called
        assert mock_extract.called

    # Case B: Second sync with identical SHA and content_hash (idempotent, skips AI extraction)
    mock_existing_snap = MagicMock(
        sync_status="success",
        blob_sha="sha_v1",
        content_hash="hash_v1",
        is_current=True,
    )
    db.query.return_value.filter.return_value.first.return_value = mock_existing_snap

    with patch("backend.app.extraction.engine.extraction_engine.process_and_persist_evidence", new_callable=AsyncMock) as mock_extract2:
        snap2, ok2 = await sync_repository_readme(
            db=db,
            user_id=test_user_id,
            connection=connection,
            selected_resource=selected_res,
            client=client_mock,
            trigger_extraction=True,
        )

        assert ok2 is True
        assert snap2 == mock_existing_snap
        # AI extraction should NOT be called again for unchanged content!
        assert not mock_extract2.called


# -----------------------------------------------------------------------------
# Test 7: Remove Selected Repository (Preserves Evidence)
# -----------------------------------------------------------------------------
def test_remove_repository_endpoint():
    test_user_id = uuid.uuid4()
    test_user = AuthenticatedUser(user_id=str(test_user_id), email="dev@example.com")
    app.dependency_overrides[get_current_user] = lambda: test_user

    mock_db = MagicMock()
    mock_conn = MagicMock()
    mock_conn.owner_user_id = test_user_id
    mock_conn.id = uuid.uuid4()

    mock_res = MagicMock()
    mock_res.id = uuid.uuid4()
    mock_res.name = "octocat/hello-world"
    mock_res.is_selected = True

    # Setup DB queries
    def mock_query(model):
        q = MagicMock()
        if model == ConnectedSource:
            q.filter.return_value.first.return_value = mock_conn
        elif model == SelectedResource:
            q.filter.return_value.first.return_value = mock_res
        return q

    mock_db.query.side_effect = mock_query

    from backend.app.db.session import get_db
    app.dependency_overrides[get_db] = lambda: mock_db

    try:
        response = client.delete(f"/api/v1/connections/github/repositories/{mock_res.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "removed"
        assert data["is_selected"] is False
        assert "preserved" in data["message"]
        # Verified that is_selected was updated to False
        assert mock_res.is_selected is False
        assert mock_db.commit.called
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
