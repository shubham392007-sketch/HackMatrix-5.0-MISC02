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

# Test State
current_test_user = None

def override_get_current_user():
    global current_test_user
    if current_test_user:
        return current_test_user
    return AuthenticatedUser(
        user_id="00000000-0000-0000-0000-000000000001",
        email="alex.chen@innovatecorp.internal",
        role="authenticated",
    )

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user
client = TestClient(app)


# ==============================================================================
# TEST SUITE: COMPLETE RECRUITER & HIRING MANAGER PORTAL E2E
# ==============================================================================

class TestRecruiterPortalE2E:

    @pytest.fixture(autouse=True)
    def ensure_db(self):
        circuit_breaker.reset()
        yield

    def test_01_recruiter_registration_and_login_flow(self):
        """1. Employer Registration, Org Provisioning, and Login Authentication."""
        # A. Register new recruiter
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

        recruiter_id = data["user_id"]
        org_id = data["organization"]["id"]

        # B. Duplicate registration must fail with 409 Conflict
        res_dup = client.post("/api/v1/recruiter/auth/register", json=reg_payload)
        assert res_dup.status_code == 409

        # C. Recruiter login
        login_res = client.post(
            "/api/v1/recruiter/auth/login",
            json={"email": "elena.rostova@cyberdyne-defense.ai", "password": "SecurePassword123!"},
        )
        assert login_res.status_code == 200
        login_data = login_res.json()
        assert login_data["success"] is True
        assert login_data["token"] is not None

        # D. Test /recruiter/auth/me with recruiter context
        global current_test_user
        current_test_user = AuthenticatedUser(
            user_id=recruiter_id,
            email="elena.rostova@cyberdyne-defense.ai",
            role="recruiter",
        )
        me_res = client.get("/api/v1/recruiter/auth/me")
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["organization"]["id"] == org_id
        assert me_data["role"] == "org_admin"

    def test_02_job_posting_lifecycle_and_dashboard_metrics(self):
        """2. Employer Dashboard Overview & Job Posting Lifecycle (Draft -> Published -> Overview)."""
        global current_test_user
        # Recruiter context
        db = TestingSessionLocal()
        user_row = db.execute(text("SELECT id FROM auth.users WHERE email = 'elena.rostova@cyberdyne-defense.ai'")).fetchone()
        assert user_row is not None
        current_test_user = AuthenticatedUser(
            user_id=str(user_row.id),
            email="elena.rostova@cyberdyne-defense.ai",
            role="recruiter",
        )
        db.close()

        # A. Check initial empty dashboard overview
        ov_res = client.get("/api/v1/recruiter/dashboard/overview")
        assert ov_res.status_code == 200
        ov_data = ov_res.json()
        assert ov_data["metrics"]["active_jobs_count"] == 0
        assert ov_data["metrics"]["candidate_shares_count"] == 0
        assert ov_data["metrics"]["unread_messages_count"] == 0

        # B. Create draft job opening with structured taxonomy skills
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
                {"name": "Control Systems", "importance": "required", "expected_level": "Practitioner"},
            ],
        }
        create_job_res = client.post("/api/v1/recruiter/jobs", json=job_payload)
        assert create_job_res.status_code == 201
        res_json = create_job_res.json()
        assert res_json["success"] is True
        job_data = res_json["job"]
        job_id = job_data["job_uuid"]
        assert job_data["status"] == "draft"

        # Verify job list in draft
        list_res = client.get("/api/v1/recruiter/jobs?status=draft")
        assert list_res.status_code == 200
        assert len(list_res.json()["jobs"]) == 1

        # C. Publish the job opening
        update_res = client.put(f"/api/v1/recruiter/jobs/{job_id}", json={"status": "published"})
        assert update_res.status_code == 200
        assert update_res.json()["job"]["status"] == "published"

        # D. Verify dashboard overview counts updated
        ov_res2 = client.get("/api/v1/recruiter/dashboard/overview")
        assert ov_res2.status_code == 200
        assert ov_res2.json()["metrics"]["active_jobs_count"] == 1

    def test_03_mode_c_recruiter_job_discovery(self):
        """3. Candidate Mode C — Explore Recruiter-Published Jobs."""
        global current_test_user
        # Switch to Candidate Context
        candidate_id = "00000000-0000-0000-0000-000000000001"
        current_test_user = AuthenticatedUser(
            user_id=candidate_id,
            email="alex.chen@innovatecorp.internal",
            role="authenticated",
        )

        discover_payload = {
            "mode": "mode_c_recruiter",
            "query": "Principal Autonomous",
            "limit": 10,
            "remote_only": False,
        }
        res = client.post("/api/v1/career/jobs/discover", json=discover_payload)
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
        skills = [r.get("name") for r in matching_job.get("extracted_requirements", [])]
        assert "Distributed Systems" in skills

    def test_04_targeted_candidate_passport_sharing(self):
        """4. Targeted Candidate Share to Recruiter with Invitation & Notification generation."""
        global current_test_user
        candidate_id = "00000000-0000-0000-0000-000000000001"
        current_test_user = AuthenticatedUser(
            user_id=candidate_id,
            email="alex.chen@innovatecorp.internal",
            role="authenticated",
        )

        # Get the job ID from database
        db = TestingSessionLocal()
        job = db.query(JobPostingRecord).filter(
            JobPostingRecord.title == "Principal Autonomous Systems Engineer"
        ).first()
        assert job is not None
        job_id = str(job.id)
        db.close()

        # Candidate issues targeted share link
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
                "evidenceAccessLevel": "summary",  # Summary only
                "includeRoleAlignment": True,
                "allowRecruiterMessaging": True,
                "templateId": "software-fullstack",
                "customLinkLabel": "Cyberdyne Application - Alex Chen",
            },
        }

        share_res = client.post("/api/v1/sharing/links", json=share_payload)
        assert share_res.status_code in (200, 201)
        share_data = share_res.json()
        assert share_data["shareId"] is not None

        # Verify CandidateShareInvitation was generated in database
        db = TestingSessionLocal()
        invitation = db.query(CandidateShareInvitation).filter(
            CandidateShareInvitation.recruiter_email == "elena.rostova@cyberdyne-defense.ai"
        ).first()
        assert invitation is not None
        assert invitation.pipeline_status == "new"
        assert str(invitation.job_id) == job_id
        assert invitation.candidate_user_id == uuid.UUID(candidate_id)

        # Verify Recruiter message was logged
        recruiter_msg = db.query(RecruiterMessage).filter(
            RecruiterMessage.share_link_id == uuid.UUID(str(share_data["id"]))
        ).first()
        assert recruiter_msg is not None
        assert "Hello Elena" in recruiter_msg.message_body

        # Verify Recruiter received notification
        notif = db.query(UserNotification).filter(
            UserNotification.user_id == invitation.recruiter_user_id
        ).first()
        assert notif is not None
        assert "New Skill Passport Shared" in notif.title
        db.close()

    def test_05_recruiter_candidates_review_and_pipeline_progression(self):
        """5. Recruiter Candidate Review, Evidence Inspection, Pipeline Updating, and Notes."""
        global current_test_user
        # Switch to Recruiter Context
        db = TestingSessionLocal()
        user_row = db.execute(text("SELECT id FROM auth.users WHERE email = 'elena.rostova@cyberdyne-defense.ai'")).fetchone()
        current_test_user = AuthenticatedUser(
            user_id=str(user_row.id),
            email="elena.rostova@cyberdyne-defense.ai",
            role="recruiter",
        )
        invitation = db.query(CandidateShareInvitation).first()
        invitation_id = str(invitation.id)
        db.close()

        # A. Recruiter lists candidates
        cand_res = client.get("/api/v1/recruiter/candidates")
        assert cand_res.status_code == 200
        cand_data = cand_res.json()
        assert len(cand_data["candidates"]) >= 1
        assert cand_data["pipeline_counts"]["new"] >= 1

        # B. Recruiter inspects candidate projection
        detail_res = client.get(f"/api/v1/recruiter/candidates/{invitation_id}")
        assert detail_res.status_code == 200
        detail_data = detail_res.json()
        assert detail_data["invitation"]["id"] == invitation_id
        assert detail_data["passport"]["template_id"] == "software-fullstack"
        assert detail_data["passport"]["evidence_permission_level"] == "summary"

        # C. Advance pipeline to reviewing, then interview
        stage_res1 = client.patch(
            f"/api/v1/recruiter/candidates/{invitation_id}/pipeline",
            json={"pipeline_status": "reviewing", "notes": "Reviewed distributed systems skills."},
        )
        assert stage_res1.status_code == 200
        assert stage_res1.json()["pipeline_status"] == "reviewing"

        stage_res2 = client.patch(
            f"/api/v1/recruiter/candidates/{invitation_id}/pipeline",
            json={"pipeline_status": "interview", "notes": "Moving to technical loop."},
        )
        assert stage_res2.status_code == 200
        assert stage_res2.json()["pipeline_status"] == "interview"

        # D. Save private recruiter notes
        notes_res = client.put(
            f"/api/v1/recruiter/candidates/{invitation_id}/notes",
            json={"notes": "Strong background in flight systems. High alignment score."},
        )
        assert notes_res.status_code == 200
        assert "Strong background" in notes_res.json()["notes"]

    def test_06_two_way_recruiter_candidate_messaging_flow(self):
        """6. Recruiter sends message -> Candidate receives notification -> Candidate replies."""
        global current_test_user
        # A. Recruiter sends message
        db = TestingSessionLocal()
        user_row = db.execute(text("SELECT id FROM auth.users WHERE email = 'elena.rostova@cyberdyne-defense.ai'")).fetchone()
        invitation = db.query(CandidateShareInvitation).first()
        invitation_id = str(invitation.id)
        current_test_user = AuthenticatedUser(
            user_id=str(user_row.id),
            email="elena.rostova@cyberdyne-defense.ai",
            role="recruiter",
        )
        db.close()

        recruiter_msg_payload = {
            "subject": "Interview Scheduling: Autonomous Systems",
            "message_body": "Hi Alex, we were impressed by your verified distributed systems evidence. Would you be available for a conversation this Thursday?",
        }
        send_res = client.post(
            f"/api/v1/recruiter/candidates/{invitation_id}/messages",
            json=recruiter_msg_payload,
        )
        assert send_res.status_code == 201
        sent_data = send_res.json()
        assert sent_data["success"] is True
        msg_id = sent_data["message_id"]

        # Check candidate received notification
        db = TestingSessionLocal()
        candidate_notif = db.query(UserNotification).filter(
            UserNotification.user_id == invitation.candidate_user_id,
            UserNotification.category == "recruiter_message",
        ).first()
        assert candidate_notif is not None
        assert "Cyberdyne Defense AI" in candidate_notif.title
        db.close()

        # B. Candidate replies via candidate portal
        current_test_user = AuthenticatedUser(
            user_id=str(invitation.candidate_user_id),
            email="alex.chen@innovatecorp.internal",
            role="authenticated",
        )

        reply_payload = {
            "reply_body": "Thank you Elena! Thursday 2 PM EST works perfectly for me. Looking forward to discussing the role.",
        }
        reply_res = client.post(f"/api/v1/sharing/messages/{msg_id}/reply", json=reply_payload)
        assert reply_res.status_code == 200
        reply_data = reply_res.json()
        assert reply_data["success"] is True
        assert "Thursday 2 PM" in reply_data["replyBody"]

        # C. Recruiter checks inbox threads
        current_test_user = AuthenticatedUser(
            user_id=str(user_row.id),
            email="elena.rostova@cyberdyne-defense.ai",
            role="recruiter",
        )
        inbox_res = client.get("/api/v1/recruiter/inbox")
        assert inbox_res.status_code == 200
        inbox_data = inbox_res.json()
        assert len(inbox_data["threads"]) >= 1
        thread = inbox_data["threads"][0]
        # Initial application message + recruiter interview inquiry
        assert len(thread["messages"]) >= 2

    def test_07_employer_authorization_guards(self):
        """7. Security Boundary: Candidate rejected from recruiter endpoints with 403."""
        global current_test_user
        # Regular candidate without recruiter membership
        current_test_user = AuthenticatedUser(
            user_id="99999999-9999-9999-9999-999999999999",
            email="random.candidate@gmail.com",
            role="authenticated",
        )

        # Attempting to access recruiter dashboard overview
        res1 = client.get("/api/v1/recruiter/dashboard/overview")
        assert res1.status_code == 403
        assert "Employer authorization required" in res1.json()["detail"]

        # Attempting to access recruiter jobs
        res2 = client.get("/api/v1/recruiter/jobs")
        assert res2.status_code == 403

        # Attempting to access recruiter candidates
        res3 = client.get("/api/v1/recruiter/candidates")
        assert res3.status_code == 403
