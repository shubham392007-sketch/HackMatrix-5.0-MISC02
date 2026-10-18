import hashlib
from typing import Dict, Any, List, Optional
import httpx
from bs4 import BeautifulSoup
import trafilatura
from urllib.parse import urlparse

from backend.app.core.exceptions import SkillPassportError, SSRFSecurityError
from backend.app.core.logging import get_logger
from backend.app.extraction.ssrf_validator import validate_url_safe, normalize_url
from backend.app.extraction.web_crawler import web_crawler, SafeHttpClient, RobotsChecker

logger = get_logger("extraction.website")

# Backward compatibility alias
SSRFViolationError = SSRFSecurityError


class WebsiteExtractor:
    """
    Website extraction service for SkillPassport Domain 1.
    Provides single-page extraction and delegates to ControlledWebCrawler for full portfolio crawls.
    """
    def __init__(self, timeout_seconds: float = 12.0, max_bytes: int = 8 * 1024 * 1024):
        self.timeout = timeout_seconds
        self.max_bytes = max_bytes
        self.safe_client = SafeHttpClient(timeout=timeout_seconds, max_bytes=max_bytes)
        self.robots_checker = RobotsChecker()

    async def preview_url(self, url: str) -> Dict[str, Any]:
        """
        Quickly validates URL, checks SSRF, and retrieves lightweight metadata
        (title, final URL, response status, content type, robots.txt crawl permission).
        """
        validation = validate_url_safe(url)
        cleaned_url = validation["cleaned_url"]
        hostname = validation["hostname"]

        async with httpx.AsyncClient(timeout=8.0) as client:
            resp, final_url = await self.safe_client.safe_fetch(client, cleaned_url)
            is_permitted = await self.robots_checker.is_allowed(client, final_url)

        title = ""
        content_type = resp.headers.get("content-type", "")
        if "html" in content_type:
            soup = BeautifulSoup(resp.text[:50000], "html.parser")
            if soup.title and soup.title.string:
                title = soup.title.string.strip()
            if not title:
                h1 = soup.find("h1")
                if h1:
                    title = h1.get_text().strip()

        if not title:
            title = urlparse(final_url).netloc

        return {
            "submitted_url": url,
            "final_url": final_url,
            "hostname": hostname,
            "status_code": resp.status_code,
            "content_type": content_type,
            "page_title": title,
            "is_accessible": resp.status_code < 400,
            "crawl_permitted": is_permitted,
        }

    async def extract_url(self, url: str) -> Dict[str, Any]:
        """
        Safely extracts single page content with SSRF protection and Trafilatura parsing.
        """
        validation = validate_url_safe(url)
        cleaned_url = validation["cleaned_url"] if isinstance(validation, dict) else str(validation)

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp, final_url = await self.safe_client.safe_fetch(client, cleaned_url)
            except Exception as e:
                logger.error(f"Failed to fetch {url}: {e}")
                raise SkillPassportError(
                    message=f"Failed to fetch webpage: {str(e)}",
                    code="FETCH_FAILED",
                )

        if resp.status_code >= 400:
            raise SkillPassportError(
                message=f"Target webpage returned HTTP {resp.status_code}",
                code="HTTP_ERROR",
                details={"status_code": resp.status_code},
            )

        html_content = resp.text
        if len(html_content) > self.max_bytes:
            html_content = html_content[: self.max_bytes]

        extracted_text = trafilatura.extract(
            html_content,
            include_links=False,
            include_images=False,
            output_format="txt",
        )

        soup = BeautifulSoup(html_content, "html.parser")
        title = soup.title.string.strip() if (soup.title and soup.title.string) else ""
        if not title:
            h1 = soup.find("h1")
            title = h1.get_text().strip() if h1 else urlparse(final_url).netloc

        headings = []
        for tag in soup.find_all(["h1", "h2", "h3"]):
            txt = tag.get_text().strip()
            if txt and len(txt) < 150:
                headings.append({"level": tag.name, "text": txt})

        discovered_links = []
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if href.startswith("http") and href not in discovered_links:
                discovered_links.append(href)
                if len(discovered_links) >= 25:
                    break

        if not extracted_text:
            for s in soup(["script", "style", "nav", "footer", "header", "aside"]):
                s.decompose()
            extracted_text = soup.get_text(separator="\n", strip=True)

        content_hash = hashlib.sha256(extracted_text.encode("utf-8")).hexdigest()
        excerpt = extracted_text[:450].replace("\n", " ")

        return {
            "submitted_url": url,
            "final_url": final_url,
            "page_title": title,
            "status_code": resp.status_code,
            "content_hash": content_hash,
            "headings": headings,
            "cleaned_content": extracted_text,
            "discovered_links": discovered_links,
            "excerpt": excerpt,
            "char_count": len(extracted_text),
            "word_count": len(extracted_text.split()),
        }

    async def crawl_portfolio(
        self,
        url: str,
        title: Optional[str] = None,
        max_depth: int = 2,
        max_pages: int = 10,
    ) -> Dict[str, Any]:
        """
        Executes comprehensive multi-page crawl using ControlledWebCrawler.
        """
        crawler = web_crawler
        crawler.max_depth = max_depth
        crawler.max_pages = max_pages
        return await crawler.crawl_site(seed_url=url, user_supplied_title=title)


website_extractor = WebsiteExtractor()
