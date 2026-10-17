import socket
import ipaddress
import re
from urllib.parse import urlparse, urljoin, urlunparse, parse_qsl, urlencode
from typing import Dict, Any, List, Optional, Set
import httpx

from backend.app.core.exceptions import SSRFSecurityError
from backend.app.core.logging import get_logger

logger = get_logger("extraction.ssrf")

# Restricted IPv4 networks
RESTRICTED_IPV4_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),          # Current network (only valid as source)
    ipaddress.ip_network("10.0.0.0/8"),         # Private-use (RFC 1918)
    ipaddress.ip_network("100.64.0.0/10"),      # Shared Address Space / CGNAT (RFC 6598)
    ipaddress.ip_network("127.0.0.0/8"),        # Loopback
    ipaddress.ip_network("169.254.0.0/16"),     # Link-Local / Cloud Metadata
    ipaddress.ip_network("172.16.0.0/12"),      # Private-use (RFC 1918)
    ipaddress.ip_network("192.0.0.0/24"),       # IETF Protocol Assignments
    ipaddress.ip_network("192.0.2.0/24"),       # TEST-NET-1 (RFC 5737)
    ipaddress.ip_network("192.88.99.0/24"),     # 6to4 Relay Anycast (RFC 7526)
    ipaddress.ip_network("192.168.0.0/16"),     # Private-use (RFC 1918)
    ipaddress.ip_network("198.18.0.0/15"),      # Network benchmark tests (RFC 2544)
    ipaddress.ip_network("198.51.100.0/24"),    # TEST-NET-2 (RFC 5737)
    ipaddress.ip_network("203.0.113.0/24"),     # TEST-NET-3 (RFC 5737)
    ipaddress.ip_network("224.0.0.0/4"),        # Multicast (RFC 5771)
    ipaddress.ip_network("240.0.0.0/4"),        # Reserved for future use (RFC 1112)
    ipaddress.ip_network("255.255.255.255/32"), # Limited Broadcast
]

# Restricted IPv6 networks
RESTRICTED_IPV6_NETWORKS = [
    ipaddress.ip_network("::/128"),             # Unspecified
    ipaddress.ip_network("::1/128"),            # Loopback
    ipaddress.ip_network("::ffff:0:0/96"),      # IPv4-mapped IPv6
    ipaddress.ip_network("64:ff9b:1::/48"),     # Local-Use IPv4/IPv6 Translation
    ipaddress.ip_network("100::/64"),           # Discard prefix
    ipaddress.ip_network("2001:db8::/32"),      # Documentation
    ipaddress.ip_network("fc00::/7"),           # Unique Local Address (ULA)
    ipaddress.ip_network("fe80::/10"),          # Link-Local Unicast
    ipaddress.ip_network("ff00::/8"),           # Multicast
]

# Cloud metadata and internal hostnames
FORBIDDEN_HOSTNAMES: Set[str] = {
    "localhost",
    "metadata.google.internal",
    "metadata.goog",
    "instance-data",
    "metadata.azure.com",
    "metadata",
    "broadcasthost",
}

# Tracking query parameters to strip during normalization
TRACKING_QUERY_PARAMS: Set[str] = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "fbclid", "gclid", "gclsrc", "dclid", "zanpid", "msclkid",
    "_hsenc", "_hsmi", "mc_cid", "mc_eid", "igshid", "ref", "source",
}


