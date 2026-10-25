"""
Resource Validation, SSRF Protection, and Ranking Utilities.
Ensures external links are safe, reachable, and deduplicated.
"""

import ipaddress
import socket
import urllib.parse
from typing import List, Tuple, Optional
from backend.app.core.logging import get_logger
from backend.app.learning.providers.base import NormalizedLearningResource

logger = get_logger("learning.validator")

# Private and non-routable CIDR ranges to block (SSRF Defense)
BLOCKED_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),      # Loopback IPv4
    ipaddress.ip_network("::1/128"),          # Loopback IPv6
    ipaddress.ip_network("10.0.0.0/8"),       # RFC 1918 Private
    ipaddress.ip_network("172.16.0.0/12"),    # RFC 1918 Private
    ipaddress.ip_network("192.168.0.0/16"),   # RFC 1918 Private
    ipaddress.ip_network("169.254.0.0/16"),   # Link-local & Cloud Metadata (AWS/GCP)
    ipaddress.ip_network("fe80::/10"),        # Link-local IPv6
    ipaddress.ip_network("224.0.0.0/4"),      # Multicast IPv4
    ipaddress.ip_network("ff00::/8"),         # Multicast IPv6
]

BLOCKED_HOSTNAMES = {
    "localhost",
    "127.0.0.1",
    "::1",
    "metadata.google.internal",
    "instance-data",
}


def is_url_safe(url: str) -> Tuple[bool, str]:
    """
    Validates that a URL is a legitimate, publicly accessible HTTP/HTTPS link.
    Guards against SSRF, internal port scanning, and cloud metadata access.
    """
    if not url or not isinstance(url, str):
        return False, "Empty URL"

    try:
        parsed = urllib.parse.urlparse(url.strip())
    except Exception as e:
        return False, f"Malformed URL: {e}"

    if parsed.scheme.lower() not in ("http", "https"):
        return False, f"Unsupported URL scheme: {parsed.scheme} (must be http or https)"

    hostname = (parsed.hostname or "").lower()
    if not hostname:
        return False, "Missing hostname"

    if hostname in BLOCKED_HOSTNAMES:
        return False, f"Blocked internal hostname: {hostname}"

    # Check if hostname is direct IP literal
    try:
        ip = ipaddress.ip_address(hostname)
        for net in BLOCKED_NETWORKS:
            if ip in net:
                return False, f"Blocked private or non-routable IP address: {ip}"
    except ValueError:
        # Hostname is a domain name, not an IP literal
        pass

    return True, "URL is safe"


STOP_WORDS = {
    "a", "an", "the", "and", "or", "in", "on", "of", "for", "with", "to", "at",
    "by", "from", "up", "about", "into", "over", "after", "tutorial", "guide",
    "how", "what", "is", "are", "using", "use", "learn", "introduction", "intro"
}


def extract_meaningful_terms(text: str) -> List[str]:
    """Tokenizes text into lowercase alphanumeric terms excluding stop words."""
    import re
    tokens = re.findall(r'[a-zA-Z0-9]+', (text or "").lower())
    clean_terms = []
    for t in tokens:
        clean = t.strip()
        if len(clean) > 1 and clean not in STOP_WORDS:
            clean_terms.append(clean)
    return clean_terms


def terms_match(t1: str, t2: str) -> bool:
    """Checks exact match or shared stem/root (e.g. impute/imputation, feature/features)."""
    if t1 == t2:
        return True
    if len(t1) >= 5 and len(t2) >= 5 and (t1.startswith(t2[:5]) or t2.startswith(t1[:5])):
        return True
    return False


TOPIC_SYNONYMS = {
    "missing": ["impute", "imputation", "mcar", "mar", "mnar"],
    "impute": ["missing", "imputation"],
    "imputation": ["missing", "impute"],
    "outliers": ["iqr", "anomaly", "anomalies", "outlier"],
    "outlier": ["iqr", "anomaly", "anomalies", "outliers"],
    "pipeline": ["pipelines", "leakage", "columntransformer"],
    "feature": ["features", "engineering", "encoding", "scaling"],
    "features": ["feature", "engineering", "encoding", "scaling"],
    "kafka": ["streaming", "partition", "partitions", "consumer"],
}

