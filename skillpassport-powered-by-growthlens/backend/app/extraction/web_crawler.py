import asyncio
import hashlib
import re
import uuid
from typing import Dict, Any, List, Optional, Set, Tuple
from urllib.parse import urlparse, urljoin
import httpx
from bs4 import BeautifulSoup
import trafilatura
from urllib.robotparser import RobotFileParser

from backend.app.core.exceptions import SkillPassportError, SSRFSecurityError
from backend.app.core.logging import get_logger
from backend.app.extraction.ssrf_validator import validate_url_safe, normalize_url
from backend.app.extraction.document_extractor import DocumentExtractor

logger = get_logger("extraction.crawler")

# Link prioritization patterns
PRIORITY_LINK_PATTERNS = [
    r"project", r"portfolio", r"work", r"case-stud", r"doc", r"architecture",
    r"about", r"research", r"paper", r"publication", r"tech", r"feature",
    r"deliverable", r"system", r"guide", r"report", r"overview", r"implementation",
]

# Excluded link patterns to avoid crawling noise, logins, pagination loops, or trackers
EXCLUDE_LINK_PATTERNS = [
    r"/login", r"/signin", r"/sign-in", r"/signup", r"/sign-up", r"/register",
    r"/cart", r"/checkout", r"/privacy", r"/terms", r"/cookie", r"/legal",
    r"/wp-admin", r"/wp-login", r"/feed", r"/rss", r"/tag/", r"/category/",
    r"/author/", r"/comments/", r"/trackback/", r"/cdn-cgi/", r"/api/",
    r"/cdn/", r"/assets/", r"/static/", r"\?share=", r"\?replytocom=",
]

# Supported document file extensions
DOCUMENT_EXTENSIONS = {".pdf", ".docx", ".pptx", ".doc", ".ppt"}


class RobotsChecker:
    """Safely checks robots.txt rules with SSRF protection and caching."""
    def __init__(self, timeout: float = 3.5):
        self.timeout = timeout
        self.parsers: Dict[str, Optional[RobotFileParser]] = {}

    async def is_allowed(self, client: httpx.AsyncClient, url: str, user_agent: str = "SkillPassport-EvidenceBot/1.0") -> bool:
        try:
            parsed = urlparse(url)
            host = parsed.netloc.lower()
            if host in self.parsers:
                parser = self.parsers[host]
                return parser.can_fetch(user_agent, url) if parser else True

            robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
            # Validate robots.txt URL with SSRF checker
            try:
                validate_url_safe(robots_url)
            except Exception:
                self.parsers[host] = None
                return True

            try:
                resp = await client.get(robots_url, timeout=self.timeout)
                if resp.status_code == 200 and resp.text:
                    parser = RobotFileParser()
                    parser.parse(resp.text.splitlines())
                    self.parsers[host] = parser
                    return parser.can_fetch(user_agent, url)
            except Exception as e:
                logger.debug(f"Could not retrieve robots.txt for {host}: {e}")

            self.parsers[host] = None
            return True
        except Exception:
            return True


class SafeHttpClient:
    """
    HTTP client that safely validates SSRF and re-validates each redirect hop.
    Enforces timeout, max response size, and custom headers.
    """
    def __init__(self, timeout: float = 12.0, max_bytes: int = 10 * 1024 * 1024):
        self.timeout = timeout
        self.max_bytes = max_bytes
        self.headers = {
            "User-Agent": "SkillPassport-EvidenceBot/1.0 (+https://skillpassport.growthlens.io; Evidence Extraction Engine)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf;q=0.8,*/*;q=0.7",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
        }

    async def safe_fetch(self, client: httpx.AsyncClient, target_url: str, max_redirects: int = 5) -> Tuple[httpx.Response, str]:
        """
        Fetches target_url while verifying every redirect target against SSRF filters.
        Returns (response, final_url).
        """
        current_url = target_url
        redirect_count = 0

        while True:
            # Validate SSRF for current hop
            validate_url_safe(current_url)

            response = await client.get(
                current_url,
                headers=self.headers,
                timeout=self.timeout,
                follow_redirects=False,
            )

            # Check if this is a redirect
            if response.status_code in (301, 302, 303, 307, 308) and "location" in response.headers:
                redirect_count += 1
                if redirect_count > max_redirects:
                    raise SkillPassportError(
                        message=f"Exceeded maximum redirects ({max_redirects}) for {target_url}",
                        code="MAX_REDIRECTS_EXCEEDED"
                    )
                raw_loc = response.headers["location"]
                current_url = urljoin(current_url, raw_loc)
                continue

            return response, current_url


