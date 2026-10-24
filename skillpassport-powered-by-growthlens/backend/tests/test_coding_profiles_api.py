import pytest
import os
import uuid
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.compiler import compiles

os.environ["APP_ENV"] = "test"

@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "TEXT"

@compiles(UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(36)"

from backend.app.main import app
from backend.app.db.session import get_db
from backend.app.api.dependencies import get_current_user, AuthenticatedUser
from backend.app.models.base import Base
import backend.app.models
from backend.app.models.connection import ConnectedSource
from backend.app.models.evidence import EvidenceItem

USER_1_ID = "00000000-0000-0000-0000-000000000011"
USER_2_ID = "00000000-0000-0000-0000-000000000022"

user_1 = AuthenticatedUser(
    user_id=USER_1_ID,
    email="coder1@skillpassport.test",
    role="authenticated",
)

user_2 = AuthenticatedUser(
    user_id=USER_2_ID,
    email="coder2@skillpassport.test",
    role="authenticated",
)

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

Base.metadata.create_all(bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_teardown_db():
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: user_1
    yield
    db = TestingSessionLocal()
    try:
        db.query(EvidenceItem).delete()
        db.query(ConnectedSource).delete()
        db.commit()
    finally:
        db.close()


def test_register_valid_leetcode_profile():
    client = TestClient(app)
    res = client.post(
        "/api/v1/connections/leetcode",
        json={"profile_url": "https://leetcode.com/u/alice_algo/"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["provider"] == "leetcode"
    assert data["username"] == "alice_algo"
    assert data["profile_url"] == "https://leetcode.com/u/alice_algo"
    assert data["status"] == "profile_linked"
    assert data["ownership_verified"] is False
    assert data["supports_sync"] is False


def test_reject_invalid_leetcode_profile():
    client = TestClient(app)
    # Non-HTTPS
    res = client.post(
        "/api/v1/connections/leetcode",
        json={"profile_url": "http://leetcode.com/u/alice_algo"},
    )
    assert res.status_code == 400
    assert "HTTPS" in res.json()["detail"]

    # Phishing domain
    res = client.post(
        "/api/v1/connections/leetcode",
        json={"profile_url": "https://notleetcode.com/u/alice_algo"},
    )
    assert res.status_code == 400
    assert "Invalid domain" in res.json()["detail"]


def test_register_valid_hackerrank_profile():
    client = TestClient(app)
    res = client.post(
        "/api/v1/connections/hackerrank",
        json={"profile_url": "https://www.hackerrank.com/profile/bob_builder"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["provider"] == "hackerrank"
    assert data["username"] == "bob_builder"
    assert data["profile_url"] == "https://www.hackerrank.com/profile/bob_builder"
    assert data["status"] == "profile_linked"
    assert data["supports_sync"] is False


def test_reject_invalid_hackerrank_profile():
    client = TestClient(app)
    res = client.post(
        "/api/v1/connections/hackerrank",
        json={"profile_url": "https://hackerrank.com/challenges"},
    )
    assert res.status_code == 400
    assert "reserved platform path" in res.json()["detail"]


def test_idempotent_profile_registration():
    client = TestClient(app)
    # First registration
    res1 = client.post(
        "/api/v1/connections/leetcode",
        json={"profile_url": "https://leetcode.com/u/coder_v1"},
    )
    assert res1.status_code == 200
    id1 = res1.json()["id"]

    # Second registration with updated handle
    res2 = client.post(
        "/api/v1/connections/leetcode",
        json={"profile_url": "https://leetcode.com/u/coder_v2"},
    )
    assert res2.status_code == 200
    id2 = res2.json()["id"]

    # Must update existing record, not duplicate
    assert id1 == id2

    db = TestingSessionLocal()
    count = db.query(ConnectedSource).filter(
        ConnectedSource.owner_user_id == uuid.UUID(USER_1_ID),
        ConnectedSource.provider == "leetcode",
    ).count()
    assert count == 1
    db.close()


def test_list_connected_sources_includes_coding_platforms():
    client = TestClient(app)
    client.post("/api/v1/connections/leetcode", json={"profile_url": "https://leetcode.com/u/shubham"})
    client.post("/api/v1/connections/hackerrank", json={"profile_url": "https://hackerrank.com/profile/shubham"})

    res = client.get("/api/v1/connections")
    assert res.status_code == 200
    data = res.json()
    sources = data["sources"]
    types = [s["type"] for s in sources]
    assert "leetcode" in types
    assert "hackerrank" in types

    lc = next(s for s in sources if s["type"] == "leetcode")
    assert lc["status"] == "profile_linked"
    assert lc["supportsSync"] is False
    assert lc["profileUrl"] == "https://leetcode.com/u/shubham"


def test_cross_user_isolation():
    client = TestClient(app)
    # User 1 registers
    res1 = client.post("/api/v1/connections/leetcode", json={"profile_url": "https://leetcode.com/u/user1"})
    conn_id = res1.json()["id"]

    # User 2 cannot disconnect User 1's connection
    app.dependency_overrides[get_current_user] = lambda: user_2
    res_del = client.delete(f"/api/v1/connections/{conn_id}")
    assert res_del.status_code == 404


def test_upload_document_linked_to_coding_profile():
    app.dependency_overrides[get_current_user] = lambda: user_1
    client = TestClient(app)

    # 1. Connect LeetCode profile
    res_conn = client.post(
        "/api/v1/connections/leetcode",
        json={"profile_url": "https://leetcode.com/u/contest_champ"},
    )
    assert res_conn.status_code == 200
    conn_id = res_conn.json()["id"]

    # 2. Upload artifact linked to LeetCode
    file_content = b"LeetCode Biweekly Contest 120 Certificate of Achievement. Rank: 42. Solved: 4/4 problems."
    files = {"file": ("contest_120_cert.txt", file_content, "text/plain")}
    data = {
        "category": "certificate",
        "title": "LeetCode Biweekly Contest 120 Certificate",
        "source_provider": "leetcode",
        "connection_id": conn_id,
    }
    res_upload = client.post("/api/v1/documents/upload", files=files, data=data)
    assert res_upload.status_code == 200
    upload_data = res_upload.json()
    assert upload_data["status"] in ("success", "extracted", "ready_for_review", "already_exists")

    # 3. List evidence associated with this connection
    res_ev = client.get(f"/api/v1/connections/{conn_id}/evidence")
    assert res_ev.status_code == 200
    ev_items = res_ev.json()["items"]
    assert len(ev_items) >= 1
    found = any("Contest 120" in item.get("title", "") for item in ev_items)
    assert found

