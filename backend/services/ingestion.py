"""Evidence Ingestion Service orchestrating the complete end-to-end evidence pipeline."""
import re
import traceback
from typing import Any, Dict, List, Optional
from backend.core.config import get_settings
from backend.core.logging import get_logger
from backend.core.exceptions import GitHubIntegrationError, JiraIntegrationError
from backend.schemas.evidence import CanonicalEvidence
from backend.integrations.github.client import GitHubClient
from backend.integrations.github.normalizer import normalize_github_commit, normalize_github_pr
from backend.integrations.jira.client import JiraClient
from backend.integrations.jira.normalizer import normalize_jira_issue
from backend.evidence.identity_resolver import IdentityResolver
from backend.db.repositories.evidence import EvidenceRepository
from backend.db.repositories.ingestion import IngestionRunRepository
from backend.services.taxonomy import TaxonomyService
from backend.llm.service import LLMService
from backend.app.ai.qwen_service import QwenService
from backend.vectorstore.repository import VectorEvidenceRepository

logger = get_logger("services.ingestion")


class EvidenceIngestionService:
    """Coordinates fetching, normalizing, mapping, storing, extracting, and indexing evidence."""

    def __init__(
        self,
        github_client: Optional[GitHubClient] = None,
        jira_client: Optional[JiraClient] = None,
        identity_resolver: Optional[IdentityResolver] = None,
        evidence_repo: Optional[EvidenceRepository] = None,
        ingestion_repo: Optional[IngestionRunRepository] = None,
        taxonomy_service: Optional[TaxonomyService] = None,
        llm_service: Optional[LLMService] = None,
        qwen_service: Optional[QwenService] = None,
        vector_repo: Optional[VectorEvidenceRepository] = None,
    ):
        self.github_client = github_client or GitHubClient()
        self.jira_client = jira_client or JiraClient()
        self.identity_resolver = identity_resolver or IdentityResolver()
        self.evidence_repo = evidence_repo or EvidenceRepository()
        self.ingestion_repo = ingestion_repo or IngestionRunRepository()
        self.taxonomy_service = taxonomy_service or TaxonomyService()
        self.llm_service = llm_service or LLMService()
        self.qwen_service = qwen_service or QwenService()
        self.vector_repo = vector_repo or VectorEvidenceRepository()

    async def sync_github(
        self,
        owner: Optional[str] = None,
        repo: Optional[str] = None,
        limit_commits: int = 15,
        limit_prs: int = 10,
        run_ai: bool = True,
        target_employee_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Synchronizes GitHub commits and pull requests."""
        settings = get_settings()
        target_owner = owner or settings.github_repository_owner
        target_repo = repo or settings.github_repository_name
        active_client = self.github_client

        # If user_id is provided, check user_integrations for personal token & repo
        if user_id:
            try:
                from backend.db.client import get_supabase_client
                from backend.core.security import decrypt_credentials
                client = get_supabase_client()
                int_res = client.table("user_integrations").select("*").eq("user_id", user_id).eq("provider", "github").execute()
                if int_res.data:
                    cfg = int_res.data[0]
                    if not owner and cfg.get("repository_owner"):
                        target_owner = cfg["repository_owner"]
                    if not repo and cfg.get("repository_name"):
                        target_repo = cfg["repository_name"]
                    if cfg.get("encrypted_credentials"):
                        creds = decrypt_credentials(cfg["encrypted_credentials"])
                        if creds.get("token"):
                            active_client = GitHubClient(token=creds["token"])
            except Exception as e:
                logger.warning(f"Could not load custom user github credentials: {e}")

        # Auto-resolve owner if user inputs display name or common alias
        if target_owner and target_owner.strip().lower() in ["shubham", "shubham-sketch", "shubham392007", "shubham-392007sketch"]:
            target_owner = "shubham392007-sketch"

        if not target_owner or not target_repo:
            raise GitHubIntegrationError("GitHub owner and repository must be specified or configured in .env")

        # Canonical employee resolution
        canonical_emp_id = None
        if target_employee_id:
            canonical_emp_id = self.evidence_repo._resolve_employee_uuid(target_employee_id)
        elif user_id:
            canonical_emp_id = self.evidence_repo._resolve_employee_uuid(user_id)

        run_id = self.ingestion_repo.start_run(
            source="github",
            metadata={"owner": target_owner, "repo": target_repo, "employee_id": canonical_emp_id}
        )
        logger.info(f"Started GitHub sync run {run_id} for {target_owner}/{target_repo}")

        found = 0
        processed = 0
        skipped = 0
        failed = 0
        error_summary = None

        try:
            # 1. Fetch raw commits
            raw_commits = active_client.get_commits(target_owner, target_repo, per_page=limit_commits)
            # 2. Fetch raw PRs
            raw_prs = active_client.get_pull_requests(target_owner, target_repo, per_page=limit_prs)

            raw_records = [("commit", c) for c in raw_commits] + [("pr", p) for p in raw_prs]
            found = len(raw_records)

            # Pre-normalize candidates to batch check duplicates
            normalized_candidates = []
            candidate_refs = []
            for rec_type, raw_item in raw_records:
                try:
                    if rec_type == "commit":
                        author_usr = (raw_item.get("author") or {}).get("login")
                        author_email = (raw_item.get("commit", {}).get("author") or {}).get("email")
                        emp_id = self.identity_resolver.resolve_github_employee(author_usr, author_email) or canonical_emp_id
                        evidence = normalize_github_commit(raw_item, target_owner, target_repo, emp_id)
                    else:
                        pr_user = (raw_item.get("user") or {}).get("login")
                        emp_id = self.identity_resolver.resolve_github_employee(pr_user) or canonical_emp_id
                        evidence = normalize_github_pr(raw_item, target_owner, target_repo, emp_id)
                    normalized_candidates.append(evidence)
                    candidate_refs.append(evidence.source_reference)
                except Exception as norm_ex:
                    logger.warning(f"Error normalizing raw item: {norm_ex}")

            existing_refs = self.evidence_repo.get_existing_references("github", candidate_refs)

            for evidence in normalized_candidates:
                try:
                    # Fast in-memory deduplication check
                    if evidence.source_reference in existing_refs:
                        skipped += 1
                        continue

                    # Process, extract and index (cap synchronous LLM extraction to first 2 to prevent request timeout)
                    should_ai = run_ai and (processed < 2)
                    await self._process_single_evidence(evidence, should_ai)
                    processed += 1

                except Exception as ex:
                    logger.error(f"Failed processing GitHub record: {ex}")
                    failed += 1

            status = "completed" if failed == 0 else ("partial" if processed > 0 else "failed")
            run_result = self.ingestion_repo.complete_run(
                run_id=run_id,
                status=status,
                found=found,
                processed=processed,
                skipped=skipped,
                failed=failed,
            )

            # Update last_sync_at in user_integrations upon sync completion
            if status in ("completed", "partial"):
                try:
                    from datetime import datetime, timezone
                    from backend.db.client import get_supabase_client
                    now_iso = datetime.now(timezone.utc).isoformat()
                    db = get_supabase_client()
                    if user_id:
                        db.table("user_integrations").update({
                            "last_sync_at": now_iso,
                            "connection_status": "connected",
                        }).eq("user_id", user_id).eq("provider", "github").execute()
                    elif canonical_emp_id:
                        db.table("user_integrations").update({
                            "last_sync_at": now_iso,
                            "connection_status": "connected",
                        }).eq("user_id", canonical_emp_id).eq("provider", "github").execute()
                    else:
                        db.table("user_integrations").update({
                            "last_sync_at": now_iso,
                            "connection_status": "connected",
                        }).eq("provider", "github").execute()
                except Exception as e:
                    logger.debug(f"Failed updating user_integrations sync time: {e}")

            return run_result

        except Exception as e:
            error_summary = f"{type(e).__name__}: {str(e)}"
            logger.error(f"GitHub ingestion run {run_id} failed: {error_summary}")
            return self.ingestion_repo.complete_run(
                run_id=run_id,
                status="failed",
                found=found,
                processed=processed,
                skipped=skipped,
                failed=failed or 1,
                error_summary=error_summary,
            )

    async def sync_jira(
        self,
        project_key: Optional[str] = None,
        max_issues: int = 20,
        run_ai: bool = True,
        target_employee_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Synchronizes Jira project issues."""
        settings = get_settings()
        target_proj = project_key or settings.jira_project_key
        instance_url = settings.jira_base_url
        active_client = self.jira_client

        if user_id:
            try:
                from backend.db.client import get_supabase_client
                from backend.core.security import decrypt_credentials
                client = get_supabase_client()
                int_res = client.table("user_integrations").select("*").eq("user_id", user_id).eq("provider", "jira").execute()
                if int_res.data:
                    cfg = int_res.data[0]
                    if not project_key and cfg.get("project_key"):
                        target_proj = cfg["project_key"]
                    if cfg.get("base_url"):
                        instance_url = cfg["base_url"]
                    if cfg.get("encrypted_credentials"):
                        creds = decrypt_credentials(cfg["encrypted_credentials"])
                        if creds.get("api_token") and creds.get("email"):
                            active_client = JiraClient(
                                base_url=instance_url,
                                email=creds["email"],
                                api_token=creds["api_token"],
                            )
            except Exception as e:
                logger.warning(f"Could not load custom user jira credentials: {e}")

        if not target_proj or not instance_url:
            raise JiraIntegrationError("Jira project_key and base_url must be specified or configured in .env")

        canonical_emp_id = None
        if target_employee_id:
            canonical_emp_id = self.evidence_repo._resolve_employee_uuid(target_employee_id)
        elif user_id:
            canonical_emp_id = self.evidence_repo._resolve_employee_uuid(user_id)

        run_id = self.ingestion_repo.start_run(
            source="jira",
            metadata={"project": target_proj, "instance": instance_url, "employee_id": canonical_emp_id}
        )
        logger.info(f"Started Jira sync run {run_id} for project {target_proj}")

        found = 0
        processed = 0
        skipped = 0
        failed = 0
        error_summary = None

        try:
            raw_issues = active_client.search_issues(project_key=target_proj, max_results=max_issues)
            found = len(raw_issues)

            # Pre-normalize candidates to batch check duplicates
            normalized_candidates = []
            candidate_refs = []
            for issue in raw_issues:
                try:
                    fields = issue.get("fields", {}) or {}
                    assignee = fields.get("assignee") or {}
                    email = assignee.get("emailAddress")
                    uname = assignee.get("displayName") or assignee.get("accountId")
                    emp_id = self.identity_resolver.resolve_jira_employee(email=email, username=uname) or canonical_emp_id
                    evidence = normalize_jira_issue(issue, instance_url, target_proj, emp_id)
                    normalized_candidates.append(evidence)
                    candidate_refs.append(evidence.source_reference)
                except Exception as norm_ex:
                    logger.warning(f"Error normalizing Jira issue: {norm_ex}")

            existing_refs = self.evidence_repo.get_existing_references("jira", candidate_refs)

            for evidence in normalized_candidates:
                try:
                    # Fast in-memory deduplication check
                    if evidence.source_reference in existing_refs:
                        skipped += 1
                        continue

                    should_ai = run_ai and (processed < 2)
                    await self._process_single_evidence(evidence, should_ai)
                    processed += 1

                except Exception as ex:
                    logger.error(f"Failed processing Jira issue: {ex}")
                    failed += 1

            status = "completed" if failed == 0 else ("partial" if processed > 0 else "failed")
            run_result = self.ingestion_repo.complete_run(
                run_id=run_id,
                status=status,
                found=found,
                processed=processed,
                skipped=skipped,
                failed=failed,
            )

            # Update last_sync_at in user_integrations upon sync completion
            if status in ("completed", "partial"):
                try:
                    from datetime import datetime, timezone
                    from backend.db.client import get_supabase_client
                    now_iso = datetime.now(timezone.utc).isoformat()
                    db = get_supabase_client()
                    if user_id:
                        db.table("user_integrations").update({
                            "last_sync_at": now_iso,
                            "connection_status": "connected",
                        }).eq("user_id", user_id).eq("provider", "jira").execute()
                    elif canonical_emp_id:
                        db.table("user_integrations").update({
                            "last_sync_at": now_iso,
                            "connection_status": "connected",
                        }).eq("user_id", canonical_emp_id).eq("provider", "jira").execute()
                    else:
                        db.table("user_integrations").update({
                            "last_sync_at": now_iso,
                            "connection_status": "connected",
                        }).eq("provider", "jira").execute()
                except Exception as e:
                    logger.debug(f"Failed updating user_integrations sync time: {e}")

            return run_result

        except Exception as e:
            error_summary = f"{type(e).__name__}: {str(e)}"
            logger.error(f"Jira ingestion run {run_id} failed: {error_summary}")
            return self.ingestion_repo.complete_run(
                run_id=run_id,
                status="failed",
                found=found,
                processed=processed,
                skipped=skipped,
                failed=failed or 1,
                error_summary=error_summary,
            )

    async def _process_single_evidence(self, evidence: CanonicalEvidence, run_ai: bool) -> None:
        """Internal worker storing canonical record, invoking AI extraction, and indexing vector."""
        # 1. Store in Supabase evidence table
        created = self.evidence_repo.create(evidence)
        ev_id = created.get("id") or evidence.evidence_id

        primary_competency_name = None
        ai_summary = None

        # 2. AI Extraction via local Qwen3 8B
        if run_ai:
            try:
                # Provide known competencies to constrain and guide Qwen3
                known_comps = [c["name"] for c in self.taxonomy_service.list_all_competencies()]
                extraction = await self.qwen_service.extract_evidence(
                    source=evidence.source,
                    source_type=evidence.source_type,
                    title=evidence.title,
                    content=evidence.content,
                    evidence_id=ev_id,
                    known_competencies=known_comps,
                )

                ai_summary = extraction.evidence_summary
                self.evidence_repo.update_ai_extraction(ev_id, ai_summary)

                # Reconcile skills against taxonomy
                for skill_cand in extraction.skills:
                    sk_id, comp_id = self.taxonomy_service.resolve_skill(
                        candidate_name=skill_cand.name,
                        evidence_id=ev_id,
                        confidence=skill_cand.confidence,
                    )
                    if sk_id:
                        self.evidence_repo.attach_skill(ev_id, sk_id, skill_cand.confidence)
                    if comp_id:
                        self.evidence_repo.attach_competency(ev_id, comp_id, skill_cand.confidence)
                        if not primary_competency_name:
                            comp_obj = self.taxonomy_service.get_competency_by_id(comp_id)
                            if comp_obj:
                                primary_competency_name = comp_obj["name"]

                # Reconcile high-level competencies
                for comp_name in extraction.competency_candidates:
                    c_id = self.taxonomy_service.resolve_competency(comp_name)
                    if c_id:
                        self.evidence_repo.attach_competency(ev_id, c_id, extraction.confidence)
                        if not primary_competency_name:
                            comp_obj = self.taxonomy_service.get_competency_by_id(c_id)
                            primary_competency_name = comp_obj["name"] if comp_obj else comp_name

            except Exception as e:
                logger.warning(f"AI extraction skipped or failed for evidence {ev_id}: {e}")

        # Fast heuristic extraction from title and content if no primary competency resolved yet
        if not primary_competency_name:
            try:
                text_to_scan = f"{evidence.title} {evidence.content}".lower()
                all_skills = self.taxonomy_service.list_all_skills()
                for sk in all_skills:
                    sk_name = sk["name"]
                    # Exact word boundary match (e.g. 'python', 'fastapi', 'docker', 'pandas')
                    if re.search(r'\b' + re.escape(sk_name.lower()) + r'\b', text_to_scan):
                        self.evidence_repo.attach_skill(ev_id, sk["id"], 0.85)
                        if sk.get("competency_id"):
                            self.evidence_repo.attach_competency(ev_id, sk["competency_id"], 0.80)
                            if not primary_competency_name:
                                comp_obj = self.taxonomy_service.get_competency_by_id(sk["competency_id"])
                                if comp_obj:
                                    primary_competency_name = comp_obj["name"]
            except Exception as ex:
                logger.warning(f"Heuristic extraction failed for {ev_id}: {ex}")

        # 3. Vector indexing in ChromaDB (only if employee is mapped)
        if evidence.employee_id:
            try:
                self.vector_repo.index_evidence(
                    evidence_id=ev_id,
                    employee_id=evidence.employee_id,
                    source=evidence.source,
                    source_type=evidence.source_type,
                    project_name=evidence.project_name,
                    title=evidence.title,
                    content=evidence.content,
                    occurred_at=evidence.occurred_at.isoformat(),
                    ai_summary=ai_summary,
                    competency_name=primary_competency_name,
                )
            except Exception as e:
                logger.error(f"Vector indexing failed for evidence {ev_id}: {e}")