def is_ip_restricted(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Checks whether an IP address belongs to any restricted or private network."""
    # Check standard library properties
    if (
        ip.is_loopback
        or ip.is_private
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    ):
        return True

    # Check IPv4 subnet ranges
    if isinstance(ip, ipaddress.IPv4Address):
        for net in RESTRICTED_IPV4_NETWORKS:
            if ip in net:
                return True
    elif isinstance(ip, ipaddress.IPv6Address):
        # Extract IPv4 from IPv4-mapped IPv6
        if ip.ipv4_mapped:
            return is_ip_restricted(ip.ipv4_mapped)
        for net in RESTRICTED_IPV6_NETWORKS:
            if ip in net:
                return True

    return False


def validate_url_safe(url: str, allowed_ports: Optional[Set[int]] = None) -> Dict[str, Any]:
    """
    Validates that a URL does not resolve to private, loopback, link-local,
    multicast, or cloud metadata network ranges.
    
    Enforces:
    - Scheme: only http and https
    - Userinfo credentials blocked
    - Port restrictions: 80 and 443 by default
    - Explicit hostname blacklist
    - Full DNS resolution check for all A and AAAA records
    - Protection against IPv4-mapped IPv6 and decimal/octal obfuscation
    """
    if not url or not isinstance(url, str):
        raise SSRFSecurityError(target_url=str(url), reason="URL must be a non-empty string.")

    cleaned_url = url.strip()
    if not cleaned_url.startswith(("http://", "https://")):
        cleaned_url = "https://" + cleaned_url

    try:
        parsed = urlparse(cleaned_url)
    except Exception as e:
        raise SSRFSecurityError(target_url=cleaned_url, reason=f"URL parsing error: {e}")

    scheme = parsed.scheme.lower()
    if scheme not in ("http", "https"):
        raise SSRFSecurityError(
            target_url=cleaned_url,
            reason=f"Prohibited scheme '{scheme}'. Only HTTP and HTTPS are permitted."
        )

    # Reject userinfo (e.g. http://user:pass@example.com)
    if parsed.username or parsed.password:
        raise SSRFSecurityError(
            target_url=cleaned_url,
            reason="URLs containing embedded userinfo credentials are not permitted."
        )

    hostname = parsed.hostname
    if not hostname:
        raise SSRFSecurityError(target_url=cleaned_url, reason="Invalid URL: hostname could not be determined.")

    hostname_lower = hostname.lower()

    # Block direct IP literals in hostname that are forbidden
    if hostname_lower in FORBIDDEN_HOSTNAMES or hostname_lower.endswith((".localhost", ".local", ".internal")):
        raise SSRFSecurityError(
            target_url=cleaned_url,
            reason=f"Access to internal hostname '{hostname}' is prohibited."
        )

    # Check port
    valid_ports = allowed_ports or {80, 443}
    port = parsed.port
    if port is None:
        port = 443 if scheme == "https" else 80

    if port not in valid_ports:
        raise SSRFSecurityError(
            target_url=cleaned_url,
            reason=f"Target port {port} is prohibited. Only standard web ports (80, 443) are allowed."
        )

    # Check if hostname is an IP literal
    try:
        direct_ip = ipaddress.ip_address(hostname_lower)
        if is_ip_restricted(direct_ip):
            raise SSRFSecurityError(
                target_url=cleaned_url,
                reason=f"Direct access to restricted IP address '{hostname}' is blocked."
            )
    except ValueError:
        pass  # It's a standard domain name, continue to DNS resolution

    # Resolve hostname via DNS
    try:
        addr_info = socket.getaddrinfo(hostname, port, proto=socket.IPPROTO_TCP)
    except socket.gaierror as e:
        raise SSRFSecurityError(
            target_url=cleaned_url,
            reason=f"DNS resolution failed for hostname '{hostname}': {e}"
        )

    resolved_ips: Set[str] = set()
    for entry in addr_info:
        sockaddr = entry[4]
        ip_str = sockaddr[0]
        resolved_ips.add(ip_str)

    if not resolved_ips:
        raise SSRFSecurityError(
            target_url=cleaned_url,
            reason=f"No IP addresses resolved for hostname '{hostname}'."
        )

    for ip_str in resolved_ips:
        try:
            ip_obj = ipaddress.ip_address(ip_str)
        except ValueError:
            raise SSRFSecurityError(
                target_url=cleaned_url,
                reason=f"Invalid IP address returned during DNS resolution: {ip_str}"
            )

        if is_ip_restricted(ip_obj):
            raise SSRFSecurityError(
                target_url=cleaned_url,
                reason=f"Hostname '{hostname}' resolves to restricted network IP '{ip_str}'. Access blocked."
            )

    return {
        "is_safe": True,
        "cleaned_url": cleaned_url,
        "hostname": hostname_lower,
        "port": port,
        "scheme": scheme,
        "resolved_ips": list(resolved_ips),
    }


def normalize_url(url: str, base_url: Optional[str] = None) -> str:
    """
    Normalizes a URL for deduplication and crawling consistency.
    - Resolves relative paths against base_url
    - Converts scheme and host to lowercase
    - Removes tracking query parameters
    - Preserves meaningful query parameters sorted alphabetically
    - Retains SPA hash routes (e.g. #/projects, #!/portfolio) while stripping empty hashes
    - Normalizes trailing slashes for standard paths
    """
    if base_url:
        url = urljoin(base_url, url)

    parsed = urlparse(url)
    scheme = parsed.scheme.lower()
    netloc = parsed.netloc.lower()

    # Normalize default ports in netloc
    if scheme == "http" and netloc.endswith(":80"):
        netloc = netloc[:-3]
    elif scheme == "https" and netloc.endswith(":443"):
        netloc = netloc[:-4]

    # Clean path: remove duplicate slashes, keep trailing slash only if root
    path = parsed.path or "/"
    path = re.sub(r"/+", "/", path)
    if len(path) > 1 and path.endswith("/"):
        path = path.rstrip("/")

    # Filter tracking query parameters
    query_params = parse_qsl(parsed.query, keep_blank_values=True)
    filtered_params = [
        (k, v) for k, v in query_params if k.lower() not in TRACKING_QUERY_PARAMS
    ]
    filtered_params.sort(key=lambda x: x[0])
    cleaned_query = urlencode(filtered_params)

    # Preserve SPA hash routes (#/ or #!/) but discard bookmark anchors (#section1)
    fragment = parsed.fragment
    if fragment and not (fragment.startswith("/") or fragment.startswith("!/")):
        fragment = ""

    return urlunparse((scheme, netloc, path, parsed.params, cleaned_query, fragment))
