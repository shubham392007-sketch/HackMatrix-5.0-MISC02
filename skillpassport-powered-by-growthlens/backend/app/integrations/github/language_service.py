import uuid
import urllib.parse
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func, or_

from backend.app.models.connection import ConnectedSource, SelectedResource
from backend.app.models.language import RepositoryLanguageSnapshot, RepositoryLanguageBreakdown
from backend.app.models.sync_run import SourceSyncRun
from backend.app.integrations.github.client import GitHubClient
from backend.app.core.security import decrypt_credential
from backend.app.core.logging import get_logger

logger = get_logger("integrations.github.language_service")


def calculate_repository_percentages(languages: Dict[str, int]) -> Tuple[int, List[Dict[str, Any]]]:
    """
    Given a mapping of language name -> byte count from GitHub REST API:
    - Calculates total reported bytes: sum(language byte counts).
    - If total_bytes is 0 or languages is empty, returns (0, []). Never divides by zero.
    - For each language, calculates exact full-precision percentage: (bytes / total_bytes) * 100.
    - Sorts descending by byte count.
    """
    if not languages:
        return 0, []

    total_bytes = sum(int(v) for v in languages.values() if v > 0)
    if total_bytes <= 0:
        return 0, []

    breakdowns = []
    for lang, byte_count in sorted(languages.items(), key=lambda x: x[1], reverse=True):
        if byte_count <= 0:
            continue
        pct = (float(byte_count) / float(total_bytes)) * 100.0
        breakdowns.append({
            "language_name": lang,
            "byte_count": int(byte_count),
            "percentage": pct,
        })

    return total_bytes, breakdowns


def calculate_aggregate_languages(snapshots: List[RepositoryLanguageSnapshot]) -> Dict[str, Any]:
    """
    Calculates weighted aggregate language composition across multiple repositories.
    STRICT RULE:
    1. Sum byte counts per language across all selected repositories.
    2. Sum the total language bytes across those repositories.
    3. Calculate each language's aggregate percentage from those totals.
    NEVER average repository percentages.
    """
    total_aggregate_bytes = 0
    language_byte_sums: Dict[str, int] = {}

    for snap in snapshots:
        if snap.sync_status not in ("success", "partial"):
            continue
        for b in snap.breakdowns:
            if b.byte_count > 0:
                total_aggregate_bytes += b.byte_count
                language_byte_sums[b.language_name] = language_byte_sums.get(b.language_name, 0) + b.byte_count

    if total_aggregate_bytes <= 0 or not language_byte_sums:
        return {
            "total_bytes": 0,
            "languages": [],
        }

    agg_breakdowns = []
    for lang, b_sum in sorted(language_byte_sums.items(), key=lambda x: x[1], reverse=True):
        pct = (float(b_sum) / float(total_aggregate_bytes)) * 100.0
        agg_breakdowns.append({
            "name": lang,
            "bytes": b_sum,
            "percentage": pct,
        })

    return {
        "total_bytes": total_aggregate_bytes,
        "languages": agg_breakdowns,
    }


