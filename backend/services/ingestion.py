"""Evidence Ingestion Service orchestrating the complete end-to-end evidence pipeline."""
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
        vector_repo: Optional[VectorEvidenceRepository] = None,
    ):
        self.github_client = github_client or GitHubClient()
        self.jira_client = jira_client or JiraClient()
        self.identity_resolver = identity_resolver or IdentityResolver()
        self.evidence_repo = evidence_repo or EvidenceRepository()
        self.ingestion_repo = ingestion_repo or IngestionRunRepository()
        self.taxonomy_service = taxonomy_service or TaxonomyService()
        self.llm_service = llm_service or LLMService()
        self.vector_repo = vector_repo or VectorEvidenceRepository()

    async def sync_github(
        self,
        owner: Optional[str] = None,
        repo: Optional[str] = None,
        limit_commits: int = 15,
        limit_prs: int = 10,
        run_ai: bool = True,
    ) -> Dict[str, Any]:
        """Synchronizes GitHub commits and pull requests."""
        settings = get_settings()
        target_owner = owner or settings.github_repository_owner
        target_repo = repo or settings.github_repository_name

        if not target_owner or not target_repo:
            raise GitHubIntegrationError("GitHub owner and repository must be specified or configured in .env")

        run_id = self.ingestion_repo.start_run(
            source="github",
            metadata={"owner": target_owner, "repo": target_repo}
        )
        logger.info(f"Started GitHub sync run {run_id} for {target_owner}/{target_repo}")

        found = 0
        processed = 0
        skipped = 0
        failed = 0
        error_summary = None

        try:
            # 1. Fetch raw commits
            raw_commits = self.github_client.get_commits(target_owner, target_repo, per_page=limit_commits)
            # 2. Fetch raw PRs
            raw_prs = self.github_client.get_pull_requests(target_owner, target_repo, per_page=limit_prs)

            raw_records = [("commit", c) for c in raw_commits] + [("pr", p) for p in raw_prs]
            found = len(raw_records)

            for rec_type, raw_item in raw_records:
                try:
                    # Normalize
                    if rec_type == "commit":
                        author_usr = (raw_item.get("author") or {}).get("login")
                        author_email = (raw_item.get("commit", {}).get("author") or {}).get("email")
                        emp_id = self.identity_resolver.resolve_github_employee(author_usr, author_email)
                        evidence = normalize_github_commit(raw_item, target_owner, target_repo, emp_id)
                    else:
                        pr_user = (raw_item.get("user") or {}).get("login")
                        emp_id = self.identity_resolver.resolve_github_employee(pr_user)
                        evidence = normalize_github_pr(raw_item, target_owner, target_repo, emp_id)

                    # Deduplication check
                    if self.evidence_repo.exists_by_reference(evidence.source, evidence.source_reference):
                        skipped += 1
                        continue

                    # Process, extract and index
                    await self._process_single_evidence(evidence, run_ai)
                    processed += 1

                except Exception as ex:
                    logger.error(f"Failed processing GitHub record: {ex}")
                    failed += 1

            status = "completed" if failed == 0 else ("partial" if processed > 0 else "failed")
            return self.ingestion_repo.complete_run(
                run_id=run_id,
                status=status,
                found=found,
                processed=processed,
                skipped=skipped,
                failed=failed,
            )

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
    ) -> Dict[str, Any]:
        """Synchronizes Jira project issues."""
        settings = get_settings()
        target_proj = project_key or settings.jira_project_key
        instance_url = settings.jira_base_url

        if not target_proj or not instance_url:
            raise JiraIntegrationError("Jira project_key and base_url must be specified or configured in .env")

        run_id = self.ingestion_repo.start_run(
            source="jira",
            metadata={"project": target_proj, "instance": instance_url}
        )
        logger.info(f"Started Jira sync run {run_id} for project {target_proj}")

        found = 0
        processed = 0
        skipped = 0
        failed = 0
        error_summary = None

        try:
            raw_issues = self.jira_client.search_issues(project_key=target_proj, max_results=max_issues)
            found = len(raw_issues)

            for issue in raw_issues:
                try:
                    fields = issue.get("fields", {}) or {}
                    assignee = fields.get("assignee") or {}
                    email = assignee.get("emailAddress")
                    uname = assignee.get("displayName") or assignee.get("accountId")
                    emp_id = self.identity_resolver.resolve_jira_employee(email=email, username=uname)

                    evidence = normalize_jira_issue(issue, instance_url, target_proj, emp_id)

                    # Deduplication check
                    if self.evidence_repo.exists_by_reference(evidence.source, evidence.source_reference):
                        skipped += 1
                        continue

                    await self._process_single_evidence(evidence, run_ai)
                    processed += 1

                except Exception as ex:
                    logger.error(f"Failed processing Jira issue: {ex}")
                    failed += 1

            status = "completed" if failed == 0 else ("partial" if processed > 0 else "failed")
            return self.ingestion_repo.complete_run(
                run_id=run_id,
                status=status,
                found=found,
                processed=processed,
                skipped=skipped,
                failed=failed,
            )

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
                extraction = await self.llm_service.extract_skills_from_evidence(
                    source=evidence.source,
                    source_type=evidence.source_type,
                    title=evidence.title,
                    content=evidence.content,
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

                # Reconcile high-level competencies
                for comp_cand in extraction.competencies:
                    c_id = self.taxonomy_service.resolve_competency(comp_cand.name)
                    if c_id:
                        self.evidence_repo.attach_competency(ev_id, c_id, comp_cand.confidence)
                        if not primary_competency_name:
                            primary_competency_name = comp_cand.name

            except Exception as e:
                logger.warning(f"AI extraction skipped or failed for evidence {ev_id}: {e}")

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
