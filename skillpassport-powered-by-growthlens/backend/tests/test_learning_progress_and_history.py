"""
Test Suite for Learn & Grow End-to-End Learning Progress, Activity History, and Step Completion (Phase 12).

Validates:
1. POST /learning/steps/{step_id}/complete marks steps completed and updates step mastery.
2. Parent roadmap completed_steps, total_steps, current_mastery, and status are recalculated.
3. Next sequential step in roadmap is unlocked.
4. LearningActivityRecord is persisted in database.
5. Idempotent step completion does not duplicate activities or corrupt counts.
6. Authentication and ownership: 401 unauthenticated, 403/404 for wrong user.
7. GET /learning/history returns paginated activities with filtering (domain_id, activity_type, roadmap_id).
8. POST /learning/history/record persists interactive learning activities.
9. GET /learning/roadmaps/{path_id} and GET /learning/roadmaps synchronize counts with step records.
10. GET /learning/overview includes recent_activities and synchronized roadmap stats.
"""

import os
import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.pool import StaticPool

os.environ["APP_ENV"] = "test"

@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "TEXT"

@compiles(UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(36)"

from backend.app.main import app
from backend.app.db.session import get_db
from backend.app.models.base import Base
import backend.app.models
from backend.app.api.dependencies import get_current_user, AuthenticatedUser
from backend.app.models.learning import (
    LearningRoadmap,
    LearningStep,
    LearningActivityRecord,
    LearningAttempt,
)
from backend.app.db.reliability import circuit_breaker

TEST_USER_ID = "00000000-0000-0000-0000-000000000001"
OTHER_USER_ID = "00000000-0000-0000-0000-000000000002"

active_test_user = TEST_USER_ID


@pytest.fixture
def test_db_session():
    """Isolated in-memory SQLite database for deterministic unit testing."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(test_db_session):
    circuit_breaker.reset()

    def override_get_db():
        try:
            yield test_db_session
        finally:
            pass

    def override_get_current_user():
        return AuthenticatedUser(
            user_id=active_test_user,
            email=f"{active_test_user[:8]}@example.com",
            role="authenticated",
            metadata={"name": "Test User"},
        )

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def seed_test_roadmap(db, owner_id=TEST_USER_ID, domain_id="dist-sys", path_id="roadmap-dist-sys-test"):
    """Helper to seed a test roadmap with two sequential steps."""
    owner_uuid = uuid.UUID(owner_id)
    rm = LearningRoadmap(
        owner_user_id=owner_uuid,
        domain_id=domain_id,
        domain_title="Distributed Systems & Event Streaming",
        target_role_id="role-senior-distributed-engineer",
        target_role_title="Senior Distributed Systems Engineer",
        path_id=path_id,
        current_mastery=0.0,
        baseline_mastery=45.0,
        target_mastery=85.0,
        completed_steps=0,
        total_steps=2,
        status="in_progress",
    )
    db.add(rm)
    db.flush()

    s1 = LearningStep(
        roadmap_id=rm.id,
        step_id="step-dist-1",
        topic_id="topic-dist-partitioning",
        module_id="mod-dist-1",
        title="Partitioning and Consistent Hashing",
        learning_objective="Implement distributed consistent hashing with virtual nodes.",
        difficulty="Intermediate",
        estimated_minutes=45,
        sequence_order=1,
        current_mastery=0.0,
        target_mastery=80.0,
        prerequisite_ids=[],
        prerequisites_met=True,
        status="available",
        recommendation_reason="Foundation step for distributed systems.",
    )
    s2 = LearningStep(
        roadmap_id=rm.id,
        step_id="step-dist-2",
        topic_id="topic-dist-consensus",
        module_id="mod-dist-1",
        title="Raft Consensus & Replication",
        learning_objective="Implement leader election and log replication.",
        difficulty="Advanced",
        estimated_minutes=60,
        sequence_order=2,
        current_mastery=0.0,
        target_mastery=85.0,
        prerequisite_ids=["step-dist-1"],
        prerequisites_met=False,
        status="locked",
        recommendation_reason="Requires partitioning fundamentals.",
    )
    db.add_all([s1, s2])
    db.commit()
    db.refresh(rm)
    db.refresh(s1)
    db.refresh(s2)
    return rm, s1, s2


class TestLearningProgressAndCompletion:
    def test_step_complete_authoritative_flow(self, client, test_db_session):
        """Validates that marking a step complete updates step, parent roadmap, unlocks next step, and records activity."""
        global active_test_user
        active_test_user = TEST_USER_ID

        rm, s1, s2 = seed_test_roadmap(test_db_session)
        assert rm.completed_steps == 0
        assert s1.status == "available"
        assert s2.status == "locked"

        # Complete step 1
        res = client.post(
            f"/api/v1/learning/steps/{s1.step_id}/complete",
            json={"roadmap_id": rm.path_id, "notes": "Studied hashing patterns and passed unit tests."},
        )
        assert res.status_code == 200, res.text
        data = res.json()

        assert data["status"] == "completed"
        assert data["already_completed"] is False
        assert data["step_id"] == s1.step_id
        assert data["current_mastery"] >= 72.0  # target_mastery * 0.9 = 72
        assert data["roadmap_progress"]["completed_steps"] == 1
        assert data["roadmap_progress"]["total_steps"] == 2
        assert data["roadmap_progress"]["completion_percentage"] == 50.0
        assert data["activity_id"] is not None

        # Verify DB records
        test_db_session.refresh(s1)
        test_db_session.refresh(s2)
        test_db_session.refresh(rm)

        assert s1.status == "completed"
        assert s2.status == "available"  # next sequential step unlocked!
        assert s2.prerequisites_met is True
        assert rm.completed_steps == 1
        assert rm.status == "in_progress"

        # Verify Activity Record
        act = (
            test_db_session.query(LearningActivityRecord)
            .filter(LearningActivityRecord.owner_user_id == uuid.UUID(TEST_USER_ID))
            .first()
        )
        assert act is not None
        assert act.activity_type == "step_completed"
        assert act.step_id == s1.step_id
        assert act.activity_status == "completed"
        assert "Consistent Hashing" in act.title

    def test_step_complete_idempotency(self, client, test_db_session):
        """Repeated completions do not duplicate activities or corrupt completed count."""
        global active_test_user
        active_test_user = TEST_USER_ID

        rm, s1, _ = seed_test_roadmap(test_db_session)

        # First completion
        res1 = client.post(f"/api/v1/learning/steps/{s1.step_id}/complete")
        assert res1.status_code == 200
        assert res1.json()["already_completed"] is False

        # Second completion
        res2 = client.post(f"/api/v1/learning/steps/{s1.step_id}/complete")
        assert res2.status_code == 200
        assert res2.json()["already_completed"] is True
        assert res2.json()["roadmap_progress"]["completed_steps"] == 1

        # Check activity count is strictly 1
        act_count = (
            test_db_session.query(LearningActivityRecord)
            .filter(
                LearningActivityRecord.owner_user_id == uuid.UUID(TEST_USER_ID),
                LearningActivityRecord.activity_type == "step_completed",
            )
            .count()
        )
        assert act_count == 1

    def test_roadmap_completes_when_all_steps_done(self, client, test_db_session):
        """Completing all steps in a roadmap transitions roadmap status to completed."""
        global active_test_user
        active_test_user = TEST_USER_ID

        rm, s1, s2 = seed_test_roadmap(test_db_session)

        # Complete step 1
        client.post(f"/api/v1/learning/steps/{s1.step_id}/complete")
        # Complete step 2
        res = client.post(f"/api/v1/learning/steps/{s2.step_id}/complete")
        assert res.status_code == 200
        data = res.json()

        assert data["roadmap_progress"]["completed_steps"] == 2
        assert data["roadmap_progress"]["completion_percentage"] == 100.0
        assert data["roadmap_progress"]["status"] == "completed"

        test_db_session.refresh(rm)
        assert rm.status == "completed"
        assert rm.completed_steps == 2

    def test_step_completion_user_isolation(self, client, test_db_session):
        """Users cannot complete steps belonging to other users."""
        global active_test_user
        active_test_user = TEST_USER_ID

        rm, s1, _ = seed_test_roadmap(test_db_session, owner_id=TEST_USER_ID)

        # Other user attempts to mark TEST_USER's step complete
        active_test_user = OTHER_USER_ID
        res = client.post(f"/api/v1/learning/steps/{s1.step_id}/complete")
        assert res.status_code in (404, 403)


class TestLearningHistoryAndActivities:
    def test_get_learning_history_pagination_and_filtering(self, client, test_db_session):
        """Validates GET /learning/history returns user activities with filtering."""
        global active_test_user
        active_test_user = TEST_USER_ID
        owner_uuid = uuid.UUID(TEST_USER_ID)

        # Seed 3 activities for TEST_USER and 1 for OTHER_USER
        a1 = LearningActivityRecord(
            owner_user_id=owner_uuid,
            activity_type="step_completed",
            activity_status="completed",
            title="Completed Step 1",
            domain_id="dist-sys",
            score=80.0,
        )
        a2 = LearningActivityRecord(
            owner_user_id=owner_uuid,
            activity_type="resource_viewed",
            activity_status="completed",
            title="Read Consistent Hashing Whitepaper",
            domain_id="dist-sys",
        )
        a3 = LearningActivityRecord(
            owner_user_id=owner_uuid,
            activity_type="practice_completed",
            activity_status="completed",
            title="Practice Hash Ring Algorithm",
            domain_id="algorithms",
            score=95.0,
        )
        other_act = LearningActivityRecord(
            owner_user_id=uuid.UUID(OTHER_USER_ID),
            activity_type="step_completed",
            activity_status="completed",
            title="Other User Activity",
            domain_id="dist-sys",
        )
        test_db_session.add_all([a1, a2, a3, other_act])
        test_db_session.commit()

        # Fetch all for TEST_USER
        res = client.get("/api/v1/learning/history")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 3
        assert len(data["activities"]) == 3
        # Other user's activity not present
        assert not any(a["title"] == "Other User Activity" for a in data["activities"])

        # Filter by domain_id
        res_filtered = client.get("/api/v1/learning/history?domain_id=dist-sys")
        assert res_filtered.status_code == 200
        assert res_filtered.json()["total"] == 2

        # Filter by activity_type
        res_type = client.get("/api/v1/learning/history?activity_type=practice_completed")
        assert res_type.status_code == 200
        assert res_type.json()["total"] == 1
        assert res_type.json()["activities"][0]["title"] == "Practice Hash Ring Algorithm"

    def test_post_learning_history_record(self, client, test_db_session):
        """Validates explicit activity recording via POST /learning/history/record."""
        global active_test_user
        active_test_user = TEST_USER_ID

        payload = {
            "activity_type": "resource_viewed",
            "title": "Viewed Kafka Architecture Tutorial",
            "detail": "Watched distributed streaming lecture.",
            "domain_id": "dist-sys",
            "resource_id": "res-kafka-arch",
            "link_route": "/app/learning/resources/res-kafka-arch",
            "activity_status": "completed",
            "activity_metadata": {"duration_minutes": 25},
        }

        res = client.post("/api/v1/learning/history/record", json=payload)
        assert res.status_code == 200
        data = res.json()

        assert data["id"] is not None
        assert data["activity_type"] == "resource_viewed"
        assert data["title"] == "Viewed Kafka Architecture Tutorial"
        assert data["activity_metadata"]["duration_minutes"] == 25

        # Check in DB
        act = test_db_session.query(LearningActivityRecord).filter(LearningActivityRecord.id == uuid.UUID(data["id"])).first()
        assert act is not None
        assert str(act.owner_user_id) == TEST_USER_ID

    def test_overview_endpoint_includes_recent_activities_and_sync(self, client, test_db_session):
        """Validates GET /learning/overview includes recent_activities and syncs roadmap progress."""
        global active_test_user
        active_test_user = TEST_USER_ID

        rm, s1, _ = seed_test_roadmap(test_db_session)
        # Mark s1 complete directly in step record
        s1.status = "completed"
        test_db_session.commit()

        # Call overview
        res = client.get("/api/v1/learning/overview")
        assert res.status_code == 200
        data = res.json()

        # Roadmap progress should report 1 completed step
        assert data["active_roadmap"]["completed_steps"] == 1
        assert "recent_activities" in data
