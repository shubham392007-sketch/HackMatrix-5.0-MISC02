import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.integrations.jira.client import extract_adf_text, JiraCloudClient

client = TestClient(app)
AUTH_HEADERS = {"Authorization": "Bearer sp_demo_alexchen_valid"}


def test_extract_adf_text():
    # Plain text
    assert extract_adf_text("Plain text description") == "Plain text description"
    
    # ADF JSON structure
    adf = {
        "version": 1,
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {"type": "text", "text": "Implemented user authentication"},
                    {"type": "text", "text": " using JWT tokens."},
                ]
            },
            {
                "type": "paragraph",
                "content": [
                    {"type": "text", "text": "Added tests and verified coverage."}
                ]
            }
        ]
    }
    extracted = extract_adf_text(adf)
    assert "Implemented user authentication" in extracted
    assert "using JWT tokens." in extracted
    assert "Added tests" in extracted


@pytest.mark.asyncio
async def test_jira_client_error_differentiation():
    jira = JiraCloudClient("https://example.atlassian.net", "user@example.com", "fake_token_12345")
    
    # 401 Unauthorized
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = AsyncMock()
        mock_resp.status_code = 401
        mock_get.return_value = mock_resp
        
        res = await jira.test_connection()
        assert res["valid"] is False
        assert res["error_category"] == "INVALID_CREDENTIALS"

    # 403 Forbidden
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = AsyncMock()
        mock_resp.status_code = 403
        mock_get.return_value = mock_resp
        
        res = await jira.test_connection()
        assert res["valid"] is False
        assert res["error_category"] == "FORBIDDEN"

    # 404 Site not found
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = AsyncMock()
        mock_resp.status_code = 404
        mock_get.return_value = mock_resp
        
        res = await jira.test_connection()
        assert res["valid"] is False
        assert res["error_category"] == "WRONG_SITE_URL"


@pytest.mark.asyncio
async def test_jira_client_valid_connection():
    jira = JiraCloudClient("https://company.atlassian.net", "alex@company.com", "secret_token_12345")
    
    from unittest.mock import MagicMock
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "accountId": "jira-acc-9988",
            "displayName": "Alex Chen",
            "emailAddress": "alex@company.com",
            "active": True,
            "timeZone": "UTC",
        }
        mock_get.return_value = mock_resp
        
        res = await jira.test_connection()
        assert res["valid"] is True
        assert res["display_name"] == "Alex Chen"
        assert res["email_address"] == "alex@company.com"


def test_jira_test_endpoint_validation():
    with patch("backend.app.integrations.jira.client.JiraCloudClient.test_connection") as mock_test:
        mock_test.return_value = {
            "valid": True,
            "account_id": "acc-1234",
            "display_name": "Alex Chen",
            "email_address": "alex@company.com",
            "site_url": "https://company.atlassian.net",
            "time_zone": "UTC",
            "active": True,
        }
        resp = client.post(
            "/api/v1/connections/jira/test",
            json={
                "site_url": "https://company.atlassian.net",
                "email": "alex@company.com",
                "api_token": "valid_token_12345",
            },
            headers=AUTH_HEADERS,
        )
        assert resp.status_code == 200
        assert resp.json()["valid"] is True
        assert resp.json()["display_name"] == "Alex Chen"


def test_jira_connect_and_list_flow():
    with patch("backend.app.integrations.jira.client.JiraCloudClient.test_connection") as mock_test, \
         patch("backend.app.integrations.jira.client.JiraCloudClient.list_projects") as mock_projs:
        mock_test.return_value = {
            "valid": True,
            "account_id": "acc-1234",
            "display_name": "Alex Chen",
            "email_address": "alex@company.com",
            "site_url": "https://company.atlassian.net",
            "active": True,
        }
        mock_projs.return_value = [
            {"id": "10001", "key": "CORE", "name": "Core Platform", "project_type_key": "software"},
            {"id": "10002", "key": "SEC", "name": "Security", "project_type_key": "software"},
        ]

        # Connect
        resp = client.post(
            "/api/v1/connections/jira",
            json={
                "site_url": "https://company.atlassian.net",
                "email": "alex@company.com",
                "api_token": "valid_token_12345",
            },
            headers=AUTH_HEADERS,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "connected"

        # List projects
        p_resp = client.get(
            "/api/v1/connections/jira/projects",
            headers=AUTH_HEADERS,
        )
        assert p_resp.status_code == 200
        assert len(p_resp.json()["projects"]) == 2

