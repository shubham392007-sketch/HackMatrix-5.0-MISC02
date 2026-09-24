import uuid
from backend.core.auth import hash_password, verify_password, create_access_token, decode_access_token


def test_password_hashing_and_verification():
    raw_pwd = "SecretPassKey987!"
    hashed = hash_password(raw_pwd)
    assert hashed != raw_pwd
    assert verify_password(raw_pwd, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_jwt_token_lifecycle():
    user_id = str(uuid.uuid4())
    token = create_access_token({"sub": user_id, "email": "test@growthlens.internal"})
    assert isinstance(token, str)
    
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["email"] == "test@growthlens.internal"


def test_invalid_jwt_token():
    payload = decode_access_token("malformed.jwt.token")
    assert payload is None
