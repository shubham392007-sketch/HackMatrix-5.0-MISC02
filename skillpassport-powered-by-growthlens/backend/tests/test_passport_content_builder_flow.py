"""
Comprehensive test suite for the Skill Passport Content Builder Data Flow.
Tests persistence, permission filtering, projection generation, and edge cases (Cases A-F).
"""

import pytest
from fastapi.testclient import TestClient

try:
    from backend.app.main import app
except ImportError:
    from app.main import app

client = TestClient(app)
AUTH_HEADER = {"Authorization": "Bearer sp_demo_alexchen_valid"}


def test_master_passport_persistence_and_retrieval():
    """Verify master passport full state can be persisted and retrieved cleanly via /api/v1/sharing/master."""
    payload = {
        "title": "Alex Chen - Senior Systems Engineer",
        "templateId": "technical",
        "workExperiences": [
            {
                "id": "exp-1",
                "jobTitle": "Staff ML Platform Engineer",
                "organization": "DeepGrowth Inc",
                "startDate": "2023",
                "endDate": "Present",
                "isCurrent": True,
                "description": "Led foundation model governance, evaluation harness, and inference serving.",
                "achievements": [
                    "Designed low-latency RAG streaming service handling 4M queries/day",
                    "Authored automated offline evaluation pipeline for hallucination guardrails"
                ],
                "techStack": ["Python", "FastAPI", "Kubernetes", "PyTorch"]
            }
        ],
        "educationEntries": [
            {
                "id": "edu-1",
                "degree": "M.S. in Computer Science",
                "institution": "Stanford University",
                "startYear": "2019",
                "endYear": "2021",
                "description": "Specialization in Distributed Systems & Machine Learning.",
                "fieldOfStudy": "Computer Science"
            }
        ],
        "portfolioProjects": [
            {
                "id": "proj-1",
                "title": "Agentic Verification Protocol",
                "description": "Deterministic multi-agent verification benchmark for local LLM inference engines.",
                "role": "Lead Architect",
                "projectUrl": "https://github.com/alexchen/agentic-verification",
                "techStack": ["Python", "FastAPI", "Ollama", "Docker"],
                "highlights": ["Zero-hallucination metric scoring", "Sub-second verification latency"]
            }
        ],
        "certifications": [
            {
                "id": "cert-1",
                "title": "AWS Certified Machine Learning - Specialty",
                "issuer": "Amazon Web Services",
                "issueDate": "2024",
                "expiryDate": "2027",
                "credentialUrl": "https://aws.amazon.com/verification/123456"
            }
        ],
        "publications": [
            {
                "id": "pub-1",
                "title": "Deterministic Verification Bounds for Small Language Models",
                "journal": "NeurIPS Systems Workshop 2025",
                "year": "2025",
                "url": "https://arxiv.org/abs/2512.99999",
                "summary": "Formal verification framework ensuring 100% boundary check adherence for on-premise SLMs."
            }
        ],
        "honorsAwards": [
            {
                "id": "ach-1",
                "title": "GrowthLens Global Innovation Award",
                "issuer": "Executive Engineering Council",
                "date": "2025",
                "description": "Awarded for exceptional contribution to AI safety architecture."
            }
        ],
        "customSections": [
            {
                "id": "cs-1",
                "title": "Patents & Standards",
                "description": "Authored IETF internet-drafts and filed safety patents.",
                "enabled": True,
                "items": [
                    {
                        "id": "item-1",
                        "title": "Cryptographic Skill Assertion Schema",
                        "subtitle": "US Patent Application #18/999,123",
                        "description": "Tamper-evident verification protocol for portable credential metadata."
                    }
                ]
            }
        ],
        "sectionsConfig": {
            "work_experience": {"enabled": True, "order": 1},
            "education": {"enabled": True, "order": 2},
            "portfolio_projects": {"enabled": True, "order": 3},
            "certifications": {"enabled": True, "order": 4},
            "publications": {"enabled": True, "order": 5},
            "achievements": {"enabled": True, "order": 6},
            "custom_sections": {"enabled": True, "order": 7}
        }
    }

    # Save to master passport
    put_res = client.put("/api/v1/sharing/master", json=payload, headers=AUTH_HEADER)
    assert put_res.status_code == 200
    saved = put_res.json()
    assert len(saved["workExperiences"]) == 1
    assert saved["workExperiences"][0]["jobTitle"] == "Staff ML Platform Engineer"
    assert len(saved["customSections"]) == 1
    assert saved["customSections"][0]["title"] == "Patents & Standards"

    # Fetch and verify persistence
    get_res = client.get("/api/v1/sharing/master", headers=AUTH_HEADER)
    assert get_res.status_code == 200
    retrieved = get_res.json()
    assert retrieved["workExperiences"][0]["organization"] == "DeepGrowth Inc"
    assert len(retrieved["portfolioProjects"]) == 1
    assert retrieved["portfolioProjects"][0]["title"] == "Agentic Verification Protocol"
    assert len(retrieved["publications"]) == 1
    assert len(retrieved.get("achievements") or retrieved.get("honorsAwards") or []) == 1