async def sync_repository_languages(
    db: Session,
    user_id: uuid.UUID,
    connection: ConnectedSource,
    selected_resource: SelectedResource,
    client: GitHubClient,
    sync_run_id: Optional[uuid.UUID] = None,
) -> Tuple[RepositoryLanguageSnapshot, bool]:
    """
    Fetches real language statistics for an explicitly selected repository,
    calculates exact percentages, and idempotently persists the snapshot and breakdown.
    
    If GitHub returns an empty dict or 0 bytes: records snapshot with sync_status="empty".
    If the API call fails: records snapshot with sync_status="failed" (preserving any previous valid data).
    
    Returns: (snapshot, is_success)
    """
    repo_full_name = selected_resource.external_resource_id
    parts = repo_full_name.split("/")
    if len(parts) != 2:
        logger.warning(f"Invalid repository full name format: {repo_full_name}")
        # Return fallback
        dummy_snap = RepositoryLanguageSnapshot(
            id=uuid.uuid4(),
            owner_user_id=user_id,
            selected_resource_id=selected_resource.id,
            repo_full_name=repo_full_name,
            connection_id=connection.id,
            sync_run_id=sync_run_id,
            total_bytes=0,
            sync_status="failed",
            error_summary="Invalid repository format",
            is_current=False,
        )
        return dummy_snap, False

    owner, repo_name = parts[0], parts[1]
    res = await client.fetch_repository_languages(owner, repo_name)
    now = datetime.now(timezone.utc)

    # Find existing current snapshot for this repository
    existing_snap = db.query(RepositoryLanguageSnapshot).filter(
        RepositoryLanguageSnapshot.selected_resource_id == selected_resource.id,
        RepositoryLanguageSnapshot.is_current == True,
    ).first()

    if not res.get("success"):
        error_msg = res.get("error") or "Failed to fetch repository languages"
        logger.warning(f"Language fetch failed for {repo_full_name}: {error_msg}")
        if existing_snap:
            # Preserve existing valid breakdown, record failure notice
            existing_snap.error_summary = error_msg
            db.commit()
            return existing_snap, False
        else:
            # Create failed snapshot record
            failed_snap = RepositoryLanguageSnapshot(
                id=uuid.uuid4(),
                owner_user_id=user_id,
                selected_resource_id=selected_resource.id,
                repo_full_name=repo_full_name,
                connection_id=connection.id,
                sync_run_id=sync_run_id,
                total_bytes=0,
                retrieval_timestamp=now,
                sync_status="failed",
                error_summary=error_msg,
                is_current=True,
            )
            db.add(failed_snap)
            db.commit()
            return failed_snap, False

    # Success from GitHub API
    languages_raw = res.get("languages", {})
    total_bytes, breakdowns_data = calculate_repository_percentages(languages_raw)

    sync_status = "success" if total_bytes > 0 else "empty"

    if existing_snap:
        # Update existing current snapshot to prevent unbounded row duplication on retries
        existing_snap.total_bytes = total_bytes
        existing_snap.retrieval_timestamp = now
        existing_snap.sync_status = sync_status
        existing_snap.error_summary = None
        existing_snap.sync_run_id = sync_run_id or existing_snap.sync_run_id

        # Replace breakdowns idempotently
        # Delete old breakdowns
        db.query(RepositoryLanguageBreakdown).filter(
            RepositoryLanguageBreakdown.snapshot_id == existing_snap.id
        ).delete()

        # Insert fresh breakdowns
        for b in breakdowns_data:
            breakdown_rec = RepositoryLanguageBreakdown(
                id=uuid.uuid4(),
                snapshot_id=existing_snap.id,
                language_name=b["language_name"],
                byte_count=b["byte_count"],
                percentage=b["percentage"],
            )
            db.add(breakdown_rec)

        db.commit()
        db.refresh(existing_snap)
        logger.info(f"Updated language snapshot for {repo_full_name} ({len(breakdowns_data)} languages, {total_bytes} bytes)")
        return existing_snap, True
    else:
        # Create fresh snapshot
        new_snap = RepositoryLanguageSnapshot(
            id=uuid.uuid4(),
            owner_user_id=user_id,
            selected_resource_id=selected_resource.id,
            repo_full_name=repo_full_name,
            connection_id=connection.id,
            sync_run_id=sync_run_id,
            total_bytes=total_bytes,
            retrieval_timestamp=now,
            sync_status=sync_status,
            error_summary=None,
            is_current=True,
        )
        db.add(new_snap)
        db.flush()

        for b in breakdowns_data:
            breakdown_rec = RepositoryLanguageBreakdown(
                id=uuid.uuid4(),
                snapshot_id=new_snap.id,
                language_name=b["language_name"],
                byte_count=b["byte_count"],
                percentage=b["percentage"],
            )
            db.add(breakdown_rec)

        db.commit()
        db.refresh(new_snap)
        logger.info(f"Created new language snapshot for {repo_full_name} ({len(breakdowns_data)} languages, {total_bytes} bytes)")
        return new_snap, True


def get_repository_languages_response(
    db: Session,
    user_id: uuid.UUID,
    repository_identifier: str,  # UUID string or full_name e.g. "owner/repo"
) -> Optional[Dict[str, Any]]:
    """
    Retrieves current language snapshot and breakdown for a selected repository.
    Enforces owner-level authorization.
    """
    # 1. Resolve SelectedResource
    decoded_id = urllib.parse.unquote(str(repository_identifier)).strip()
    resource = None
    try:
        res_uuid = uuid.UUID(decoded_id)
        resource = db.query(SelectedResource).join(ConnectedSource).filter(
            SelectedResource.id == res_uuid,
            ConnectedSource.owner_user_id == user_id,
        ).first()
    except (ValueError, AttributeError):
        pass

    if not resource:
        # Search by external_resource_id or name (unquoted or raw)
        resource = db.query(SelectedResource).join(ConnectedSource).filter(
            (SelectedResource.external_resource_id == decoded_id)
            | (SelectedResource.name == decoded_id)
            | (SelectedResource.external_resource_id == repository_identifier)
            | (SelectedResource.name == repository_identifier)
            | (SelectedResource.external_resource_id.ilike(f"%/{decoded_id}"))
            | (SelectedResource.name.ilike(f"%/{decoded_id}")),
            ConnectedSource.owner_user_id == user_id,
        ).first()

    if not resource:
        return None

    # 2. Get current snapshot
    snapshot = (
        db.query(RepositoryLanguageSnapshot)
        .options(selectinload(RepositoryLanguageSnapshot.breakdowns))
        .filter(
            RepositoryLanguageSnapshot.selected_resource_id == resource.id,
            RepositoryLanguageSnapshot.owner_user_id == user_id,
            RepositoryLanguageSnapshot.is_current == True,
        )
        .first()
    )

    if not snapshot:
        return {
            "repository_id": str(resource.id),
            "repository_name": resource.external_resource_id,
            "sync_status": "not_synced",
            "total_bytes": 0,
            "retrieval_timestamp": None,
            "languages": [],
            "error_summary": None,
        }

    languages_list = [
        {
            "name": b.language_name,
            "bytes": b.byte_count,
            "percentage": round(b.percentage, 2),
        }
        for b in snapshot.breakdowns
    ]

    return {
        "repository_id": str(resource.id),
        "repository_name": snapshot.repo_full_name,
        "sync_status": snapshot.sync_status,
        "total_bytes": snapshot.total_bytes,
        "retrieval_timestamp": snapshot.retrieval_timestamp.isoformat() if snapshot.retrieval_timestamp else None,
        "languages": languages_list,
        "error_summary": snapshot.error_summary,
    }


