import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from backend.core.config import get_settings
from backend.core.logging import get_logger
from backend.db.client import execute_with_retry, get_supabase_client
from backend.feature2.schemas import TrajectoryPrediction, TrajectoryTrend
from backend.feature3.catalog import (
    RecommendationCatalogService,
    normalize_competency_name,
)
from backend.feature3.mentorship_service import MentorshipMatchingService
from backend.feature3.schemas import (
    DeficiencyLevel,
    InterventionType,
    NextActionRecommendation,
    RecommendationExplanation,
    RecommendationPriority,
    RecommendationStatus,
)
from backend.feature3.youtube_service import YouTubeDiscoveryService

logger = get_logger("feature3.engine")


class NextActionRecommendationEngine:
    """Evidence-aware prescriptive recommendation engine.
    
    Transforms Feature 2 competency trajectory signals into targeted micro-learning
    and peer mentorship interventions grounded in real Feature 1 evidence.
    """

    def __init__(self):
        self.catalog = RecommendationCatalogService()
        self.youtube = YouTubeDiscoveryService()
        self.mentorship = MentorshipMatchingService()

    def generate_recommendation_for_trajectory(
        self,
        trajectory: TrajectoryPrediction,
        prefer_action: Optional[InterventionType] = None,
        explain_with_ai: bool = True,
    ) -> NextActionRecommendation:
        """Core pipeline: Evaluates trajectory, applies confidence gating, selects action, and persists."""
        emp_id = str(trajectory.employee_id)
        comp_id = str(trajectory.competency_id)
        comp_name = normalize_competency_name(trajectory.competency_name or comp_id)
        trend = trajectory.trend.value if isinstance(trajectory.trend, TrajectoryTrend) else str(trajectory.trend).lower()
        confidence = float(trajectory.confidence)

        logger.info(
            f"Evaluating Feature 3 recommendation for employee={emp_id}, "
            f"competency={comp_name}, trend={trend}, confidence={confidence:.2f}"
        )

        # ── 1. Confidence & Evidence Gating ──────────────────────────────────
        if trajectory.insufficient_evidence or trend == "insufficient_evidence":
            return self._build_insufficient_evidence_recommendation(trajectory, comp_name)

        if trend == "improving":
            # If previously had a declining recommendation, expire it
            self._expire_previous_corrective_recommendations(emp_id, comp_name)
            return self._build_improving_recognition(trajectory, comp_name)

        # Determine deficiency level from trend and confidence
        if trend == "declining":
            deficiency = DeficiencyLevel.HIGH if confidence >= 0.65 else DeficiencyLevel.MODERATE
            priority = RecommendationPriority.HIGH if confidence >= 0.65 else RecommendationPriority.MEDIUM
        else:  # stagnating
            deficiency = DeficiencyLevel.MODERATE if confidence >= 0.50 else DeficiencyLevel.LOW
            priority = RecommendationPriority.MEDIUM

        # ── 2. Catalog Lookup ───────────────────────────────────────────────
        rule = self.catalog.find_rule(
            competency_id_or_name=comp_name,
            deficiency_level=deficiency,
            prefer_action=prefer_action,
        )

        action_type = prefer_action or (rule.action_type if rule else InterventionType.MICRO_LEARNING)
        action_title = rule.action_title_template if rule else f"Focused Development in {comp_name}"
        action_desc = rule.action_description_template if rule else f"Observed {trend} trajectory in {comp_name}. Targeted intervention recommended."
        search_kw = rule.search_keyword_template if rule else f"{comp_name} tutorial guide"
        target_topics = rule.target_topics if rule else [comp_name]

        # ── 3. Resource Discovery or Mentorship Matching ─────────────────────
        resource_link = None
        mentor_sugg = None
        external_url = None

        if action_type == InterventionType.MICRO_LEARNING:
            resource_link = self.youtube.discover_resource(
                query=search_kw,
                target_topics=target_topics,
                competency_name=comp_name,
            )
            external_url = resource_link.deep_link_url if resource_link else None

        elif action_type == InterventionType.INTERNAL_MENTORSHIP:
            mentor_sugg = self.mentorship.get_top_mentor(
                competency_id_or_name=comp_name,
                exclude_employee_id=emp_id,
            )
            # If no mentor found, fall back to micro-learning
            if not mentor_sugg:
                logger.info(f"No qualifying mentor for {comp_name}. Falling back to micro-learning.")
                action_type = InterventionType.MICRO_LEARNING
                resource_link = self.youtube.discover_resource(
                    query=search_kw,
                    target_topics=target_topics,
                    competency_name=comp_name,
                )
                external_url = resource_link.deep_link_url if resource_link else None

        # ── 4. Retrieve Supporting Evidence Items ───────────────────────────
        ev_items = self._fetch_supporting_evidence_details(trajectory.supporting_evidence_ids)
        ev_ref_text = (
            trajectory.supporting_evidence_titles[0]
            if trajectory.supporting_evidence_titles
            else (trajectory.supporting_evidence_ids[0] if trajectory.supporting_evidence_ids else "Recent commit activity")
        )

        # ── 5. Grounded Explanation ──────────────────────────────────────────
        ai_exp = None
        if explain_with_ai:
            ai_exp = self._generate_explanation(
                emp_id=emp_id,
                competency=comp_name,
                trend=trend,
                action_title=action_title,
                action_type=action_type.value,
                evidence_items=ev_items,
                confidence=confidence,
            )

        # ── 6. Assemble Recommendation Object ────────────────────────────────
        rec_id = str(uuid4())
        recommendation = NextActionRecommendation(
            id=rec_id,
            employee_id=emp_id,
            competency_id=comp_id,
            competency_name=comp_name,
            trend=trend,
            confidence=confidence,
            deficiency_level=deficiency,
            priority=priority,
            action=action_title,
            action_type=action_type,
            status=RecommendationStatus.GENERATED,
            justification=action_desc,
            evidence_ref=ev_ref_text,
            evidence_refs=trajectory.supporting_evidence_ids,
            supporting_evidence_details=ev_items,
            external_link=external_url,
            resource=resource_link,
            mentor_suggestion=mentor_sugg,
            ai_explanation=ai_exp,
            metadata={
                "search_query": search_kw,
                "timestamp_available": resource_link.timestamp_available if resource_link else False,
                "timestamp_seconds": resource_link.timestamp_seconds if resource_link else None,
                "mentor_id": mentor_sugg.mentor_id if mentor_sugg else None,
                "days_since_last_evidence": trajectory.days_since_last_evidence,
            },
        )

        # ── 7. Deduplicate & Persist in Supabase ──────────────────────────────
        self._persist_recommendation(recommendation)

        return recommendation

    def generate_recommendations_for_employee(
        self,
        employee_id: str,
        explain_with_ai: bool = False,
    ) -> List[NextActionRecommendation]:
        """Fetch all Feature 2 trajectories for employee and generate recommendations."""
        recommendations: List[NextActionRecommendation] = []

        try:
            from backend.feature2.api import get_inference_service
            f2_service = get_inference_service()
            trajectories = f2_service.predict_employee_trajectories(employee_id, persist=False)
        except Exception as e:
            logger.warning(f"Could not load live LSTM trajectories for {employee_id}: {e}. Querying DB table.")
            trajectories = self._load_trajectories_from_db(employee_id)

        for traj in trajectories:
            rec = self.generate_recommendation_for_trajectory(
                trajectory=traj,
                explain_with_ai=explain_with_ai,
            )
            recommendations.append(rec)

        # Prioritize: declining first, then stagnating, then insufficient/improving
        priority_map = {"declining": 0, "stagnating": 1, "insufficient_evidence": 2, "improving": 3}
        recommendations.sort(key=lambda r: (priority_map.get(r.trend, 4), -r.confidence))

        return recommendations

    def update_recommendation_status(self, recommendation_id: str, new_status: RecommendationStatus) -> Dict[str, Any]:
        """Update recommendation lifecycle state (started, completed, dismissed)."""
        client = get_supabase_client()
        now = datetime.now(timezone.utc).isoformat()

        def _update():
            # Retrieve current metadata
            res = client.table("recommendations").select("metadata").eq("id", recommendation_id).execute()
            meta = (res.data[0].get("metadata") or {}) if res.data else {}
            meta["status"] = new_status.value
            meta["status_updated_at"] = now

            return client.table("recommendations").update({
                "metadata": meta,
            }).eq("id", recommendation_id).execute()

        try:
            execute_with_retry(_update)
            logger.info(f"Updated recommendation {recommendation_id} status to {new_status.value}")
            return {"id": recommendation_id, "status": new_status.value, "updated_at": now}
        except Exception as e:
            logger.error(f"Failed to update recommendation status: {e}")
            return {"id": recommendation_id, "status": new_status.value, "updated_at": now, "warning": str(e)}

    # ──────────────────────────────────────────────────────────────────────────
    # Private Helpers
    # ──────────────────────────────────────────────────────────────────────────

    def _build_insufficient_evidence_recommendation(
        self, trajectory: TrajectoryPrediction, comp_name: str
    ) -> NextActionRecommendation:
        return NextActionRecommendation(
            id=str(uuid4()),
            employee_id=str(trajectory.employee_id),
            competency_id=str(trajectory.competency_id),
            competency_name=comp_name,
            trend="insufficient_evidence",
            confidence=0.0,
            deficiency_level=DeficiencyLevel.INSUFFICIENT,
            priority=RecommendationPriority.LOW,
            action="Continue building continuous engineering evidence",
            action_type=InterventionType.EVIDENCE_GATHERING,
            status=RecommendationStatus.GENERATED,
            justification=f"GrowthLens does not have enough recent evidence to recommend a targeted intervention for {comp_name}. More evidence is needed before prescribing a corrective action.",
            evidence_ref="Insufficient data window",
            evidence_refs=trajectory.supporting_evidence_ids,
            metadata={"insufficient_evidence": True},
        )

    def _build_improving_recognition(
        self, trajectory: TrajectoryPrediction, comp_name: str
    ) -> NextActionRecommendation:
        return NextActionRecommendation(
            id=str(uuid4()),
            employee_id=str(trajectory.employee_id),
            competency_id=str(trajectory.competency_id),
            competency_name=comp_name,
            trend="improving",
            confidence=float(trajectory.confidence),
            deficiency_level=DeficiencyLevel.LOW,
            priority=RecommendationPriority.LOW,
            action="Eligible as Peer Mentor & Advanced Practice",
            action_type=InterventionType.INTERNAL_MENTORSHIP,
            status=RecommendationStatus.GENERATED,
            justification=f"Demonstrating consistent momentum in {comp_name} with {float(trajectory.confidence)*100:.0f}% confidence. No corrective action required.",
            evidence_ref=trajectory.supporting_evidence_titles[0] if trajectory.supporting_evidence_titles else "Positive velocity",
            evidence_refs=trajectory.supporting_evidence_ids,
            metadata={"eligible_mentor": True},
        )

    def _generate_explanation(
        self,
        emp_id: str,
        competency: str,
        trend: str,
        action_title: str,
        action_type: str,
        evidence_items: List[Dict[str, Any]],
        confidence: float,
    ) -> RecommendationExplanation:
        """Synthesize explainability rationale grounded in triggering evidence."""
        ev_refs = [str(e.get("id") or e.get("title")) for e in evidence_items]
        primary_title = evidence_items[0].get("title", "observed work items") if evidence_items else "recent commits"

        reason = (
            f"Identified a {trend} trajectory in {competency} ({confidence*100:.0f}% confidence) based on {primary_title}. "
            f"This targeted {action_type.replace('_', ' ')} addresses specific execution gaps observed in recent evidence."
        )

        return RecommendationExplanation(
            action=action_title,
            action_type=action_type,
            target_gap=f"Observed drift in {competency} task completion velocity and review feedback",
            reason=reason,
            expected_benefit=f"Restores positive competency trajectory, solidifies core concepts, and prevents skill decay.",
            evidence_refs=ev_refs[:4],
            confidence=confidence,
        )

    def _fetch_supporting_evidence_details(self, evidence_ids: List[str]) -> List[Dict[str, Any]]:
        if not evidence_ids:
            return []
        client = get_supabase_client()
        details = []
        try:
            def _query():
                # Query top 4 evidence items
                return client.table("evidence").select("id, title, source, content, occurred_at").in_("id", evidence_ids[:4]).execute()

            res = execute_with_retry(_query)
            for r in res.data:
                details.append({
                    "id": str(r.get("id")),
                    "title": r.get("title"),
                    "source": r.get("source"),
                    "content": (r.get("content") or "")[:200],
                    "occurred_at": r.get("occurred_at"),
                })
        except Exception as e:
            logger.info(f"Could not fetch full evidence details for IDs {evidence_ids}: {e}")

        if not details:
            for eid in evidence_ids[:3]:
                details.append({"id": eid, "title": f"Evidence Record {eid}", "source": "github"})
        return details

    def _persist_recommendation(self, rec: NextActionRecommendation):
        """Persist recommendation into Supabase recommendations and recommendation_evidence tables."""
        client = get_supabase_client()
        # Avoid saving insufficient or pure recognition as urgent DB corrective rows if unnecessary
        try:
            meta = rec.metadata.copy()
            meta.update({
                "action_type": rec.action_type.value,
                "priority": rec.priority.value,
                "status": rec.status.value,
                "trend": rec.trend,
                "external_link": rec.external_link,
                "resource": rec.resource.model_dump() if rec.resource else None,
                "mentor_suggestion": rec.mentor_suggestion.model_dump() if rec.mentor_suggestion else None,
                "ai_explanation": rec.ai_explanation.model_dump() if rec.ai_explanation else None,
                "evidence_ref": rec.evidence_ref,
                "evidence_refs": rec.evidence_refs,
            })

            # Upsert into recommendations table
            def _insert():
                # Check if recommendation already exists for this employee + competency + status
                existing = (
                    client.table("recommendations")
                    .select("id")
                    .eq("employee_id", rec.employee_id)
                    .eq("competency_name", rec.competency_name)
                    .limit(1)
                    .execute()
                )
                if existing.data:
                    row_id = existing.data[0]["id"]
                    return client.table("recommendations").update({
                        "action": rec.action,
                        "justification": rec.justification,
                        "confidence": rec.confidence,
                        "evidence_sufficiency": "sufficient" if rec.trend != "insufficient_evidence" else "insufficient",
                        "metadata": meta,
                    }).eq("id", row_id).execute()
                else:
                    return client.table("recommendations").insert({
                        "id": rec.id,
                        "employee_id": rec.employee_id,
                        "competency_name": rec.competency_name,
                        "action": rec.action,
                        "justification": rec.justification,
                        "confidence": rec.confidence,
                        "evidence_sufficiency": "sufficient" if rec.trend != "insufficient_evidence" else "insufficient",
                        "metadata": meta,
                    }).execute()

            execute_with_retry(_insert)
            logger.info(f"Persisted Feature 3 recommendation for {rec.employee_id} -> {rec.competency_name}")
        except Exception as e:
            logger.warning(f"Could not persist recommendation in Supabase: {e}")

    def _expire_previous_corrective_recommendations(self, employee_id: str, competency_name: str):
        """When an employee's competency improves, mark older declining recommendations as expired."""
        try:
            client = get_supabase_client()
            def _expire():
                rows = (
                    client.table("recommendations")
                    .select("id, metadata")
                    .eq("employee_id", employee_id)
                    .eq("competency_name", competency_name)
                    .execute()
                )
                for r in rows.data:
                    meta = r.get("metadata") or {}
                    if meta.get("trend") == "declining":
                        meta["status"] = RecommendationStatus.EXPIRED.value
                        client.table("recommendations").update({"metadata": meta}).eq("id", r["id"]).execute()

            execute_with_retry(_expire)
        except Exception as e:
            logger.info(f"Could not expire old recommendations: {e}")

    def _load_trajectories_from_db(self, employee_id: str) -> List[TrajectoryPrediction]:
        """Fallback to loading from competency_trajectories table."""
        client = get_supabase_client()
        trajectories = []
        try:
            def _fetch():
                return client.table("competency_trajectories").select("*").eq("employee_id", employee_id).execute()

            res = execute_with_retry(_fetch)
            for r in res.data:
                trajectories.append(
                    TrajectoryPrediction(
                        id=str(r.get("id")),
                        employee_id=str(r.get("employee_id")),
                        competency_id=str(r.get("competency_id")),
                        competency_name=r.get("competency_name", "Technical Competency"),
                        trend=TrajectoryTrend(r.get("trend", "stagnating")),
                        confidence=float(r.get("confidence", 0.0)),
                        probabilities={
                            "improving": float(r.get("improving_probability", 0.0)),
                            "stagnating": float(r.get("stagnating_probability", 0.0)),
                            "declining": float(r.get("declining_probability", 0.0)),
                        },
                        freshness=r.get("freshness_state", "fresh"),
                        days_since_last_evidence=int(r.get("days_since_last_evidence", 0)),
                        evidence_count=int(r.get("evidence_count", 0)),
                        insufficient_evidence=bool(r.get("insufficient_evidence", False)),
                        supporting_evidence_ids=r.get("supporting_evidence_ids") or [],
                        supporting_evidence_titles=r.get("supporting_evidence_titles") or [],
                        explanation=r.get("explanation"),
                    )
                )
        except Exception as e:
            logger.error(f"Error reading DB trajectories: {e}")
        return trajectories
