import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.extraction.website_extractor import validate_url_safe, SSRFViolationError, website_extractor

client = TestClient(app)
AUTH_HEADERS = {"Authorization": "Bearer sp_demo_alexchen_valid"}


def test_ssrf_blocks_private_and_loopback_ips():
    # Loopback
    with pytest.raises(SSRFViolationError):
        validate_url_safe("http://127.0.0.1/admin")

    with pytest.raises(SSRFViolationError):
        validate_url_safe("http://localhost:8080/metrics")

    # RFC 1918 Private networks
    with pytest.raises(SSRFViolationError):
        validate_url_safe("http://10.1.2.3/internal")

    with pytest.raises(SSRFViolationError):
        validate_url_safe("http://192.168.1.100/router")

    with pytest.raises(SSRFViolationError):
        validate_url_safe("http://172.16.0.5/secrets")


def test_ssrf_blocks_cloud_metadata_and_non_http():
    # Cloud metadata
    with pytest.raises(SSRFViolationError):
        validate_url_safe("http://169.254.169.254/latest/meta-data")

    with pytest.raises(SSRFViolationError):
        validate_url_safe("http://metadata.google.internal/computeMetadata/v1")

    # Non-HTTP schemes
    with pytest.raises(SSRFViolationError):
        validate_url_safe("file:///etc/passwd")

    with pytest.raises(SSRFViolationError):
        validate_url_safe("ftp://ftp.example.com/data")


@pytest.mark.asyncio
async def test_safe_website_extraction_mocked():
    sample_html = """
    <!DOCTYPE html>
    <html>
    <head><title>Alex Chen - Staff Systems Engineer Portfolio</title></head>
    <body>
        <header><nav><a href="/home">Home</a></nav></header>
        <main>
            <h1>Distributed Systems Architecture & Engineering</h1>
            <h2>Core Competencies</h2>
            <p>Designed and scaled event-driven microservices handling 250k RPS with zero downtime.</p>
            <h2>Featured Projects</h2>
            <p>Led real-time analytics pipeline using Kafka and Rust.</p>
            <a href="https://github.com/alexchen/systems">View Open Source</a>
        </main>
        <footer><p>© 2026 Alex Chen</p></footer>
    </body>
    </html>
    """
    with patch("backend.app.extraction.website_extractor.validate_url_safe", return_value={"cleaned_url": "https://alexchen.dev", "is_safe": True}), \
         patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.url = "https://alexchen.dev"
        mock_resp.text = sample_html
        mock_get.return_value = mock_resp

        res = await website_extractor.extract_url("https://alexchen.dev")
        assert "Alex Chen" in res["page_title"]
        assert len(res["headings"]) >= 2
        assert "Distributed Systems Architecture" in res["cleaned_content"]
        assert "https://github.com/alexchen/systems" in res["discovered_links"]
        assert res["char_count"] > 50


def test_portfolio_scrape_endpoint_ssrf_blocked():
    resp = client.post(
        "/api/v1/portfolio/scrape",
        json={"url": "http://169.254.169.254/latest/meta-data"},
        headers=AUTH_HEADERS,
    )
    assert resp.status_code == 400
    assert "Security violation" in resp.json()["detail"]


def test_portfolio_scrape_endpoint_success():
    sample_html = """
    <html><head><title>Cloud Architect Portfolio</title></head>
    <body>
        <h1>Portfolio Overview</h1>
        <p>10 years of experience delivering cloud-native platforms across AWS and GCP.</p>
    </body></html>
    """
    with patch("backend.app.extraction.website_extractor.validate_url_safe", return_value="https://myportfolio.io"), \
         patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.url = "https://myportfolio.io"
        mock_resp.text = sample_html
        mock_get.return_value = mock_resp

        resp = client.post(
            "/api/v1/portfolio/scrape",
            json={"url": "https://myportfolio.io", "title": "Alex Cloud Portfolio"},
            headers=AUTH_HEADERS,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ["success", "already_exists"]
        assert "crawl_id" in data

        # List crawls
        list_resp = client.get("/api/v1/portfolio/crawls", headers=AUTH_HEADERS)
        assert list_resp.status_code == 200
        assert list_resp.json()["total"] >= 1
