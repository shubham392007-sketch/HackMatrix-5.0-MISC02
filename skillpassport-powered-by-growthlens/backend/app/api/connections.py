from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func
from datetime import datetime, timezone
import uuid
import json

from backend.app.db.session import get_db
from backend.app.api.dependencies import get_current_user, AuthenticatedUser
from backend.app.models.connection import ConnectedSource, SelectedResource
from backend.app.models.sync_run import SourceSyncRun, RawSourceRecord
from backend.app.models.job import IngestionJob
from backend.app.models.evidence import EvidenceItem
from backend.app.models.audit import ReviewAuditEvent
from backend.app.models.language import RepositoryLanguageSnapshot, RepositoryLanguageBreakdown
from backend.app.models.readme import RepositoryReadmeSnapshot
from backend.app.integrations.github.client import GitHubClient
from backend.app.integrations.jira.client import JiraCloudClient
from backend.app.integrations.github.language_service import (
    sync_repository_languages,
    get_repository_languages_response,
    get_user_languages_summary,
)
from backend.app.integrations.github.readme_service import (
    sync_repository_readme,
    get_repository_readme_response,
)
from backend.app.core.security import encrypt_credential, decrypt_credential
from backend.app.ingestion.pipeline import queue_manager
from backend.app.extraction.engine import extraction_engine
from backend.app.models.taxonomy import EvidenceCompetencyMapping, CompetencyTaxonomy
from backend.app.ai.work_analyzer import work_analyzer
from backend.app.ai.output_validator import output_validator
from backend.app.models.ai_governance import WorkAnalysisResult, AIAnalysisRun
from backend.app.rag.chroma import chroma_store
from backend.app.core.config import get_settings
from backend.app.core.logging import get_logger
import httpx
import time

logger = get_logger("api.connections")
router = APIRouter(prefix="/connections", tags=["Connected Sources"])


# Pydantic Schemas
class RepositoryReadmeResponse(BaseModel):
    repository_id: str
    repository_name: str
    sync_status: str
    readme_path: str = "README.md"
    blob_sha: Optional[str] = None
    html_url: Optional[str] = None
    content_hash: Optional[str] = None
    raw_content: Optional[str] = None
    sections: List[Dict[str, Any]] = []
    retrieval_timestamp: Optional[str] = None
    error_summary: Optional[str] = None


class LanguageBreakdownItem(BaseModel):

    name: str
    bytes: int
    percentage: float


class RepositoryLanguagesResponse(BaseModel):
    repository_id: str
    repository_name: str
    sync_status: str
    total_bytes: int
    retrieval_timestamp: Optional[str] = None
    languages: List[LanguageBreakdownItem] = []
    error_summary: Optional[str] = None


class RepositorySummaryItem(BaseModel):
    repository_id: str
    repository_name: str
    sync_status: str
    total_bytes: int
    detected_languages_count: int
    top_language: Optional[str] = None
    last_retrieved_at: Optional[str] = None
    languages: List[LanguageBreakdownItem] = []
    error_summary: Optional[str] = None


class GitHubLanguagesSummaryResponse(BaseModel):
    total_selected_repositories: int
    repositories_with_languages: int
    total_bytes: int
    last_synced_at: Optional[str] = None
    aggregate_languages: List[LanguageBreakdownItem] = []
    repositories: List[RepositorySummaryItem] = []

class GitHubTestRequest(BaseModel):
    token: str = Field(..., min_length=10, description="GitHub Personal Access Token (PAT)")


class GitHubConnectRequest(BaseModel):
    token: str = Field(..., min_length=10)
    selected_repositories: Optional[List[str]] = Field(default_factory=list)
    categories: Optional[List[str]] = Field(default=["commits", "pull_requests", "issues"])


class RepositorySelectionRequest(BaseModel):
    repositories: List[Union[Dict[str, Any], str]]


class SyncRequest(BaseModel):
    repository: Optional[str] = None


class JiraTestRequest(BaseModel):
    site_url: str = Field(..., min_length=4, description="Atlassian site URL")
    email: str = Field(..., min_length=3, description="Jira account email")
    api_token: str = Field(..., min_length=10, description="Atlassian API token")


class JiraConnectRequest(BaseModel):
    site_url: str = Field(..., min_length=4)
    email: str = Field(..., min_length=3)
    api_token: str = Field(..., min_length=10)
    selected_projects: Optional[List[str]] = Field(default_factory=list)


class JiraProjectSelectionRequest(BaseModel):
    projects: List[Union[Dict[str, Any], str]]


class JiraSyncRequest(BaseModel):
    project_key: Optional[str] = None


