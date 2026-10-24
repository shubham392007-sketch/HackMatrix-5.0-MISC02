import pytest
from fastapi.testclient import TestClient
try:
    from backend.app.main import app
except ImportError:
    from app.main import app

client = TestClient(app)

AUTH_HEADER = {"Authorization": "Bearer sp_demo_alexchen_valid"}


def test_sharing_overview():
    """Verify overview endpoint returns real aggregated counts and readiness metrics."""
    res = client.get("/api/v1/sharing/overview", headers=AUTH_HEADER)
    assert res.status_code == 200
    data = res.json()
    assert "readiness" in data
    assert "links" in data
    assert "messaging" in data
    assert "recent_activities" in data

    readiness = data["readiness"]
    assert "verified_skills_count" in readiness
    assert "candidate_skills_count" in readiness
    assert "eligible_evidence_count" in readiness
    assert "custom_skills_count" in readiness
    assert isinstance(readiness["verified_skills_count"], int)
    assert isinstance(readiness["eligible_evidence_count"], int)

    links = data["links"]
    assert "active_links" in links
    assert "total_links" in links
    assert "recent_links" in links


def test_custom_skills_lifecycle_and_invariants():
    """Verify candidate can author custom skills, attached to evidence, labeled unverified."""
    # 1. Create a custom skill
    payload = {
        "title": "Autonomous LLM Evaluation Frameworks",
        "description": "Design and deployment of multi-agent adversarial test harness for evaluating model hallucinations.",
        "context": "Built internal benchmarking tool across 10 prompt suites.",
        "self_assessed_level": "Expert",
        "tags": ["evals", "rag", "guardrails"],
        "attached_evidence_ids": [],
        "external_project_url": "https://github.com/alexchen/llm-eval-harness",
    }
    create_res = client.post("/api/v1/sharing/custom-skills", json=payload, headers=AUTH_HEADER)
    assert create_res.status_code in (200, 201)
    custom_skill = create_res.json()
    skill_id = custom_skill["id"]

    # Invariant 1: Must be explicitly labeled as unverified
    assert custom_skill["isVerified"] is False
    assert custom_skill["verificationLabel"] == "User-declared · Not independently verified"
    assert custom_skill["title"] == payload["title"]

    # 2. List custom skills and confirm presence
    list_res = client.get("/api/v1/sharing/custom-skills", headers=AUTH_HEADER)
    assert list_res.status_code == 200
    all_custom = list_res.json()
    assert any(s["id"] == skill_id for s in all_custom)

    # Invariant 2: Custom skill must NOT appear in verified skills count in overview
    overview_res = client.get("/api/v1/sharing/overview", headers=AUTH_HEADER)
    assert overview_res.status_code == 200
    overview_data = overview_res.json()
    assert overview_data["readiness"]["custom_skills_count"] >= 1

    # 3. Clean up custom skill
    del_res = client.delete(f"/api/v1/sharing/custom-skills/{skill_id}", headers=AUTH_HEADER)
    assert del_res.status_code in (200, 204)


