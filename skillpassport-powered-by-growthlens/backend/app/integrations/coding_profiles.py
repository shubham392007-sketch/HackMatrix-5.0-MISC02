import re
import urllib.parse
from typing import Tuple

# Reserved routes on LeetCode that cannot be user profile handles
LEETCODE_RESERVED_PATHS = {
    "problems", "contest", "discuss", "explore", "interview", "subscribe",
    "tag", "api", "graphql", "login", "register", "accounts", "company",
    "playground", "terms", "privacy", "support", "jobs", "assessment",
    "studyplan", "points", "submissions", "developer"
}

# Reserved routes on HackerRank that cannot be user profile handles
HACKERRANK_RESERVED_PATHS = {
    "challenges", "domains", "leaderboard", "dashboard", "auth", "login",
    "signup", "work", "community", "settings", "administration", "certificates",
    "tests", "scoring", "faq", "terms-of-service", "privacy", "about-us",
    "careers", "resources", "skills-directory", "interview", "pricing"
}

# Safe username patterns
LEETCODE_USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9_-]{1,64}$")
HACKERRANK_USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9_.-]{1,64}$")


class ProfileValidationError(ValueError):
    """Raised when a profile URL fails security, protocol, domain, or format validation."""
    pass


def validate_and_normalize_leetcode_url(url: str) -> Tuple[str, str]:
    """
    Validates and normalizes a LeetCode profile URL.
    
    Security & Validation Requirements:
    1. Scheme MUST be HTTPS.
    2. Hostname MUST be leetcode.com or www.leetcode.com.
    3. Path must be /u/<username> or /<username>.
    4. Rejects reserved keywords, query strings, fragments, path traversals, and non-alphanumeric handles.
    
    Returns:
        Tuple of (normalized_profile_url, username)
    """
    if not url or not isinstance(url, str):
        raise ProfileValidationError("Profile URL is required and must be a string.")

    raw = url.strip()
    if not raw.startswith("https://"):
        raise ProfileValidationError("HTTPS protocol is required (e.g. https://leetcode.com/u/your-username).")

    try:
        parsed = urllib.parse.urlparse(raw)
    except Exception as e:
        raise ProfileValidationError(f"Malformed URL: {e}")

    hostname = (parsed.hostname or "").lower()
    if hostname not in ("leetcode.com", "www.leetcode.com"):
        raise ProfileValidationError(
            f"Invalid domain '{hostname}'. Only official 'leetcode.com' profile URLs are supported."
        )

    # Normalize path segments
    path = parsed.path.strip("/")
    segments = [s for s in path.split("/") if s]

    if not segments:
        raise ProfileValidationError("URL does not contain a LeetCode username.")

    username = ""
    if segments[0].lower() == "u":
        if len(segments) < 2:
            raise ProfileValidationError("Missing username in LeetCode profile URL path (expected /u/<username>).")
        username = segments[1]
    elif len(segments) == 1:
        username = segments[0]
    else:
        # Check if first segment is 'u' and extra segments exist
        raise ProfileValidationError("Unsupported path format. Expected 'https://leetcode.com/u/<username>' or 'https://leetcode.com/<username>'.")

    # Guard against reserved endpoints
    if username.lower() in LEETCODE_RESERVED_PATHS:
        raise ProfileValidationError(f"'{username}' is a reserved platform path, not a valid user profile.")

    # Validate username characters and length
    if not LEETCODE_USERNAME_REGEX.match(username):
        raise ProfileValidationError(
            f"Invalid username '{username}'. Usernames must be 1-64 alphanumeric characters, underscores, or hyphens."
        )

    normalized_url = f"https://leetcode.com/u/{username}"
    return normalized_url, username


def validate_and_normalize_hackerrank_url(url: str) -> Tuple[str, str]:
    """
    Validates and normalizes a HackerRank profile URL.
    
    Security & Validation Requirements:
    1. Scheme MUST be HTTPS.
    2. Hostname MUST be hackerrank.com or www.hackerrank.com.
    3. Path must be /profile/<username> or /<username>.
    4. Rejects reserved paths, query parameters, fragments, path traversals, and invalid characters.
    
    Returns:
        Tuple of (normalized_profile_url, username)
    """
    if not url or not isinstance(url, str):
        raise ProfileValidationError("Profile URL is required and must be a string.")

    raw = url.strip()
    if not raw.startswith("https://"):
        raise ProfileValidationError("HTTPS protocol is required (e.g. https://www.hackerrank.com/profile/your-username).")

    try:
        parsed = urllib.parse.urlparse(raw)
    except Exception as e:
        raise ProfileValidationError(f"Malformed URL: {e}")

    hostname = (parsed.hostname or "").lower()
    if hostname not in ("hackerrank.com", "www.hackerrank.com"):
        raise ProfileValidationError(
            f"Invalid domain '{hostname}'. Only official 'hackerrank.com' profile URLs are supported."
        )

    path = parsed.path.strip("/")
    segments = [s for s in path.split("/") if s]

    if not segments:
        raise ProfileValidationError("URL does not contain a HackerRank username.")

    username = ""
    if segments[0].lower() == "profile":
        if len(segments) < 2:
            raise ProfileValidationError("Missing username in HackerRank profile URL path (expected /profile/<username>).")
        username = segments[1]
    elif len(segments) == 1:
        username = segments[0]
    else:
        raise ProfileValidationError("Unsupported path format. Expected 'https://www.hackerrank.com/profile/<username>' or 'https://www.hackerrank.com/<username>'.")

    # Guard against reserved endpoints
    if username.lower() in HACKERRANK_RESERVED_PATHS:
        raise ProfileValidationError(f"'{username}' is a reserved platform path, not a valid user profile.")

    # Validate username characters and length
    if not HACKERRANK_USERNAME_REGEX.match(username):
        raise ProfileValidationError(
            f"Invalid username '{username}'. Usernames must be 1-64 alphanumeric characters, dots, underscores, or hyphens."
        )

    normalized_url = f"https://www.hackerrank.com/profile/{username}"
    return normalized_url, username