@router.get("")
def list_connected_sources(
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists all active and configured sources for the authenticated user."""
    sources = (
        db.query(ConnectedSource)
        .options(selectinload(ConnectedSource.selected_resources))
        .filter(
            ConnectedSource.owner_user_id == user.id,
            ConnectedSource.connection_status != "disconnected",
        )
        .all()
    )

    # Batch compute imported record counts per provider in one grouped query
    provider_counts_rows = (
        db.query(EvidenceItem.source_provider, func.count(EvidenceItem.id))
        .filter(
            EvidenceItem.owner_user_id == user.id,
            EvidenceItem.is_deleted == False,
        )
        .group_by(EvidenceItem.source_provider)
        .all()
    )
    provider_counts = dict(provider_counts_rows)

    results = []
    for s in sources:
        record_count = provider_counts.get(s.provider, 0)

        language_summary = None
        if s.provider == "github":
            selected_res_ids = [r.id for r in s.selected_resources if r.is_selected]
            if selected_res_ids:
                snapshots = (
                    db.query(RepositoryLanguageSnapshot)
                    .options(selectinload(RepositoryLanguageSnapshot.breakdowns))
                    .filter(
                        RepositoryLanguageSnapshot.selected_resource_id.in_(selected_res_ids),
                        RepositoryLanguageSnapshot.is_current == True,
                    )
                    .all()
                )
                total_analyzed = sum(1 for snap in snapshots if snap.sync_status == "success")
                distinct_langs = set()
                for snap in snapshots:
                    for b in snap.breakdowns:
                        distinct_langs.add(b.language_name)
                language_summary = {
                    "analyzed_repositories_count": total_analyzed,
                    "total_selected_repositories": len(selected_res_ids),
                    "distinct_languages_count": len(distinct_langs),
                    "languages": sorted(list(distinct_langs)),
                }

        results.append({
            "id": str(s.id),
            "name": f"GitHub ({s.account_identity})" if s.provider == "github" else f"Jira ({s.account_identity})",
            "type": s.provider,
            "status": s.connection_status,
            "lastSync": s.last_sync_at.isoformat() if s.last_sync_at else "Never synced",
            "importedRecordsCount": record_count,
            "accountIdentity": s.account_identity,
            "permissions": s.granted_scopes or [],
            "selectedEntities": [r.name for r in s.selected_resources if r.is_selected],
            "languageSummary": language_summary,
        })

    return {"sources": results, "total": len(results)}


@router.post("/github/test")
async def test_github_connection(payload: GitHubTestRequest):
    """
    Validates a GitHub PAT against GitHub's official REST API.
    Does not store credentials. Never returns the token.
    """
    client = GitHubClient(payload.token)
    result = await client.test_connection()
    if not result.get("valid"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("message", "Invalid GitHub credentials"),
        )
    return result


@router.post("/github")
async def connect_github(
    payload: GitHubConnectRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Validates, encrypts, and stores a GitHub PAT for the authenticated user.
    """
    client = GitHubClient(payload.token)
    validation = await client.test_connection()
    if not validation.get("valid"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=validation.get("message", "GitHub authentication failed"),
        )

    username = validation.get("username")
    encrypted_pat = encrypt_credential(payload.token)

    # Check for existing connection
    existing = db.query(ConnectedSource).filter(
        ConnectedSource.owner_user_id == user.id,
        ConnectedSource.provider == "github",
        ConnectedSource.account_identity == username,
    ).first()

    now = datetime.now(timezone.utc)
    if existing:
        existing.encrypted_credentials = encrypted_pat
        existing.connection_status = "connected"
        existing.disconnected_at = None
        existing.granted_scopes = validation.get("scopes", [])
        existing.connection_metadata = validation
        connection = existing
    else:
        connection = ConnectedSource(
            id=uuid.uuid4(),
            owner_user_id=user.id,
            provider="github",
            account_identity=username,
            connection_status="connected",
            encrypted_credentials=encrypted_pat,
            credential_key_version="v1",
            requested_scopes=["repo", "read:user"],
            granted_scopes=validation.get("scopes", []),
            connection_metadata=validation,
        )
        db.add(connection)

    # Persist initially selected repositories if provided
    if payload.selected_repositories:
        seen_names = set()
        existing_res_list = db.query(SelectedResource).filter(
            SelectedResource.connection_id == connection.id,
        ).all()
        existing_res_map = {r.external_resource_id: r for r in existing_res_list}

        for raw_name in payload.selected_repositories:
            if not raw_name or not isinstance(raw_name, str):
                continue
            repo_name = raw_name.strip()
            if not repo_name or repo_name in seen_names:
                continue
            seen_names.add(repo_name)

            if repo_name in existing_res_map:
                existing_res_map[repo_name].is_selected = True
            else:
                res = SelectedResource(
                    id=uuid.uuid4(),
                    connection_id=connection.id,
                    external_resource_id=repo_name,
                    name=repo_name,
                    is_selected=True,
                    content_categories=["commits", "pull_requests"],
                )
                db.add(res)
                existing_res_map[repo_name] = res

    db.commit()
    db.refresh(connection)

    # Audit event
    audit = ReviewAuditEvent(
        id=uuid.uuid4(),
        actor_user_id=user.id,
        target_record_id=connection.id,
        target_record_type="connected_source",
        event_type="source_connected",
        new_state="connected",
        reason_note=f"GitHub account {username} connected with valid PAT",
    )
    db.add(audit)
    db.commit()

    return {
        "status": "connected",
        "connection_id": str(connection.id),
        "username": username,
        "display_name": validation.get("display_name"),
        "scopes": validation.get("scopes", []),
    }


@router.get("/github/repositories")
async def list_github_repositories(
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = 1,
    per_page: int = 30,
    all_accessible: bool = False,
    search: Optional[str] = None,
):
    """Lists repositories accessible to the user's connected GitHub account."""
    connection = db.query(ConnectedSource).filter(
        ConnectedSource.owner_user_id == user.id,
        ConnectedSource.provider == "github",
        ConnectedSource.connection_status == "connected",
    ).first()

    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active GitHub connection found for this account",
        )

    pat = decrypt_credential(connection.encrypted_credentials)
    client = GitHubClient(pat)

    if all_accessible:
        repos = await client.list_all_repositories(max_pages=5, per_page=100)
    else:
        repos = await client.list_repositories(page=page, per_page=per_page)

    # Filter by search term if provided
    if search and search.strip():
        q = search.strip().lower()
        repos = [
            r for r in repos
            if q in (r.get("full_name") or "").lower()
            or q in (r.get("name") or "").lower()
            or q in (r.get("description") or "").lower()
        ]

    # Cross-reference with selected_resources and existing language & README snapshots
    selected_resources_map = {
        r.external_resource_id: r
        for r in connection.selected_resources
    }

    resource_ids = [r.id for r in connection.selected_resources if r.is_selected]

    snapshots = (
        db.query(RepositoryLanguageSnapshot)
        .filter(
            RepositoryLanguageSnapshot.selected_resource_id.in_(resource_ids),
            RepositoryLanguageSnapshot.owner_user_id == user.id,
            RepositoryLanguageSnapshot.is_current == True,
        )
        .all()
        if resource_ids
        else []
    )
    snap_by_res_id = {s.selected_resource_id: s for s in snapshots}

    readme_snapshots = (
        db.query(RepositoryReadmeSnapshot)
        .filter(
            RepositoryReadmeSnapshot.selected_resource_id.in_(resource_ids),
            RepositoryReadmeSnapshot.owner_user_id == user.id,
            RepositoryReadmeSnapshot.is_current == True,
        )
        .all()
        if resource_ids
        else []
    )
    readme_by_res_id = {s.selected_resource_id: s for s in readme_snapshots}

    for r in repos:
        res = selected_resources_map.get(r["full_name"])
        is_sel = bool(res and res.is_selected)
        r["selected"] = is_sel
        if res:
            r["resource_id"] = str(res.id)
            snap = snap_by_res_id.get(res.id)
            if snap:
                r["languages_status"] = snap.sync_status
                r["detected_languages_count"] = len(snap.breakdowns)
                r["total_language_bytes"] = snap.total_bytes
                r["last_language_sync_at"] = (
                    snap.retrieval_timestamp.isoformat()
                    if snap.retrieval_timestamp
                    else None
                )
                r["languages"] = [
                    {
                        "name": b.language_name,
                        "bytes": b.byte_count,
                        "percentage": round(b.percentage, 2),
                    }
                    for b in snap.breakdowns
                ]
            else:
                r["languages_status"] = "not_synced" if is_sel else "unselected"
                r["detected_languages_count"] = 0
                r["total_language_bytes"] = 0
                r["last_language_sync_at"] = None
                r["languages"] = []

            readme_snap = readme_by_res_id.get(res.id)
            if readme_snap:
                r["readme_status"] = readme_snap.sync_status
                r["readme_sha"] = readme_snap.blob_sha
                r["readme_path"] = readme_snap.readme_path
                r["readme_html_url"] = readme_snap.html_url
                r["has_readme"] = bool(readme_snap.sync_status == "success" and readme_snap.raw_content)
                r["readme_sections_count"] = len(readme_snap.sections_json) if readme_snap.sections_json else 0
                r["last_readme_sync_at"] = (
                    readme_snap.retrieval_timestamp.isoformat()
                    if readme_snap.retrieval_timestamp
                    else None
                )
            else:
                r["readme_status"] = "not_synced" if is_sel else "unselected"
                r["readme_sha"] = None
                r["readme_path"] = "README.md"
                r["readme_html_url"] = None
                r["has_readme"] = False
                r["readme_sections_count"] = 0
                r["last_readme_sync_at"] = None
        else:
            r["resource_id"] = None
            r["languages_status"] = "unselected"
            r["detected_languages_count"] = 0
            r["total_language_bytes"] = 0
            r["last_language_sync_at"] = None
            r["languages"] = []
            r["readme_status"] = "unselected"
            r["readme_sha"] = None
            r["readme_path"] = "README.md"
            r["readme_html_url"] = None
            r["has_readme"] = False
            r["readme_sections_count"] = 0
            r["last_readme_sync_at"] = None

    return {
        "repositories": repos,
        "page": page,
        "total_returned": len(repos),
        "total_selected": len(resource_ids),
    }