def get_user_languages_summary(db: Session, user_id: uuid.UUID) -> Dict[str, Any]:
    """
    Returns aggregate language distribution across all explicitly selected
    GitHub repositories of the authenticated user.
    """
    # Find active GitHub connection
    connection = db.query(ConnectedSource).filter(
        ConnectedSource.owner_user_id == user_id,
        ConnectedSource.provider == "github",
        ConnectedSource.connection_status == "connected",
    ).first()

    if not connection:
        return {
            "total_selected_repositories": 0,
            "repositories_with_languages": 0,
            "total_bytes": 0,
            "last_synced_at": None,
            "aggregate_languages": [],
            "repositories": [],
        }

    # Get all selected resources for this connection
    selected_resources = db.query(SelectedResource).filter(
        SelectedResource.connection_id == connection.id,
        SelectedResource.is_selected == True,
    ).all()

    resource_ids = [r.id for r in selected_resources]
    if not resource_ids:
        return {
            "total_selected_repositories": 0,
            "repositories_with_languages": 0,
            "total_bytes": 0,
            "last_synced_at": connection.last_sync_at.isoformat() if connection.last_sync_at else None,
            "aggregate_languages": [],
            "repositories": [],
        }

    # Fetch current snapshots for selected resources with eager loaded breakdowns
    snapshots = (
        db.query(RepositoryLanguageSnapshot)
        .options(selectinload(RepositoryLanguageSnapshot.breakdowns))
        .filter(
            RepositoryLanguageSnapshot.selected_resource_id.in_(resource_ids),
            RepositoryLanguageSnapshot.owner_user_id == user_id,
            RepositoryLanguageSnapshot.is_current == True,
        )
        .all()
    )

    # Calculate weighted aggregate
    agg_result = calculate_aggregate_languages(snapshots)

    # Format per-repository items
    repo_results = []
    synced_count = 0
    latest_fetch: Optional[datetime] = None

    snap_by_res_id = {s.selected_resource_id: s for s in snapshots}

    for res in selected_resources:
        snap = snap_by_res_id.get(res.id)
        if snap:
            if snap.retrieval_timestamp:
                if latest_fetch is None or snap.retrieval_timestamp > latest_fetch:
                    latest_fetch = snap.retrieval_timestamp
            if snap.sync_status == "success":
                synced_count += 1

            langs = [
                {
                    "name": b.language_name,
                    "bytes": b.byte_count,
                    "percentage": round(b.percentage, 2),
                }
                for b in snap.breakdowns
            ]
            top_lang = langs[0]["name"] if langs else None

            repo_results.append({
                "repository_id": str(res.id),
                "repository_name": res.external_resource_id,
                "sync_status": snap.sync_status,
                "total_bytes": snap.total_bytes,
                "detected_languages_count": len(langs),
                "top_language": top_lang,
                "last_retrieved_at": snap.retrieval_timestamp.isoformat() if snap.retrieval_timestamp else None,
                "languages": langs,
                "error_summary": snap.error_summary,
            })
        else:
            repo_results.append({
                "repository_id": str(res.id),
                "repository_name": res.external_resource_id,
                "sync_status": "not_synced",
                "total_bytes": 0,
                "detected_languages_count": 0,
                "top_language": None,
                "last_retrieved_at": None,
                "languages": [],
                "error_summary": None,
            })

    # Round aggregate percentages
    rounded_agg = [
        {
            "name": l["name"],
            "bytes": l["bytes"],
            "percentage": round(l["percentage"], 2),
        }
        for l in agg_result.get("languages", [])
    ]

    return {
        "total_selected_repositories": len(selected_resources),
        "repositories_with_languages": synced_count,
        "total_bytes": agg_result.get("total_bytes", 0),
        "last_synced_at": latest_fetch.isoformat() if latest_fetch else (connection.last_sync_at.isoformat() if connection.last_sync_at else None),
        "aggregate_languages": rounded_agg,
        "repositories": repo_results,
    }