def test_draft_preview_projection_with_embedded_master_state():
    """Verify that draft preview immediately projects builder content without needing prior DB write."""
    custom_master = {
        "workExperience": [
            {
                "id": "exp-draft",
                "role": "Principal AI Architect",
                "company": "Cognitive Edge Corp",
                "period": "2024 - 2026",
                "summary": "Led high-assurance AI agents deployment.",
                "bullets": ["Evaluated 12 model families", "Zero security breach track record"],
                "skills": ["Python", "Rust", "TypeScript"]
            }
        ],
        "education": [],
        "projects": [
            {
                "id": "proj-draft",
                "title": "SLM Fast-Inference Engine",
                "description": "C++ AVX-512 accelerated execution engine for Qwen3-8B.",
                "role": "Author",
                "url": "https://github.com/alexchen/fast-slm",
                "techStack": ["C++", "Python", "CMake"]
            }
        ],
        "certifications": [],
        "publications": [],
        "achievements": [],
        "customSections": [
            {
                "id": "sec-draft",
                "title": "Advisory Boards",
                "enabled": True,
                "items": [
                    {"id": "adv-1", "title": "Open Source AI Safety Foundation", "subtitle": "Board Member (2024-Present)"}
                ]
            }
        ]
    }

    preview_payload = {
        "label": "Technical Draft Preview",
        "template_id": "technical-portfolio",
        "permissions": {
            "identity": {
                "showDisplayName": True,
                "showHeadline": True,
                "showSummary": True,
                "showContactInfo": True
            },
            "shareVerifiedSkillsOnly": False,
            "selectedSkillIds": [],
            "selectedCustomSkillIds": [],
            "evidenceAccessLevel": "summary_only",
            "selectedEvidencePermissions": {},
            "includeRoleAlignment": False,
            "allowRecruiterMessaging": True,
            "templateId": "technical-portfolio",
            "sections": {
                "work_experience": True,
                "projects": True,
                "portfolio_projects": True,
                "custom_sections": True
            },
            "master_passport": custom_master
        }
    }

    res = client.post("/api/v1/sharing/preview", json=preview_payload, headers=AUTH_HEADER)
    assert res.status_code == 200
    projection = res.json()

    # Verify work experience projected
    assert len(projection["workExperience"]) == 1
    assert projection["workExperience"][0]["role"] == "Principal AI Architect"
    assert projection["workExperience"][0]["company"] == "Cognitive Edge Corp"

    # Verify projects projected
    assert len(projection["projects"]) == 1
    assert projection["projects"][0]["title"] == "SLM Fast-Inference Engine"

    # Verify custom sections projected
    assert len(projection["customSections"]) == 1
    assert projection["customSections"][0]["title"] == "Advisory Boards"