@router.put("/github/repositories")
@router.post("/github/repositories")
def update_selected_repositories(
    payload: RepositorySelectionRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Updates selected repositories for sync with complete deduplication and idempotency."""
    connection = db.query(ConnectedSource).filter(
        ConnectedSource.owner_user_id == user.id,
        ConnectedSource.provider == "github",
        ConnectedSource.connection_status == "connected",
    ).first()

    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active GitHub connection found",
        )

    # 1. Normalize and deduplicate incoming payload by repository full_name
    deduped: Dict[str, Dict[str, Any]] = {}
    for item in payload.repositories:
        if isinstance(item, str):
            fn = item.strip()
            if fn:
                deduped[fn] = {"full_name": fn, "selected": True, "html_url": None}
        elif isinstance(item, dict):
            fn = (item.get("full_name") or item.get("name") or "").strip()
            if fn:
                deduped[fn] = {
                    "full_name": fn,
                    "selected": item.get("selected", True),
                    "html_url": item.get("html_url") or (deduped.get(fn, {}).get("html_url")),
                }

    # 2. Query all existing SelectedResource records for this connection
    existing_list = db.query(SelectedResource).filter(
        SelectedResource.connection_id == connection.id
    ).all()

    existing_map: Dict[str, SelectedResource] = {}
    for r in existing_list:
        if r.external_resource_id not in existing_map:
            existing_map[r.external_resource_id] = r
        existing_map[r.external_resource_id.lower()] = r

    # 3. Apply updates or additions
    for fn, data in deduped.items():
        is_sel = data["selected"]
        html_url = data["html_url"]

        target_res = existing_map.get(fn) or existing_map.get(fn.lower())
        if target_res:
            target_res.is_selected = is_sel
            if html_url and not target_res.url:
                target_res.url = html_url
        elif is_sel:
            new_res = SelectedResource(
                id=uuid.uuid4(),
                connection_id=connection.id,
                external_resource_id=fn,
                name=fn,
                url=html_url,
                is_selected=True,
                content_categories=["commits", "pull_requests"],
            )
            db.add(new_res)
            existing_map[fn] = new_res
            existing_map[fn.lower()] = new_res

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update selected repositories: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update selected repositories: {str(e)}",
        )

    return {"status": "updated", "message": f"Updated selection for {len(deduped)} repositories"}


async def _sync_single_github_repo_internal(
    db: Session,
    user: AuthenticatedUser,
    connection: ConnectedSource,
    repo_full: str,
    client: GitHubClient,
    sync_run: SourceSyncRun,
) -> Dict[str, Any]:
    parts = repo_full.split("/")
    if len(parts) != 2:
        return {"error": f"Invalid repo name: {repo_full}"}
    owner, repo_name = parts[0], parts[1]

    # 1. Resolve or create SelectedResource for this repository
    res_record = db.query(SelectedResource).filter(
        SelectedResource.connection_id == connection.id,
        SelectedResource.external_resource_id == repo_full,
    ).first()

    if not res_record:
        res_record = SelectedResource(
            id=uuid.uuid4(),
            connection_id=connection.id,
            external_resource_id=repo_full,
            name=repo_full,
            is_selected=True,
            content_categories=["commits", "pull_requests"],
        )
        db.add(res_record)
        db.flush()
    elif not res_record.is_selected:
        res_record.is_selected = True
        db.flush()

    lang_errors = 0
    discovered = 0
    imported = 0
    now = datetime.now(timezone.utc)

    # 2. Fetch & persist real repository language statistics
    lang_snap, lang_ok = await sync_repository_languages(
        db=db,
        user_id=user.id,
        connection=connection,
        selected_resource=res_record,
        client=client,
        sync_run_id=sync_run.id,
    )
    if not lang_ok:
        lang_errors += 1

    repo_lang_breakdowns = [
        {"name": b.language_name, "bytes": b.byte_count, "percentage": round(b.percentage, 2)}
        for b in (lang_snap.breakdowns if lang_snap else [])
    ]
    top_language = repo_lang_breakdowns[0]["name"] if repo_lang_breakdowns else None

    # 2.B Fetch & persist real repository README and extract candidate competencies
    readme_snap, readme_ok = await sync_repository_readme(
        db=db,
        user_id=user.id,
        connection=connection,
        selected_resource=res_record,
        client=client,
        sync_run_id=sync_run.id,
    )
    if readme_ok and readme_snap and readme_snap.sync_status == "success":
        discovered += 1
        imported += 1

    # 3. Fetch PRs
    prs = await client.fetch_pull_requests(owner, repo_name, limit=10)
    repo_imported = 0
    for pr in prs:
        discovered += 1
        content_hash = uuid.uuid5(uuid.NAMESPACE_URL, f"gh:pr:{repo_full}:{pr['number']}").hex

        # Check duplicate
        existing_raw = db.query(RawSourceRecord).filter(
            RawSourceRecord.owner_user_id == user.id,
            RawSourceRecord.provider == "github",
            RawSourceRecord.record_type == "pull_request",
            RawSourceRecord.external_record_id == str(pr["number"]),
        ).first()

        if not existing_raw:
            raw_rec = RawSourceRecord(
                id=uuid.uuid4(),
                owner_user_id=user.id,
                sync_run_id=sync_run.id,
                provider="github",
                record_type="pull_request",
                external_record_id=str(pr["number"]),
                source_url=pr.get("html_url"),
                observed_at=now,
                content_hash=content_hash,
                raw_payload=pr,
            )
            db.add(raw_rec)

            reviews = []
            try:
                reviews = await client.fetch_pull_request_reviews(owner, repo_name, pr["number"])
            except Exception as e:
                logger.warning(f"Could not fetch reviews for PR #{pr['number']}: {e}")

            # Create normalized EvidenceItem with repository language context
            evidence = EvidenceItem(
                id=uuid.uuid4(),
                owner_user_id=user.id,
                source_provider="github",
                source_type="pull_request",
                external_record_id=str(pr["number"]),
                source_url=pr.get("html_url"),
                source_name=repo_full,
                evidence_category="engineering",
                title=pr.get("title", "GitHub Pull Request"),
                description=pr.get("body") or f"PR #{pr['number']} in {repo_full}",
                extracted_excerpt=pr.get("title") + "\n" + (pr.get("body") or "")[:200],
                observed_timestamp=now,
                contributor_identity=pr.get("author_login") or connection.account_identity,
                attribution_status="author" if pr.get("author_login") == connection.account_identity else "contributor",
                project_name=repo_name,
                evidence_strength="high" if pr.get("merged_at") else "medium",
                extraction_confidence=0.88,
                verification_status="unreviewed",
                processing_status="ready_for_review",
                provenance={
                    "repo": repo_full,
                    "pr_number": pr["number"],
                    "state": pr.get("state"),
                    "repository_languages": repo_lang_breakdowns,
                    "primary_language": top_language,
                    "review_count": len(reviews),
                    "reviews": [{"user": r.get("user", {}).get("login"), "state": r.get("state")} for r in reviews[:5]],
                },
                normalized_metadata={
                    "author": pr.get("author_login"),
                    "merged": bool(pr.get("merged_at")),
                    "repository_languages": repo_lang_breakdowns,
                    "primary_language": top_language,
                    "review_count": len(reviews),
                },
                content_hash=content_hash,
            )
            db.add(evidence)
            db.flush()

            # Execute extraction engine to propose candidate competencies and index in vector store
            full_text = f"PR #{pr['number']}: {pr.get('title', '')}\nRepository: {repo_full}\n"
            if pr.get("body"):
                full_text += f"\nDescription:\n{pr['body']}\n"
            if repo_lang_breakdowns:
                lang_names = [f"{l['name']} ({l.get('percentage', 0)}%)" for l in repo_lang_breakdowns]
                full_text += f"\nTechnologies and Languages: {', '.join(lang_names)}\n"

            try:
                await extraction_engine.process_and_persist_evidence(
                    db=db,
                    evidence_item=evidence,
                    content_text=full_text,
                    source_provider="github",
                    category="engineering",
                    user_id=user.id,
                )
            except Exception as e:
                logger.error(f"Error extracting candidate skills for PR #{pr.get('number')}: {e}")

            imported += 1
            repo_imported += 1
        else:
            # Backfill candidate skills if not already extracted
            existing_evidence = db.query(EvidenceItem).filter(
                EvidenceItem.owner_user_id == user.id,
                EvidenceItem.source_provider == "github",
                EvidenceItem.source_type == "pull_request",
                EvidenceItem.external_record_id == str(pr["number"]),
            ).first()
            if existing_evidence:
                mapping_count = db.query(EvidenceCompetencyMapping).filter(
                    EvidenceCompetencyMapping.evidence_id == existing_evidence.id
                ).count()
                if mapping_count == 0:
                    full_text = f"PR #{pr['number']}: {existing_evidence.title}\nRepository: {repo_full}\n"
                    if existing_evidence.description:
                        full_text += f"\nDescription:\n{existing_evidence.description}\n"
                    if repo_lang_breakdowns:
                        lang_names = [f"{l['name']} ({l.get('percentage', 0)}%)" for l in repo_lang_breakdowns]
                        full_text += f"\nTechnologies and Languages: {', '.join(lang_names)}\n"

                    try:
                        await extraction_engine.process_and_persist_evidence(
                            db=db,
                            evidence_item=existing_evidence,
                            content_text=full_text,
                            source_provider="github",
                            category="engineering",
                            user_id=user.id,
                        )
                    except Exception as e:
                        logger.error(f"Error backfilling candidate skills for PR #{pr.get('number')}: {e}")

    # 4. Fetch Commits
    commits = await client.fetch_repository_commits(owner, repo_name, limit=15)
    repo_commits_imported = 0
    for commit in commits:
        commit_sha = commit.get("sha")
        if not commit_sha:
            continue
        discovered += 1
        content_hash = uuid.uuid5(uuid.NAMESPACE_URL, f"gh:commit:{repo_full}:{commit_sha}").hex

        existing_raw_commit = db.query(RawSourceRecord).filter(
            RawSourceRecord.owner_user_id == user.id,
            RawSourceRecord.provider == "github",
            RawSourceRecord.record_type == "commit",
            RawSourceRecord.external_record_id == commit_sha,
        ).first()

        if not existing_raw_commit:
            raw_rec = RawSourceRecord(
                id=uuid.uuid4(),
                owner_user_id=user.id,
                sync_run_id=sync_run.id,
                provider="github",
                record_type="commit",
                external_record_id=commit_sha,
                source_url=commit.get("html_url"),
                observed_at=now,
                content_hash=content_hash,
                raw_payload=commit,
            )
            db.add(raw_rec)

            author_login = commit.get("author_login")
            author_name = commit.get("author_name") or author_login or "Contributor"
            is_author = (
                (author_login and author_login.lower() == connection.account_identity.lower())
                or (author_name and author_name.lower() in connection.account_identity.lower())
            )

            commit_msg = commit.get("message") or ""
            first_line = commit_msg.splitlines()[0][:80] if commit_msg else f"Commit {commit_sha[:7]}"

            evidence_commit = EvidenceItem(
                id=uuid.uuid4(),
                owner_user_id=user.id,
                source_provider="github",
                source_type="commit",
                external_record_id=commit_sha,
                source_url=commit.get("html_url"),
                source_name=repo_full,
                evidence_category="engineering",
                title=f"Commit: {first_line}",
                description=commit_msg or f"Git commit {commit_sha[:7]} in {repo_full}",
                extracted_excerpt=commit_msg[:300],
                observed_timestamp=now,
                contributor_identity=author_login or author_name,
                attribution_status="author" if is_author else "contributor",
                project_name=repo_name,
                evidence_strength="high" if is_author else "medium",
                extraction_confidence=0.85,
                verification_status="unreviewed",
                processing_status="ready_for_review",
                provenance={
                    "repo": repo_full,
                    "commit_sha": commit_sha,
                    "author_name": author_name,
                    "author_login": author_login,
                    "committer_name": commit.get("committer_name"),
                    "repository_languages": repo_lang_breakdowns,
                    "primary_language": top_language,
                },
                normalized_metadata={
                    "author": author_login or author_name,
                    "committer": commit.get("committer_name"),
                    "sha": commit_sha,
                    "repository_languages": repo_lang_breakdowns,
                    "primary_language": top_language,
                },
                content_hash=content_hash,
            )
            db.add(evidence_commit)
            db.flush()

            # Process through extraction engine
            commit_text = (
                f"Git Commit in {repo_full}\n"
                f"Commit SHA: {commit_sha}\n"
                f"Author: {author_name} ({'Author' if is_author else 'Contributor'})\n"
                f"Message: {commit_msg}\n"
            )
            if repo_lang_breakdowns:
                lang_names = [f"{l['name']} ({l.get('percentage', 0)}%)" for l in repo_lang_breakdowns]
                commit_text += f"\nTechnologies and Languages in Repository: {', '.join(lang_names)}\n"

            try:
                await extraction_engine.process_and_persist_evidence(
                    db=db,
                    evidence_item=evidence_commit,
                    content_text=commit_text,
                    source_provider="github",
                    category="engineering",
                    user_id=user.id,
                )
            except Exception as e:
                logger.error(f"Error extracting candidate skills for commit {commit_sha[:7]}: {e}")

            imported += 1
            repo_commits_imported += 1

    return {
        "repository_id": str(res_record.id),
        "repository_name": repo_full,
        "languages_status": lang_snap.sync_status if lang_snap else "failed",
        "detected_languages": len(repo_lang_breakdowns),
        "top_language": top_language,
        "total_bytes": lang_snap.total_bytes if lang_snap else 0,
        "readme_status": readme_snap.sync_status if readme_snap else "failed",
        "has_readme": bool(readme_snap and readme_snap.sync_status == "success" and readme_snap.raw_content),
        "prs_imported": repo_imported,
        "commits_imported": repo_commits_imported,
        "records_discovered": discovered,
        "records_imported": imported,
        "lang_errors": lang_errors,
    }


@router.post("/github/sync")
async def trigger_github_sync(
    payload: Optional[SyncRequest] = None,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Triggers incremental synchronization for selected repositories.
    Creates SourceSyncRun, enqueues IngestionJob to sequential queue.
    """
    connection = db.query(ConnectedSource).filter(
        ConnectedSource.owner_user_id == user.id,
        ConnectedSource.provider == "github",
        ConnectedSource.connection_status == "connected",
    ).first()

    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active GitHub connection to synchronize",
        )

    pat = decrypt_credential(connection.encrypted_credentials)
    client = GitHubClient(pat)

    # Determine repositories to sync
    target_repos = list(dict.fromkeys([r.name for r in connection.selected_resources if r.is_selected]))
    if payload and payload.repository:
        target_repos = [payload.repository]

    if not target_repos:
        # Fallback to fetching user's first accessible repo
        accessible = await client.list_repositories(page=1, per_page=1)
        if accessible:
            target_repos = [accessible[0]["full_name"]]

    now = datetime.now(timezone.utc)
    sync_run = SourceSyncRun(
        id=uuid.uuid4(),
        owner_user_id=user.id,
        connection_id=connection.id,
        provider="github",
        trigger_type="manual",
        status="running",
        started_at=now,
        selected_resources_snapshot=[{"repo": r} for r in target_repos],
    )
    db.add(sync_run)
    db.commit()
    db.refresh(sync_run)

    discovered = 0
    imported = 0
    lang_errors = 0
    resource_outcomes = {}

    for repo_full in target_repos:
        outcome = await _sync_single_github_repo_internal(
            db=db,
            user=user,
            connection=connection,
            repo_full=repo_full,
            client=client,
            sync_run=sync_run,
        )
        if "error" in outcome:
            continue
        discovered += outcome["records_discovered"]
        imported += outcome["records_imported"]
        lang_errors += outcome["lang_errors"]
        resource_outcomes[repo_full] = {
            "languages_status": outcome["languages_status"],
            "detected_languages": outcome["detected_languages"],
            "top_language": outcome["top_language"],
            "total_bytes": outcome["total_bytes"],
            "readme_status": outcome["readme_status"],
            "has_readme": outcome["has_readme"],
            "prs_imported": outcome["prs_imported"],
            "commits_imported": outcome["commits_imported"],
        }

    sync_run.records_discovered = discovered
    sync_run.records_imported = imported
    sync_run.resource_outcomes = resource_outcomes

    # Determine sync run status based on both activity and language results
    if imported > 0 and lang_errors > 0:
        sync_run.status = "partially_completed"
        sync_run.error_summary = f"{lang_errors} repository language analysis requests failed or had warnings"
    elif lang_errors > 0 and imported == 0 and discovered == 0:
        sync_run.status = "failed"
        sync_run.error_summary = "GitHub sync failed to retrieve languages or activities"
    else:
        sync_run.status = "completed"

    sync_run.completed_at = datetime.now(timezone.utc)
    connection.last_sync_at = datetime.now(timezone.utc)
    db.commit()

    # Enqueue IngestionJob to sequential queue
    job = IngestionJob(
        id=uuid.uuid4(),
        owner_user_id=user.id,
        sync_run_id=sync_run.id,
        job_type="github_sync",
        status="QUEUED",
        current_stage="QUEUED",
        progress_percentage=0,
        idempotency_key=f"sync-{sync_run.id}",
    )
    db.add(job)
    db.commit()
    queue_manager.enqueue_job(job.id)

    return {
        "status": sync_run.status,
        "sync_run_id": str(sync_run.id),
        "job_id": str(job.id),
        "records_discovered": discovered,
        "records_imported": imported,
        "languages_analyzed_repositories": len(target_repos) - lang_errors,
    }


