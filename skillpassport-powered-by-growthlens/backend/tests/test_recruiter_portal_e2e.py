import os
os.environ["APP_ENV"] = "test"

import uuid
import json
import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB, UUID
from fastapi.testclient import TestClient

# Register SQLite JSONB and UUID compilers before tables are created
@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"

@compiles(UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(36)"

from backend.app.main import app
from backend.app.models.base import Base
import backend.app.models  # Register all models with Base.metadata
from backend.app.db.session import get_db
from backend.app.db.reliability import circuit_breaker
from backend.app.api.dependencies import get_current_user, AuthenticatedUser
from backend.app.models.recruiter import EmployerOrganization, OrganizationMembership, CandidateShareInvitation
from backend.app.models.career import JobPostingRecord
from backend.app.models.sharing import ShareLinkRecord, RecruiterMessage, UserNotification, UserPassportConfigRecord
from backend.app.models.user_profile import UserProfile

# Single persistent in-memory SQLite connection via StaticPool
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

with engine.connect() as conn:
    conn.execute(text("ATTACH DATABASE ':memory:' AS auth;"))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS auth.users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE,
            encrypted_password TEXT,
            created_at TEXT,
            updated_at TEXT,
            raw_user_meta_data TEXT
        );
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS auth.identities (
            id TEXT PRIMARY KEY,
            provider_id TEXT,
            user_id TEXT,
            identity_data TEXT,
            provider TEXT,
            created_at TEXT,
            updated_at TEXT
        );
    """))
    conn.commit()

# Create all application tables
Base.metadata.create_all(bind=engine)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Reset circuit breaker
circuit_breaker.reset()

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# NOTICE: We DO NOT override get_current_user!
# The test suite exercises genuine token parsing, verification, and role resolution.
app.dependency_overrides[get_db] = override_get_db
if get_current_user in app.dependency_overrides:
    del app.dependency_overrides[get_current_user]

client = TestClient(app)

# ==============================================================================
# TEST SUITE: RECRUITER AUTHENTICATION & PORTAL E2E
# ==============================================================================

class TestRecruiterPortalE2E:

    recruiter_token = None
    recruiter_id = None
    org_id = None
    candidate_id = "00000000-0000-0000-0000-000000000001"
    candidate_token = "test-token-00000000-0000-0000-0000-000000000001:alex.chen@innovatecorp.internal"
    created_job_id = None
    created_invitation_id = None

    @pytest.fixture(autouse=True)
    def ensure_db(self):
        circuit_breaker.reset()
        yield

    def test_01_recruiter_registration_and_login_flow(self):
        """1. Employer Registration, Org Provisioning, and Login Authentication."""
        reg_payload = {
            "full_name": "Elena Rostova",
            "work_email": "elena.rostova@cyberdyne-defense.ai",
            "password": "SecurePassword123!",
            "organization_name": "Cyberdyne Defense AI",
            "job_title": "Head of Engineering Talent",
            "website": "https://cyberdyne-defense.ai",
            "location": "Boston, MA",
            "industry": "Artificial Intelligence / Defense",
            "company_size": "250-500",
        }
        res = client.post("/api/v1/recruiter/auth/register", json=reg_payload)
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["success"] is True
        assert data["token"] is not None
        assert data["organization"]["name"] == "Cyberdyne Defense AI"
        assert data["organization"]["slug"] == "cyberdyne-defense-ai"
        assert data["role"] == "org_admin"
        assert data["status"] == "active"

        TestRecruiterPortalE2E.recruiter_id = data["user_id"]
        TestRecruiterPortalE2E.org_id = data["organization"]["id"]
        TestRecruiterPortalE2E.recruiter_token = data["token"]

        # Duplicate registration must fail with 409 Conflict
        res_dup = client.post("/api/v1/recruiter/auth/register", json=reg_payload)
        assert res_dup.status_code == 409

        # Recruiter login with password
        login_res = client.post(
            "/api/v1/recruiter/auth/login",
            json={"email": "elena.rostova@cyberdyne-defense.ai", "password": "SecurePassword123!"},
        )
        assert login_res.status_code == 200
        login_data = login_res.json()
        assert login_data["success"] is True
        assert login_data["token"] is not None
        TestRecruiterPortalE2E.recruiter_token = login_data["token"]

        # Access /recruiter/auth/me using genuine Bearer token header
        headers = {"Authorization": f"Bearer {TestRecruiterPortalE2E.recruiter_token}"}
        me_res = client.get("/api/v1/recruiter/auth/me", headers=headers)
        assert me_res.status_code == 200, f"Expected 200, got {me_res.status_code}: {me_res.text}"
        me_data = me_res.json()
        assert me_data["organization"]["id"] == TestRecruiterPortalE2E.org_id
        assert me_data["role"] == "org_admin"

    def test_02_token_validation_and_rejection_security(self):
        """2. Security Verification: Token verification and rejection invariants."""
        # A. Fabricated legacy rec_session_ token must be rejected with 401
        fake_rec_headers = {"Authorization": "Bearer rec_session_fake_1234567890abcdef"}
        res1 = client.get("/api/v1/recruiter/dashboard/overview", headers=fake_rec_headers)
        assert res1.status_code == 401, f"Expected 401 for fake rec_session token, got {res1.status_code}"

        # B. Invalid / malformed Bearer token must be rejected with 401
        malformed_headers = {"Authorization": "Bearer invalid.malformed.token"}
        res2 = client.get("/api/v1/recruiter/dashboard/overview", headers=malformed_headers)
        assert res2.status_code == 401, f"Expected 401 for malformed token, got {res2.status_code}"

        # C. Candidate identity without recruiter membership receives 403 Forbidden
        cand_headers = {"Authorization": f"Bearer {self.candidate_token}"}
        res3 = client.get("/api/v1/recruiter/dashboard/overview", headers=cand_headers)
        assert res3.status_code == 403, f"Expected 403 for candidate token, got {res3.status_code}"
        assert "Employer authorization required" in res3.json()["detail"]

    def test_03_job_posting_lifecycle_and_dashboard_metrics(self):
        """3. Employer Dashboard Overview & Job Posting Lifecycle with genuine Bearer token."""
        headers = {"Authorization": f"Bearer {TestRecruiterPortalE2E.recruiter_token}"}

        # A. Check initial empty dashboard overview
        ov_res = client.get("/api/v1/recruiter/dashboard/overview", headers=headers)
        assert ov_res.status_code == 200
        ov_data = ov_res.json()
        assert ov_data["metrics"]["active_jobs_count"] == 0
        assert ov_data["metrics"]["candidate_shares_count"] == 0

        # B. Create draft job opening
        job_payload = {
            "title": "Principal Autonomous Systems Engineer",
            "description": "Architect, benchmark, and deploy resilient real-time decision algorithms for autonomous flight systems.",
            "location_text": "Boston, MA (Hybrid)",
            "remote_status": "hybrid",
            "employment_type": "full_time",
            "seniority": "Principal / Staff",
            "salary_min": 220000.0,
            "salary_max": 280000.0,
            "salary_currency": "USD",
            "status": "draft",
            "public_recruiter_name": "Elena Rostova",
            "public_recruiter_email": "elena.rostova@cyberdyne-defense.ai",
            "extracted_requirements": [
                {"name": "Rust", "importance": "required", "expected_level": "Expert"},
                {"name": "Distributed Systems", "importance": "required", "expected_level": "Expert"},
                {"name": "C++", "importance": "required", "expected_level": "Practitioner"},
            ],
        }
        create_res = client.post("/api/v1/recruiter/jobs", json=job_payload, headers=headers)
        assert create_res.status_code == 201
        res_json = create_res.json()
        assert res_json["success"] is True
        job_id = res_json["job"]["job_uuid"]
        TestRecruiterPortalE2E.created_job_id = job_id

        # C. Publish the job opening
        update_res = client.put(f"/api/v1/recruiter/jobs/{job_id}", json={"status": "published"}, headers=headers)
        assert update_res.status_code == 200
        assert update_res.json()["job"]["status"] == "published"

        # D. Verify dashboard overview counts updated
        ov_res2 = client.get("/api/v1/recruiter/dashboard/overview", headers=headers)
        assert ov_res2.status_code == 200
        assert ov_res2.json()["metrics"]["active_jobs_count"] == 1

    def test_04_mode_c_recruiter_job_discovery(self):
        """4. Candidate Mode C — Explore Recruiter-Published Jobs."""
        cand_headers = {"Authorization": f"Bearer {self.candidate_token}"}
        discover_payload = {
            "mode": "mode_c_recruiter",
            "query": "Principal Autonomous",
            "limit": 10,
            "remote_only": False,
        }
        res = client.post("/api/v1/career/jobs/discover", json=discover_payload, headers=cand_headers)
        assert res.status_code == 200
        data = res.json()
        assert "jobs" in data
        assert len(data["jobs"]) >= 1

        matching_job = next(
            (j for j in data["jobs"] if j["title"] == "Principal Autonomous Systems Engineer"),
            None,
        )
        assert matching_job is not None
        assert matching_job["company_name"] == "Cyberdyne Defense AI"
        assert matching_job["provider"] == "recruiter_portal"
        assert matching_job["public_recruiter_email"] == "elena.rostova@cyberdyne-defense.ai"

    def test_05_targeted_candidate_passport_sharing(self):
        """5. Targeted Candidate Share to Recruiter with Invitation & Notification generation."""
        cand_headers = {"Authorization": f"Bearer {self.candidate_token}"}
        db = TestingSessionLocal()
        job = db.query(JobPostingRecord).filter(
            JobPostingRecord.title == "Principal Autonomous Systems Engineer"
        ).first()
        assert job is not None
        job_id = str(job.id)
        db.close()

        share_payload = {
            "label": "Application: Principal Autonomous Systems Engineer",
            "template_id": "software-fullstack",
            "expiry_days": 30,
            "recruiter_email": "elena.rostova@cyberdyne-defense.ai",
            "job_id": job_id,
            "candidate_message": "Hello Elena, I am excited about Cyberdyne's autonomous aerial platforms. Here is my verified Skill Passport.",
            "permissions": {
                "identity": {
                    "showDisplayName": True,
                    "showHeadline": True,
                    "showSummary": True,
                    "showContactInfo": True,
                },
                "shareVerifiedSkillsOnly": True,
                "selectedSkillIds": [],
                "selectedCustomSkillIds": [],
                "excludedEvidenceIds": [],
                "includeWorkAnalysis": True,
                "includeEvidenceArtifacts": True,
                "allowRecruiterMessaging": True,
            },
        }
        res = client.post("/api/v1/sharing/links", json=share_payload, headers=cand_headers)
        assert res.status_code == 201
        data = res.json()
        assert (data.get("shareId") or data.get("token")) is not None

        # Verify CandidateShareInvitation was generated in database
        db = TestingSessionLocal()
        invitation = db.query(CandidateShareInvitation).filter(
            CandidateShareInvitation.recruiter_email == "elena.rostova@cyberdyne-defense.ai"
        ).first()
        assert invitation is not None
        assert invitation.delivery_status == "delivered"
        assert invitation.pipeline_status == "new"
        TestRecruiterPortalE2E.created_invitation_id = str(invitation.id)
        db.close()

    def test_06_recruiter_candidate_pipeline_and_notes(self):
        """6. Recruiter Pipeline Review, Notes Update, and Evaluation."""
        rec_headers = {"Authorization": f"Bearer {TestRecruiterPortalE2E.recruiter_token}"}
        inv_id = TestRecruiterPortalE2E.created_invitation_id
        assert inv_id is not None

        # A. Recruiter lists candidates
        cand_list_res = client.get("/api/v1/recruiter/candidates?status=all", headers=rec_headers)
        assert cand_list_res.status_code == 200
        list_data = cand_list_res.json()
        assert list_data["total"] >= 1
        assert any(c["invitation_id"] == inv_id for c in list_data["candidates"])

        # B. Recruiter inspects candidate details (marks as read)
        detail_res = client.get(f"/api/v1/recruiter/candidates/{inv_id}", headers=rec_headers)
        assert detail_res.status_code == 200
        detail_data = detail_res.json()
        assert (detail_data.get("invitation", {}).get("is_read") or detail_data.get("is_read")) is True

        # C. Advance pipeline to 'interview'
        status_res = client.patch(
            f"/api/v1/recruiter/candidates/{inv_id}/pipeline",
            json={"pipeline_status": "interview", "notes": "Candidate exhibits strong distributed systems proof."},
            headers=rec_headers,
        )
        assert status_res.status_code == 200
        res_json = status_res.json()
        assert (res_json.get("pipeline_status") or res_json.get("invitation", {}).get("pipeline_status")) == "interview"

        # D. Add confidential recruiter evaluation notes
        notes_res = client.put(
            f"/api/v1/recruiter/candidates/{inv_id}/notes",
            json={"notes": "Strong technical foundation in real-time robotics. Schedule technical screen with autonomous systems lead."},
            headers=rec_headers,
        )
        assert notes_res.status_code == 200
        assert "real-time robotics" in notes_res.json()["notes"]

    def test_07_two_way_messaging_and_inbox(self):
        """7. Recruiter sends message -> Candidate replies -> Recruiter checks inbox."""
        rec_headers = {"Authorization": f"Bearer {TestRecruiterPortalE2E.recruiter_token}"}
        cand_headers = {"Authorization": f"Bearer {self.candidate_token}"}
        inv_id = TestRecruiterPortalE2E.created_invitation_id

        # A. Recruiter sends interview inquiry
        msg_payload = {
            "subject": "Interview Invitation — Principal Autonomous Systems Engineer",
            "message_body": "Hi Alex, we reviewed your verified Rust evidence items and would like to invite you for a 45-minute technical discussion.",
        }
        send_res = client.post(
            f"/api/v1/recruiter/candidates/{inv_id}/messages",
            json=msg_payload,
            headers=rec_headers,
        )
        assert send_res.status_code == 201
        msg_data = send_res.json()
        assert msg_data["success"] is True
        msg_id = msg_data.get("message_id") or (msg_data["message"]["id"] if isinstance(msg_data.get("message"), dict) else None)

        # B. Candidate replies via candidate portal
        reply_payload = {
            "reply_body": "Thank you Elena! Thursday 2 PM EST works perfectly for me. Looking forward to discussing the role.",
        }
        reply_res = client.post(f"/api/v1/sharing/messages/{msg_id}/reply", json=reply_payload, headers=cand_headers)
        assert reply_res.status_code == 200
        assert reply_res.json()["success"] is True

        # C. Recruiter checks inbox
        inbox_res = client.get("/api/v1/recruiter/inbox", headers=rec_headers)
        assert inbox_res.status_code == 200
        inbox_data = inbox_res.json()
        assert len(inbox_data["threads"]) >= 1

    def test_08_cross_tenant_isolation_enforcement(self):
        """8. Cross-Tenant Security: Recruiter B from Org B cannot access Org A's jobs or candidates."""
        # A. Register Recruiter B in a separate organization
        reg_b_payload = {
            "full_name": "Marcus Vance",
            "work_email": "marcus.vance@quantum-robotics.org",
            "password": "SecurePassword456!",
            "organization_name": "Quantum Robotics Corp",
            "job_title": "Talent Acquisition Director",
        }
        res_b = client.post("/api/v1/recruiter/auth/register", json=reg_b_payload)
        assert res_b.status_code == 201
        b_token = res_b.json()["token"]
        headers_b = {"Authorization": f"Bearer {b_token}"}

        # B. Recruiter B attempts to view Org A's job -> 404 Not Found
        job_id_a = TestRecruiterPortalE2E.created_job_id
        res_job = client.get(f"/api/v1/recruiter/jobs/{job_id_a}", headers=headers_b)
        assert res_job.status_code == 404, "Recruiter B must not view Org A job opening"

        # C. Recruiter B attempts to view Org A's candidate invitation -> 404 Not Found
        inv_id_a = TestRecruiterPortalE2E.created_invitation_id
        res_cand = client.get(f"/api/v1/recruiter/candidates/{inv_id_a}", headers=headers_b)
        assert res_cand.status_code == 404, "Recruiter B must not view Org A candidate share invitation"