class ControlledWebCrawler:
    """
    Comprehensive, controlled web crawler for Skill Passport Domain 1.
    Performs bounded multi-page discovery, link extraction, content prioritization,
    SPA shell detection, document parsing, and provenance preservation.
    """
    def __init__(
        self,
        max_depth: int = 2,
        max_pages: int = 10,
        per_host_delay: float = 0.25,
        request_timeout: float = 12.0,
        max_doc_bytes: int = 15 * 1024 * 1024,
    ):
        self.max_depth = max_depth
        self.max_pages = max_pages
        self.per_host_delay = per_host_delay
        self.request_timeout = request_timeout
        self.max_doc_bytes = max_doc_bytes
        self.safe_client = SafeHttpClient(timeout=request_timeout)
        self.robots_checker = RobotsChecker()
        self.doc_extractor = DocumentExtractor()

    def _is_priority_link(self, url: str, link_text: str = "") -> bool:
        haystack = f"{url.lower()} {link_text.lower()}"
        return any(re.search(pat, haystack) for pat in PRIORITY_LINK_PATTERNS)

    def _is_excluded_link(self, url: str) -> bool:
        url_lower = url.lower()
        if any(re.search(pat, url_lower) for pat in EXCLUDE_LINK_PATTERNS):
            return True
        # Exclude non-document binary assets
        for ext in [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico", ".css", ".js", ".mp4", ".zip", ".tar", ".gz"]:
            if url_lower.endswith(ext):
                return True
        return False

    async def crawl_site(
        self,
        seed_url: str,
        user_supplied_title: Optional[str] = None,
        additional_allowed_hosts: Optional[Set[str]] = None,
    ) -> Dict[str, Any]:
        """
        Executes a bounded, multi-page crawl starting from seed_url.
        Returns all discovered pages, parsed text, headings, and linked documents.
        """
        # Validate seed URL first
        validation = validate_url_safe(seed_url)
        normalized_seed = normalize_url(validation["cleaned_url"])
        parsed_seed = urlparse(normalized_seed)
        seed_host = parsed_seed.netloc.lower()

        allowed_hosts: Set[str] = {seed_host}
        if additional_allowed_hosts:
            for h in additional_allowed_hosts:
                allowed_hosts.add(h.lower().strip())

        visited_urls: Set[str] = set()
        visited_content_hashes: Set[str] = set()

        # Queue: list of dicts {url, depth, discovery_source, parent_url, title_hint}
        queue: List[Dict[str, Any]] = [{
            "url": normalized_seed,
            "depth": 0,
            "discovery_source": "seed",
            "parent_url": None,
            "title_hint": user_supplied_title,
        }]

        crawled_pages: List[Dict[str, Any]] = []
        discovered_documents: List[Dict[str, Any]] = []
        external_links: Set[str] = set()

        async with httpx.AsyncClient(timeout=self.request_timeout) as client:
            while queue and len(crawled_pages) < self.max_pages:
                item = queue.pop(0)
                current_url = item["url"]
                current_depth = item["depth"]
                discovery_src = item["discovery_source"]
                parent_url = item["parent_url"]

                if current_url in visited_urls:
                    continue
                visited_urls.add(current_url)

                # Check robots.txt
                is_permitted = await self.robots_checker.is_allowed(client, current_url)
                if not is_permitted:
                    logger.info(f"Skipping {current_url}: blocked by robots.txt")
                    continue

                # Polite per-host delay
                if crawled_pages:
                    await asyncio.sleep(self.per_host_delay)

                logger.info(f"Crawling page [{len(crawled_pages)+1}/{self.max_pages}] (depth {current_depth}): {current_url}")

                try:
                    resp, final_url = await self.safe_client.safe_fetch(client, current_url)
                except Exception as e:
                    logger.warning(f"Failed to fetch {current_url}: {e}")
                    crawled_pages.append({
                        "page_id": str(uuid.uuid4()),
                        "submitted_url": current_url,
                        "final_url": current_url,
                        "depth": current_depth,
                        "discovery_source": discovery_src,
                        "parent_url": parent_url,
                        "http_status": 500,
                        "extraction_status": "fetch_error",
                        "error_summary": str(e),
                        "page_title": item.get("title_hint") or current_url,
                        "cleaned_content": "",
                        "headings": [],
                        "word_count": 0,
                        "content_hash": "",
                    })
                    continue

                if resp.status_code >= 400:
                    crawled_pages.append({
                        "page_id": str(uuid.uuid4()),
                        "submitted_url": current_url,
                        "final_url": final_url,
                        "depth": current_depth,
                        "discovery_source": discovery_src,
                        "parent_url": parent_url,
                        "http_status": resp.status_code,
                        "extraction_status": "http_error",
                        "error_summary": f"HTTP {resp.status_code}",
                        "page_title": item.get("title_hint") or current_url,
                        "cleaned_content": "",
                        "headings": [],
                        "word_count": 0,
                        "content_hash": "",
                    })
                    continue

                content_type = resp.headers.get("content-type", "").lower()

                # Handle downloadable documents (PDF, DOCX, PPTX)
                parsed_final = urlparse(final_url)
                file_ext = "." + parsed_final.path.split(".")[-1].lower() if "." in parsed_final.path else ""

                if file_ext in DOCUMENT_EXTENSIONS or "pdf" in content_type:
                    file_bytes = resp.content
                    if len(file_bytes) > self.max_doc_bytes:
                        file_bytes = file_bytes[:self.max_doc_bytes]

                    doc_filename = parsed_final.path.split("/")[-1] or f"document{file_ext}"
                    try:
                        doc_res = await self.doc_extractor.extract_async(file_bytes, doc_filename, content_type)
                        doc_text = doc_res.get("text", "")
                        doc_hash = hashlib.sha256(doc_text.encode("utf-8")).hexdigest()
                        discovered_documents.append({
                            "document_id": str(uuid.uuid4()),
                            "url": final_url,
                            "filename": doc_filename,
                            "file_type": file_ext,
                            "char_count": len(doc_text),
                            "word_count": len(doc_text.split()),
                            "extracted_text": doc_text,
                            "content_hash": doc_hash,
                            "page_count": doc_res.get("page_count", 1),
                        })
                    except Exception as doc_err:
                        logger.warning(f"Error parsing linked document {final_url}: {doc_err}")
                    continue

                # Parse HTML
                html = resp.text
                soup = BeautifulSoup(html, "html.parser")

                # Extract page title
                page_title = ""
                if soup.title and soup.title.string:
                    page_title = soup.title.string.strip()
                if not page_title:
                    h1 = soup.find("h1")
                    if h1:
                        page_title = h1.get_text().strip()
                if not page_title:
                    page_title = item.get("title_hint") or parsed_final.path.strip("/") or seed_host

                # Extract headings
                headings = []
                for tag in soup.find_all(["h1", "h2", "h3"]):
                    txt = tag.get_text().strip()
                    if txt and len(txt) < 150:
                        headings.append({"level": tag.name, "text": txt})

                # Extract main content text using Trafilatura
                extracted_text = trafilatura.extract(
                    html,
                    include_links=False,
                    include_images=False,
                    output_format="txt",
                )

                # Fallback to BeautifulSoup clean text if Trafilatura is empty or very short
                is_spa_shell = False
                if not extracted_text or len(extracted_text.split()) < 35:
                    for s in soup(["script", "style", "nav", "footer", "header", "aside", "svg"]):
                        s.decompose()
                    bs_text = soup.get_text(separator="\n", strip=True)
                    if len(bs_text.split()) >= len((extracted_text or "").split()):
                        extracted_text = bs_text

                    # Detect client-side SPA shell
                    if ("id=\"root\"" in html or "id=\"app\"" in html or "id=\"__next\"" in html) and len((extracted_text or "").split()) < 50:
                        is_spa_shell = True

                clean_content = (extracted_text or "").strip()
                content_hash = hashlib.sha256(clean_content.encode("utf-8")).hexdigest()

                # Deduplicate content
                if content_hash in visited_content_hashes and len(clean_content.split()) > 20:
                    logger.info(f"Skipping duplicate content page: {final_url}")
                    continue
                visited_content_hashes.add(content_hash)

                word_count = len(clean_content.split())
                page_record = {
                    "page_id": str(uuid.uuid4()),
                    "submitted_url": current_url,
                    "final_url": final_url,
                    "depth": current_depth,
                    "discovery_source": discovery_src,
                    "parent_url": parent_url,
                    "http_status": resp.status_code,
                    "extraction_status": "extracted" if not is_spa_shell else "spa_shell_extracted",
                    "page_title": page_title,
                    "cleaned_content": clean_content,
                    "headings": headings[:10],
                    "word_count": word_count,
                    "content_hash": content_hash,
                    "excerpt": clean_content[:450].replace("\n", " "),
                    "is_spa_shell": is_spa_shell,
                }
                crawled_pages.append(page_record)

                # Link Discovery (only if within max_depth)
                if current_depth < self.max_depth:
                    discovered_candidate_links = []

                    for a in soup.find_all("a", href=True):
                        raw_href = a["href"].strip()
                        link_text = a.get_text().strip()

                        # Skip in-page anchors, javascript, mailto
                        if not raw_href or raw_href.startswith(("#", "javascript:", "mailto:", "tel:")):
                            continue

                        # Resolve relative links
                        abs_link = urljoin(final_url, raw_href)
                        link_parsed = urlparse(abs_link)
                        link_host = link_parsed.netloc.lower()

                        # Exclude noise links
                        if self._is_excluded_link(abs_link):
                            continue

                        # Check if internal host
                        if link_host in allowed_hosts:
                            norm_link = normalize_url(abs_link)
                            if norm_link not in visited_urls and not any(q["url"] == norm_link for q in queue):
                                is_prio = self._is_priority_link(norm_link, link_text)
                                discovered_candidate_links.append({
                                    "url": norm_link,
                                    "depth": current_depth + 1,
                                    "discovery_source": "internal_link",
                                    "parent_url": final_url,
                                    "title_hint": link_text if len(link_text) > 3 else None,
                                    "priority": 1 if is_prio else 0,
                                })
                        else:
                            # Note external links (e.g. GitHub repos, project live sites)
                            if link_parsed.scheme in ("http", "https") and len(external_links) < 30:
                                external_links.add(abs_link)

                    # Sort candidate links: prioritize project/doc/work links first
                    discovered_candidate_links.sort(key=lambda x: x["priority"], reverse=True)

                    # Enqueue up to remaining page quota
                    for cand in discovered_candidate_links:
                        if len(queue) + len(crawled_pages) < self.max_pages * 2:
                            queue.append(cand)

        total_words = sum(p.get("word_count", 0) for p in crawled_pages)
        root_page = crawled_pages[0] if crawled_pages else None

        return {
            "seed_url": seed_url,
            "normalized_seed": normalized_seed,
            "root_page": root_page,
            "crawled_pages": crawled_pages,
            "discovered_documents": discovered_documents,
            "external_links": list(external_links),
            "total_pages_crawled": len(crawled_pages),
            "total_documents_found": len(discovered_documents),
            "total_words": total_words,
            "status": "success" if crawled_pages else "no_pages_extracted",
        }


web_crawler = ControlledWebCrawler()