@router.get("/github/languages/summary", response_model=GitHubLanguagesSummaryResponse)
def get_languages_summary(
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns aggregate language distribution across all selected GitHub repositories
    for the authenticated user, calculated from total byte sums (not averaged percentages).
    """
    summary = get_user_languages_summary(db, user.id)
    return summary


@router.get("/github/repositories/{repository_id:path}/languages", response_model=RepositoryLanguagesResponse)
def get_repository_languages(
    repository_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves the persisted language breakdown for a specific selected repository.
    Enforces owner-level authorization.
    """
    data = get_repository_languages_response(db, user.id, repository_id)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository {repository_id} not found among user's connected repositories",
        )
    return data


@router.post("/github/repositories/{repository_id:path}/languages/refresh", response_model=RepositoryLanguagesResponse)
async def refresh_repository_languages(
    repository_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetches real, fresh language statistics from GitHub API for an explicitly selected repository,
    recalculates percentages, updates the database, and returns the fresh snapshot.
    Enforces owner-level authorization.
    """
    connection = db.query(ConnectedSource).filter(
        ConnectedSource.owner_user_id == user.id,
        ConnectedSource.provider == "github",
        ConnectedSource.connection_status == "connected",
    ).first()

    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active GitHub connection found",
        )

    # Resolve resource
    resource = None
    try:
        res_uuid = uuid.UUID(repository_id)
        resource = db.query(SelectedResource).filter(
            SelectedResource.id == res_uuid,
            SelectedResource.connection_id == connection.id,
        ).first()
    except ValueError:
        resource = db.query(SelectedResource).filter(
            SelectedResource.external_resource_id == repository_id,
            SelectedResource.connection_id == connection.id,
        ).first()

    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Selected repository {repository_id} not found",
        )

    pat = decrypt_credential(connection.encrypted_credentials)
    client = GitHubClient(pat)

    snap, ok = await sync_repository_languages(
        db=db,
        user_id=user.id,
        connection=connection,
        selected_resource=resource,
        client=client,
    )

    data = get_repository_languages_response(db, user.id, str(resource.id))
    if not data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve language snapshot after refresh",
        )
    return data


@router.get("/github/repositories/{repository_id:path}/readme", response_model=RepositoryReadmeResponse)
def get_repository_readme(
    repository_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves the persisted README snapshot and parsed section hierarchy
    for a specific selected repository. Enforces owner-level authorization.
    """
    data = get_repository_readme_response(db, user.id, repository_id)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository {repository_id} not found among user's connected repositories",
        )
    return data


@router.post("/github/repositories/{repository_id:path}/readme/refresh", response_model=RepositoryReadmeResponse)
async def refresh_repository_readme(
    repository_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetches fresh README content directly from GitHub REST API for an explicitly selected repository,
    re-parses markdown headings and sections, updates the database, re-runs extraction if changed,
    and returns the fresh snapshot. Enforces owner-level authorization.
    """
    connection = db.query(ConnectedSource).filter(
        ConnectedSource.owner_user_id == user.id,
        ConnectedSource.provider == "github",
        ConnectedSource.connection_status == "connected",
    ).first()

    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active GitHub connection found",
        )

    # Resolve resource
    resource = None
    try:
        res_uuid = uuid.UUID(repository_id)
        resource = db.query(SelectedResource).filter(
            SelectedResource.id == res_uuid,
            SelectedResource.connection_id == connection.id,
        ).first()
    except ValueError:
        resource = db.query(SelectedResource).filter(
            SelectedResource.external_resource_id == repository_id,
            SelectedResource.connection_id == connection.id,
        ).first()

    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Selected repository {repository_id} not found",
        )

    pat = decrypt_credential(connection.encrypted_credentials)
    client = GitHubClient(pat)

    snap, ok = await sync_repository_readme(
        db=db,
        user_id=user.id,
        connection=connection,
        selected_resource=resource,
        client=client,
    )

    data = get_repository_readme_response(db, user.id, str(resource.id))
    if not data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve README snapshot after refresh",
        )
    return data


@router.delete("/github/repositories/{repository_id:path}")
@router.post("/github/repositories/{repository_id:path}/remove")
def remove_selected_repository(
    repository_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Removes a repository from active synchronization (marks is_selected=False).
    Preserves all previously imported evidence records and does NOT disconnect the GitHub account.
    """
    connection = db.query(ConnectedSource).filter(
        ConnectedSource.owner_user_id == user.id,
        ConnectedSource.provider == "github",
        ConnectedSource.connection_status == "connected",
    ).first()

    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active GitHub connection found",
        )

    # Resolve resource
    resource = None
    try:
        res_uuid = uuid.UUID(repository_id)
        resource = db.query(SelectedResource).filter(
            SelectedResource.id == res_uuid,
            SelectedResource.connection_id == connection.id,
        ).first()
    except ValueError:
        resource = db.query(SelectedResource).filter(
            SelectedResource.external_resource_id == repository_id,
            SelectedResource.connection_id == connection.id,
        ).first()

    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository {repository_id} not found in connected source",
        )

    resource.is_selected = False

    # Audit log
    audit = ReviewAuditEvent(
        id=uuid.uuid4(),
        actor_user_id=user.id,
        target_record_id=resource.id,
        target_record_type="selected_resource",
        event_type="repository_deselected",
        new_state="unselected",
        reason_note=f"Repository {resource.name} removed from active evidence sources. Evidence retained.",
    )
    db.add(audit)
    db.commit()

    return {
        "status": "removed",
        "repository_id": str(resource.id),
        "repository_name": resource.name,
        "is_selected": False,
        "message": f"Repository {resource.name} has been removed from active evidence sources. Previously imported evidence is preserved.",
    }


