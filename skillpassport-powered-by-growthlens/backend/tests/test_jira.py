import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
import httpx
from backend.app.main import app
from backend.app.integrations.jira.client import extract_adf_text, JiraCloudClient, normalize_jira_site_url

client = TestClient(app)
AUTH_HEADERS = {"Authorization": "Bearer sp_demo_alexchen_valid"}


def test_normalize_jira_site_url():
    assert normalize_jira_site_url("https://company.atlassian.net/jira/your-work") == "https://company.atlassian.net"
    assert normalize_jira_site_url("https://company.atlassian.net/jira/software/c/projects/1") == "https://company.atlassian.net"
    assert normalize_jira_site_url("https://company.atlassian.net/") == "https://company.atlassian.net"
    assert normalize_jira_site_url("company.atlassian.net") == "https://company.atlassian.net"
    assert normalize_jira_site_url("myteam") == "https://myteam.atlassian.net"
    assert normalize_jira_site_url("http://127.0.0.1:8080/jira") == "http://127.0.0.1:8080"


@pytest.mark.asyncio
async def test_jira_client_non_json_response_handling():
    jira = JiraCloudClient("https://company.atlassian.net/jira/your-work", "alex@company.com", "fake_token")
    assert jira.site_url == "https://company.atlassian.net"

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.headers = {"content-type": "text/html; charset=utf-8"}
        mock_resp.json.side_effect = ValueError("Expecting value: line 1 column 1")
        mock_get.return_value = mock_resp

        res = await jira.test_connection()
        assert res["valid"] is False
        assert res["error_category"] == "INVALID_RESPONSE"
        assert "unexpected non-JSON response" in res["message"]


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

    # 429 Rate limited
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 429
        mock_resp.headers = {"Retry-After": "15"}
        mock_get.return_value = mock_resp
        
        res = await jira.test_connection()
        assert res["valid"] is False
        assert res["error_category"] == "RATE_LIMITED"
        assert "15 seconds" in res["message"]

    # Timeout
    with patch("httpx.AsyncClient.get", side_effect=httpx.ConnectTimeout("Connection timed out")):
        res = await jira.test_connection()
        assert res["valid"] is False
        assert res["error_category"] == "NETWORK_TIMEOUT"


@pytest.mark.asyncio
async def test_jira_client_valid_connection():
    jira = JiraCloudClient("https://company.atlassian.net", "alex@company.com", "secret_token_12345")
    
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


