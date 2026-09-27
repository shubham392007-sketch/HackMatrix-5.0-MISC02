"""Service for generating the Manager Team Skill Heatmap and Team-Level Skill Gap Insights."""
from typing import Optional, Dict, Any, List

from services.retention_service import RetentionService, COMPETENCIES_MAP, COMPETENCY_NAME_TO_ID
from ..schemas.heatmap_schema import (
    HeatmapCell,
    HeatmapMember,
    CompetencyAggregate,
    TeamSkillInsight,
    TeamHeatmapResponse
)
from ..repositories.heatmap_repository import HeatmapRepository


class HeatmapService:
    """Constructs the Team x Competency matrix with directional icons, aggregates, and gap insights."""

    def __init__(
        self,
        retention_service: Optional[RetentionService] = None,
        heatmap_repository: Optional[HeatmapRepository] = None
    ):
        self.retention_service = retention_service or RetentionService.get_instance()
        self.repo = heatmap_repository or HeatmapRepository(self.retention_service)

    def generate_team_heatmap(self, team_id: str = "Engineering") -> TeamHeatmapResponse:
        """Builds full heatmap matrix, aggregates per competency, and generates actionable team insights."""
        members_raw = self.repo.get_team_members(team_id)
        if not members_raw:
            members_raw = self.repo.get_team_members("all")

        # Competencies to track (top standard competencies)
        tracked_competencies = [
            {"competency_id": cid, "competency_name": cname}
            for cid, cname in list(COMPETENCIES_MAP.items())[:6]  # Focus on key 6 competencies for clear UI matrix
        ]

        matrix_members: List[HeatmapMember] = []
        aggregates: Dict[str, CompetencyAggregate] = {
            c["competency_id"]: CompetencyAggregate(
                competency_id=c["competency_id"],
                competency_name=c["competency_name"]
            )
            for c in tracked_competencies
        }

        # Build matrix
        for mem in members_raw:
            lid = mem["learner_id"]
            cell_dict: Dict[str, HeatmapCell] = {}

            for comp in tracked_competencies:
                cid = comp["competency_id"]
                eval_data = self.repo.evaluate_member_competency(lid, cid)
                cell = HeatmapCell(**eval_data)
                cell_dict[cid] = cell

                # Update aggregates
                agg = aggregates[cid]
                if cell.trend == "improving":
                    agg.improving += 1
                elif cell.trend == "declining":
                    agg.declining += 1
                elif cell.trend == "stagnating":
                    agg.stagnating += 1
                else:
                    agg.insufficient_evidence += 1
                agg.total_evaluated += 1

            matrix_members.append(HeatmapMember(
                employee_id=lid,
                display_name=mem["display_name"],
                role=mem["role"],
                department=mem["department"],
                cells=cell_dict
            ))

        # Determine dominant trends for each competency
        for agg in aggregates.values():
            counts = {
                "improving": agg.improving,
                "stagnating": agg.stagnating,
                "declining": agg.declining,
                "insufficient_evidence": agg.insufficient_evidence
            }
            # Find key with max count
            dominant = max(counts, key=counts.get)
            agg.dominant_trend = dominant

        # Generate Team Skill Insights
        insights = self._generate_team_insights(aggregates)

        return TeamHeatmapResponse(
            team_id=team_id,
            team_name=team_id.title() if team_id else "All Teams",
            total_members=len(matrix_members),
            competencies=tracked_competencies,
            matrix=matrix_members,
            team_aggregates=aggregates,
            team_insights=insights
        )

    def _generate_team_insights(self, aggregates: Dict[str, CompetencyAggregate]) -> List[TeamSkillInsight]:
        """Synthesizes high-impact team skill gap, stagnation, and coverage insights."""
        insights: List[TeamSkillInsight] = []

        for cid, agg in aggregates.items():
            cname = agg.competency_name

            # 1. Skill Gap Check
            if agg.declining > 0:
                insights.append(TeamSkillInsight(
                    competency_id=cid,
                    competency_name=cname,
                    insight_type="skill_gap",
                    summary=f"{agg.declining} team member(s) exhibiting retentive decline in {cname}.",
                    actionable_suggestion=(
                        f"Schedule a hands-on technical workshop or pair-programming sessions in {cname} "
                        "to refresh practical application before retention dips further."
                    )
                ))

            # 2. Team Stagnation Check
            elif agg.stagnating >= max(2, agg.total_evaluated // 2):
                insights.append(TeamSkillInsight(
                    competency_id=cid,
                    competency_name=cname,
                    insight_type="stagnation",
                    summary=f"{agg.stagnating} team members have plateaued in {cname} without upward acceleration.",
                    actionable_suggestion=(
                        f"Assign stretch goals or advanced architecture design tasks involving {cname} "
                        "to stimulate higher-order skill progression."
                    )
                ))

            # 3. Strength Check
            elif agg.improving >= 2:
                insights.append(TeamSkillInsight(
                    competency_id=cid,
                    competency_name=cname,
                    insight_type="strength",
                    summary=f"Strong team momentum in {cname} with {agg.improving} members actively accelerating.",
                    actionable_suggestion=(
                        f"Leverage accelerating team members to lead internal knowledge-sharing demos "
                        f"and mentor cross-functional peers in {cname}."
                    )
                ))

            # 4. Coverage / Telemetry Gap Check
            elif agg.insufficient_evidence >= max(2, agg.total_evaluated // 2):
                insights.append(TeamSkillInsight(
                    competency_id=cid,
                    competency_name=cname,
                    insight_type="coverage",
                    summary=f"Low telemetry signal density for {cname} ({agg.insufficient_evidence} members with no recent data).",
                    actionable_suggestion=(
                        f"Connect Jira/GitHub integration streams or log recent project milestones to capture "
                        f"verified contributions in {cname}."
                    )
                ))

        if not insights:
            # General balanced health insight
            insights.append(TeamSkillInsight(
                competency_id="GENERAL",
                competency_name="Overall Team Capability",
                insight_type="strength",
                summary="Team demonstrates stable competency baselines across evaluated skills.",
                actionable_suggestion="Continue regular quarterly practice cadences to preserve telemetry freshness."
            ))

        return insights