def test_case_c_d_permissions_and_hidden_sections():
    """
    Case C: Section hidden in sectionsConfig.
    Case D: Section excluded from share permissions.
    Both must ensure the excluded section is completely omitted from final projection.
    """
    share_payload = {
        "label": "Frontend Lead Share Link",
        "purpose": "Hiring Review",
        "template_id": "software-fullstack",
        "permissions": {
            "identity": {
                "showDisplayName": True,
                "showHeadline": True,
                "showSummary": True,
                "showContactInfo": True
            },
            "shareVerifiedSkillsOnly": False,
            "selectedSkillIds": [],
            "selectedCustomSkillIds": [],
            "evidenceAccessLevel": "summary_only",
            "selectedEvidencePermissions": {},
            "includeRoleAlignment": False,
            "allowRecruiterMessaging": True,
            "templateId": "software-fullstack",
            "sections": {
                "work_experience": True,
                "portfolio_projects": False,  # Explicitly excluded
                "education": False,           # Explicitly excluded
                "publications": False,        # Explicitly excluded
                "achievements": True
            },
            "master_passport": {
                "workExperience": [{"id": "w1", "role": "Fullstack Dev", "company": "VentureCo", "summary": "Frontend lead"}],
                "projects": [{"id": "p1", "title": "Portal App", "description": "Interactive portal"}],
                "education": [{"id": "e1", "degree": "BS CS", "institution": "Tech Univ"}],
                "publications": [{"id": "pub1", "title": "Paper on React"}],
                "achievements": [{"id": "a1", "title": "Hackathon Winner", "issuer": "TechCon", "date": "2024"}]
            }
        }
    }

    link_res = client.post("/api/v1/sharing/links", json=share_payload, headers=AUTH_HEADER)
    assert link_res.status_code in (200, 201)
    link_data = link_res.json()
    token = link_data.get("shareId") or link_data.get("token")
    assert token is not None

    # Fetch recruiter view projection
    proj_res = client.get(f"/api/v1/sharing/public/{token}")
    assert proj_res.status_code == 200
    proj = proj_res.json()

    # Disclosed sections must be present
    assert len(proj["workExperience"]) >= 1
    assert len(proj["achievements"]) >= 1

    # Excluded sections must be strictly empty (Case D)
    assert len(proj["projects"]) == 0
    assert len(proj["education"]) == 0
    assert len(proj["publications"]) == 0


def test_case_a_b_e_f_edge_cases():
    """
    Case A: Partial/optional fields blank.
    Case B: Entire section unpopulated.
    Case E: Partial fields populated (e.g. no link, no period).
    Case F: Zero selected entries.
    Verify no runtime crashes, no fabricated content, and clean data output.
    """
    minimal_master = {
        # Case A & E: Missing optional fields like 'bullets', 'location', 'skills'
        "workExperience": [
            {
                "id": "exp-sparse",
                "role": "Systems Consultant",
                "company": "Apex Dynamics",
                "summary": "Short consulting engagement."
            }
        ],
        # Case B: Entire section unpopulated
        "education": [],
        # Case E: Missing url, highlights
        "projects": [
            {
                "id": "proj-sparse",
                "title": "Minimal Script",
                "description": "Python CLI tool"
            }
        ],
        "certifications": [],
        "publications": [],
        "achievements": [],
        # Case F: Custom section with empty items list
        "customSections": [
            {
                "id": "cs-empty",
                "title": "Empty Community Work",
                "enabled": True,
                "items": []
            }
        ]
    }

    preview_payload = {
        "label": "Minimal Privacy Draft",
        "template_id": "minimal-privacy",
        "permissions": {
            "identity": {
                "showDisplayName": True,
                "showHeadline": True,
                "showSummary": True,
                "showContactInfo": False
            },
            "shareVerifiedSkillsOnly": False,
            "selectedSkillIds": [],
            "selectedCustomSkillIds": [],
            "evidenceAccessLevel": "summary_only",
            "selectedEvidencePermissions": {},
            "includeRoleAlignment": False,
            "allowRecruiterMessaging": False,
            "templateId": "minimal-privacy",
            "sections": {
                "work_experience": True,
                "portfolio_projects": True,
                "education": True,
                "custom_sections": True
            },
            "master_passport": minimal_master
        }
    }

    res = client.post("/api/v1/sharing/preview", json=preview_payload, headers=AUTH_HEADER)
    assert res.status_code == 200
    p = res.json()

    # Case A & E: Valid sparse item must project without failing
    assert len(p["workExperience"]) == 1
    assert p["workExperience"][0]["role"] == "Systems Consultant"
    assert p["workExperience"][0].get("company") == "Apex Dynamics"
    assert p["workExperience"][0].get("bullets", []) == []

    # Case B: Empty section must stay empty, zero fabricated stubs
    assert p["education"] == []
    assert p["certifications"] == []
    assert p["publications"] == []

    # Case F: Custom section with zero items projects with empty items array
    assert len(p["customSections"]) == 1
    assert p["customSections"][0]["items"] == []