def test_share_link_creation_and_canonical_projection():
    """Verify share link issuance, template selection, and canonical projection isolation."""
    create_payload = {
        "label": "DeepMind Staff ML Systems Recruiter Share",
        "template_id": "ai_ml",
        "expiry_days": 14,
        "permissions": {
            "identity": {
                "showDisplayName": True,
                "showHeadline": True,
                "showSummary": True,
                "showContactInfo": False,
            },
            "shareVerifiedSkillsOnly": True,
            "selectedSkillIds": [],
            "selectedCustomSkillIds": [],
            "evidenceAccessLevel": "detail_inspection",
            "selectedEvidencePermissions": {},
            "includeRoleAlignment": True,
            "targetRoleId": "role-ml-systems",
            "allowRecruiterMessaging": True,
            "templateId": "ai_ml",
            "expiryDays": 14,
            "customLinkLabel": "DeepMind Staff ML Systems Recruiter Share",
        },
    }

    create_res = client.post("/api/v1/sharing/links", json=create_payload, headers=AUTH_HEADER)
    assert create_res.status_code in (200, 201)
    link = create_res.json()

    share_token = link["shareId"]
    link_id = link["id"]
    assert len(share_token) >= 16
    assert link["status"] == "active"
    assert link["templateId"] == "ai_ml"

    # Public access test
    public_res = client.get(f"/api/v1/sharing/public/{share_token}")
    assert public_res.status_code == 200
    projection = public_res.json()

    assert projection["shareId"] == share_token
    assert projection["status"] == "active"
    assert projection["isRevoked"] is False
    assert projection["isExpired"] is False
    assert projection["templateId"] == "ai_ml"
    assert projection["allowRecruiterMessaging"] is True
    assert "candidateProfile" in projection
    assert "verifiedSkills" in projection
    assert "authorizedEvidence" in projection

    # All verified skills in projection must strictly have verification metadata
    for skill in projection["verifiedSkills"]:
        assert "canonicalName" in skill
        assert "verifiedProficiency" in skill
        assert "evidenceCount" in skill

    # Test Recruiter Messaging to candidate
    msg_payload = {
        "sender_name": "Sarah Jenkins",
        "sender_email": "sjenkins@deepmind.google.com",
        "company": "Google DeepMind",
        "role_title": "Staff ML Systems Researcher",
        "subject": "Discussion regarding ML Systems Architecture and RAG pipelines",
        "message_body": "Hi Alex, we reviewed your verified evidence and would love to chat about our LLM serving infrastructure team.",
    }
    msg_res = client.post(f"/api/v1/sharing/public/{share_token}/messages", json=msg_payload)
    assert msg_res.status_code in (200, 201)
    msg_data = msg_res.json()
    assert msg_data["success"] is True
    assert "messageId" in msg_data

    # Candidate retrieves recruiter message in inbox
    inbox_res = client.get("/api/v1/sharing/messages", headers=AUTH_HEADER)
    assert inbox_res.status_code == 200
    messages = inbox_res.json()
    assert len(messages) >= 1
    found_msg = next((m for m in messages if m["senderEmail"] == "sjenkins@deepmind.google.com"), None)
    assert found_msg is not None
    assert found_msg["isRead"] is False

    # Mark message as read
    mark_res = client.patch(f"/api/v1/sharing/messages/{found_msg['id']}/read", headers=AUTH_HEADER)
    assert mark_res.status_code == 200
    assert mark_res.json()["isRead"] is True

    # Test Extending the link
    extend_res = client.post(f"/api/v1/sharing/links/{link_id}/extend", json={"additional_days": 30}, headers=AUTH_HEADER)
    assert extend_res.status_code == 200

    # Test Instant Revocation
    revoke_res = client.post(
        f"/api/v1/sharing/links/{link_id}/revoke",
        json={"reason": "Position filled, candidate concluded hiring loop."},
        headers=AUTH_HEADER,
    )
    assert revoke_res.status_code == 200

    # After revocation, public view MUST show revoked state and purge all capability data
    post_revoke_res = client.get(f"/api/v1/sharing/public/{share_token}")
    assert post_revoke_res.status_code == 200
    revoked_proj = post_revoke_res.json()
    assert revoked_proj["status"] == "revoked"
    assert revoked_proj["isRevoked"] is True
    assert len(revoked_proj["verifiedSkills"]) == 0
    assert len(revoked_proj["authorizedEvidence"]) == 0
    assert len(revoked_proj["customSkills"]) == 0


def test_draft_preview_without_database_persistence():
    """Verify draft preview endpoint computes canonical projection without creating a link record."""
    preview_payload = {
        "label": "Temporary Preview Evaluation",
        "template_id": "executive",
        "permissions": {
            "identity": {
                "showDisplayName": True,
                "showHeadline": True,
                "showSummary": False,
                "showContactInfo": False,
            },
            "shareVerifiedSkillsOnly": True,
            "selectedSkillIds": [],
            "selectedCustomSkillIds": [],
            "evidenceAccessLevel": "summary_only",
            "selectedEvidencePermissions": {},
            "includeRoleAlignment": False,
            "allowRecruiterMessaging": False,
            "templateId": "executive",
            "expiryDays": 7,
        },
    }

    # Count links before
    list_before = client.get("/api/v1/sharing/links", headers=AUTH_HEADER).json()
    count_before = len(list_before)

    # Call preview
    preview_res = client.post("/api/v1/sharing/preview", json=preview_payload, headers=AUTH_HEADER)
    assert preview_res.status_code == 200
    proj = preview_res.json()

    assert proj["templateId"] == "executive"
    assert proj["status"] == "active"
    assert "candidateProfile" in proj

    # Count links after (must not have increased)
    list_after = client.get("/api/v1/sharing/links", headers=AUTH_HEADER).json()
    assert len(list_after) == count_before


