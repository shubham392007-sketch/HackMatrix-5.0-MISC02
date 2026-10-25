import uuid
import urllib.parse
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.models.connection import ConnectedSource, SelectedResource
from backend.app.models.evidence import EvidenceItem
from backend.app.models.readme import RepositoryReadmeSnapshot
from backend.app.integrations.github.client import GitHubClient
from backend.app.extraction.engine import extraction_engine
from backend.app.core.logging import get_logger

logger = get_logger("integrations.github.readme_service")


async def sync_repository_readme(
    db: Session,
    user_id: uuid.UUID,
    connection: ConnectedSource,
    selected_resource: SelectedResource,
    client: GitHubClient,
    sync_run_id: Optional[uuid.UUID] = None,
    trigger_extraction: bool = False,
) -> Tuple[Optional[RepositoryReadmeSnapshot], bool]:
    """
    Synchronizes the README for an explicitly selected repository:
    1. Fetches official README content from GitHub REST API via GET /repos/{owner}/{repo}/readme.
    2. Validates content, decodes base64, parses Markdown section hierarchy.
    3. Handles idempotency: if unchanged by Git blob SHA / content_hash, reuses existing snapshot.
    4. Persists versioned RepositoryReadmeSnapshot.
    5. Ingests into EvidenceItem with source_provider="github", source_type="readme".
    6. Optionally triggers extraction_engine when trigger_extraction=True (defaults to False for fast preview).
    7. Accurately records empty or permission-denied states (no fake successful extraction).
    """
    repo_full = selected_resource.external_resource_id
    parts = repo_full.split("/")
    if len(parts) != 2:
        logger.warning(f"Invalid repository full name for README sync: {repo_full}")
        return None, False

    owner, repo_name = parts[0], parts[1]
    res = await client.fetch_repository_readme(owner, repo_name)

    now = datetime.now(timezone.utc)
    existing_snapshot = db.query(RepositoryReadmeSnapshot).filter(
        RepositoryReadmeSnapshot.selected_resource_id == selected_resource.id,
        RepositoryReadmeSnapshot.owner_user_id == user_id,
        RepositoryReadmeSnapshot.is_current == True,
    ).first()

    if res.get("success"):
        sha = res.get("sha") or ""
        content_hash = res.get("content_hash") or ""
        raw_content = res.get("content") or ""
        sections = res.get("sections") or []

        # Idempotency check: if unchanged, update retrieval timestamp and return
        if (
            existing_snapshot
            and existing_snapshot.sync_status == "success"
            and existing_snapshot.blob_sha == sha
            and existing_snapshot.content_hash == content_hash
        ):
            logger.info(f"README for {repo_full} is unchanged (blob_sha={sha}). Reusing snapshot.")
            existing_snapshot.retrieval_timestamp = now
            db.commit()
            return existing_snapshot, True

        # Archive old snapshot
        if existing_snapshot:
            existing_snapshot.is_current = False
            db.flush()

        # Insert new current snapshot
        snapshot = RepositoryReadmeSnapshot(
            id=uuid.uuid4(),
            owner_user_id=user_id,
            selected_resource_id=selected_resource.id,
            repo_full_name=repo_full,
            connection_id=connection.id,
            sync_run_id=sync_run_id,
            readme_path=res.get("path") or "README.md",
            blob_sha=sha,
            html_url=res.get("html_url"),
            content_hash=content_hash,
            raw_content=raw_content,
            extracted_summary=raw_content[:400] if raw_content else None,
            sections_json=sections,
            sync_status="success",
            error_summary=None,
            retrieval_timestamp=now,
            is_current=True,
        )
        db.add(snapshot)
        db.flush()

        # Ingest or update EvidenceItem for this README
        existing_evidence = db.query(EvidenceItem).filter(
            EvidenceItem.owner_user_id == user_id,
            EvidenceItem.source_provider == "github",
            EvidenceItem.source_type == "readme",
            EvidenceItem.source_name == repo_full,
        ).first()

        section_titles = [s.get("title", "") for s in sections if s.get("title")]

        if existing_evidence:
            evidence = existing_evidence
            evidence.external_record_id = f"gh:readme:{repo_full}:{sha}"
            evidence.source_url = res.get("html_url")
            evidence.observed_timestamp = now
            evidence.content_hash = content_hash
            evidence.extracted_excerpt = raw_content[:1000]
            evidence.provenance = {
                "repo": repo_full,
                "readme_path": res.get("path") or "README.md",
                "blob_sha": sha,
                "content_hash": content_hash,
                "sections": section_titles,
            }
            evidence.normalized_metadata = {
                "repo": repo_full,
                "author": connection.account_identity,
                "sections_count": len(sections),
                "size": res.get("size") or len(raw_content),
            }
        else:
            evidence = EvidenceItem(
                id=uuid.uuid4(),
                owner_user_id=user_id,
                source_provider="github",
                source_type="readme",
                external_record_id=f"gh:readme:{repo_full}:{sha}",
                source_url=res.get("html_url"),
                source_name=repo_full,
                evidence_category="engineering",
                title=f"{repo_full} README",
                description=f"Project documentation and architectural specification for {repo_full}",
                extracted_excerpt=raw_content[:1000],
                observed_timestamp=now,
                contributor_identity=connection.account_identity,
                attribution_status="author",
                project_name=repo_name,
                evidence_strength="high",
                extraction_confidence=0.90,
                verification_status="unreviewed",
                processing_status="ready_for_review",
                provenance={
                    "repo": repo_full,
                    "readme_path": res.get("path") or "README.md",
                    "blob_sha": sha,
                    "content_hash": content_hash,
                    "sections": section_titles,
                },
                normalized_metadata={
                    "repo": repo_full,
                    "author": connection.account_identity,
                    "sections_count": len(sections),
                    "size": res.get("size") or len(raw_content),
                },
                content_hash=content_hash,
            )
            db.add(evidence)
            db.flush()

        # Execute extraction engine to propose candidate competencies and index in vector store if requested
        if trigger_extraction:
            try:
                full_text = f"Repository {repo_full} Project README:\n\n{raw_content}"
                await extraction_engine.process_and_persist_evidence(
                    db=db,
                    evidence_item=evidence,
                    content_text=full_text,
                    source_provider="github",
                    category="engineering",
                    user_id=user_id,
                )
            except Exception as e:
                logger.error(f"Error extracting candidate skills from README for {repo_full}: {e}")

        db.commit()
        return snapshot, True

    else:
        # Handle failures accurately
        status_code = res.get("status_code", 0)
        err_cat = res.get("error_category")
        if status_code == 404 or err_cat == "NOT_FOUND":
            sync_status = "not_found"
        elif status_code == 403 or err_cat == "FORBIDDEN":
            sync_status = "forbidden"
        elif err_cat == "RATE_LIMITED":
            sync_status = "rate_limited"
        else:
            sync_status = "failed"

        if existing_snapshot:
            existing_snapshot.is_current = False
            db.flush()

        snapshot = RepositoryReadmeSnapshot(
            id=uuid.uuid4(),
            owner_user_id=user_id,
            selected_resource_id=selected_resource.id,
            repo_full_name=repo_full,
            connection_id=connection.id,
            sync_run_id=sync_run_id,
            readme_path="README.md",
            blob_sha=None,
            html_url=None,
            content_hash=None,
            raw_content=None,
            sections_json=[],
            sync_status=sync_status,
            error_summary=res.get("error") or "README could not be retrieved from GitHub API",
            retrieval_timestamp=now,
            is_current=True,
        )
        db.add(snapshot)
        db.commit()
        return snapshot, False


