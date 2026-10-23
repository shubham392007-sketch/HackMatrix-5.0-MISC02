import uuid
import re
import hashlib
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.core.config import get_settings
from backend.app.core.logging import get_logger
from backend.app.models.career import JobPostingRecord, JobSearchCacheRecord
from backend.app.models.taxonomy import CompetencyTaxonomy, EvidenceCompetencyMapping
from backend.app.models.ai_governance import VerificationDecision
from backend.app.career.providers.base import (
    BaseJobSearchAdapter,
    JobSearchResult,
    ProviderException,
    ProviderErrorType,
    generate_canonical_dedupe_key,
)
from backend.app.career.providers.jsearch import JSearchAdapter
from backend.app.career.providers.theirstack import TheirStackAdapter
from backend.app.career.providers.fantastic_jobs import FantasticJobsAdapter

logger = get_logger("career.orchestrator")


class JobSearchOrchestrator:
    """
    Cost-aware job discovery orchestrator.
    Minimizes API usage via request coalescing, strict single-provider routing,
    multi-tier deduplication, and database caching.
    """

    def __init__(self):
        self.settings = get_settings()
        self.adapters: Dict[str, BaseJobSearchAdapter] = {
            "jsearch": JSearchAdapter(),
            "theirstack": TheirStackAdapter(),
            "fantastic_jobs": FantasticJobsAdapter(),
        }
        # In-flight request coalescing to prevent duplicate concurrent external calls
        self._inflight_requests: Dict[str, asyncio.Future] = {}
        self._inflight_lock = asyncio.Lock()

    def get_providers_status(self) -> Dict[str, Any]:
        """
        Returns configuration status for all providers without exposing secrets.
        """
        statuses = [adapter.get_provider_status() for adapter in self.adapters.values()]
        any_configured = any(s["is_configured"] for s in statuses)
        return {
            "any_configured": any_configured,
            "primary_provider": self.settings.job_search_primary_provider,
            "fallback_provider": self.settings.job_search_fallback_provider,
            "max_results_per_search": self.settings.job_search_max_results,
            "cache_ttl_minutes": self.settings.job_search_cache_ttl_minutes,
            "fallback_enabled": self.settings.job_search_enable_fallback,
            "providers": statuses,
        }

    def _get_provider_cascade(self) -> List[BaseJobSearchAdapter]:
        """
        Returns configured providers in order of execution cascade:
        1. primary provider (e.g. theirstack)
        2. fallback provider (e.g. jsearch)
        3. any remaining configured providers (e.g. fantastic_jobs)
        """
        cascade: List[BaseJobSearchAdapter] = []
        seen = set()

        primary_name = (self.settings.job_search_primary_provider or "theirstack").lower()
        primary = self.adapters.get(primary_name)
        if primary and primary.is_configured():
            cascade.append(primary)
            seen.add(primary_name)

        if self.settings.job_search_enable_fallback:
            fallback_name = (self.settings.job_search_fallback_provider or "theirstack").lower()
            fallback = self.adapters.get(fallback_name)
            if fallback and fallback.is_configured() and fallback_name not in seen:
                cascade.append(fallback)
                seen.add(fallback_name)

        return cascade

    def _select_provider(self) -> Tuple[Optional[BaseJobSearchAdapter], Optional[BaseJobSearchAdapter]]:
        """
        Selects primary and eligible fallback provider for legacy compatibility.
        """
        cascade = self._get_provider_cascade()
        primary = cascade[0] if cascade else None
        fallback = cascade[1] if len(cascade) > 1 else None
        return primary, fallback

    def extract_influencing_skills_for_user(self, db: Session, user_id: uuid.UUID) -> List[str]:
        """
        Extracts top 3 to 6 high-confidence, verified/candidate skills for Mode A.
        Never sends raw private evidence content or unbounded histories.
        """
        mappings = (
            db.query(EvidenceCompetencyMapping, CompetencyTaxonomy)
            .join(CompetencyTaxonomy, EvidenceCompetencyMapping.competency_id == CompetencyTaxonomy.id)
            .filter(
                EvidenceCompetencyMapping.owner_user_id == user_id,
                EvidenceCompetencyMapping.status.in_(["verified", "reviewed", "candidate"]),
            )
            .all()
        )

        # Disallow rejected skills
        decisions = (
            db.query(VerificationDecision)
            .filter(
                VerificationDecision.owner_user_id == user_id,
                VerificationDecision.verification_state == "rejected",
            )
            .all()
        )
        rejected_comp_ids = {d.competency_id for d in decisions if d.competency_id}

        skills_scored: Dict[str, float] = {}
        for m, comp in mappings:
            if comp.id in rejected_comp_ids:
                continue
            
            # Base weight: verified > reviewed > candidate
            status_weight = 1.0 if m.status == "verified" else (0.8 if m.status == "reviewed" else 0.5)
            score = (m.relevance_score or 0.8) * status_weight
            canonical = comp.canonical_name.strip()
            skills_scored[canonical] = max(skills_scored.get(canonical, 0.0), score)

        # Sort descending and take top 4
        sorted_skills = sorted(skills_scored.items(), key=lambda x: x[1], reverse=True)
        return [name for name, _ in sorted_skills[:4]]

    def construct_mode_a_query(self, skills: List[str]) -> str:
        """
        Constructs a compact high-recall job title search string from verified skills.
        Avoids concatenating verbose taxonomy phrases into a broken multi-sentence query.
        """
        if not skills:
            return "Software Engineer"

        combined = " ".join(skills).lower()

        if any(k in combined for k in ["machine learning", "ai", "artificial intelligence", "deep learning"]):
            return "AI Machine Learning Engineer"
        if any(k in combined for k in ["frontend", "react", "typescript", "ui", "javascript"]):
            return "Frontend Engineer"
        if any(k in combined for k in ["python", "django", "fastapi"]):
            return "Python Developer"
        if any(k in combined for k in ["devops", "cloud", "aws", "docker", "kubernetes"]):
            return "DevOps Cloud Engineer"
        if any(k in combined for k in ["data", "sql", "postgresql", "pipeline"]):
            return "Data Engineer"
        if any(k in combined for k in ["security", "devsecops", "auth"]):
            return "Security Engineer"

        # Extract shortest significant noun
        first_skill = skills[0].split("&")[0].strip()
        first_word = first_skill.split()[0]
        if len(first_word) > 2:
            return f"{first_word} Engineer"

        return "Software Engineer"

    def _generate_cache_key(self, mode: str, query: str, location: Optional[str], remote_only: bool) -> str:
        norm = f"{mode.lower()}|{query.strip().lower()}|{(location or '').strip().lower()}|{remote_only}"
        return hashlib.sha256(norm.encode("utf-8")).hexdigest()

    async def discover_jobs(
        self,
        db: Session,
        user_id: uuid.UUID,
        mode: str,  # "mode_a_skills" or "mode_b_role"
        query: Optional[str] = None,
        location: Optional[str] = None,
        remote_only: bool = False,
        limit: int = 10,
    ) -> Dict[str, Any]:
        """
        Main entry point for cost-aware job discovery.
        """
        influencing_skills: List[str] = []
        bounded_limit = min(max(1, limit), self.settings.job_search_max_results, 10)

        # 1. Determine effective search query
        if mode == "mode_a_skills":
            influencing_skills = self.extract_influencing_skills_for_user(db, user_id)
            if query and query.strip():
                # Allow user-selected skills from frontend to guide query
                search_query = query.strip()
            elif not influencing_skills:
                search_query = "Software Engineer"
            else:
                search_query = self.construct_mode_a_query(influencing_skills)
        else:
            search_query = (query or "").strip()
            if not search_query:
                raise ValueError("Target role title is required for Mode B search.")

        cache_key = self._generate_cache_key(mode, search_query, location, remote_only)

        # 2. Check Database Cache
        now = datetime.now(timezone.utc)
        cached_entry = None
        try:
            cached_entry = db.query(JobSearchCacheRecord).filter(JobSearchCacheRecord.cache_key == cache_key).first()
        except Exception as e:
            logger.warning(f"Database cache query bypassed: {e}")
        if cached_entry and cached_entry.expires_at > now and cached_entry.result_job_ids:
            logger.info(f"Cache hit for search '{search_query}'. Serving {cached_entry.result_count} cached jobs.")
            job_uuids = [uuid.UUID(jid) for jid in cached_entry.result_job_ids if jid]
            postings = db.query(JobPostingRecord).filter(JobPostingRecord.id.in_(job_uuids)).all()
            
            job_results = [
                JobSearchResult(
                    id=f"job-{p.id}",
                    provider=p.provider,
                    provider_job_id=p.provider_job_id,
                    canonical_dedupe_key=p.canonical_dedupe_key,
                    title=p.title,
                    company_name=p.company_name,
                    company_domain=p.company_domain,
                    location_text=p.location_text,
                    remote_status=p.remote_status,
                    employment_type=p.employment_type,
                    seniority=p.seniority,
                    salary_min=p.salary_min,
                    salary_max=p.salary_max,
                    salary_currency=p.salary_currency,
                    salary_period=p.salary_period,
                    description=p.description,
                    job_url=p.job_url,
                    apply_url=p.apply_url,
                    posted_at=p.posted_at.isoformat() if p.posted_at else None,
                    retrieved_at=p.retrieved_at.isoformat(),
                    raw_metadata=p.raw_source_metadata or {},
                    extracted_requirements=p.extracted_requirements or [],
                )
                for p in postings
            ]

            return {
                "status": "success",
                "mode": mode,
                "query": search_query,
                "location": location,
                "remote_only": remote_only,
                "influencing_skills": cached_entry.influencing_skills or influencing_skills,
                "provider_used": cached_entry.provider_used,
                "from_cache": True,
                "is_stale": False,
                "total_results": len(job_results),
                "total_returned": len(job_results),
                "retrieved_at": cached_entry.created_at.isoformat(),
                "jobs": [j.model_dump() for j in job_results],
            }

        # 3. In-flight request coalescing (prevent duplicate simultaneous provider calls)
        async with self._inflight_lock:
            if cache_key in self._inflight_requests:
                logger.info(f"Coalescing in-flight request for search '{search_query}'")
                future = self._inflight_requests[cache_key]
            else:
                loop = asyncio.get_running_loop()
                future = loop.create_future()
                self._inflight_requests[cache_key] = future

        # If another task created the future, await it
        if future.done():
            return future.result()

        cascade = self._get_provider_cascade()

        # If NO providers are configured, return truthful configuration notice
        if not cascade:
            logger.warning("No job search providers configured.")
            return {
                "mode": mode,
                "query": search_query,
                "location": location,
                "remote_only": remote_only,
                "influencing_skills": influencing_skills,
                "provider_used": "none",
                "from_cache": False,
                "is_stale": False,
                "total_results": 0,
                "retrieved_at": now.isoformat(),
                "status": "not_configured",
                "message": (
                    "Job discovery requires an external provider key. "
                    "Please configure THEIRSTACK_API_KEY, JSEARCH_API_KEY, or FANTASTIC_JOBS_API_KEY in backend/.env."
                ),
                "jobs": [],
            }

        # Execute search with controlled cascade (1st -> 2nd -> 3rd)
        raw_results: List[JobSearchResult] = []
        provider_used_name = cascade[0].get_provider_name()
        last_error: Optional[Exception] = None
        executed_successfully = False

        for provider in cascade:
            curr_name = provider.get_provider_name()
            try:
                logger.info(f"Attempting job search via provider '{curr_name}' with query='{search_query}'...")
                res = await provider.search_jobs(
                    query=search_query,
                    location=location,
                    remote_only=remote_only,
                    limit=bounded_limit,
                )
                executed_successfully = True
                raw_results = res
                provider_used_name = curr_name
                logger.info(f"Provider '{curr_name}' returned {len(res)} jobs.")
                # Primary provider executed successfully (HTTP 200).
                # Do not cascade to unsubscribed secondary providers.
                break
            except ProviderException as p_err:
                last_error = p_err
                logger.warning(f"Provider '{curr_name}' failed with {p_err.error_type}: {p_err.message}. Trying next fallback...")
            except Exception as p_err:
                last_error = p_err
                logger.warning(f"Provider '{curr_name}' failed: {p_err}. Trying next fallback...")

        if not executed_successfully and last_error:
            logger.error(f"All configured job providers in cascade failed. Last error: {last_error}")
            if isinstance(last_error, ProviderException):
                raise last_error
            raise RuntimeError(f"Job search failed across configured providers: {last_error}")

        # 4. Deduplicate and persist in Database
        persisted_job_ids: List[str] = []
        deduped_results: List[JobSearchResult] = []
        seen_keys = set()

        for res in raw_results:
            if res.canonical_dedupe_key in seen_keys:
                continue
            seen_keys.add(res.canonical_dedupe_key)
            deduped_results.append(res)

            # Check if job already exists in DB
            existing_post = db.query(JobPostingRecord).filter(
                JobPostingRecord.canonical_dedupe_key == res.canonical_dedupe_key
            ).first()

            if not existing_post:
                new_post = JobPostingRecord(
                    provider=res.provider,
                    provider_job_id=res.provider_job_id,
                    canonical_dedupe_key=res.canonical_dedupe_key,
                    title=res.title,
                    company_name=res.company_name,
                    company_domain=res.company_domain,
                    location_text=res.location_text,
                    remote_status=res.remote_status,
                    employment_type=res.employment_type,
                    seniority=res.seniority,
                    salary_min=res.salary_min,
                    salary_max=res.salary_max,
                    salary_currency=res.salary_currency,
                    salary_period=res.salary_period,
                    description=res.description,
                    job_url=res.job_url,
                    apply_url=res.apply_url,
                    posted_at=datetime.fromisoformat(res.posted_at) if res.posted_at else None,
                    retrieved_at=datetime.fromisoformat(res.retrieved_at),
                    raw_source_metadata=res.raw_metadata,
                    extracted_requirements=res.extracted_requirements,
                    content_hash=hashlib.sha256((res.description or res.title).encode()).hexdigest(),
                )
                db.add(new_post)
                db.flush()
                persisted_job_ids.append(str(new_post.id))
            else:
                existing_post.last_seen_at = now
                persisted_job_ids.append(str(existing_post.id))

        # 5. Save Search Cache
        ttl_minutes = self.settings.job_search_cache_ttl_minutes or 120
        expires_at = now + timedelta(minutes=ttl_minutes)

        if cached_entry:
            cached_entry.result_job_ids = persisted_job_ids
            cached_entry.result_count = len(deduped_results)
            cached_entry.influencing_skills = influencing_skills
            cached_entry.provider_used = provider_used_name
            cached_entry.expires_at = expires_at
        else:
            new_cache = JobSearchCacheRecord(
                cache_key=cache_key,
                mode=mode,
                query_text=search_query,
                provider_used=provider_used_name,
                result_job_ids=persisted_job_ids,
                result_count=len(deduped_results),
                influencing_skills=influencing_skills,
                expires_at=expires_at,
            )
            db.add(new_cache)

        try:
            db.commit()
        except Exception as commit_err:
            db.rollback()
            logger.warning(f"Error persisting search cache: {commit_err}")

        response_payload = {
            "mode": mode,
            "query": search_query,
            "location": location,
            "remote_only": remote_only,
            "influencing_skills": influencing_skills,
            "provider_used": provider_used_name,
            "from_cache": False,
            "is_stale": False,
            "total_results": len(deduped_results),
            "total_returned": len(deduped_results),
            "retrieved_at": now.isoformat(),
            "status": "success",
            "jobs": [j.model_dump() for j in deduped_results],
        }

        # Resolve coalesced in-flight future
        async with self._inflight_lock:
            if cache_key in self._inflight_requests:
                f = self._inflight_requests.pop(cache_key)
                if not f.done():
                    f.set_result(response_payload)

        return response_payload


job_orchestrator = JobSearchOrchestrator()
