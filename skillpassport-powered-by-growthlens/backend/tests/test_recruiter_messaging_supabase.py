import uuid
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import text

from backend.app.main import app
from backend.app.db.session import engine, SessionLocal
from backend.app.models.sharing import (
    ShareLinkRecord,
    RecruiterMessage,
    UserNotification,
    ShareAccessEvent,
)
from backend.app.api.dependencies import get_current_user, AuthenticatedUser

client = TestClient(app)

TEST_USER_ID = uuid.UUID("8853fee2-2f9f-4023-a4cd-17e638492a3c")
OTHER_USER_ID = uuid.UUID("eddb76cb-ac53-460f-9569-2995449914fa")


def override_current_user():
    return AuthenticatedUser(
        user_id=str(TEST_USER_ID),
        email="alex.chen@innovatecorp.internal",
        role="authenticated",
    )


@pytest.fixture(autouse=True)
def setup_auth():
    app.dependency_overrides[get_current_user] = override_current_user
    yield
    app.dependency_overrides.clear()


def test_supabase_realtime_publication_and_replica_identity():
    """Verify that recruiter_messages and user_notifications are published and configured for Realtime."""
    with engine.connect() as conn:
        pub_tables = conn.execute(
            text("SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';")
        ).fetchall()
        table_names = [r[0] for r in pub_tables]
        assert "recruiter_messages" in table_names, "recruiter_messages must be in supabase_realtime publication"
        assert "user_notifications" in table_names, "user_notifications must be in supabase_realtime publication"

        # Check replica identity is 'f' (FULL)
        replicas = conn.execute(
            text("SELECT relname, relreplident FROM pg_class WHERE relname IN ('recruiter_messages', 'user_notifications');")
        ).fetchall()
        for relname, replident in replicas:
            assert replident == "f", f"Table {relname} must have REPLICA IDENTITY FULL ('f')"

        # Check RLS is enabled and policies exist
        policies = conn.execute(
            text("SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('recruiter_messages', 'user_notifications', 'share_links');")
        ).fetchall()
        policy_tables = set(r[0] for r in policies)
        assert "recruiter_messages" in policy_tables
        assert "user_notifications" in policy_tables
        assert "share_links" in policy_tables


