import pytest
import uuid
from fastapi.testclient import TestClient
try:
    from backend.app.main import app
except ImportError:
    from app.main import app

client = TestClient(app)
AUTH_HEADER = {"Authorization": "Bearer sp_demo_alexchen_valid"}


def test_get_sharing_permissions_default_or_saved():
    """
    Test A & B: Verify GET /api/v1/sharing/permissions returns authoritative
    permissions with valid structure and enforced security invariants.
    """
    res = client.get("/api/v1/sharing/permissions", headers=AUTH_HEADER)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()

    # Core structure validation
    assert "identity" in data
    assert "selectedSkillIds" in data or "selected_skill_ids" in data
    assert "selectedEvidencePermissions" in data or "selected_evidence_permissions" in data
    assert "sections" in data

    # Security Invariant: shareVerifiedSkillsOnly must always be True
    assert data.get("shareVerifiedSkillsOnly") is True or data.get("share_verified_skills_only") is True

    # Identity structure
    ident = data["identity"]
    assert "showDisplayName" in ident or "show_display_name" in ident
    assert "showContactInfo" in ident or "show_contact_info" in ident


def test_put_and_persist_sharing_permissions():
    """
    Test C: Verify PUT /api/v1/sharing/permissions validates and persists
    authoritative default sharing permissions to PostgreSQL.
    """
    # 1. Fetch current permissions to get real verified skills
    initial_res = client.get("/api/v1/sharing/permissions", headers=AUTH_HEADER)
    assert initial_res.status_code == 200
    initial_data = initial_res.json()
    valid_skills = initial_data.get("selectedSkillIds") or initial_data.get("selected_skill_ids") or []

    # Pick a subset of skills if available
    subset_skills = valid_skills[:2] if len(valid_skills) >= 2 else valid_skills

    payload = {
        "identity": {
            "showDisplayName": True,
            "showHeadline": True,
            "showSummary": False,
            "showContactInfo": True,
            "contactEmail": "candidate.alex@example.com",
            "contactLinkedIn": "linkedin.com/in/alexchen-sync-test",
        },
        "shareVerifiedSkillsOnly": True,
        "selectedSkillIds": subset_skills,
        "selectedCustomSkillIds": [],
        "evidenceAccessLevel": "detail_inspection",
        "selectedEvidencePermissions": {},
        "includeRoleAlignment": True,
        "targetRoleId": "role-data-scientist",
        "allowRecruiterMessaging": True,
        "templateId": "technical-portfolio",
        "expiryDays": 30,
        "customLinkLabel": "Audited Recruiter Permissions Link",
        "sections": {
            "work_experience": True,
            "portfolio_projects": True,
            "education": False,
            "certifications": True,
            "publications": False,
            "achievements": True,
            "custom_sections": False,
        },
    }

    put_res = client.put("/api/v1/sharing/permissions", json=payload, headers=AUTH_HEADER)
    assert put_res.status_code == 200, f"Expected 200, got {put_res.status_code}: {put_res.text}"
    persisted = put_res.json()

    # Verify response reflections
    ident = persisted["identity"]
    assert ident.get("showSummary") is False or ident.get("show_summary") is False
    assert ident.get("showContactInfo") is True or ident.get("show_contact_info") is True
    assert persisted.get("expiryDays") == 30 or persisted.get("expiry_days") == 30
    assert persisted.get("customLinkLabel") == "Audited Recruiter Permissions Link" or persisted.get("custom_link_label") == "Audited Recruiter Permissions Link"

    # 2. Subsequent GET must return the persisted configuration from DB
    get_res = client.get("/api/v1/sharing/permissions", headers=AUTH_HEADER)
    assert get_res.status_code == 200
    retrieved = get_res.json()

    retrieved_ident = retrieved["identity"]
    assert retrieved_ident.get("showSummary") is False or retrieved_ident.get("show_summary") is False
    assert retrieved_ident.get("showContactInfo") is True or retrieved_ident.get("show_contact_info") is True
    assert retrieved.get("expiryDays") == 30 or retrieved.get("expiry_days") == 30
    assert retrieved["sections"]["education"] is False
    assert retrieved["sections"]["work_experience"] is True


