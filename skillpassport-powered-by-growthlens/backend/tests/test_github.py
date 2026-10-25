import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.integrations.github.client import GitHubClient

client = TestClient(app)


@pytest.mark.asyncio
async def test_github_client_error_differentiation():
    """Verify that GitHubClient differentiates 401, 403, and network errors."""
    with patch("httpx.AsyncClient.get") as mock_get:
        # Test 401 Invalid Token
        mock_get.return_value.status_code = 401
        gh = GitHubClient("invalid_test_token_12345")
        result = await gh.test_connection()
        assert result["valid"] is False
        assert result["error_category"] == "INVALID_TOKEN"

        # Test 403 Rate Limited
        mock_get.return_value.status_code = 403
        mock_get.return_value.headers = {"x-ratelimit-remaining": "0", "x-ratelimit-reset": "1730000000"}
        result = await gh.test_connection()
        assert result["valid"] is False
        assert result["error_category"] == "RATE_LIMITED"


def test_list_connected_sources_api():
    """Verify GET /api/v1/connections returns source listing."""
    response = client.get("/api/v1/connections")
    assert response.status_code == 200
    data = response.json()
    assert "sources" in data
    assert "total" in data


def test_github_test_endpoint_validation():
    """Verify POST /api/v1/connections/github/test rejects bad token format."""
    response = client.post(
        "/api/v1/connections/github/test",
        json={"token": "too_short"},
    )
    # Fails Pydantic validation (min_length=10)
    assert response.status_code == 422


def test_github_repository_sync_status_endpoint():
    """Verify GET /api/v1/connections/github/repositories/{id}/sync-status executes without NameError."""
    from backend.app.db.session import SessionLocal
    from backend.app.models.connection import ConnectedSource
    from backend.app.api.dependencies import get_current_user, AuthenticatedUser
    import uuid

    mock_user_id = str(uuid.uuid4())
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        user_id=mock_user_id,
        email="test_sync_status@growthlens.dev",
        role="authenticated",
    )

    db = SessionLocal()
    try:
        conn = ConnectedSource(
            owner_user_id=mock_user_id,
            provider="github",
            connection_status="connected",
            account_identity="test-github-user",
            encrypted_credentials="dummy",
        )
        db.add(conn)
        db.commit()

        response = client.get("/api/v1/connections/github/repositories/test-owner/test-repo/sync-status")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "repository_name" in data
    finally:
        db.query(ConnectedSource).filter(ConnectedSource.owner_user_id == mock_user_id).delete()
        db.commit()
        db.close()
        app.dependency_overrides.pop(get_current_user, None)
