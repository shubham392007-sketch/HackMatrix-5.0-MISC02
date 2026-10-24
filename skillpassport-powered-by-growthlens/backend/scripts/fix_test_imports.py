def fix():
    # 1. Add asyncio import to backend/app/api/career.py
    with open("backend/app/api/career.py", "r", encoding="utf-8") as f:
        career_text = f.read().replace("\r\n", "\n")

    if "import asyncio" not in career_text:
        career_text = career_text.replace("import uuid\n", "import uuid\nimport asyncio\n")
        with open("backend/app/api/career.py", "w", encoding="utf-8") as f:
            f.write(career_text)
        print("Added asyncio import to api/career.py")

    # 2. Add httpx import and fix assertion in backend/tests/test_career_intelligence.py
    with open("backend/tests/test_career_intelligence.py", "r", encoding="utf-8") as f:
        test_text = f.read().replace("\r\n", "\n")

    if "import httpx" not in test_text:
        test_text = test_text.replace("import uuid\n", "import uuid\nimport httpx\n")

    old_target_check = '''    # Verify active target role in user session is NOT forcibly changed
    current_target_res = client.get("/api/v1/career/targets/active", headers=AUTH_HEADERS)
    assert current_target_res.status_code == 200
    # The active target remains whatever was set (or none), not forced to this new role
    if current_target_res.json().get("role_id"):
        assert current_target_res.json()["role_id"] != data["role_id"] or True'''

    new_target_check = '''    # Verify active target role in user session is NOT forcibly changed
    current_target_res = client.get("/api/v1/career/targets/active", headers=AUTH_HEADERS)
    assert current_target_res.status_code in (200, 404)
    if current_target_res.status_code == 200:
        assert current_target_res.json().get("role_id") != data["role_id"]'''

    test_text = test_text.replace(old_target_check, new_target_check)

    with open("backend/tests/test_career_intelligence.py", "w", encoding="utf-8") as f:
        f.write(test_text)
    print("Updated backend/tests/test_career_intelligence.py")

if __name__ == "__main__":
    fix()
