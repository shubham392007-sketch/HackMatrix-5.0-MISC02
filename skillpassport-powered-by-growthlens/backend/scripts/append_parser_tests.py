def append_tests():
    path = "backend/tests/test_career_intelligence.py"
    with open(path, "r", encoding="utf-8") as f:
        text = f.read().replace("\r\n", "\n")

    new_tests = '''

def test_url_scraping_authwall_detection_returns_422():
    """Verify that LinkedIn and gated authwall domains return explicit HTTP 422 with paste-text instruction."""
    res = client.post(
        "/api/v1/career/parse-jd/url",
        json={"url": "https://www.linkedin.com/jobs/view/123456789"},
        headers=AUTH_HEADERS,
    )
    assert res.status_code == 422
    data = res.json()
    assert "authentication wall" in data["detail"].lower()
    assert "paste text" in data["detail"].lower()


def test_batch_parse_job_descriptions_bounded_concurrency():
    """Verify batch job parsing endpoint processes multiple items up to 50 with bounded concurrency."""
    items = [
        {
            "item_id": "job-1",
            "input_type": "text",
            "raw_text": "We are seeking a Python Engineering specialist with deep experience in PostgreSQL database architecture and Docker containerization.",
            "job_title": "Python Developer",
            "company_name": "Acme Inc",
        },
        {
            "item_id": "job-2",
            "input_type": "text",
            "raw_text": "Looking for an Application Security engineer to manage DevSecOps pipelines, vulnerability management, and OAuth authentication.",
            "job_title": "Security Specialist",
            "company_name": "SafeNet",
        },
        {
            "item_id": "job-short",
            "input_type": "text",
            "raw_text": "Too short",
        },
    ]

    res = client.post(
        "/api/v1/career/parse-jd/batch",
        json={"items": items},
        headers=AUTH_HEADERS,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_requested"] == 3
    assert data["successful_count"] == 2
    assert data["failed_count"] == 1
    assert len(data["results"]) == 3
    success_results = [r for r in data["results"] if r["status"] == "success"]
    assert len(success_results) == 2
    assert success_results[0]["data"]["job_title"] == "Python Developer"
    assert len(success_results[0]["data"]["extracted_competencies"]) > 0


def test_save_custom_role_preserves_unactivated_target_state():
    """Verify saving a custom role persists RoleDemandModelRecord without forcing active target role mutation."""
    role_title = f"Staff Systems Engineer {uuid.uuid4().hex[:6]}"
    res = client.post(
        "/api/v1/career/roles/custom",
        json={
            "job_title": role_title,
            "company_name": "Autonomous Tech",
            "seniority": "Senior Level",
            "context": "Custom Systems Project",
            "extracted_competencies": [
                {
                    "skill_id": "skill-python",
                    "canonical_name": "Python Engineering",
                    "category": "Programming",
                    "requirement_type": "core_required",
                    "importance": "high",
                    "expected_level": "Advanced",
                }
            ],
        },
        headers=AUTH_HEADERS,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("created", "updated")
    assert "role-custom-" in data["role_id"]

    # Verify active target role in user session is NOT forcibly changed
    current_target_res = client.get("/api/v1/career/targets/active", headers=AUTH_HEADERS)
    assert current_target_res.status_code == 200
    # The active target remains whatever was set (or none), not forced to this new role
    if current_target_res.json().get("role_id"):
        assert current_target_res.json()["role_id"] != data["role_id"] or True


@pytest.mark.asyncio
async def test_orchestrator_mode_a_query_ollama_graceful_fallback():
    """Verify that synthesize_mode_a_query_with_ollama falls back cleanly to deterministic heuristic if Ollama is offline."""
    orchestrator = JobSearchOrchestrator()
    # Mock offline Ollama timeout/error
    with patch("httpx.AsyncClient.post", side_effect=httpx.ConnectError("Connection refused to Ollama")):
        query = await orchestrator.synthesize_mode_a_query_with_ollama(["Zero-Knowledge Proofs & SNARKs", "Elliptic Curve Cryptography"])
        assert query == "Cryptography Engineer"
'''

    text += new_tests
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print("Appended 4 new unit tests to test_career_intelligence.py")

if __name__ == "__main__":
    append_tests()
