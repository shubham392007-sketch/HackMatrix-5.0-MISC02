import re

def update_api_career():
    path = "backend/app/api/career.py"
    with open(path, "r", encoding="utf-8") as f:
        text = f.read().replace("\r\n", "\n")

    # 1. Add Batch request models near ParseJobUrlRequest
    batch_models = '''class BatchParseJobItem(BaseModel):
    item_id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    input_type: str = Field("text", description="'text' or 'url'")
    url: Optional[str] = None
    raw_text: Optional[str] = None
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    seniority: Optional[str] = "Mid Level"
    context: Optional[str] = None


class BatchParseJobRequest(BaseModel):
    items: List[BatchParseJobItem] = Field(..., max_length=50)

'''
    if "class BatchParseJobItem" not in text:
        text = text.replace("class SaveCustomRoleRequest(BaseModel):", batch_models + "class SaveCustomRoleRequest(BaseModel):")

    # 2. Update parse_job_description_from_url with authwall checks and honest extraction
    old_func = '''@router.post("/parse-jd/url")
async def parse_job_description_from_url(
    payload: ParseJobUrlRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    SSRF-safe scraper and parser for public job posting URLs.
    Validates against private/loopback/metadata addresses, fetches HTML with strict timeout,
    strips markup, and feeds raw text to JobDescriptionParserService.
    """
    target_url = payload.url.strip() if payload.url else ""
    if not target_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid public URL is required.",
        )

    # 1. Enforce strict SSRF validation
    try:
        validation = validate_url_safe(target_url)
        cleaned_url = validation["cleaned_url"]
    except SSRFSecurityError as e:
        reason = e.details.get("reason", e.message)
        logger.warning(f"Blocked SSRF attempt for URL {target_url}: {reason}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Security violation: Access to prohibited host or IP address blocked ({reason})",
        )
    except Exception as e:
        logger.warning(f"URL validation failed for {target_url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid URL structure: {str(e)}",
        )

    # 2. Asynchronously fetch public page with strict timeout and redirect restrictions
    try:
        headers = {
            "User-Agent": "SkillPassport-JobScraper/1.0 (Mozilla/5.0; compatible; CareerIntelligence/2026.1)",
            "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        }
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True, max_redirects=3) as client:
            resp = await client.get(cleaned_url, headers=headers)
            if resp.status_code >= 400:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to fetch content from URL (HTTP status code {resp.status_code})",
                )
            html_content = resp.text
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Connection to target URL timed out after 10 seconds.",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"HTTP request failed for {cleaned_url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not retrieve webpage content: {str(e)}",
        )

    # 3. Strip HTML markup, scripts, and navigation
    try:
        soup = BeautifulSoup(html_content, "html.parser")
        for tag in soup(["script", "style", "noscript", "header", "footer", "nav", "svg", "button", "iframe"]):
            tag.decompose()

        inferred_title = payload.job_title
        if not inferred_title:
            if soup.title and soup.title.string:
                title_cand = soup.title.string.strip()
                inferred_title = re.split(r"[-–|:]", title_cand)[0].strip()
            elif soup.find("h1"):
                inferred_title = soup.find("h1").get_text().strip()

        text = soup.get_text(separator="\\n")
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        cleaned_text = "\\n".join(lines)
    except Exception as e:
        logger.error(f"HTML parsing failed for {cleaned_url}: {e}")
        cleaned_text = re.sub(r"<[^>]+>", " ", html_content)

    if len(cleaned_text) < 40:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The target URL does not contain enough extractable job description text (minimum 40 characters required).",
        )

    # 4. Feed clean extracted text to parser_service
    parsed = parser_service.parse_job_text(
        db=db,
        raw_text=cleaned_text,
        title=inferred_title or payload.job_title,
        company=payload.company_name,
        seniority=payload.seniority,
        context=payload.context or "Discovered via URL",
        source_url=cleaned_url,
    )
    return parsed'''

    new_func = '''@router.post("/parse-jd/url")
async def parse_job_description_from_url(
    payload: ParseJobUrlRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    SSRF-safe scraper and parser for public job posting URLs.
    Validates against private/loopback/metadata addresses, detects authentication barriers honestly,
    fetches HTML with strict timeout, strips markup, and feeds raw text to JobDescriptionParserService.
    """
    target_url = payload.url.strip() if payload.url else ""
    if not target_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid public URL is required.",
        )

    # 1. Enforce strict SSRF validation
    try:
        validation = validate_url_safe(target_url)
        cleaned_url = validation["cleaned_url"]
    except SSRFSecurityError as e:
        reason = e.details.get("reason", e.message)
        logger.warning(f"Blocked SSRF attempt for URL {target_url}: {reason}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Security violation: Access to prohibited host or IP address blocked ({reason})",
        )
    except Exception as e:
        logger.warning(f"URL validation failed for {target_url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid URL structure: {str(e)}",
        )

    # 2. Domain-level auth wall detection (e.g. LinkedIn, Indeed login barriers)
    domain_lower = urlparse(cleaned_url).netloc.lower()
    if any(d in domain_lower for d in ["linkedin.com", "indeed.com", "glassdoor.com", "ziprecruiter.com"]):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"The job posting host ({domain_lower}) enforces an authentication wall or anti-scraping policy. "
                "Automated ingestion cannot bypass login barriers. "
                "Please copy the job posting text and use the 'Paste Text' tab to parse it."
            ),
        )

    # 3. Asynchronously fetch public page with strict timeout and redirect restrictions
    try:
        headers = {
            "User-Agent": "SkillPassport-JobScraper/1.0 (Mozilla/5.0; compatible; CareerIntelligence/2026.1)",
            "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        }
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True, max_redirects=3) as client:
            resp = await client.get(cleaned_url, headers=headers)

            final_url_lower = str(resp.url).lower()
            if any(w in final_url_lower for w in ["authwall", "login", "checkpoint", "challenge", "signin"]):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="The URL redirected to an authentication wall or login challenge. Please copy the job description text and use the 'Paste Text' tab.",
                )
            if resp.status_code in (401, 403, 999):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Access blocked by the host (HTTP {resp.status_code}). Please copy the job description text and use the 'Paste Text' tab.",
                )
            if resp.status_code >= 400:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to fetch content from URL (HTTP status code {resp.status_code})",
                )
            html_content = resp.text

            if any(w in html_content.lower() for w in ["authwall", "join linkedin to view", "sign in to view this job", "please enable javascript and cookies"]):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="The page returned an authentication wall or challenge. Please copy the job description text and use the 'Paste Text' tab.",
                )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Connection to target URL timed out after 10 seconds.",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"HTTP request failed for {cleaned_url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not retrieve webpage content: {str(e)}",
        )

    # 4. Strip HTML markup, scripts, and navigation
    try:
        soup = BeautifulSoup(html_content, "html.parser")
        for tag in soup(["script", "style", "noscript", "header", "footer", "nav", "svg", "button", "iframe"]):
            tag.decompose()

        inferred_title = payload.job_title
        inferred_company = payload.company_name

        if not inferred_title:
            og_title = soup.find("meta", property="og:title")
            if og_title and og_title.get("content"):
                cand = og_title.get("content").strip()
                inferred_title = re.split(r"[-–|:]", cand)[0].strip()
            elif soup.title and soup.title.string:
                cand = soup.title.string.strip()
                inferred_title = re.split(r"[-–|:]", cand)[0].strip()
            elif soup.find("h1"):
                inferred_title = soup.find("h1").get_text().strip()

            if inferred_title and any(g in inferred_title.lower() for g in ["careers", "job search", "working at", "home", "welcome", "application"]):
                inferred_title = None

        if not inferred_company:
            og_site = soup.find("meta", property="og:site_name")
            if og_site and og_site.get("content"):
                inferred_company = og_site.get("content").strip()
            else:
                parts = domain_lower.replace("www.", "").split(".")
                if parts and len(parts[0]) > 2:
                    inferred_company = parts[0].capitalize()

        text = soup.get_text(separator="\\n")
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        cleaned_text = "\\n".join(lines)
    except Exception as e:
        logger.error(f"HTML parsing failed for {cleaned_url}: {e}")
        cleaned_text = re.sub(r"<[^>]+>", " ", html_content)

    if len(cleaned_text) < 40:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The target URL does not contain enough extractable job description text (minimum 40 characters required).",
        )

    # 5. Feed clean extracted text to parser_service
    parsed = parser_service.parse_job_text(
        db=db,
        raw_text=cleaned_text,
        title=inferred_title,
        company=inferred_company,
        seniority=payload.seniority,
        context=payload.context or f"Discovered via URL ({domain_lower})",
        source_url=cleaned_url,
    )
    return parsed


@router.post("/parse-jd/batch")
async def batch_parse_job_descriptions(
    payload: BatchParseJobRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Parses a batch of up to 50 jobs with bounded concurrency (5 concurrent workers).
    Returns per-item results and aggregate success/failure statistics.
    """
    semaphore = asyncio.Semaphore(5)

    async def process_item(item: BatchParseJobItem) -> Dict[str, Any]:
        async with semaphore:
            try:
                if item.input_type == "url":
                    if not item.url or not item.url.strip():
                        return {"item_id": item.item_id, "status": "error", "error": "URL is missing"}
                    sub_req = ParseJobUrlRequest(
                        url=item.url.strip(),
                        job_title=item.job_title,
                        company_name=item.company_name,
                        seniority=item.seniority or "Mid Level",
                        context=item.context,
                    )
                    res = await parse_job_description_from_url(payload=sub_req, db=db, user=user)
                    return {"item_id": item.item_id, "status": "success", "data": res}
                else:
                    if not item.raw_text or len(item.raw_text.strip()) < 40:
                        return {"item_id": item.item_id, "status": "error", "error": "Text too short (< 40 characters)"}
                    res = parser_service.parse_job_text(
                        db=db,
                        raw_text=item.raw_text.strip(),
                        title=item.job_title,
                        company=item.company_name,
                        seniority=item.seniority or "Mid Level",
                        context=item.context,
                    )
                    return {"item_id": item.item_id, "status": "success", "data": res}
            except HTTPException as he:
                return {"item_id": item.item_id, "status": "error", "error": str(he.detail)}
            except Exception as e:
                return {"item_id": item.item_id, "status": "error", "error": str(e)}

    tasks = [process_item(item) for item in payload.items]
    results = await asyncio.gather(*tasks)

    success_count = sum(1 for r in results if r["status"] == "success")
    failed_count = sum(1 for r in results if r["status"] == "error")

    return {
        "total_requested": len(payload.items),
        "successful_count": success_count,
        "failed_count": failed_count,
        "results": results,
    }'''

    text = text.replace(old_func, new_func)

    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print("Updated api/career.py")

if __name__ == "__main__":
    update_api_career()