def test_recruiter_message_valid_flow():
    """Test full valid workflow: public message submission -> DB persistence -> notification creation."""
    db = SessionLocal()
    token = f"test_token_{uuid.uuid4().hex[:12]}"
    link = ShareLinkRecord(
        owner_user_id=TEST_USER_ID,
        label="Test Automated Recruiter Share Link",
        token=token,
        status="active",
        permissions_json={"allow_recruiter_messaging": True},
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    link_id = link.id
    db.close()

    try:
        payload = {
            "sender_name": "Sarah Connor",
            "sender_email": "sarah.connor@cyberdyne.ai",
            "company": "Cyberdyne Systems",
            "role_title": "Principal AI Architect",
            "subject": "Executive Role Discussion",
            "message_body": "We reviewed your verified Skill Passport and would like to schedule an interview.",
        }
        res = client.post(f"/api/v1/sharing/public/{token}/messages", json=payload)
        assert res.status_code == 201, res.text
        data = res.json()
        assert data["success"] is True
        assert "messageId" in data
        assert "notificationId" in data
        assert data["recipientUserId"] == str(TEST_USER_ID)

        # Verify DB records
        verify_db = SessionLocal()
        msg = verify_db.query(RecruiterMessage).filter(RecruiterMessage.id == uuid.UUID(data["messageId"])).first()
        assert msg is not None
        assert msg.recipient_user_id == TEST_USER_ID
        assert msg.sender_name == "Sarah Connor"
        assert msg.is_read is False

        notif = verify_db.query(UserNotification).filter(UserNotification.id == uuid.UUID(data["notificationId"])).first()
        assert notif is not None
        assert notif.user_id == TEST_USER_ID
        assert notif.entity_type == "recruiter_message"
        assert notif.entity_id == str(msg.id)
        assert notif.read is False

        event = verify_db.query(ShareAccessEvent).filter(
            ShareAccessEvent.share_link_id == link_id,
            ShareAccessEvent.action == "message_received",
        ).first()
        assert event is not None
        verify_db.close()

        # Test authenticated message list
        list_res = client.get("/api/v1/sharing/messages")
        assert list_res.status_code == 200
        messages = list_res.json()
        matching = [m for m in messages if m["id"] == str(msg.id)]
        assert len(matching) == 1
        assert matching[0]["senderEmail"] == "sarah.connor@cyberdyne.ai"
        assert matching[0]["isRead"] is False

        # Test marking message read synchronizes UserNotification
        read_res = client.patch(f"/api/v1/sharing/messages/{msg.id}/read?read=true")
        assert read_res.status_code == 200

        verify_db2 = SessionLocal()
        refreshed_notif = verify_db2.query(UserNotification).filter(UserNotification.id == notif.id).first()
        assert refreshed_notif.read is True, "UserNotification should be marked read when RecruiterMessage is marked read"
        verify_db2.close()

        # Test notifications API
        notifs_res = client.get("/api/v1/sharing/notifications")
        assert notifs_res.status_code == 200
        user_notifs = notifs_res.json()
        matching_n = [n for n in user_notifs if n["id"] == str(notif.id)]
        assert len(matching_n) == 1
        assert matching_n[0]["read"] is True

    finally:
        # Cleanup
        clean_db = SessionLocal()
        clean_db.query(ShareAccessEvent).filter(ShareAccessEvent.share_link_id == link_id).delete()
        clean_db.query(UserNotification).filter(UserNotification.user_id == TEST_USER_ID, UserNotification.entity_id == str(msg.id)).delete()
        clean_db.query(RecruiterMessage).filter(RecruiterMessage.share_link_id == link_id).delete()
        clean_db.query(ShareLinkRecord).filter(ShareLinkRecord.id == link_id).delete()
        clean_db.commit()
        clean_db.close()


def test_recruiter_message_permissions_and_rejections():
    """Verify security gates: invalid token, revoked token, expired link, messaging disabled."""
    db = SessionLocal()

    # 1. Non-existent token
    fake_token = f"nonexistent_{uuid.uuid4().hex}"
    res = client.post(f"/api/v1/sharing/public/{fake_token}/messages", json={
        "sender_name": "Test Recruiter",
        "sender_email": "recruiter@test.com",
        "message_body": "Hello candidate, interested in your skills.",
    })
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()

    # 2. Revoked link
    revoked_token = f"revoked_{uuid.uuid4().hex[:12]}"
    revoked_link = ShareLinkRecord(
        owner_user_id=TEST_USER_ID,
        label="Revoked Link",
        token=revoked_token,
        status="revoked",
        permissions_json={"allow_recruiter_messaging": True},
    )
    db.add(revoked_link)

    # 3. Expired link
    expired_token = f"expired_{uuid.uuid4().hex[:12]}"
    expired_link = ShareLinkRecord(
        owner_user_id=TEST_USER_ID,
        label="Expired Link",
        token=expired_token,
        status="active",
        expires_at=datetime.now(timezone.utc) - timedelta(days=2),
        permissions_json={"allow_recruiter_messaging": True},
    )
    db.add(expired_link)

    # 4. Messaging disabled link
    disabled_token = f"disabled_{uuid.uuid4().hex[:12]}"
    disabled_link = ShareLinkRecord(
        owner_user_id=TEST_USER_ID,
        label="Disabled Messaging Link",
        token=disabled_token,
        status="active",
        permissions_json={"allow_recruiter_messaging": False},
    )
    db.add(disabled_link)
    db.commit()
    db.close()

    try:
        valid_payload = {
            "sender_name": "Jane Recruiter",
            "sender_email": "jane@techcorp.io",
            "message_body": "Exciting role for you at TechCorp.",
        }

        # Revoked check
        res_revoked = client.post(f"/api/v1/sharing/public/{revoked_token}/messages", json=valid_payload)
        assert res_revoked.status_code == 403
        assert "revoked" in res_revoked.json()["detail"].lower()

        # Expired check
        res_expired = client.post(f"/api/v1/sharing/public/{expired_token}/messages", json=valid_payload)
        assert res_expired.status_code == 410
        assert "expired" in res_expired.json()["detail"].lower()

        # Disabled messaging check
        res_disabled = client.post(f"/api/v1/sharing/public/{disabled_token}/messages", json=valid_payload)
        assert res_disabled.status_code == 403
        assert "disabled" in res_disabled.json()["detail"].lower()

    finally:
        clean_db = SessionLocal()
        clean_db.query(ShareLinkRecord).filter(
            ShareLinkRecord.token.in_([revoked_token, expired_token, disabled_token])
        ).delete(synchronize_session=False)
        clean_db.commit()
        clean_db.close()


def test_recruiter_message_validation_and_rate_limiting():
    """Verify input validation and rate limiting."""
    db = SessionLocal()
    token = f"rate_limit_token_{uuid.uuid4().hex[:12]}"
    link = ShareLinkRecord(
        owner_user_id=TEST_USER_ID,
        label="Rate Limit Test Link",
        token=token,
        status="active",
        permissions_json={"allow_recruiter_messaging": True},
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    link_id = link.id
    db.close()

    try:
        # Invalid email
        res_email = client.post(f"/api/v1/sharing/public/{token}/messages", json={
            "sender_name": "Valid Name",
            "sender_email": "not-an-email",
            "message_body": "Valid message body for candidate.",
        })
        assert res_email.status_code == 400
        assert "valid work email" in res_email.json()["detail"].lower()

        # Short body
        res_short = client.post(f"/api/v1/sharing/public/{token}/messages", json={
            "sender_name": "Valid Name",
            "sender_email": "recruiter@valid.com",
            "message_body": "hi",
        })
        assert res_short.status_code == 400
        assert "5 characters" in res_short.json()["detail"]

        # Send 5 messages (allowed)
        for i in range(5):
            res_spam = client.post(f"/api/v1/sharing/public/{token}/messages", json={
                "sender_name": "Frequent Recruiter",
                "sender_email": "spammer@recruiter.com",
                "message_body": f"Inquiry message number {i+1} regarding opportunities.",
            })
            assert res_spam.status_code == 201

        # 6th message should be rate-limited with 429
        res_blocked = client.post(f"/api/v1/sharing/public/{token}/messages", json={
            "sender_name": "Frequent Recruiter",
            "sender_email": "spammer@recruiter.com",
            "message_body": "This 6th message should trigger the anti-spam rate limiter.",
        })
        assert res_blocked.status_code == 429
        assert "too many messages" in res_blocked.json()["detail"].lower()

    finally:
        clean_db = SessionLocal()
        clean_db.query(ShareAccessEvent).filter(ShareAccessEvent.share_link_id == link_id).delete()
        clean_db.query(UserNotification).filter(UserNotification.user_id == TEST_USER_ID).delete()
        clean_db.query(RecruiterMessage).filter(RecruiterMessage.share_link_id == link_id).delete()
        clean_db.query(ShareLinkRecord).filter(ShareLinkRecord.id == link_id).delete()
        clean_db.commit()
        clean_db.close()
