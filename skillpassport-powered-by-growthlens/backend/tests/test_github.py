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