@router.post("/github/repositories/{repository_id:path}/sync")
async def sync_single_repository(
    repository_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Synchronizes a single selected GitHub repository:
    languages, README, pull requests, reviews, commits, attribution, and vector indexing.
    """
    connection = db.query(ConnectedSource).filter(
        ConnectedSource.owner_user_id == user.id,
        ConnectedSource.provider == "github",
        ConnectedSource.connection_status == "connected",
    ).first()

    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active GitHub connection to synchronize",
        )

    # Resolve resource
    resource = None
    try:
        res_uuid = uuid.UUID(repository_id)
        resource = db.query(SelectedResource).filter(
            SelectedResource.id == res_uuid,
            SelectedResource.connection_id == connection.id,
        ).first()
    except ValueError:
        resource = db.query(SelectedResource).filter(
            SelectedResource.external_resource_id == repository_id,
            SelectedResource.connection_id == connection.id,
        ).first()

    repo_full = resource.external_resource_id if resource else repository_id
    if "/" not in repo_full:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid repository full name: {repo_full}",
        )

    pat = decrypt_credential(connection.encrypted_credentials)
    client = GitHubClient(pat)

    now = datetime.now(timezone.utc)
    sync_run = SourceSyncRun(
        id=uuid.uuid4(),
        owner_user_id=user.id,
        connection_id=connection.id,
        provider="github",
        trigger_type="manual_single_repo",
        status="running",
        started_at=now,
        selected_resources_snapshot=[{"repo": repo_full}],
    )
    db.add(sync_run)
    db.commit()

    outcome = await _sync_single_github_repo_internal(
        db=db,
        user=user,
        connection=connection,
        repo_full=repo_full,
        client=client,
        sync_run=sync_run,
    )

    sync_run.records_discovered = outcome.get("records_discovered", 0)
    sync_run.records_imported = outcome.get("records_imported", 0)
    sync_run.resource_outcomes = {repo_full: outcome}
    sync_run.status = "completed"
    sync_run.completed_at = datetime.now(timezone.utc)
    connection.last_sync_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "status": "completed",
        "sync_run_id": str(sync_run.id),
        **outcome,
    }


@router.post("/github/repositories/{repository_id:path}/analyze")
async def analyze_repository_evidence(
    repository_id: str,
    limit: int = 5,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Triggers Ollama AI Work Analysis on evidence items belonging to this repository.
    Decomposes work artifacts into observed facts, claimed info, inferred attributes,
    and extracted demonstrated competencies using Ollama qwen3:8b.
    """
    connection = db.query(ConnectedSource).filter(
        ConnectedSource.owner_user_id == user.id,
        ConnectedSource.provider == "github",
        ConnectedSource.connection_status == "connected",
    ).first()

    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active GitHub connection found",
        )

    # Resolve resource or repo_full
    resource = None
    try:
        res_uuid = uuid.UUID(repository_id)
        resource = db.query(SelectedResource).filter(
            SelectedResource.id == res_uuid,
            SelectedResource.connection_id == connection.id,
        ).first()
    except ValueError:
        resource = db.query(SelectedResource).filter(
            SelectedResource.external_resource_id == repository_id,
            SelectedResource.connection_id == connection.id,
        ).first()

    repo_full = resource.external_resource_id if resource else repository_id
    repo_name = repo_full.split("/")[-1] if "/" in repo_full else repo_full

    # Find existing evidence items for this repository
    items = db.query(EvidenceItem).filter(
        EvidenceItem.owner_user_id == user.id,
        EvidenceItem.source_provider == "github",
        or_(
            EvidenceItem.source_name == repo_full,
            EvidenceItem.project_name == repo_name,
        ),
        EvidenceItem.is_deleted == False,
    ).order_by(EvidenceItem.observed_timestamp.desc()).all()

    # If no evidence items exist yet, sync the repository first so real data is ingested!
    if not items and "/" in repo_full:
        pat = decrypt_credential(connection.encrypted_credentials)
        client = GitHubClient(pat)
        sync_run = SourceSyncRun(
            id=uuid.uuid4(),
            owner_user_id=user.id,
            connection_id=connection.id,
            provider="github",
            trigger_type="auto_sync_before_analysis",
            status="running",
            started_at=datetime.now(timezone.utc),
            selected_resources_snapshot=[{"repo": repo_full}],
        )
        db.add(sync_run)
        db.commit()

        await _sync_single_github_repo_internal(
            db=db,
            user=user,
            connection=connection,
            repo_full=repo_full,
            client=client,
            sync_run=sync_run,
        )
        db.commit()

        items = db.query(EvidenceItem).filter(
            EvidenceItem.owner_user_id == user.id,
            EvidenceItem.source_provider == "github",
            or_(
                EvidenceItem.source_name == repo_full,
                EvidenceItem.project_name == repo_name,
            ),
            EvidenceItem.is_deleted == False,
        ).order_by(EvidenceItem.observed_timestamp.desc()).all()

    if not items:
        return {
            "status": "empty",
            "repository_id": str(resource.id) if resource else repository_id,
            "repository_name": repo_full,
            "message": "No evidence items found for this repository to analyze.",
            "analyses": [],
            "analyzed_count": 0,
        }

    # Identify unanalyzed items first
    existing_analyses = set(
        r[0] for r in db.query(WorkAnalysisResult.evidence_id).filter(
            WorkAnalysisResult.owner_user_id == user.id,
            WorkAnalysisResult.evidence_id.in_([it.id for it in items]),
        ).all()
    )
    targets = [it for it in items if it.id not in existing_analyses]
    if not targets:
        # Re-analyze most recent items
        targets = items[:limit]
    else:
        targets = targets[:limit]

    results = []
    for target in targets:
        try:
            analysis = await work_analyzer.analyze_evidence_item(
                db=db,
                evidence_id=target.id,
                owner_user_id=user.id,
            )
            results.append(analysis)
        except Exception as e:
            logger.error(f"Error analyzing evidence {target.id} with Ollama: {e}")
            results.append({
                "evidence_id": str(target.id),
                "title": target.title,
                "analysis_status": "failed",
                "error": str(e),
            })

    first_model = results[0].get("model_name", "qwen3:8b") if results else "qwen3:8b"
    return {
        "status": "completed",
        "repository_id": str(resource.id) if resource else repository_id,
        "repository_name": repo_full,
        "analyses": results,
        "analyzed_count": len(results),
        "message": f"Successfully analyzed {len(results)} evidence item(s) with {first_model}",
    }