def test_unverified_skill_filtered_from_saved_permissions():
    """
    Test D: Verify that unverified / fake skill identifiers cannot be saved
    into authoritative sharing permissions.
    """
    fake_skill_id = str(uuid.uuid4())
    payload = {
        "shareVerifiedSkillsOnly": True,
        "selectedSkillIds": [fake_skill_id],
        "identity": {
            "showDisplayName": True,
        },
    }

    put_res = client.put("/api/v1/sharing/permissions", json=payload, headers=AUTH_HEADER)
    assert put_res.status_code == 200
    persisted = put_res.json()

    # The fake skill must be filtered out
    skills_in_response = persisted.get("selectedSkillIds") or persisted.get("selected_skill_ids") or []
    assert fake_skill_id not in skills_in_response


def test_independent_share_link_snapshots():
    """
    Test E: Verify that creating a link records an immutable permissions snapshot,
    so subsequent changes to global sharing defaults never alter existing links.
    """
    # 1. Set global defaults to Config 1
    config_1 = {
        "identity": {"showDisplayName": True, "showContactInfo": False},
        "selectedSkillIds": [],
        "expiryDays": 7,
        "customLinkLabel": "Link A Global Default",
        "sections": {"work_experience": True, "education": False},
    }
    client.put("/api/v1/sharing/permissions", json=config_1, headers=AUTH_HEADER)

    # 2. Create Link A with custom per-link override
    link_a_payload = {
        "label": "Recruiter Link A (Snapshotted)",
        "template_id": "classic",
        "expiry_days": 7,
        "permissions": {
            "identity": {"showDisplayName": True, "showContactInfo": False},
            "selectedSkillIds": [],
            "sections": {"work_experience": True, "education": False},
        },
    }
    res_a = client.post("/api/v1/sharing/links", json=link_a_payload, headers=AUTH_HEADER)
    assert res_a.status_code in (200, 201)
    link_a = res_a.json()
    link_a_token = link_a.get("shareId") or link_a.get("token")

    # 3. Modify global defaults to Config 2
    config_2 = {
        "identity": {"showDisplayName": False, "showContactInfo": True},
        "selectedSkillIds": [],
        "expiryDays": 60,
        "customLinkLabel": "Link B Global Default",
        "sections": {"work_experience": False, "education": True},
    }
    client.put("/api/v1/sharing/permissions", json=config_2, headers=AUTH_HEADER)

    # 4. Create Link B with the new defaults
    link_b_payload = {
        "label": "Recruiter Link B (Snapshotted)",
        "template_id": "technical-portfolio",
        "expiry_days": 60,
        "permissions": {
            "identity": {"showDisplayName": False, "showContactInfo": True},
            "selectedSkillIds": [],
            "sections": {"work_experience": False, "education": True},
        },
    }
    res_b = client.post("/api/v1/sharing/links", json=link_b_payload, headers=AUTH_HEADER)
    assert res_b.status_code in (200, 201)
    link_b = res_b.json()
    link_b_token = link_b.get("shareId") or link_b.get("token")

    # 5. Retrieve Link A from DB and confirm its snapshot is unchanged
    all_links_res = client.get("/api/v1/sharing/links", headers=AUTH_HEADER)
    assert all_links_res.status_code == 200
    all_links = all_links_res.json()

    retrieved_a = next((l for l in all_links if (l.get("shareId") == link_a_token or l.get("id") == link_a.get("id"))), None)
    assert retrieved_a is not None, "Link A must exist"
    perms_a = retrieved_a.get("permissions") or {}
    ident_a = perms_a.get("identity") or {}

    # Link A retains its original snapshot: showContactInfo was False
    assert ident_a.get("showContactInfo") is False or ident_a.get("show_contact_info") is False

    # 6. Retrieve Link B and confirm it reflects Config 2
    retrieved_b = next((l for l in all_links if (l.get("shareId") == link_b_token or l.get("id") == link_b.get("id"))), None)
    assert retrieved_b is not None, "Link B must exist"
    perms_b = retrieved_b.get("permissions") or {}
    ident_b = perms_b.get("identity") or {}
    assert ident_b.get("showContactInfo") is True or ident_b.get("show_contact_info") is True