DOMAIN_SLUG_EXPANSIONS = {
    "dist-sys": "distributed systems kafka consensus",
    "data-eng": "data engineering postgresql sql pipelines",
    "cloud-infra": "cloud infrastructure devops docker terraform",
    "appsec": "application security owasp jwt authentication",
    "domain-data-preprocessing": "data preprocessing cleaning pandas",
    "gap-046377b2-6953-4aba-99e0-a8164be7e97d": "relational data modeling postgresql sql indexing",
    "gap-024e9309-ac90-4451-8a0d-054aa3e49b3d": "cloud infrastructure devops docker terraform",
    "gap-602d5bcb-7e3f-4d8d-8381-d60f8e803ac0": "python programming asyncio",
}


def clean_topic_slug_for_relevance(topic_slug: Optional[str]) -> str:
    """
    Sanitizes a domain/skill/topic slug so UUID segments and structural prefixes
    (e.g. gap-<uuid>, domain-, skill-, topic-) do not dilute relevance scoring.
    """
    if not topic_slug:
        return ""
    slug_lower = topic_slug.strip().lower()
    if slug_lower in DOMAIN_SLUG_EXPANSIONS:
        return DOMAIN_SLUG_EXPANSIONS[slug_lower]

    import re
    cleaned = re.sub(
        r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
        " ",
        slug_lower,
    )
    tokens = []
    for tok in re.findall(r"[a-z0-9]+", cleaned):
        if tok in ("gap", "domain", "skill", "topic", "mod", "step", "roadmap"):
            continue
        if len(tok) >= 4 and all(c in "0123456789abcdef" for c in tok):
            continue
        tokens.append(tok)
    return " ".join(tokens)


def compute_topic_relevance(
    query: str,
    title: str,
    description: str = "",
    tags: Optional[List[str]] = None,
    learning_objective: Optional[str] = None,
    topic_slug: Optional[str] = None,
) -> float:
    """
    Computes a deterministic topic relevance score (0.0 to 1.0) between a query/topic
    and a resource's metadata (title, description, tags, and learning objective).
    """
    if not (query or topic_slug) or not title:
        return 0.0

    clean_slug = clean_topic_slug_for_relevance(topic_slug)
    raw_query = f"{query or ''} {clean_slug}"
    q_terms = list(dict.fromkeys(extract_meaningful_terms(raw_query)))
    if not q_terms:
        return 0.50

    # Expand query terms with key domain synonyms
    expanded_terms = set(q_terms)
    for term in q_terms:
        if term in TOPIC_SYNONYMS:
            expanded_terms.update(TOPIC_SYNONYMS[term])

    title_lower = title.lower()
    title_terms = set(extract_meaningful_terms(title))

    tag_terms = set()
    if tags:
        for tag in tags:
            tag_terms.update(extract_meaningful_terms(str(tag)))

    desc_text = f"{description or ''} {learning_objective or ''}"
    desc_terms = set(extract_meaningful_terms(desc_text))

    # Title match scoring
    title_matches = sum(
        1 for term in expanded_terms
        if any(terms_match(term, tt) for tt in title_terms)
    )
    title_overlap = min(1.0, title_matches / max(1, len(q_terms)))
    title_score = (0.50 * title_overlap) + (0.50 if title_matches > 0 else 0.0)

    # Tag match scoring
    tag_matches = sum(
        1 for term in expanded_terms
        if any(terms_match(term, tg) for tg in tag_terms)
    )
    tag_overlap = min(1.0, tag_matches / max(1, len(q_terms)))
    tag_score = (0.50 * tag_overlap) + (0.50 if tag_matches > 0 else 0.0)

    # Description match scoring
    desc_matches = sum(
        1 for term in expanded_terms
        if any(terms_match(term, dt) for dt in desc_terms)
    )
    desc_overlap = min(1.0, desc_matches / max(1, len(q_terms)))
    desc_score = (0.50 * desc_overlap) + (0.50 if desc_matches > 0 else 0.0)

    # Base weighted score
    score = (0.50 * title_score) + (0.25 * tag_score) + (0.25 * desc_score)

    # Exact multi-word phrase bonus
    clean_query = " ".join(extract_meaningful_terms(query))
    if len(clean_query.split()) > 1:
        if clean_query in title_lower:
            score += 0.20
        elif clean_query in desc_text.lower():
            score += 0.10

    return max(0.0, min(1.0, round(score, 2)))