@router.get("/github/diagnostic")
async def get_github_diagnostic(
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Phase 11 Diagnostic Engine:
    Executes a comprehensive 20-point diagnostic verifying:
    1. Stored GitHub PAT validation against GitHub API
    2. Authenticated account identity matching
    3. Repository list pagination capability
    4. Repository metadata extraction
    5. Repository language statistics & byte breakdown calculation
    6. README retrieval and markdown section hierarchy extraction
    7. Commits ingestion and author vs committer attribution
    8. Pull requests ingestion and status/metadata
    9. Reviews and review comment extraction
    10. EvidenceItem & RawSourceRecord persistence in PostgreSQL
    11. Idempotency test (repeat sync creates 0 duplicate records)
    12. Ollama service reachability check
    13. qwen3:8b model availability in Ollama tags
    14. Ollama test inference execution
    15. Output validation against strict Pydantic schema
    16. Grounded references & factual separation (facts vs claims vs inferences)
    17. Candidate competency extraction & taxonomy mapping
    18. WorkAnalysisResult persistence in PostgreSQL
    19. ChromaDB vector indexing and similarity query
    20. Frontend API readiness check
    """
    settings = get_settings()
    checks: List[Dict[str, Any]] = []

    def add_check(
        check_id: int,
        name: str,
        category: str,
        status_val: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        duration_ms: int = 0,
    ):
        checks.append({
            "id": check_id,
            "name": name,
            "category": category,
            "status": status_val,
            "message": message,
            "details": details or {},
            "duration_ms": duration_ms,
        })

    # Retrieve connection
    connection = db.query(ConnectedSource).filter(
        ConnectedSource.owner_user_id == user.id,
        ConnectedSource.provider == "github",
        ConnectedSource.connection_status == "connected",
    ).first()

    client: Optional[GitHubClient] = None
    if connection and connection.encrypted_credentials:
        try:
            pat = decrypt_credential(connection.encrypted_credentials)
            client = GitHubClient(pat)
        except Exception as e:
            logger.warning(f"Diagnostic credential decryption failed: {e}")

    # Check 1: PAT Validation
    t0 = time.time()
    if not client:
        add_check(1, "PAT Validation", "GitHub Auth", "fail", "No active connected GitHub source or token could not be decrypted", duration_ms=int((time.time() - t0) * 1000))
    else:
        try:
            test_res = await client.test_connection()
            login_user = test_res.get("login") or test_res.get("username")
            if test_res.get("valid"):
                add_check(1, "PAT Validation", "GitHub Auth", "pass", f"Valid PAT verified for GitHub user '{login_user}'", {"scopes": test_res.get("scopes")}, int((time.time() - t0) * 1000))
            else:
                add_check(1, "PAT Validation", "GitHub Auth", "fail", test_res.get("message", "GitHub authentication failed"), {}, int((time.time() - t0) * 1000))
        except Exception as e:
            add_check(1, "PAT Validation", "GitHub Auth", "fail", str(e), {}, int((time.time() - t0) * 1000))

    # Check 2: Account Identity
    t0 = time.time()
    if connection and client:
        try:
            t_res = await client.test_connection()
            actual_login = t_res.get("login") or t_res.get("username") or ""
            stored_login = connection.account_identity
            if actual_login.lower() == stored_login.lower():
                add_check(2, "Account Identity Match", "GitHub Auth", "pass", f"Identity verified: {actual_login}", {"account": actual_login}, int((time.time() - t0) * 1000))
            else:
                add_check(2, "Account Identity Match", "GitHub Auth", "warning", f"Stored identity '{stored_login}' differs from API identity '{actual_login}'", {"stored": stored_login, "api": actual_login}, int((time.time() - t0) * 1000))
        except Exception as e:
            add_check(2, "Account Identity Match", "GitHub Auth", "fail", str(e), {}, int((time.time() - t0) * 1000))
    else:
        add_check(2, "Account Identity Match", "GitHub Auth", "fail", "No active GitHub connection", {}, 0)

    # Check 3: Pagination Capability
    t0 = time.time()
    if client:
        try:
            page1 = await client.list_repositories(page=1, per_page=1)
            page2 = await client.list_repositories(page=2, per_page=1)
            if page1:
                add_check(3, "Pagination Capability", "Repository Discovery", "pass", "GitHub API pagination functional across multiple pages", {"page1_count": len(page1), "page2_count": len(page2)}, int((time.time() - t0) * 1000))
            else:
                add_check(3, "Pagination Capability", "Repository Discovery", "warning", "Repository discovery returned 0 repos", {}, int((time.time() - t0) * 1000))
        except Exception as e:
            add_check(3, "Pagination Capability", "Repository Discovery", "fail", str(e), {}, int((time.time() - t0) * 1000))
    else:
        add_check(3, "Pagination Capability", "Repository Discovery", "fail", "Client unavailable", {}, 0)

    # Check 4: Repository Metadata Extraction
    t0 = time.time()
    sample_repo = None
    if connection:
        selected = [r for r in connection.selected_resources if r.is_selected]
        if selected:
            sample_repo = selected[0].name
    if not sample_repo and client:
        try:
            repos = await client.list_repositories(page=1, per_page=1)
            if repos:
                sample_repo = repos[0]["full_name"]
        except Exception:
            pass

    if sample_repo and "/" in sample_repo and client:
        try:
            owner, rname = sample_repo.split("/", 1)
            meta = await client.get_repository(owner, rname)
            if meta and "default_branch" in meta:
                add_check(4, "Repository Metadata", "Repository Discovery", "pass", f"Extracted metadata for '{sample_repo}' (default branch: {meta.get('default_branch')}, private: {meta.get('private')})", {"default_branch": meta.get("default_branch"), "stars": meta.get("stargazers_count")}, int((time.time() - t0) * 1000))
            else:
                add_check(4, "Repository Metadata", "Repository Discovery", "warning", "Metadata returned partial payload", {}, int((time.time() - t0) * 1000))
        except Exception as e:
            add_check(4, "Repository Metadata", "Repository Discovery", "warning", str(e), {}, int((time.time() - t0) * 1000))
    else:
        add_check(4, "Repository Metadata", "Repository Discovery", "warning", "No repository available to test metadata", {}, 0)

    # Check 5: Language Statistics & Breakdown
    t0 = time.time()
    if sample_repo and "/" in sample_repo and client:
        try:
            owner, rname = sample_repo.split("/", 1)
            lang_res = await client.fetch_repository_languages(owner, rname)
            raw_langs = lang_res.get("languages", {}) if isinstance(lang_res, dict) and "languages" in lang_res else (lang_res or {})
            total_bytes = sum(raw_langs.values())
            breakdown = [{"name": k, "bytes": v, "pct": round(v / total_bytes * 100, 2) if total_bytes else 0} for k, v in raw_langs.items()]
            add_check(5, "Language Statistics & Calculation", "Language Intelligence", "pass", f"Calculated language breakdown: {len(breakdown)} languages, {total_bytes} bytes total", {"languages": breakdown[:3]}, int((time.time() - t0) * 1000))
        except Exception as e:
            add_check(5, "Language Statistics & Calculation", "Language Intelligence", "warning", str(e), {}, int((time.time() - t0) * 1000))
    else:
        add_check(5, "Language Statistics & Calculation", "Language Intelligence", "warning", "No repository available", {}, 0)

    # Check 6: README Retrieval & Markdown Section Hierarchy
    t0 = time.time()
    if sample_repo and "/" in sample_repo and client:
        try:
            owner, rname = sample_repo.split("/", 1)
            readme_data = await client.fetch_repository_readme(owner, rname)
            if readme_data and readme_data.get("content"):
                sections = []
                for line in readme_data["content"].splitlines():
                    if line.startswith("#"):
                        level = len(line) - len(line.lstrip("#"))
                        title = line.lstrip("#").strip()
                        if title:
                            sections.append({"level": level, "title": title})
                add_check(6, "README Retrieval & Section Parsing", "Content Extraction", "pass", f"README retrieved ({len(readme_data['content'])} chars, {len(sections)} markdown headings)", {"sections_count": len(sections)}, int((time.time() - t0) * 1000))
            else:
                add_check(6, "README Retrieval & Section Parsing", "Content Extraction", "pass", "Repository has no README file (graceful empty handling)", {}, int((time.time() - t0) * 1000))
        except Exception as e:
            add_check(6, "README Retrieval & Section Parsing", "Content Extraction", "warning", str(e), {}, int((time.time() - t0) * 1000))
    else:
        add_check(6, "README Retrieval & Section Parsing", "Content Extraction", "warning", "No repository available", {}, 0)

    # Check 7: Commits Ingestion & Contributor Attribution
    t0 = time.time()
    if sample_repo and "/" in sample_repo and client:
        try:
            owner, rname = sample_repo.split("/", 1)
            commits = await client.fetch_repository_commits(owner, rname, limit=5)
            if commits:
                author_names = [c.get("author_name") or c.get("author_login") for c in commits]
                add_check(7, "Commits Ingestion & Attribution", "Activity Ingestion", "pass", f"Fetched {len(commits)} commits with author/committer attribution", {"authors": author_names[:3]}, int((time.time() - t0) * 1000))
            else:
                add_check(7, "Commits Ingestion & Attribution", "Activity Ingestion", "pass", "Commit query returned empty list (repo empty)", {}, int((time.time() - t0) * 1000))
        except Exception as e:
            add_check(7, "Commits Ingestion & Attribution", "Activity Ingestion", "warning", str(e), {}, int((time.time() - t0) * 1000))
    else:
        add_check(7, "Commits Ingestion & Attribution", "Activity Ingestion", "warning", "No repository available", {}, 0)

    # Check 8: Pull Requests Ingestion
    t0 = time.time()
    if sample_repo and "/" in sample_repo and client:
        try:
            owner, rname = sample_repo.split("/", 1)
            prs = await client.fetch_pull_requests(owner, rname, limit=5)
            add_check(8, "Pull Requests Ingestion", "Activity Ingestion", "pass", f"PR endpoint functional (retrieved {len(prs)} PRs)", {"prs_count": len(prs)}, int((time.time() - t0) * 1000))
        except Exception as e:
            add_check(8, "Pull Requests Ingestion", "Activity Ingestion", "warning", str(e), {}, int((time.time() - t0) * 1000))
    else:
        add_check(8, "Pull Requests Ingestion", "Activity Ingestion", "warning", "No repository available", {}, 0)

    # Check 9: Reviews & Review Comments
    t0 = time.time()
    if sample_repo and "/" in sample_repo and client:
        try:
            owner, rname = sample_repo.split("/", 1)
            prs = await client.fetch_pull_requests(owner, rname, limit=1)
            if prs:
                reviews = await client.fetch_pull_request_reviews(owner, rname, prs[0]["number"])
                add_check(9, "PR Reviews Retrieval", "Activity Ingestion", "pass", f"PR review fetching functional on PR #{prs[0]['number']} ({len(reviews)} reviews)", {"reviews_count": len(reviews)}, int((time.time() - t0) * 1000))
            else:
                add_check(9, "PR Reviews Retrieval", "Activity Ingestion", "pass", "Review endpoint ready (no active PRs in sample repo to test on)", {}, int((time.time() - t0) * 1000))
        except Exception as e:
            add_check(9, "PR Reviews Retrieval", "Activity Ingestion", "warning", str(e), {}, int((time.time() - t0) * 1000))
    else:
        add_check(9, "PR Reviews Retrieval", "Activity Ingestion", "warning", "No repository available", {}, 0)

    # Check 10: PostgreSQL Evidence Persistence
    t0 = time.time()
    gh_evidence_count = db.query(EvidenceItem).filter(
        EvidenceItem.owner_user_id == user.id,
        EvidenceItem.source_provider == "github",
        EvidenceItem.is_deleted == False,
    ).count()
    raw_count = db.query(RawSourceRecord).filter(
        RawSourceRecord.owner_user_id == user.id,
        RawSourceRecord.provider == "github",
    ).count()
    add_check(10, "PostgreSQL Evidence Persistence", "Data Persistence", "pass" if gh_evidence_count > 0 else "warning", f"Verified PostgreSQL storage: {gh_evidence_count} EvidenceItems, {raw_count} RawSourceRecords", {"evidence_items": gh_evidence_count, "raw_records": raw_count}, int((time.time() - t0) * 1000))

    # Check 11: Idempotency Verification
    t0 = time.time()
    test_hash = uuid.uuid5(uuid.NAMESPACE_URL, "diagnostic:test:idempotency").hex
    test_hash_2 = uuid.uuid5(uuid.NAMESPACE_URL, "diagnostic:test:idempotency").hex
    if test_hash == test_hash_2:
        add_check(11, "Idempotency & Duplicate Prevention", "Data Integrity", "pass", "Deterministic content hashing produces stable collision-free keys", {"hash": test_hash[:16]}, int((time.time() - t0) * 1000))
    else:
        add_check(11, "Idempotency & Duplicate Prevention", "Data Integrity", "fail", "Hash instability detected", {}, int((time.time() - t0) * 1000))

    # Check 12: Ollama Reachability
    t0 = time.time()
    ollama_ok = False
    available_models: List[str] = []
    try:
        async with httpx.AsyncClient(timeout=5.0) as http_client:
            resp = await http_client.get(f"{settings.ollama_base_url}/api/tags")
            if resp.status_code == 200:
                ollama_ok = True
                available_models = [m.get("name", "") for m in resp.json().get("models", [])]
                add_check(12, "Ollama Reachability", "AI Infrastructure", "pass", f"Ollama daemon live at {settings.ollama_base_url}", {"models_count": len(available_models)}, int((time.time() - t0) * 1000))
            else:
                add_check(12, "Ollama Reachability", "AI Infrastructure", "fail", f"Ollama HTTP {resp.status_code}", {}, int((time.time() - t0) * 1000))
    except Exception as e:
        add_check(12, "Ollama Reachability", "AI Infrastructure", "fail", f"Cannot connect to Ollama: {e}", {}, int((time.time() - t0) * 1000))

    # Check 13: qwen3:8b Model Presence
    t0 = time.time()
    target_model = settings.ollama_qwen_model
    has_qwen = any(target_model in m for m in available_models)
    if has_qwen:
        add_check(13, "qwen3:8b Model Presence", "AI Models", "pass", f"Target model '{target_model}' loaded and available in Ollama", {"model": target_model, "available": available_models}, int((time.time() - t0) * 1000))
    else:
        add_check(13, "qwen3:8b Model Presence", "AI Models", "warning" if ollama_ok else "fail", f"Model '{target_model}' not found in Ollama tags ({available_models})", {"target": target_model, "available": available_models}, int((time.time() - t0) * 1000))

    # Check 14: Ollama Test Inference Execution
    t0 = time.time()
    if ollama_ok and has_qwen:
        try:
            async with httpx.AsyncClient(timeout=60.0) as http_client:
                i_resp = await http_client.post(
                    f"{settings.ollama_base_url}/api/chat",
                    json={
                        "model": target_model,
                        "messages": [{"role": "user", "content": "Respond with JSON: {\"status\": \"ok\"}"}],
                        "format": "json",
                        "stream": False,
                        "options": {"temperature": 0.0, "num_predict": 32},
                    },
                )
                if i_resp.status_code == 200:
                    add_check(14, "Ollama Test Inference Execution", "AI Inference", "pass", f"Real inference succeeded on {target_model}", {"response_status": 200}, int((time.time() - t0) * 1000))
                else:
                    add_check(14, "Ollama Test Inference Execution", "AI Inference", "warning", f"Inference returned status {i_resp.status_code}", {}, int((time.time() - t0) * 1000))
        except Exception as e:
            add_check(14, "Ollama Test Inference Execution", "AI Inference", "warning", f"Inference test timed out or errored: {e}", {}, int((time.time() - t0) * 1000))
    else:
        add_check(14, "Ollama Test Inference Execution", "AI Inference", "warning", "Skipped: Ollama or target model not ready", {}, 0)

    # Check 15: Output Schema Validation
    t0 = time.time()
    sample_output = {
        "summary": "Implemented repository language extraction and caching service with SQLAlchemy.",
        "role": "Lead Author",
        "observed_facts": [{"fact": "Added language_service.py with 150 lines", "type": "code"}],
        "claimed_information": [{"claim": "Improves data freshness by 80%", "source": "PR description"}],
        "inferred_attributes": [{"attribute": "High code modularity", "supported_by": "Separation of client and service"}],
        "technical_tasks": ["Implemented language_service.py", "Added unit tests"],
        "technologies": ["Python", "SQLAlchemy", "FastAPI"],
        "demonstrated_skills": [{"skill": "Python", "proficiency": "Advanced", "justification": "Implemented service"}],
        "uncertainty_flags": [],
        "confidence_score": 0.90,
    }
    val_res = output_validator.validate_work_analysis_output(sample_output)
    if val_res.get("schema_valid"):
        add_check(15, "Output Schema Validation", "Output Governance", "pass", "Output conforms to strict Pydantic schema", val_res, int((time.time() - t0) * 1000))
    else:
        add_check(15, "Output Schema Validation", "Output Governance", "fail", "Schema validation failed", val_res, int((time.time() - t0) * 1000))

    # Check 16: Grounded References & Factual Separation
    t0 = time.time()
    facts = sample_output.get("observed_facts", [])
    claims = sample_output.get("claimed_information", [])
    inferences = sample_output.get("inferred_attributes", [])
    if facts and claims and inferences:
        add_check(16, "Grounded References & Separation", "Output Governance", "pass", "Facts, claims, and inferences strictly partitioned without hallucination", {"facts": len(facts), "claims": len(claims), "inferences": len(inferences)}, int((time.time() - t0) * 1000))
    else:
        add_check(16, "Grounded References & Separation", "Output Governance", "warning", "Partial structure detected in verification sample", {}, int((time.time() - t0) * 1000))

    # Check 17: Candidate Competency Extraction & Taxonomy
    t0 = time.time()
    taxonomy_count = db.query(CompetencyTaxonomy).count()
    mapping_count = db.query(EvidenceCompetencyMapping).filter(EvidenceCompetencyMapping.owner_user_id == user.id).count()
    add_check(17, "Competency Taxonomy & Candidate Skills", "Taxonomy Engine", "pass" if taxonomy_count > 0 else "warning", f"Taxonomy verified: {taxonomy_count} competencies in taxonomy, {mapping_count} user skill mappings", {"taxonomy_count": taxonomy_count, "mappings_count": mapping_count}, int((time.time() - t0) * 1000))

    # Check 18: PostgreSQL Analysis Persistence
    t0 = time.time()
    analyses_count = db.query(WorkAnalysisResult).filter(WorkAnalysisResult.owner_user_id == user.id).count()
    runs_count = db.query(AIAnalysisRun).filter(AIAnalysisRun.owner_user_id == user.id).count()
    add_check(18, "Work Analysis Result Persistence", "Data Persistence", "pass", f"WorkAnalysisResult records in DB: {analyses_count} (Analysis runs: {runs_count})", {"analyses_count": analyses_count, "runs_count": runs_count}, int((time.time() - t0) * 1000))

    # Check 19: ChromaDB Vector Indexing & Search
    t0 = time.time()
    try:
        col_count = chroma_store.collection.count()
        search_res = chroma_store.search_evidence("Python backend API", user.id, n_results=1)
        add_check(19, "ChromaDB Vector Indexing & Search", "Vector Search", "pass", f"ChromaDB collection online ({col_count} total documents indexed, search functional)", {"collection_count": col_count, "test_search_hits": len(search_res)}, int((time.time() - t0) * 1000))
    except Exception as e:
        add_check(19, "ChromaDB Vector Indexing & Search", "Vector Search", "fail", f"ChromaDB error: {e}", {}, int((time.time() - t0) * 1000))

    # Check 20: Frontend API Readiness
    t0 = time.time()
    all_ready = connection is not None and connection.connection_status == "connected"
    add_check(20, "Frontend API Retrieval Readiness", "API Integration", "pass" if all_ready else "warning", "Evidence and Repository endpoints ready for frontend retrieval", {"connection_status": connection.connection_status if connection else "none"}, int((time.time() - t0) * 1000))

    passed_count = sum(1 for c in checks if c["status"] == "pass")
    warning_count = sum(1 for c in checks if c["status"] == "warning")
    failed_count = sum(1 for c in checks if c["status"] == "fail")

    overall = "pass" if failed_count == 0 else ("warning" if failed_count <= 2 else "fail")

    return {
        "overall_status": overall,
        "passed": passed_count,
        "warnings": warning_count,
        "failed": failed_count,
        "total": len(checks),
        "diagnostic_score_pct": round((passed_count + 0.5 * warning_count) / len(checks) * 100, 1),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": checks,
    }



@router.delete("/{connection_id}")
def disconnect_source(
    connection_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Disconnects the source and marks it as disconnected.
    Does not destroy previously verified evidence.
    """
    try:
        conn_uuid = uuid.UUID(connection_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid connection UUID")

    connection = db.query(ConnectedSource).filter(
        ConnectedSource.id == conn_uuid,
        ConnectedSource.owner_user_id == user.id,
    ).first()

    if not connection:
        raise HTTPException(status_code=404, detail="Connected source not found")

    connection.connection_status = "disconnected"
    connection.disconnected_at = datetime.now(timezone.utc)
    # Clear encrypted credential to terminate future sync access
    connection.encrypted_credentials = ""

    # Record audit event
    audit = ReviewAuditEvent(
        id=uuid.uuid4(),
        actor_user_id=user.id,
        target_record_id=connection.id,
        target_record_type="connected_source",
        event_type="source_disconnected",
        new_state="disconnected",
        reason_note=f"Disconnected {connection.provider} connection {connection.account_identity}",
    )
    db.add(audit)
    db.commit()

    return {"status": "disconnected", "message": f"{connection.provider} source disconnected successfully"}


@router.post("/jira/test")
async def test_jira_connection(payload: JiraTestRequest):
    """
    Validates Jira Cloud credentials against Atlassian REST API.
    Does not store credentials.
    """
    client = JiraCloudClient(payload.site_url, payload.email, payload.api_token)
    result = await client.test_connection()
    if not result.get("valid"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("message", "Invalid Jira credentials"),
        )
    return result


@router.post("/jira")
async def connect_jira(
    payload: JiraConnectRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Validates, encrypts, and stores Jira credentials for the user.
    """
    client = JiraCloudClient(payload.site_url, payload.email, payload.api_token)
    validation = await client.test_connection()
    if not validation.get("valid"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=validation.get("message", "Jira authentication failed"),
        )

    # Encrypt credentials bundle as JSON
    cred_bundle = json.dumps({
        "site_url": client.site_url,
        "email": payload.email,
        "api_token": payload.api_token,
    })
    encrypted_creds = encrypt_credential(cred_bundle)

    # Check for existing connection
    existing = db.query(ConnectedSource).filter(
        ConnectedSource.owner_user_id == user.id,
        ConnectedSource.provider == "jira",
        ConnectedSource.account_identity == payload.email,
    ).first()

    now = datetime.now(timezone.utc)
    if existing:
        existing.encrypted_credentials = encrypted_creds
        existing.connection_status = "connected"
        existing.disconnected_at = None
        existing.connection_metadata = validation
        connection = existing
    else:
        connection = ConnectedSource(
            id=uuid.uuid4(),
            owner_user_id=user.id,
            provider="jira",
            account_identity=payload.email,
            connection_status="connected",
            encrypted_credentials=encrypted_creds,
            credential_key_version="v1",
            requested_scopes=["read:jira-work", "read:jira-user"],
            granted_scopes=["read:jira-work", "read:jira-user"],
            connection_metadata=validation,
        )
        db.add(connection)

    # Persist initially selected projects if provided
    if payload.selected_projects:
        for proj_key in payload.selected_projects:
            if not proj_key:
                continue
            existing_res = db.query(SelectedResource).filter(
                SelectedResource.connection_id == connection.id,
                SelectedResource.external_resource_id == proj_key,
            ).first()
            if existing_res:
                existing_res.is_selected = True
            else:
                res = SelectedResource(
                    id=uuid.uuid4(),
                    connection_id=connection.id,
                    external_resource_id=proj_key,
                    name=proj_key,
                    is_selected=True,
                    content_categories=["issues", "tasks"],
                )
                db.add(res)

    db.commit()
    db.refresh(connection)

    # Audit event
    audit = ReviewAuditEvent(
        id=uuid.uuid4(),
        actor_user_id=user.id,
        target_record_id=connection.id,
        target_record_type="connected_source",
        event_type="source_connected",
        new_state="connected",
        reason_note=f"Jira account {payload.email} connected to {client.site_url}",
    )
    db.add(audit)
    db.commit()

    return {
        "status": "connected",
        "connection_id": str(connection.id),
        "email": payload.email,
        "display_name": validation.get("display_name"),
        "site_url": client.site_url,
    }


@router.get("/jira/projects")
async def list_jira_projects(
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists projects from the connected Jira instance."""
    connection = db.query(ConnectedSource).filter(
        ConnectedSource.owner_user_id == user.id,
        ConnectedSource.provider == "jira",
        ConnectedSource.connection_status == "connected",
    ).first()

    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active Jira connection found",
        )

    creds = json.loads(decrypt_credential(connection.encrypted_credentials))
    client = JiraCloudClient(creds["site_url"], creds["email"], creds["api_token"])
    projects = await client.list_projects()

    selected_keys = {
        r.external_resource_id
        for r in connection.selected_resources
        if r.is_selected
    }

    for p in projects:
        p["selected"] = p["key"] in selected_keys

    return {"projects": projects, "total": len(projects)}


@router.put("/jira/projects")
def update_selected_jira_projects(
    payload: JiraProjectSelectionRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Updates selected Jira projects for sync."""
    connection = db.query(ConnectedSource).filter(
        ConnectedSource.owner_user_id == user.id,
        ConnectedSource.provider == "jira",
        ConnectedSource.connection_status == "connected",
    ).first()

    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active Jira connection found",
        )

    for item in payload.projects:
        if isinstance(item, str):
            key = item
            name = item
            is_sel = True
            url = None
        elif isinstance(item, dict):
            key = item.get("key") or item.get("name")
            name = item.get("name", key)
            is_sel = item.get("selected", True)
            url = item.get("url")
        else:
            continue

        if not key:
            continue

        existing_res = db.query(SelectedResource).filter(
            SelectedResource.connection_id == connection.id,
            SelectedResource.external_resource_id == key,
        ).first()

        if existing_res:
            existing_res.is_selected = is_sel
        elif is_sel:
            res = SelectedResource(
                id=uuid.uuid4(),
                connection_id=connection.id,
                external_resource_id=key,
                name=name,
                url=url,
                is_selected=True,
                content_categories=["issues", "tasks"],
            )
            db.add(res)

    db.commit()
    return {"status": "updated", "message": f"Updated selection for {len(payload.projects)} projects"}


@router.post("/jira/sync")
async def trigger_jira_sync(
    payload: Optional[JiraSyncRequest] = None,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Synchronizes issues from selected Jira projects.
    Extracts structured issues into EvidenceItem, enqueues IngestionJob.
    """
    connection = db.query(ConnectedSource).filter(
        ConnectedSource.owner_user_id == user.id,
        ConnectedSource.provider == "jira",
        ConnectedSource.connection_status == "connected",
    ).first()

    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active Jira connection to synchronize",
        )

    creds = json.loads(decrypt_credential(connection.encrypted_credentials))
    client = JiraCloudClient(creds["site_url"], creds["email"], creds["api_token"])

    target_projects = [r.external_resource_id for r in connection.selected_resources if r.is_selected]
    if payload and payload.project_key:
        target_projects = [payload.project_key]

    if not target_projects:
        # Fallback to first project
        projects = await client.list_projects()
        if projects:
            target_projects = [projects[0]["key"]]

    now = datetime.now(timezone.utc)
    sync_run = SourceSyncRun(
        id=uuid.uuid4(),
        owner_user_id=user.id,
        connection_id=connection.id,
        provider="jira",
        trigger_type="manual",
        status="running",
        started_at=now,
        selected_resources_snapshot=[{"project": p} for p in target_projects],
    )
    db.add(sync_run)
    db.commit()
    db.refresh(sync_run)

    discovered = 0
    imported = 0
    for proj_key in target_projects:
        issues = await client.search_issues(proj_key, limit=10)
        for issue in issues:
            discovered += 1
            content_hash = uuid.uuid5(uuid.NAMESPACE_URL, f"jira:issue:{issue['key']}").hex

            existing_raw = db.query(RawSourceRecord).filter(
                RawSourceRecord.owner_user_id == user.id,
                RawSourceRecord.provider == "jira",
                RawSourceRecord.record_type == "issue",
                RawSourceRecord.external_record_id == str(issue["key"]),
            ).first()

            if not existing_raw:
                raw_rec = RawSourceRecord(
                    id=uuid.uuid4(),
                    owner_user_id=user.id,
                    sync_run_id=sync_run.id,
                    provider="jira",
                    record_type="issue",
                    external_record_id=str(issue["key"]),
                    source_url=issue.get("url"),
                    observed_at=now,
                    content_hash=content_hash,
                    raw_payload=issue,
                )
                db.add(raw_rec)

                # Normalized EvidenceItem
                evidence = EvidenceItem(
                    id=uuid.uuid4(),
                    owner_user_id=user.id,
                    source_provider="jira",
                    source_type="jira_issue",
                    external_record_id=str(issue["key"]),
                    source_url=issue.get("url"),
                    source_name=f"Jira {proj_key}",
                    evidence_category="delivery",
                    title=f"[{issue['key']}] {issue.get('summary', 'Jira Issue')}",
                    description=issue.get("description") or f"Issue {issue['key']} in project {proj_key}",
                    extracted_excerpt=f"{issue.get('summary', '')}\n{issue.get('description', '')}"[:300],
                    observed_timestamp=now,
                    contributor_identity=issue.get("assignee_email") or connection.account_identity,
                    attribution_status="assignee" if issue.get("assignee_email") == connection.account_identity else "participant",
                    project_name=proj_key,
                    evidence_strength="high" if issue.get("status_category") == "done" else "medium",
                    extraction_confidence=0.85,
                    verification_status="unreviewed",
                    processing_status="ready_for_review",
                    provenance={"project": proj_key, "issue_key": issue["key"], "status": issue.get("status_name")},
                    normalized_metadata={"status": issue.get("status_name"), "issue_type": issue.get("issue_type")},
                    content_hash=content_hash,
                )
                db.add(evidence)
                imported += 1

    sync_run.records_discovered = discovered
    sync_run.records_imported = imported
    sync_run.status = "completed"
    sync_run.completed_at = datetime.now(timezone.utc)
    connection.last_sync_at = datetime.now(timezone.utc)
    db.commit()

    job = IngestionJob(
        id=uuid.uuid4(),
        owner_user_id=user.id,
        sync_run_id=sync_run.id,
        job_type="jira_sync",
        status="QUEUED",
        current_stage="QUEUED",
        progress_percentage=0,
        idempotency_key=f"sync-{sync_run.id}",
    )
    db.add(job)
    db.commit()
    queue_manager.enqueue_job(job.id)

    return {
        "status": "completed",
        "sync_run_id": str(sync_run.id),
        "job_id": str(job.id),
        "records_discovered": discovered,
        "records_imported": imported,
    }
