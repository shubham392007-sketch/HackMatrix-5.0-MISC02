import pytest
import uuid
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.config import get_settings
from backend.app.db.session import get_db
from backend.app.api.dependencies import get_current_user, AuthenticatedUser
from backend.app.models.connection import ConnectedSource, SelectedResource


def test_ollama_num_ctx_setting():
    settings = get_settings()
    assert hasattr(settings, "ollama_num_ctx")
    assert settings.ollama_num_ctx >= 16384


def test_select_single_repository_endpoint():
    user_id = uuid.uuid4()
    mock_user = AuthenticatedUser(
        user_id=user_id,
        email="test_engineer@example.com",
        role="authenticated",
    )

    mock_db = MagicMock()
    mock_conn = MagicMock(spec=ConnectedSource)
    mock_conn.id = uuid.uuid4()
    mock_conn.owner_user_id = user_id
    mock_conn.provider = "github"
    mock_conn.connection_status = "connected"

    def query_router(model):
        m = MagicMock()
        m.filter.return_value = m
        if model == ConnectedSource:
            m.first.return_value = mock_conn
        else:
            m.first.return_value = None
        return m

    mock_db.query.side_effect = query_router

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_db] = lambda: mock_db

    client = TestClient(app)
    repo_to_select = "testuser/repo-beta"
    resp = client.post(f"/api/v1/connections/github/repositories/{repo_to_select}/select")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "selected"
    assert data["is_selected"] is True
    assert data["external_resource_id"] == repo_to_select
    assert mock_db.commit.called

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_repository_readme_fast_preview():
    user_id = uuid.uuid4()
    mock_user = AuthenticatedUser(
        user_id=user_id,
        email="test_engineer@example.com",
        role="authenticated",
    )

    fake_readme_content = "# Project Alpha\n\nFull architecture specification and API guide."
    fake_sections = [{"level": 1, "title": "Project Alpha"}]

    mock_db = MagicMock()
    mock_conn = MagicMock(spec=ConnectedSource)
    mock_conn.id = uuid.uuid4()
    mock_conn.encrypted_credentials = "encrypted_token"

    mock_res = MagicMock(spec=SelectedResource)
    mock_res.id = uuid.uuid4()
    mock_res.external_resource_id = "testuser/repo-alpha"
    mock_res.name = "testuser/repo-alpha"

    def query_router(model):
        m = MagicMock()
        m.filter.return_value = m
        if model == ConnectedSource:
            m.first.return_value = mock_conn
        elif model == SelectedResource:
            m.first.return_value = mock_res
        else:
            m.first.return_value = None
        return m

    mock_db.query.side_effect = query_router

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_db] = lambda: mock_db

    with patch("backend.app.api.connections.get_repository_readme_response") as mock_get_resp, \
         patch("backend.app.api.connections.decrypt_credential") as mock_decrypt, \
         patch("backend.app.api.connections.GitHubClient") as mock_client_cls, \
         patch("backend.app.api.connections.sync_repository_readme") as mock_sync_readme:

        mock_get_resp.side_effect = [
            None,
            {
                "repository_id": str(mock_res.id),
                "repository_name": "testuser/repo-alpha",
                "sync_status": "success",
                "readme_path": "README.md",
                "blob_sha": "blob123abc",
                "html_url": "https://github.com/testuser/repo-alpha/blob/main/README.md",
                "content_hash": "hash123",
                "raw_content": fake_readme_content,
                "sections": fake_sections,
                "retrieval_timestamp": "2026-10-20T12:00:00Z",
                "error_summary": None,
            }
        ]
        mock_decrypt.return_value = "ghp_mocktoken"
        mock_sync_readme.return_value = (MagicMock(), True)

        client = TestClient(app)
        resp = client.get("/api/v1/connections/github/repositories/testuser/repo-alpha/readme")
        assert resp.status_code == 200
        data = resp.json()
        assert data["sync_status"] == "success"
        assert data["raw_content"] == fake_readme_content
        assert len(data["sections"]) == 1
        assert data["sections"][0]["title"] == "Project Alpha"

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_sync_single_repository_isolation_and_languages():
    user_id = uuid.uuid4()
    mock_user = AuthenticatedUser(
        user_id=user_id,
        email="test_engineer@example.com",
        role="authenticated",
    )

    mock_db = MagicMock()
    mock_conn = MagicMock(spec=ConnectedSource)
    mock_conn.id = uuid.uuid4()
    mock_conn.account_identity = "testuser"
    mock_conn.encrypted_credentials = "encrypted_token"

    mock_res = MagicMock(spec=SelectedResource)
    mock_res.id = uuid.uuid4()
    mock_res.external_resource_id = "testuser/repo-alpha"
    mock_res.name = "testuser/repo-alpha"

    def query_router(model):
        m = MagicMock()
        m.filter.return_value = m
        if model == ConnectedSource:
            m.first.return_value = mock_conn
        elif model == SelectedResource:
            m.first.return_value = mock_res
        else:
            m.first.return_value = None
        return m

    mock_db.query.side_effect = query_router

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_db] = lambda: mock_db

    fake_outcome = {
        "repository_id": str(mock_res.id),
        "repository_name": "testuser/repo-alpha",
        "languages_status": "success",
        "detected_languages": 2,
        "top_language": "Python",
        "total_bytes": 75000,
        "readme_status": "success",
        "has_readme": True,
        "readme_path": "README.md",
        "readme_chars": 250,
        "prs_imported": 0,
        "commits_imported": 2,
        "records_discovered": 3,
        "records_imported": 2,
        "new_evidence_items": 2,
        "candidate_skills": [
            {"name": "Python", "category": "Programming Languages", "proficiency": "Advanced", "justification": "Primary codebase language", "confidence": 0.95},
            {"name": "Distributed Systems", "category": "Backend Engineering", "proficiency": "Intermediate", "justification": "README and commits describe distributed architecture", "confidence": 0.88},
        ],
        "candidate_skills_count": 2,
        "lang_errors": 0,
    }

    with patch("backend.app.api.connections.decrypt_credential") as mock_decrypt, \
         patch("backend.app.api.connections.GitHubClient"), \
         patch("backend.app.api.connections._sync_single_github_repo_internal", new_callable=AsyncMock) as mock_sync_internal:
        mock_decrypt.return_value = "ghp_mocktoken"
        mock_sync_internal.return_value = fake_outcome

        client = TestClient(app)
        resp = client.post("/api/v1/connections/github/repositories/testuser/repo-alpha/sync")
        assert resp.status_code == 200
        data = resp.json()

        assert data["status"] == "completed"
        assert data["repository_name"] == "testuser/repo-alpha"
        assert data["has_readme"] is True
        assert data["readme_status"] == "success"
        assert data["commits_imported"] == 2
        assert data["detected_languages"] == 2
        assert data["top_language"] == "Python"
        assert len(data["candidate_skills"]) == 2
        assert data["candidate_skills"][0]["name"] == "Python"

    app.dependency_overrides.clear()