def test_master_passport_lifecycle():
    """Verify Master Passport configuration, custom sections persistence, and canonical projection."""
    # 1. Fetch current master passport (or initial default)
    get_res = client.get("/api/v1/sharing/master", headers=AUTH_HEADER)
    assert get_res.status_code == 200
    master_data = get_res.json()
    assert "sectionsConfig" in master_data
    assert "workExperiences" in master_data
    assert "educationEntries" in master_data
    assert "portfolioProjects" in master_data

    # 2. Update master passport with user-authored sections
    update_payload = {
        "title": "Alex Chen - Principal Systems Architect",
        "templateId": "technical",
        "workExperiences": [
            {
                "id": "exp-test-1",
                "jobTitle": "Lead Infrastructure Engineer",
                "organization": "OpenCore Systems",
                "startDate": "2021-03",
                "endDate": "2023-01",
                "isCurrent": False,
                "description": "Architected low-latency pub/sub and distributed consensus pipelines.",
                "achievements": ["Reduced tail latency by 45%", "Built automated verification cluster"],
                "techStack": ["Go", "Kubernetes", "gRPC", "PostgreSQL"],
                "attachedEvidenceIds": [],
            }
        ],
        "educationEntries": [
            {
                "id": "edu-test-1",
                "institution": "University of California, Berkeley",
                "degree": "B.S.",
                "fieldOfStudy": "Computer Science",
                "startYear": "2015",
                "endYear": "2019",
                "coursework": ["Distributed Systems", "Operating Systems", "Machine Learning"],
            }
        ],
        "portfolioProjects": [
            {
                "id": "proj-test-1",
                "title": "RAG Verification Sentinel",
                "description": "Zero-trust verification service for LLM hallucinations with cryptographic provenance.",
                "role": "Lead Architect",
                "techStack": ["Python", "FastAPI", "Vector DB"],
                "outcomes": ["Audited 50k outputs with zero leakage"],
                "repoUrl": "https://github.com/alexchen/rag-sentinel",
            }
        ],
        "certifications": [
            {
                "id": "cert-test-1",
                "name": "CKA: Certified Kubernetes Administrator",
                "issuer": "Cloud Native Computing Foundation",
                "issueDate": "2022-06",
            }
        ],
    }

    put_res = client.put("/api/v1/sharing/master", json=update_payload, headers=AUTH_HEADER)
    assert put_res.status_code == 200
    saved = put_res.json()
    assert saved["title"] == "Alex Chen - Principal Systems Architect"
    assert saved["templateId"] == "technical"
    assert len(saved["workExperiences"]) >= 1
    assert len(saved["educationEntries"]) >= 1
    assert len(saved["portfolioProjects"]) >= 1
    assert len(saved["certifications"]) >= 1

    # 3. Canonical Preview must project these sections when authorized
    prev_res = client.post("/api/v1/sharing/preview", json={"templateId": "technical"}, headers=AUTH_HEADER)
    assert prev_res.status_code == 200
    proj = prev_res.json()
    assert len(proj["workExperience"]) >= 1
    assert proj["workExperience"][0]["jobTitle"] == "Lead Infrastructure Engineer"
    assert proj["workExperience"][0]["organization"] == "OpenCore Systems"
    assert len(proj["education"]) >= 1
    assert proj["education"][0]["institution"] == "University of California, Berkeley"
    assert len(proj["projects"]) >= 1
    assert proj["projects"][0]["title"] == "RAG Verification Sentinel"
    assert len(proj["certifications"]) >= 1

    # 4. Anonymous Mode projection must anonymize institution and company names
    anon_prev = client.post("/api/v1/sharing/preview", json={"templateId": "anonymous"}, headers=AUTH_HEADER)
    assert anon_prev.status_code == 200
    anon_proj = anon_prev.json()
    assert anon_proj["candidateProfile"]["isAnonymous"] is True
    assert anon_proj["workExperience"][0]["organization"] == "[Confidential Organization]"
    assert anon_proj["education"][0]["institution"] == "[Accredited Institution]"


