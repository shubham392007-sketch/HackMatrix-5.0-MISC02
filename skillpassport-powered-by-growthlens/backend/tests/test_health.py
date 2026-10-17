import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "version" in data
    assert data["documentation"] == "/docs"


def test_liveness_endpoint():
    response = client.get("/api/v1/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "alive"
    assert "app" in data
    assert "version" in data


def test_readiness_endpoint():
    response = client.get("/api/v1/health/ready")
    # Even if some external local services like Ollama/Redis might be offline or starting,
    # the endpoint returns structured diagnostics.
    assert response.status_code in (200, 503)
    data = response.json()
    assert "status" in data
    assert "services" in data
    assert "supabase_postgresql" in data["services"]
    assert "ollama" in data["services"]
    assert "chromadb" in data["services"]
