"""Manager View for Feature 2: Team Competency Trajectory Intelligence.
Provides manager-scoped endpoints to view authorized employees' LSTM trajectory
predictions, competency trends, and team-wide trajectory aggregations.

IMPORTANT: This does NOT duplicate the ML model, training pipeline, or trajectory
calculation logic. It reuses the exact same Feature2InferenceService and data from
the competency_trajectories table.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Query

from backend.core.dependencies import get_optional_profile
from backend.schemas.profile import UserProfile
from backend.db.client import get_supabase_client
from backend.core.logging import get_logger

logger = get_logger("api.manager_trajectory")

router = APIRouter(prefix="/manager/trajectory", tags=["Manager Trajectory Intelligence"])


def _require_manager(profile: Optional[UserProfile]):
    """Enforce manager/admin role when JWT is present; allow unauthenticated dev access."""
    if profile and profile.role not in ("MANAGER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Access denied: Manager role required.")


# ─── Helper: Fetch all employees visible to this manager ─────────────────────

def _get_visible_employees(department: Optional[str] = None, limit: int = 100) -> list:
    """Get all employees, optionally filtered by department."""
    client = get_supabase_client()
    query = client.table("employees").select(
        "id, name, email, department, role, organization_id"
    ).limit(limit)
    if department and isinstance(department, str) and department.strip():
        query = query.eq("department", department.strip())
    res = query.execute()
    return res.data or []


# ─── Helper: Fetch persisted trajectories from competency_trajectories ───────

def _get_trajectories_for_employees(employee_ids: List[str]) -> List[dict]:
    """Batch-fetch all persisted trajectory predictions for a list of employee IDs."""
    if not employee_ids:
        return []
    client = get_supabase_client()
    all_trajs = []
    # Supabase .in_ has practical limits around 100 items, batch if needed
    batch_size = 50
    for i in range(0, len(employee_ids), batch_size):
        batch = employee_ids[i:i + batch_size]
        res = client.table("competency_trajectories").select("*").in_(
            "employee_id", batch
        ).execute()
        if res.data:
            all_trajs.extend(res.data)
    return all_trajs


def _compute_freshness_label(days: int) -> str:
    if days <= 30:
        return "fresh"
    elif days <= 60:
        return "recent"
    elif days <= 90:
        return "aging"
    return "stale"


# ─── Endpoint 1: Team Trajectory Overview ────────────────────────────────────

@router.get("/team")
async def get_team_trajectory_overview(
    department: Optional[str] = Query(None, description="Filter by department"),
    profile: Optional[UserProfile] = Depends(get_optional_profile),
):
    """
    Returns an aggregated team trajectory overview showing each authorized
    employee's trajectory summary (trend distribution, evidence freshness,
    confidence) without exposing individual scores or creating rankings.
    """
    _require_manager(profile)

    employees = _get_visible_employees(department)
    if not employees:
        return {
            "team_members": [],
            "total_members": 0,
            "total_competencies_tracked": 0,
            "trend_distribution": {"improving": 0, "stagnating": 0, "declining": 0, "insufficient_evidence": 0},
            "average_confidence": 0.0,
            "department_filter": department,
        }

    emp_ids = [e["id"] for e in employees]
    emp_map = {e["id"]: e for e in employees}

    # Batch-fetch all trajectories
    all_trajs = _get_trajectories_for_employees(emp_ids)

    # Group by employee
    trajs_by_emp: Dict[str, List[dict]] = {}
    for t in all_trajs:
        eid = t.get("employee_id")
        if eid:
            trajs_by_emp.setdefault(eid, []).append(t)

    # Aggregate
    global_trend_dist = {"improving": 0, "stagnating": 0, "declining": 0, "insufficient_evidence": 0}
    all_confidences = []
    team_members = []

    for emp in employees:
        eid = emp["id"]
        emp_trajs = trajs_by_emp.get(eid, [])

        member_trend_dist = {"improving": 0, "stagnating": 0, "declining": 0, "insufficient_evidence": 0}
        member_confidences = []
        member_evidence_count = 0
        latest_evidence_at = None
        competency_count = len(emp_trajs)

        for t in emp_trajs:
            trend = t.get("trend", "insufficient_evidence")
            if trend in member_trend_dist:
                member_trend_dist[trend] += 1
                global_trend_dist[trend] += 1

            conf = t.get("confidence", 0.0)
            member_confidences.append(conf)
            all_confidences.append(conf)

            ec = t.get("evidence_count", 0)
            member_evidence_count += ec

            lea = t.get("last_evidence_at")
            if lea:
                if latest_evidence_at is None or lea > latest_evidence_at:
                    latest_evidence_at = lea

        avg_conf = round(sum(member_confidences) / len(member_confidences), 2) if member_confidences else 0.0

        # Determine dominant trend
        if member_trend_dist["declining"] > 0:
            dominant_trend = "attention_needed"
        elif member_trend_dist["improving"] > member_trend_dist["stagnating"]:
            dominant_trend = "improving"
        elif member_trend_dist["stagnating"] > 0:
            dominant_trend = "stagnating"
        elif member_trend_dist["insufficient_evidence"] > 0:
            dominant_trend = "insufficient_evidence"
        else:
            dominant_trend = "no_data"

        team_members.append({
            "employee_id": eid,
            "name": emp.get("name", "Unknown"),
            "email": emp.get("email", ""),
            "department": emp.get("department"),
            "competency_count": competency_count,
            "total_evidence": member_evidence_count,
            "average_confidence": avg_conf,
            "trend_distribution": member_trend_dist,
            "dominant_trend": dominant_trend,
            "latest_evidence_at": latest_evidence_at,
        })

    overall_avg_conf = round(sum(all_confidences) / len(all_confidences), 2) if all_confidences else 0.0

    return {
        "team_members": team_members,
        "total_members": len(employees),
        "total_competencies_tracked": sum(m["competency_count"] for m in team_members),
        "trend_distribution": global_trend_dist,
        "average_confidence": overall_avg_conf,
        "department_filter": department,
    }


# ─── Endpoint 2: Single Employee Trajectories (Manager View) ────────────────

@router.get("/team/{employee_id}")
async def get_employee_trajectories(
    employee_id: str,
    refresh: bool = Query(False, description="Force re-inference from LSTM model"),
    profile: Optional[UserProfile] = Depends(get_optional_profile),
):
    """
    Returns all competency trajectory predictions for a specific authorized employee.
    By default reads from persisted competency_trajectories table.
    If refresh=True, runs live LSTM inference (same model as employee view).
    """
    _require_manager(profile)

    if refresh:
        # Use the same inference service the employee view uses
        try:
            from backend.feature2.service import Feature2InferenceService
            service = Feature2InferenceService()
            predictions = service.predict_employee_trajectories(employee_id, persist=True)
            results = [p.model_dump(mode="json") for p in predictions]
        except Exception as e:
            logger.error(f"Error running live inference for {employee_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Trajectory inference failed: {str(e)}")
    else:
        # Read from persisted table
        client = get_supabase_client()

        # Try direct UUID match
        res = client.table("competency_trajectories").select("*").eq(
            "employee_id", employee_id
        ).execute()
        results = res.data or []

        # If no results, try resolving via employees table
        if not results:
            emp_res = client.table("employees").select("id").or_(
                f"id.eq.{employee_id},name.ilike.%{employee_id}%"
            ).limit(1).execute()
            if emp_res.data:
                resolved_id = emp_res.data[0]["id"]
                res = client.table("competency_trajectories").select("*").eq(
                    "employee_id", resolved_id
                ).execute()
                results = res.data or []

    # Enrich with employee name
    if results:
        emp_id = results[0].get("employee_id", employee_id)
        client = get_supabase_client()
        emp_res = client.table("employees").select("name, department").eq("id", emp_id).limit(1).execute()
        employee_name = emp_res.data[0]["name"] if emp_res.data else employee_id
        employee_dept = emp_res.data[0].get("department") if emp_res.data else None
    else:
        employee_name = employee_id
        employee_dept = None

    return {
        "employee_id": employee_id,
        "employee_name": employee_name,
        "department": employee_dept,
        "trajectory_count": len(results),
        "trajectories": results,
    }


# ─── Endpoint 3: Single Employee Single Competency Trajectory ────────────────

@router.get("/team/{employee_id}/{competency_id}")
async def get_employee_competency_trajectory(
    employee_id: str,
    competency_id: str,
    refresh: bool = Query(False, description="Force re-inference"),
    profile: Optional[UserProfile] = Depends(get_optional_profile),
):
    """
    Returns a single competency trajectory prediction for an authorized employee.
    Includes explanation, evidence citations, and confidence analysis.
    """
    _require_manager(profile)

    if refresh:
        try:
            from backend.feature2.service import Feature2InferenceService
            service = Feature2InferenceService()
            prediction = service.predict_competency_trajectory(employee_id, competency_id, persist=True)
            return prediction.model_dump(mode="json")
        except Exception as e:
            logger.error(f"Error running single competency inference: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    client = get_supabase_client()
    res = client.table("competency_trajectories").select("*").eq(
        "employee_id", employee_id
    ).eq("competency_id", competency_id).limit(1).execute()

    if not res.data:
        raise HTTPException(status_code=404, detail=f"No trajectory found for {employee_id}/{competency_id}")

    return res.data[0]


# ─── Endpoint 4: Team Trend Summary (aggregation only) ───────────────────────

@router.get("/trends")
async def get_team_trend_summary(
    department: Optional[str] = Query(None),
    profile: Optional[UserProfile] = Depends(get_optional_profile),
):
    """
    Returns competency-level trend aggregation across the team.
    Shows how many employees are improving/stagnating/declining per competency.
    Does NOT create rankings or scores comparisons.
    """
    _require_manager(profile)

    employees = _get_visible_employees(department)
    if not employees:
        return {"competency_trends": [], "department_filter": department}

    emp_ids = [e["id"] for e in employees]
    all_trajs = _get_trajectories_for_employees(emp_ids)

    # Group by competency
    by_comp: Dict[str, Dict[str, int]] = {}
    comp_names: Dict[str, str] = {}

    for t in all_trajs:
        cid = t.get("competency_id", "unknown")
        cname = t.get("competency_name", cid)
        comp_names[cid] = cname
        trend = t.get("trend", "insufficient_evidence")

        if cid not in by_comp:
            by_comp[cid] = {"improving": 0, "stagnating": 0, "declining": 0, "insufficient_evidence": 0}

        if trend in by_comp[cid]:
            by_comp[cid][trend] += 1

    competency_trends = []
    for cid, trends in sorted(by_comp.items()):
        total = sum(trends.values())
        competency_trends.append({
            "competency_id": cid,
            "competency_name": comp_names.get(cid, cid),
            "employee_count": total,
            "trend_distribution": trends,
            "health": "healthy" if trends["declining"] == 0 else (
                "at_risk" if trends["declining"] <= 1 else "critical"
            ),
        })

    return {
        "competency_trends": competency_trends,
        "total_employees": len(employees),
        "department_filter": department,
    }


# ─── Endpoint 5: Departments list (for filter dropdowns) ─────────────────────

@router.get("/departments")
async def get_departments(
    profile: Optional[UserProfile] = Depends(get_optional_profile),
):
    """Returns distinct department values for UI filter dropdowns."""
    _require_manager(profile)

    client = get_supabase_client()
    res = client.table("employees").select("department").execute()
    departments = sorted(set(
        r["department"] for r in (res.data or [])
        if r.get("department") and isinstance(r["department"], str) and r["department"].strip()
    ))
    return {"departments": departments}