def test_preview_mode_evidence_inspection_and_messaging():
    """Verify evidence modal and recruiter inquiry submission work in Preview / Recruiter View mode."""
    # 1. Fetch preview projection to obtain an authorized evidence id
    prev_res = client.post("/api/v1/sharing/preview", json={"templateId": "classic"}, headers=AUTH_HEADER)
    assert prev_res.status_code == 200
    proj = prev_res.json()
    assert proj["shareId"] == "preview-token"
    assert "authorizedEvidence" in proj

    # 2. Inspect evidence using preview token
    if proj["authorizedEvidence"]:
        ev_id = proj["authorizedEvidence"][0]["id"]
        ev_res = client.get(f"/api/v1/sharing/public/preview-token/evidence/{ev_id}")
        assert ev_res.status_code == 200
        ev_data = ev_res.json()
        assert ev_data["id"] == ev_id
        assert "title" in ev_data
        assert "confidenceScore" in ev_data
        assert ev_data["allowDetailInspection"] is True

    # 3. Test recruiter messaging from preview mode
    msg_payload = {
        "sender_name": "Sarah Talent Partner",
        "sender_email": "sarah.tp@techcorp.example",
        "company": "TechCorp",
        "role_title": "Lead Recruiter",
        "subject": "Verified Skill Passport Opportunity",
        "message_body": "We reviewed your verified technical skills and would love to connect.",
    }
    msg_res = client.post("/api/v1/sharing/public/preview-token/messages", json=msg_payload)
    assert msg_res.status_code in (200, 201)
    msg_data = msg_res.json()
    assert "messageId" in msg_data
    assert msg_data.get("notificationCreated") is True


def test_share_link_revoke_and_extend_by_token_string():
    """Verify share link operations (get, update, extend, revoke) accept token string as well as UUID."""
    # 1. Create a share link
    create_payload = {
        "label": "Token Identifier Support Test Link",
        "template_id": "standard",
        "expiry_days": 7,
        "permissions": {
            "identity": {"showDisplayName": True},
            "allowRecruiterMessaging": True,
        },
    }
    create_res = client.post("/api/v1/sharing/links", json=create_payload, headers=AUTH_HEADER)
    assert create_res.status_code in (200, 201)
    link = create_res.json()
    share_token = link["shareId"]
    uuid_id = link["id"]

    # 2. GET by token string
    get_by_tok = client.get(f"/api/v1/sharing/links/{share_token}", headers=AUTH_HEADER)
    assert get_by_tok.status_code == 200
    assert get_by_tok.json()["link"]["id"] == uuid_id

    # 3. PUT by token string
    put_by_tok = client.put(f"/api/v1/sharing/links/{share_token}", json={"label": "Updated Via Token"}, headers=AUTH_HEADER)
    assert put_by_tok.status_code == 200
    assert put_by_tok.json()["label"] == "Updated Via Token"

    # 4. POST /extend by token string
    ext_by_tok = client.post(f"/api/v1/sharing/links/{share_token}/extend", json={"additional_days": 14}, headers=AUTH_HEADER)
    assert ext_by_tok.status_code == 200
    assert ext_by_tok.json()["status"] == "active"

    # 5. POST /revoke by token string (reproducing and verifying the user's exact issue)
    rev_by_tok = client.post(
        f"/api/v1/sharing/links/{share_token}/revoke",
        json={"reason": "Revoked by user using token string in UI"},
        headers=AUTH_HEADER,
    )
    assert rev_by_tok.status_code == 200
    assert rev_by_tok.json()["status"] == "revoked"
    assert rev_by_tok.json()["revocationReason"] == "Revoked by user using token string in UI"

    # 6. Verify public access is revoked
    pub_res = client.get(f"/api/v1/sharing/public/{share_token}")
    assert pub_res.status_code == 200
    assert pub_res.json()["isRevoked"] is True


