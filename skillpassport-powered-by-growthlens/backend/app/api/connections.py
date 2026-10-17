from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from sqlalchemy.orm import Session
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
from backend.app.integrations.github.client import GitHubClient
from backend.app.integrations.jira.client import JiraCloudClient
from backend.app.integrations.github.language_service import (
    sync_repository_languages,
    get_repository_languages_response,
    get_user_languages_summary,
)
from backend.app.core.security import encrypt_credential, decrypt_credential
from backend.app.ingestion.pipeline import queue_manager
from backend.app.extraction.engine import extraction_engine
from backend.app.models.taxonomy import EvidenceCompetencyMapping
from backend.app.core.logging import get_logger

logger = get_logger("api.connections")
router = APIRouter(prefix="/connections", tags=["Connected Sources"])


# Pydantic Schemas
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
    sources = db.query(ConnectedSource).filter(
        ConnectedSource.owner_user_id == user.id,
        ConnectedSource.connection_status != "disconnected",
    ).all()

    results = []
    for s in sources:
        # Count imported records
        record_count = db.query(EvidenceItem).filter(
            EvidenceItem.owner_user_id == user.id,
            EvidenceItem.source_provider == s.provider,
        ).count()

        language_summary = None
        if s.provider == "github":
            selected_res_ids = [r.id for r in s.selected_resources if r.is_selected]
            if selected_res_ids:
                snapshots = db.query(RepositoryLanguageSnapshot).filter(
                    RepositoryLanguageSnapshot.selected_resource_id.in_(selected_res_ids),
                    RepositoryLanguageSnapshot.is_current == True,
                ).all()
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
    repos = await client.list_repositories(page=page, per_page=per_page)

    # Cross-reference with selected_resources and existing language snapshots
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
                r["languages_status"] = "not_synced"
                r["detected_languages_count"] = 0
                r["total_language_bytes"] = 0
                r["last_language_sync_at"] = None
                r["languages"] = []
        else:
            r["resource_id"] = None
            r["languages_status"] = "unselected"
            r["detected_languages_count"] = 0
            r["total_language_bytes"] = 0
            r["last_language_sync_at"] = None
            r["languages"] = []

    return {"repositories": repos, "page": page, "total_returned": len(repos)}


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

    # Fetch PRs and commits + Repository Language Statistics
    discovered = 0
    imported = 0
    lang_errors = 0
    resource_outcomes = {}

    for repo_full in target_repos:
        parts = repo_full.split("/")
        if len(parts) != 2:
            continue
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

        # 3. Fetch PRs
        prs = await client.fetch_pull_requests(owner, repo_name, limit=5)
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
                    },
                    normalized_metadata={
                        "author": pr.get("author_login"),
                        "merged": bool(pr.get("merged_at")),
                        "repository_languages": repo_lang_breakdowns,
                        "primary_language": top_language,
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
                # If PR was previously ingested but has no candidate skills extracted, backfill extraction
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

        resource_outcomes[repo_full] = {
            "languages_status": lang_snap.sync_status if lang_snap else "failed",
            "detected_languages": len(repo_lang_breakdowns),
            "top_language": top_language,
            "total_bytes": lang_snap.total_bytes if lang_snap else 0,
            "prs_imported": repo_imported,
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