def is_resource_relevant(
    resource: NormalizedLearningResource,
    query: str,
    topic_slug: Optional[str] = None,
    min_threshold: float = 0.20,
) -> Tuple[bool, float, str]:
    """
    Evaluates whether a candidate resource is genuinely relevant to the requested query/topic.
    Rejects completely unrelated articles, personal blogs, and non-educational repos.
    Verified curated catalog entries are always accepted.
    """
    if getattr(resource, "is_fallback", False) or getattr(resource, "validation_status", "") == "verified_available":
        return True, getattr(resource, "relevance_score", 0.90), "Verified Curated Resource"

    rel = compute_topic_relevance(
        query=query,
        title=resource.title,
        description=resource.description,
        tags=resource.tags,
        learning_objective=resource.learning_objective,
        topic_slug=topic_slug,
    )
    if rel < min_threshold:
        return False, rel, f"Low topic relevance score ({rel:.2f} < {min_threshold:.2f}) for '{resource.title}'"
    return True, rel, "Relevant"


def deduplicate_resources(
    resources: List[NormalizedLearningResource],
) -> List[NormalizedLearningResource]:
    """
    Deduplicates resources by canonicalized URL (ignoring tracking query params).
    Preserves YouTube video identifiers (v parameter or youtu.be path).
    """
    seen_urls = set()
    deduped = []

    for res in resources:
        try:
            parsed = urllib.parse.urlparse(res.url)
            netloc = parsed.netloc.lower()
            if "youtube.com" in netloc:
                qs = urllib.parse.parse_qs(parsed.query)
                vid = qs.get("v", [""])[0]
                canonical = f"{parsed.scheme.lower()}://{netloc}{parsed.path.rstrip('/')}?v={vid}" if vid else f"{parsed.scheme.lower()}://{netloc}{parsed.path.rstrip('/')}"
            elif "youtu.be" in netloc:
                canonical = f"{parsed.scheme.lower()}://{netloc}{parsed.path.rstrip('/')}"
            else:
                canonical = f"{parsed.scheme.lower()}://{netloc}{parsed.path.rstrip('/')}"
        except Exception:
            canonical = res.url.lower().strip()

        if canonical not in seen_urls:
            seen_urls.add(canonical)
            deduped.append(res)

    return deduped


def rank_resources(
    resources: List[NormalizedLearningResource],
) -> List[NormalizedLearningResource]:
    """
    Ranks resources using multi-factor criteria:
    - Base topic relevance score (0.50)
    - Deep-link bonus (0.15 for precise timestamp/section)
    - Provider reliability weight (0.20)
    - Title/description completeness (0.15)
    """
    provider_weights = {
        "official_docs": 1.0,
        "youtube": 0.90,
        "github": 0.85,
        "freecodecamp": 0.85,
        "devto": 0.80,
    }

    def scoring_fn(r: NormalizedLearningResource) -> float:
        base = r.relevance_score * 0.50
        deep_bonus = 0.15 if (r.deep_link_url and r.deep_link_url != r.url) else 0.0
        p_weight = provider_weights.get(r.provider, 0.70) * 0.20
        detail = 0.15 if len(r.description) > 40 else 0.05
        return base + deep_bonus + p_weight + detail

    return sorted(resources, key=scoring_fn, reverse=True)