def test_evidence_competency_mapping_attributes():
    from backend.app.models.taxonomy import EvidenceCompetencyMapping
    mapping = EvidenceCompetencyMapping(
        relevance_score=0.92,
        proficiency_level="Advanced",
        supporting_excerpt="Demonstrated advanced Python concurrency",
        rationale="Used async patterns",
    )
    assert mapping.relevance_score == 0.92
    assert mapping.confidence_score == 0.92
    assert mapping.proficiency_level == "Advanced"


def test_dynamic_confidence_score_not_hardcoded():
    from backend.app.ai.extractor import compute_dynamic_confidence_score
    
    # 1. Model provides dynamic float score
    s1 = compute_dynamic_confidence_score(0.93, skill_name="Distributed Systems")
    assert s1 == 0.93
    
    # 2. Model provides percentage string
    s2 = compute_dynamic_confidence_score("87%", skill_name="Kafka Architecture")
    assert s2 == 0.87
    
    # 3. Model score omitted -> dynamic computation based on evidence depth, not fixed 0.85
    s_adv = compute_dynamic_confidence_score(
        None,
        text_content="Built scalable microservices in Python with FastAPI and PostgreSQL",
        justification="Built scalable microservices in Python with FastAPI",
        demonstration_level="Advanced",
        skill_name="Python Backend Architecture",
    )
    s_fnd = compute_dynamic_confidence_score(
        None,
        text_content="Brief mention of tool",
        justification="tool",
        demonstration_level="Foundational",
        skill_name="CSS Styling",
    )
    assert s_adv != s_fnd
    assert s_adv > s_fnd


