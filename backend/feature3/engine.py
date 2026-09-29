import json
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from backend.core.config import get_settings
from backend.core.logging import get_logger
from backend.db.client import execute_with_retry, get_supabase_client
from backend.db.repositories.evidence import EvidenceRepository
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
    ResourceDeepLink,
)
from backend.feature3.youtube_service import YouTubeDiscoveryService
from backend.rag.retriever import EvidenceRetriever

logger = get_logger("feature3.engine")

KNOWN_TECH_KEYWORDS = [
    "fastapi", "docker", "kubernetes", "k8s", "ci/cd", "ci", "github actions",
    "pytest", "pydantic", "postgresql", "postgres", "sqlite", "mysql", "redis",
    "asyncio", "celery", "pandas", "polars", "numpy", "react", "next.js", "nextjs",
    "typescript", "javascript", "python", "graphql", "rest", "api", "opentelemetry",
    "prometheus", "grafana", "git", "jwt", "auth", "security", "microservices",
    "exception handling", "concurrency", "unit testing", "integration testing",
    "schema", "etl", "data pipeline", "database migration", "caching", "container",
]


class NextActionRecommendationEngine:
    """Evidence-aware prescriptive recommendation engine.
    
    Transforms Feature 2 competency trajectory signals into targeted micro-learning
    and peer mentorship interventions grounded in real Feature 1 evidence via RAG
    and live YouTube API resource discovery.
    """

    def __init__(self):
        self.catalog = RecommendationCatalogService()
        self.youtube = YouTubeDiscoveryService()
        self.mentorship = MentorshipMatchingService()
        self.retriever = EvidenceRetriever()
        self.evidence_repo = EvidenceRepository()

    def generate_recommendation_for_trajectory(
        self,
        trajectory: TrajectoryPrediction,
        prefer_action: Optional[InterventionType] = None,
        explain_with_ai: bool = True,
    ) -> NextActionRecommendation:
        """Core pipeline: Evaluates trajectory, extracts skills via RAG, discovers YouTube resources, and persists."""
        emp_id = str(trajectory.employee_id)
        comp_id = str(trajectory.competency_id)
        comp_name = normalize_competency_name(trajectory.competency_name or comp_id)
        trend = trajectory.trend.value if isinstance(trajectory.trend, TrajectoryTrend) else str(trajectory.trend).lower()
        confidence = float(trajectory.confidence)

        logger.info(
            f"Evaluating Feature 3 recommendation for employee={emp_id}, "
            f"competency={comp_name}, trend={trend}, confidence={confidence:.2f}"
        )

        # ── 1. RAG-Based Evidence & Skill Extraction ─────────────────────────
        rag_evidence, extracted_skills = self._extract_skills_and_evidence_with_rag(
            emp_id=emp_id,
            comp_name=comp_name,
            trajectory=trajectory,
        )

        # ── 2. Confidence & Evidence Gating ──────────────────────────────────
        if trajectory.insufficient_evidence or trend == "insufficient_evidence":
            return self._build_insufficient_evidence_recommendation(
                trajectory, comp_name, rag_evidence, extracted_skills
            )

        if trend == "improving":
            # If previously had a declining recommendation, expire it
            self._expire_previous_corrective_recommendations(emp_id, comp_name)
            return self._build_improving_recognition(
                trajectory, comp_name, rag_evidence, extracted_skills
            )

        # ── 3. Lagging Competency (Declining or Stagnating) Handling ──────────
        if trend == "declining":
            deficiency = DeficiencyLevel.HIGH if confidence >= 0.65 else DeficiencyLevel.MODERATE
            priority = RecommendationPriority.HIGH
        else:  # stagnating
            deficiency = DeficiencyLevel.MODERATE if confidence >= 0.50 else DeficiencyLevel.LOW
            priority = RecommendationPriority.HIGH if confidence >= 0.75 else RecommendationPriority.MEDIUM

        # ── 4. Catalog Rule Lookup ───────────────────────────────────────────
        rule = self.catalog.find_rule(
            competency_id_or_name=comp_name,
            deficiency_level=deficiency,
            prefer_action=prefer_action,
        )

        action_type = prefer_action or (rule.action_type if rule else InterventionType.MICRO_LEARNING)
        action_title = rule.action_title_template if rule else f"Focused Development in {comp_name}"
        action_desc = rule.action_description_template if rule else f"Observed {trend} trajectory in {comp_name}. Targeted intervention recommended."
        target_topics = list(rule.target_topics) if rule and rule.target_topics else [comp_name]

        # Domain keywords mapping to prevent cross-domain search pollution
        competency_domain_skills = {
            "DevOps & Cloud Infrastructure": ["docker", "kubernetes", "k8s", "ci/cd", "ci", "github actions", "container", "deployment", "render", "cloud", "opentelemetry", "prometheus", "grafana"],
            "Backend Engineering & API Development": ["fastapi", "api", "asyncio", "python", "rest", "graphql", "celery", "exception handling", "concurrency", "jwt", "auth", "middleware"],
            "Quality Assurance & Testing": ["pytest", "testing", "unit testing", "integration testing", "mock", "test automation", "e2e"],
            "Data Processing & Analytics": ["pandas", "polars", "pydantic", "etl", "data pipeline", "schema", "batch processing", "analytics", "numpy"],
            "Database Systems & Storage": ["postgresql", "postgres", "sql", "sqlite", "mysql", "redis", "database migration", "indexing", "caching"],
            "Technical Communication & Collaboration": ["git", "code review", "technical writing", "adr", "rfc", "documentation", "collaboration", "swagger", "openapi"],
        }
        allowed_domain = competency_domain_skills.get(comp_name, [])
        domain_skills = [s for s in extracted_skills if any(ad in s or s in ad for ad in allowed_domain)]

        # Enforce target topics from domain-filtered extracted skills
        for s in domain_skills:
            if s not in target_topics:
                target_topics.append(s)

        # Construct specific search query for YouTube API based on domain-relevant extracted skills
        if domain_skills:
            skill_focus = " ".join(domain_skills[:2])
            search_kw = f"{comp_name} {skill_focus} tutorial"
        elif rule and rule.search_keyword_template:
            search_kw = rule.search_keyword_template
        else:
            search_kw = f"{comp_name} tutorial guide"

        # ── 5. YouTube API Discovery & Peer Mentorship Matching ──────────────
        # For lagging skills, ALWAYS discover a real YouTube tutorial to ensure immediate self-serve learning
        resource_link = self.youtube.discover_resource(
            query=search_kw,
            target_topics=target_topics,
            competency_name=comp_name,
        )
        external_url = resource_link.deep_link_url if resource_link else None

        # Also search for an improving peer mentor in the organization
        mentor_sugg = self.mentorship.get_top_mentor(
            competency_id_or_name=comp_name,
            exclude_employee_id=emp_id,
        )

        # If action_type was set to mentorship but no mentor exists, mark as micro-learning
        if action_type == InterventionType.INTERNAL_MENTORSHIP and not mentor_sugg:
            action_type = InterventionType.MICRO_LEARNING

        # ── 6. Evidence References and Justification Rationale ───────────────
        ev_items = rag_evidence if rag_evidence else self._fetch_supporting_evidence_details(trajectory.supporting_evidence_ids)
        ev_ref_text = (
            ev_items[0].get("title")
            if ev_items
            else (
                trajectory.supporting_evidence_titles[0]
                if trajectory.supporting_evidence_titles
                else (trajectory.supporting_evidence_ids[0] if trajectory.supporting_evidence_ids else "Recent commit activity")
            )
        )
        ev_ids = [e["id"] for e in ev_items] if ev_items else trajectory.supporting_evidence_ids

        # Build grounded justification referencing authentic work signals
        grounded_justification = action_desc
        if ev_ref_text and ev_ref_text != "Recent commit activity":
            grounded_justification = (
                f"Identified {trend} trajectory in {comp_name} ({confidence*100:.0f}% confidence), "
                f"triggered by recent work item '{ev_ref_text[:90]}'. "
                f"Targeted intervention bridges core concepts in {', '.join(target_topics[:3])}."
            )

        # ── 7. Grounded Explanation ──────────────────────────────────────────
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
                extracted_skills=extracted_skills,
            )

        # ── 8. Assemble Recommendation Object ────────────────────────────────
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
            justification=grounded_justification,
            evidence_ref=ev_ref_text,
            evidence_refs=ev_ids,
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
                "extracted_skills": extracted_skills,
            },
        )

        # ── 9. Deduplicate & Persist in Supabase ──────────────────────────────
        self._persist_recommendation(recommendation)

        return recommendation

    def generate_recommendations_for_employee(
        self,
        employee_id: str,
        explain_with_ai: bool = False,
    ) -> List[NextActionRecommendation]:
        """Fetch all Feature 2 trajectories for employee, deduplicate by competency, and generate recommendations."""
        try:
            from backend.feature2.api import get_inference_service
            f2_service = get_inference_service()
            trajectories = f2_service.predict_employee_trajectories(employee_id, persist=False)
        except Exception as e:
            logger.warning(f"Could not load live LSTM trajectories for {employee_id}: {e}. Querying DB table.")
            trajectories = self._load_trajectories_from_db(employee_id)

        # ── Consolidate & Deduplicate trajectories per canonical competency ──
        # An employee may have multiple trajectories (e.g. from DB UUID and CSV).
        # We group by canonical name and choose the most informative trajectory.
        by_comp: Dict[str, List[TrajectoryPrediction]] = {}
        for t in trajectories:
            cname = normalize_competency_name(t.competency_name or t.competency_id)
            if cname not in by_comp:
                by_comp[cname] = []
            by_comp[cname].append(t)

        consolidated_trajectories: List[TrajectoryPrediction] = []
        for cname, candidate_list in by_comp.items():
            if len(candidate_list) == 1:
                consolidated_trajectories.append(candidate_list[0])
                continue

            # Prioritize:
            # 1. Non-insufficient evidence over insufficient
            # 2. Lagging status (declining=0, stagnating=1, improving=2, insufficient=3)
            # 3. Highest evidence_count
            # 4. Highest confidence
            def _sort_key(item: TrajectoryPrediction):
                tr_str = item.trend.value if isinstance(item.trend, TrajectoryTrend) else str(item.trend).lower()
                lag_priority = 0 if tr_str == "declining" else (1 if tr_str == "stagnating" else (2 if tr_str == "improving" else 3))
                is_insuff = 1 if (item.insufficient_evidence or tr_str == "insufficient_evidence") else 0
                return (is_insuff, lag_priority, -item.evidence_count, -item.confidence)

            candidate_list.sort(key=_sort_key)
            consolidated_trajectories.append(candidate_list[0])

        from concurrent.futures import ThreadPoolExecutor

        recommendations: List[NextActionRecommendation] = []
        with ThreadPoolExecutor(max_workers=min(len(consolidated_trajectories), 6)) as executor:
            futures = [
                executor.submit(self.generate_recommendation_for_trajectory, traj, None, explain_with_ai)
                for traj in consolidated_trajectories
            ]
            for f in futures:
                try:
                    recommendations.append(f.result())
                except Exception as e:
                    logger.error(f"Error generating recommendation: {e}")

        # Prioritize: declining first, then stagnating (lagging skills first), then insufficient, then improving
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
    # RAG & Skill Extraction
    # ──────────────────────────────────────────────────────────────────────────

    def _extract_skills_and_evidence_with_rag(
        self, emp_id: str, comp_name: str, trajectory: TrajectoryPrediction
    ) -> tuple[List[Dict[str, Any]], List[str]]:
        """Uses ChromaDB/Supabase evidence retriever to extract genuine work signals and skills."""
        details: List[Dict[str, Any]] = []
        extracted_skills: List[str] = []

        try:
            retrieved = self.retriever.retrieve(
                employee_id=emp_id,
                query=f"{comp_name} engineering code commit pull request",
                competency=comp_name,
                limit=4,
            )
            for r in retrieved:
                details.append({
                    "id": r.evidence_id,
                    "title": r.title,
                    "source": r.source,
                    "content": (r.content or "")[:250],
                    "occurred_at": r.occurred_at,
                })
                # Scan for tech keywords
                combined_text = f"{r.title} {r.content or ''}".lower()
                for kw in KNOWN_TECH_KEYWORDS:
                    if re.search(r"\b" + re.escape(kw) + r"\b", combined_text):
                        if kw not in extracted_skills:
                            extracted_skills.append(kw)
        except Exception as e:
            logger.warning(f"RAG retrieval encountered issue for {emp_id}:{comp_name}: {e}")

        # If empty from retriever, fallback to trajectory's existing supporting evidence IDs
        if not details and trajectory.supporting_evidence_ids:
            details = self._fetch_supporting_evidence_details(trajectory.supporting_evidence_ids)
            for d in details:
                combined_text = f"{d.get('title', '')} {d.get('content', '')}".lower()
                for kw in KNOWN_TECH_KEYWORDS:
                    if re.search(r"\b" + re.escape(kw) + r"\b", combined_text):
                        if kw not in extracted_skills:
                            extracted_skills.append(kw)

        return details, extracted_skills

    # ──────────────────────────────────────────────────────────────────────────
    # Private Helpers for Recommendations
    # ──────────────────────────────────────────────────────────────────────────

    def _build_insufficient_evidence_recommendation(
        self,
        trajectory: TrajectoryPrediction,
        comp_name: str,
        rag_evidence: List[Dict[str, Any]],
        extracted_skills: List[str],
    ) -> NextActionRecommendation:
        # Discover a foundational crash course tutorial via YouTube API
        search_kw = f"{comp_name} complete crash course tutorial for beginners"
        resource_link = self.youtube.discover_resource(
            query=search_kw,
            target_topics=[comp_name, "foundations", "getting started"],
            competency_name=comp_name,
        )
        external_url = resource_link.deep_link_url if resource_link else None

        ev_ref = (
            rag_evidence[0].get("title")
            if rag_evidence
            else "Initial telemetry window"
        )
        ev_ids = [e["id"] for e in rag_evidence] if rag_evidence else trajectory.supporting_evidence_ids

        return NextActionRecommendation(
            id=str(uuid4()),
            employee_id=str(trajectory.employee_id),
            competency_id=str(trajectory.competency_id),
            competency_name=comp_name,
            trend="insufficient_evidence",
            confidence=0.0,
            deficiency_level=DeficiencyLevel.INSUFFICIENT,
            priority=RecommendationPriority.LOW,
            action=f"Foundational Ramp-Up in {comp_name}",
            action_type=InterventionType.MICRO_LEARNING,
            status=RecommendationStatus.GENERATED,
            justification=f"GrowthLens observed under 3 recent evidence records for {comp_name}. Complete this foundational crash course to ramp up core patterns and begin producing verified evidence.",
            evidence_ref=ev_ref,
            evidence_refs=ev_ids,
            supporting_evidence_details=rag_evidence,
            external_link=external_url,
            resource=resource_link,
            metadata={"insufficient_evidence": True, "search_query": search_kw},
        )

    def _build_improving_recognition(
        self,
        trajectory: TrajectoryPrediction,
        comp_name: str,
        rag_evidence: List[Dict[str, Any]],
        extracted_skills: List[str],
    ) -> NextActionRecommendation:
        # Discover an advanced architectural masterclass tutorial via YouTube API
        search_kw = f"Advanced {comp_name} system design architecture masterclass"
        resource_link = self.youtube.discover_resource(
            query=search_kw,
            target_topics=[comp_name, "advanced architecture", "system design", "best practices"],
            competency_name=comp_name,
        )
        external_url = resource_link.deep_link_url if resource_link else None

        ev_ref = (
            rag_evidence[0].get("title")
            if rag_evidence
            else (
                trajectory.supporting_evidence_titles[0]
                if trajectory.supporting_evidence_titles
                else "Positive evidence velocity"
            )
        )
        ev_ids = [e["id"] for e in rag_evidence] if rag_evidence else trajectory.supporting_evidence_ids

        return NextActionRecommendation(
            id=str(uuid4()),
            employee_id=str(trajectory.employee_id),
            competency_id=str(trajectory.competency_id),
            competency_name=comp_name,
            trend="improving",
            confidence=float(trajectory.confidence),
            deficiency_level=DeficiencyLevel.LOW,
            priority=RecommendationPriority.LOW,
            action=f"Peer Mentor Eligibility & Advanced {comp_name} Masterclass",
            action_type=InterventionType.INTERNAL_MENTORSHIP,
            status=RecommendationStatus.GENERATED,
            justification=f"Demonstrating consistent momentum in {comp_name} with {float(trajectory.confidence)*100:.0f}% confidence. Eligible to serve as internal peer mentor or pursue advanced architectural mastery.",
            evidence_ref=ev_ref,
            evidence_refs=ev_ids,
            supporting_evidence_details=rag_evidence,
            external_link=external_url,
            resource=resource_link,
            metadata={"eligible_mentor": True, "search_query": search_kw},
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
        extracted_skills: Optional[List[str]] = None,
    ) -> RecommendationExplanation:
        """Synthesize explainability rationale grounded in triggering evidence and RAG extracted skills."""
        ev_refs = [str(e.get("id") or e.get("title")) for e in evidence_items]
        primary_title = evidence_items[0].get("title", "observed work items") if evidence_items else "recent commits"
        skills_str = f" involving {', '.join(extracted_skills[:3])}" if extracted_skills else ""

        reason = (
            f"Identified a {trend} trajectory in {competency} ({confidence*100:.0f}% confidence) based on verified work record '{primary_title}'{skills_str}. "
            f"This targeted {action_type.replace('_', ' ')} addresses specific execution gaps observed in recent engineering tasks."
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

    def _resolve_employee_uuid(self, emp_id: str) -> Optional[str]:
        """Resolves employee identifier (e.g. shubham_pokale) to a valid Supabase UUID."""
        try:
            resolved = self.evidence_repo._resolve_employee_uuid(emp_id)
            if resolved:
                return resolved
            # Check if emp_id itself is a valid UUID
            uuid.UUID(emp_id)
            return emp_id
        except Exception:
            return None

    def _persist_recommendation(self, rec: NextActionRecommendation):
        """Persist recommendation into Supabase recommendations table using valid UUID."""
        emp_uuid = self._resolve_employee_uuid(rec.employee_id)
        if not emp_uuid:
            logger.info(f"Skipping DB persistence for non-UUID employee identifier: {rec.employee_id}")
            return

        client = get_supabase_client()
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
                existing = (
                    client.table("recommendations")
                    .select("id")
                    .eq("employee_id", emp_uuid)
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
                        "employee_id": emp_uuid,
                        "competency_name": rec.competency_name,
                        "action": rec.action,
                        "justification": rec.justification,
                        "confidence": rec.confidence,
                        "evidence_sufficiency": "sufficient" if rec.trend != "insufficient_evidence" else "insufficient",
                        "metadata": meta,
                    }).execute()

            execute_with_retry(_insert)
            logger.info(f"Persisted Feature 3 recommendation for {emp_uuid} -> {rec.competency_name}")
        except Exception as e:
            logger.warning(f"Could not persist recommendation in Supabase: {e}")

    def _expire_previous_corrective_recommendations(self, employee_id: str, competency_name: str):
        """When an employee's competency improves, mark older declining recommendations as expired."""
        emp_uuid = self._resolve_employee_uuid(employee_id)
        if not emp_uuid:
            return

        try:
            client = get_supabase_client()
            def _expire():
                rows = (
                    client.table("recommendations")
                    .select("id, metadata")
                    .eq("employee_id", emp_uuid)
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
        emp_uuid = self._resolve_employee_uuid(employee_id) or employee_id
        client = get_supabase_client()
        trajectories = []
        try:
            def _fetch():
                return client.table("competency_trajectories").select("*").eq("employee_id", emp_uuid).execute()

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