def get_repository_readme_response(
    db: Session,
    user_id: uuid.UUID,
    repository_id: str,
) -> Optional[Dict[str, Any]]:
    """
    Retrieves the persisted current README snapshot for a repository.
    Enforces owner-level authorization.
    """
    connection = db.query(ConnectedSource).filter(
        ConnectedSource.owner_user_id == user_id,
        ConnectedSource.provider == "github",
        ConnectedSource.connection_status == "connected",
    ).first()

    if not connection:
        return None

    # Resolve resource
    decoded_id = urllib.parse.unquote(str(repository_id)).strip()
    resource = None
    try:
        res_uuid = uuid.UUID(decoded_id)
        resource = db.query(SelectedResource).filter(
            SelectedResource.id == res_uuid,
            SelectedResource.connection_id == connection.id,
        ).first()
    except (ValueError, AttributeError):
        pass

    if not resource:
        resource = db.query(SelectedResource).filter(
            (SelectedResource.external_resource_id == decoded_id)
            | (SelectedResource.name == decoded_id)
            | (SelectedResource.external_resource_id == repository_id)
            | (SelectedResource.name == repository_id)
            | (SelectedResource.external_resource_id.ilike(f"%/{decoded_id}"))
            | (SelectedResource.name.ilike(f"%/{decoded_id}")),
            SelectedResource.connection_id == connection.id,
        ).first()

    if not resource:
        if "/" in decoded_id or "/" in repository_id:
            return {
                "repository_id": str(repository_id),
                "repository_name": decoded_id,
                "sync_status": "not_synced",
                "readme_path": "README.md",
                "blob_sha": None,
                "html_url": None,
                "content_hash": None,
                "raw_content": None,
                "sections": [],
                "retrieval_timestamp": None,
                "error_summary": "README has not been synchronized yet.",
            }
        return None

    snapshot = db.query(RepositoryReadmeSnapshot).filter(
        RepositoryReadmeSnapshot.selected_resource_id == resource.id,
        RepositoryReadmeSnapshot.owner_user_id == user_id,
        RepositoryReadmeSnapshot.is_current == True,
    ).first()

    if not snapshot:
        return {
            "repository_id": str(resource.id),
            "repository_name": resource.name,
            "sync_status": "not_synced",
            "readme_path": "README.md",
            "blob_sha": None,
            "html_url": None,
            "content_hash": None,
            "raw_content": None,
            "sections": [],
            "retrieval_timestamp": None,
            "error_summary": "README has not been synchronized yet.",
        }

    return {
        "repository_id": str(resource.id),
        "repository_name": snapshot.repo_full_name,
        "sync_status": snapshot.sync_status,
        "readme_path": snapshot.readme_path,
        "blob_sha": snapshot.blob_sha,
        "html_url": snapshot.html_url,
        "content_hash": snapshot.content_hash,
        "raw_content": snapshot.raw_content,
        "sections": snapshot.sections_json or [],
        "retrieval_timestamp": snapshot.retrieval_timestamp.isoformat() if snapshot.retrieval_timestamp else None,
        "error_summary": snapshot.error_summary,
    }
