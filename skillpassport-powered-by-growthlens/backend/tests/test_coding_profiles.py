import pytest
from backend.app.integrations.coding_profiles import (
    validate_and_normalize_leetcode_url,
    validate_and_normalize_hackerrank_url,
    ProfileValidationError,
)


def test_valid_leetcode_urls():
    # Modern /u/ path
    url, user = validate_and_normalize_leetcode_url("https://leetcode.com/u/shubham_dev/")
    assert url == "https://leetcode.com/u/shubham_dev"
    assert user == "shubham_dev"

    # Classic path
    url, user = validate_and_normalize_leetcode_url("https://leetcode.com/john-doe")
    assert url == "https://leetcode.com/u/john-doe"
    assert user == "john-doe"

    # With www and query parameters stripped
    url, user = validate_and_normalize_leetcode_url("https://www.leetcode.com/u/coder123?tab=profile#recent")
    assert url == "https://leetcode.com/u/coder123"
    assert user == "coder123"


def test_invalid_leetcode_urls():
    # Non-HTTPS
    with pytest.raises(ProfileValidationError, match="HTTPS protocol is required"):
        validate_and_normalize_leetcode_url("http://leetcode.com/u/shubham")

    # Unrelated domain
    with pytest.raises(ProfileValidationError, match="Invalid domain"):
        validate_and_normalize_leetcode_url("https://malicious-site.com/u/shubham")

    # Reserved endpoint
    with pytest.raises(ProfileValidationError, match="reserved platform path"):
        validate_and_normalize_leetcode_url("https://leetcode.com/problems")

    # Invalid characters in handle
    with pytest.raises(ProfileValidationError, match="Invalid username"):
        validate_and_normalize_leetcode_url("https://leetcode.com/u/user<script>")

    # Empty handle
    with pytest.raises(ProfileValidationError, match="does not contain a LeetCode username"):
        validate_and_normalize_leetcode_url("https://leetcode.com/")


def test_valid_hackerrank_urls():
    # /profile/ path
    url, user = validate_and_normalize_hackerrank_url("https://www.hackerrank.com/profile/shubham_dev")
    assert url == "https://www.hackerrank.com/profile/shubham_dev"
    assert user == "shubham_dev"

    # Non-www path with dot in username
    url, user = validate_and_normalize_hackerrank_url("https://hackerrank.com/profile/john.doe-99/")
    assert url == "https://www.hackerrank.com/profile/john.doe-99"
    assert user == "john.doe-99"

    # Direct username path
    url, user = validate_and_normalize_hackerrank_url("https://hackerrank.com/coder_expert")
    assert url == "https://www.hackerrank.com/profile/coder_expert"
    assert user == "coder_expert"


def test_invalid_hackerrank_urls():
    # Non-HTTPS
    with pytest.raises(ProfileValidationError, match="HTTPS protocol is required"):
        validate_and_normalize_hackerrank_url("http://hackerrank.com/profile/shubham")

    # Unrelated domain
    with pytest.raises(ProfileValidationError, match="Invalid domain"):
        validate_and_normalize_hackerrank_url("https://phishing.com/profile/shubham")

    # Reserved endpoint
    with pytest.raises(ProfileValidationError, match="reserved platform path"):
        validate_and_normalize_hackerrank_url("https://www.hackerrank.com/challenges")

    # Empty username
    with pytest.raises(ProfileValidationError, match="does not contain a HackerRank username"):
        validate_and_normalize_hackerrank_url("https://www.hackerrank.com/")