def test_jira_cors_preflight_and_explicit_origin():
    """Verifies that CORS preflight and actual requests echo explicit frontend origins and credentials header."""
    # Preflight OPTIONS
    resp = client.options(
        "/api/v1/connections/jira/test",
        headers={
            "Origin": "http://localhost:3001",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == "http://localhost:3001"
    assert resp.headers.get("access-control-allow-credentials") == "true"

    # Actual request with Origin
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
        res_post = client.post(
            "/api/v1/connections/jira/test",
            json={
                "site_url": "https://company.atlassian.net",
                "email": "alex@company.com",
                "api_token": "valid_token_12345",
            },
            headers={"Origin": "http://localhost:3001", **AUTH_HEADERS},
        )
        assert res_post.status_code == 200
        assert res_post.headers.get("access-control-allow-origin") == "http://localhost:3001"
        assert res_post.headers.get("access-control-allow-credentials") == "true"


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


def test_jira_per_project_sync_and_idempotency():
    """Verifies per-project sync, deduplication/idempotency, and evidence integration without auto-verification."""
    from backend.app.db.session import SessionLocal
    from backend.app.models.sync_run import RawSourceRecord
    from backend.app.models.evidence import EvidenceItem
    with SessionLocal() as db:
        db.query(RawSourceRecord).filter(
            RawSourceRecord.provider == "jira",
            RawSourceRecord.external_record_id == "CORE-101",
        ).delete()
        db.query(EvidenceItem).filter(
            EvidenceItem.source_provider == "jira",
            EvidenceItem.external_record_id == "CORE-101",
        ).delete()
        db.commit()

    with patch("backend.app.integrations.jira.client.JiraCloudClient.test_connection") as mock_test, \
         patch("backend.app.integrations.jira.client.JiraCloudClient.search_issues") as mock_search, \
         patch("backend.app.ingestion.pipeline.queue_manager.enqueue_job"):
        
        mock_test.return_value = {
            "valid": True,
            "account_id": "acc-1234",
            "display_name": "Alex Chen",
            "email_address": "alex@company.com",
            "site_url": "https://company.atlassian.net",
            "active": True,
        }
        
        # Connect first
        client.post(
            "/api/v1/connections/jira",
            json={
                "site_url": "https://company.atlassian.net",
                "email": "alex@company.com",
                "api_token": "valid_token_12345",
                "selected_projects": ["CORE"],
            },
            headers=AUTH_HEADERS,
        )

        mock_search.return_value = [
            {
                "id": "20001",
                "key": "CORE-101",
                "summary": "Implement Redis Cache Cluster",
                "description": "Architected low-latency caching cluster for session invalidation.",
                "status_name": "Done",
                "status_category": "done",
                "issue_type": "Story",
                "assignee_name": "Alex Chen",
                "assignee_email": "alex@company.com",
                "components": ["Caching", "Infrastructure"],
                "labels": ["backend", "performance"],
                "url": "https://company.atlassian.net/browse/CORE-101",
                "project_key": "CORE",
            }
        ]

        # Sync specific project CORE
        sync_resp = client.post(
            "/api/v1/connections/jira/sync",
            json={"project_key": "CORE"},
            headers=AUTH_HEADERS,
        )
        assert sync_resp.status_code == 200
        data = sync_resp.json()
        assert data["status"] == "completed"
        assert data["records_discovered"] == 1
        assert data["records_imported"] == 1

        # Second sync with updated description (Idempotency check)
        mock_search.return_value = [
            {
                "id": "20001",
                "key": "CORE-101",
                "summary": "Implement Redis Cache Cluster (v2)",
                "description": "Updated cluster configuration with Redis Sentinel failover.",
                "status_name": "Done",
                "status_category": "done",
                "issue_type": "Story",
                "assignee_name": "Alex Chen",
                "assignee_email": "alex@company.com",
                "components": ["Caching", "Infrastructure"],
                "labels": ["backend", "performance"],
                "url": "https://company.atlassian.net/browse/CORE-101",
                "project_key": "CORE",
            }
        ]

        sync_resp2 = client.post(
            "/api/v1/connections/jira/sync",
            json={"project_key": "CORE"},
            headers=AUTH_HEADERS,
        )
        assert sync_resp2.status_code == 200
        data2 = sync_resp2.json()
        assert data2["status"] == "completed"
        # Should be updated, NOT duplicate imported
        assert data2["records_updated"] == 1
        assert data2["records_imported"] == 0


def test_jira_secrets_never_exposed_in_api():
    """Ensures raw API tokens are never surfaced in connection listings or project payloads."""
    resp = client.get("/api/v1/connections", headers=AUTH_HEADERS)
    assert resp.status_code == 200
    content = resp.text
    assert "valid_token_12345" not in content
    assert "fake_token_12345" not in content


@pytest.mark.asyncio
async def test_jira_search_issues_v3_jql_and_pagination():
    """Verifies that search_issues queries /rest/api/3/search/jql and processes nextPageToken."""
    jira = JiraCloudClient("https://company.atlassian.net", "alex@company.com", "fake_token")

    page1_data = {
        "issues": [
            {
                "id": "1001",
                "key": "TEST-1",
                "fields": {
                    "summary": "First Issue",
                    "description": "ADF or plain text",
                    "status": {"name": "In Progress", "statusCategory": {"key": "indeterminate"}},
                    "issuetype": {"name": "Story"},
                    "components": [{"name": "Auth"}],
                    "labels": ["security"],
                },
            }
        ],
        "nextPageToken": "token_abc123",
        "isLast": False,
    }

    page2_data = {
        "issues": [
            {
                "id": "1002",
                "key": "TEST-2",
                "fields": {
                    "summary": "Second Issue",
                    "description": "ADF or plain text",
                    "status": {"name": "Done", "statusCategory": {"key": "done"}},
                    "issuetype": {"name": "Bug"},
                    "components": [],
                    "labels": [],
                },
            }
        ],
        "nextPageToken": None,
        "isLast": True,
    }

    call_urls = []

    async def mock_get(url, *args, **kwargs):
        call_urls.append(url)
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        params = kwargs.get("params", {})
        if params.get("nextPageToken") == "token_abc123":
            mock_resp.json.return_value = page2_data
        else:
            mock_resp.json.return_value = page1_data
        return mock_resp

    with patch("httpx.AsyncClient.get", side_effect=mock_get):
        issues = await jira.search_issues("TEST", limit=10)
        assert len(issues) == 2
        assert issues[0]["key"] == "TEST-1"
        assert issues[1]["key"] == "TEST-2"
        assert all("/rest/api/3/search/jql" in u for u in call_urls)


@pytest.mark.asyncio
async def test_jira_search_issues_v2_fallback():
    """Verifies that search_issues falls back to /rest/api/2/search if /search/jql returns 410 or 404."""
    jira = JiraCloudClient("https://company.atlassian.net", "alex@company.com", "fake_token")

    call_urls = []

    async def mock_get(url, *args, **kwargs):
        call_urls.append(url)
        mock_resp = MagicMock()
        if "/rest/api/3/search/jql" in url:
            mock_resp.status_code = 410
            mock_resp.json.return_value = {"errorMessages": ["Deprecated"]}
        else:
            mock_resp.status_code = 200
            mock_resp.json.return_value = {
                "issues": [
                    {
                        "id": "2001",
                        "key": "FALLBACK-1",
                        "fields": {"summary": "Fallback Issue", "description": ""},
                    }
                ],
                "total": 1,
            }
        return mock_resp

    with patch("httpx.AsyncClient.get", side_effect=mock_get):
        issues = await jira.search_issues("FALLBACK", limit=10)
        assert len(issues) == 1
        assert issues[0]["key"] == "FALLBACK-1"
        assert any("/rest/api/3/search/jql" in u for u in call_urls)
        assert any("/rest/api/2/search" in u for u in call_urls)

