"""
Recomputes and updates persisted match snapshots with genuine proficiency-based evaluation.
"""
import sys
from backend.app.db.session import SessionLocal
from backend.app.models.career import RoleDemandModelRecord, RoleMatchSnapshotRecord
from backend.app.career.matching_engine import matching_engine
from backend.app.api.career import CURATED_ROLES_SEED

def run():
    db = SessionLocal()
    try:
        snapshots = db.query(RoleMatchSnapshotRecord).all()
        print(f"Loaded {len(snapshots)} snapshots from database.", flush=True)

        roles_by_id = {r.role_id: r for r in db.query(RoleDemandModelRecord).all()}
        for seed in CURATED_ROLES_SEED:
            if seed["role_id"] not in roles_by_id:
                roles_by_id[seed["role_id"]] = type("obj", (), {
                    "role_id": seed["role_id"],
                    "version": seed["version"],
                    "title": seed["title"],
                    "seniority": seed["seniority"],
                    "context": seed["context"],
                    "description": seed["description"],
                    "competencies": seed.get("competencies") or [],
                })()

        user_skills_cache = {}
        distinct_users = list({s.owner_user_id for s in snapshots})
        print(f"Preloading capabilities for {len(distinct_users)} distinct users...", flush=True)
        for u in distinct_users:
            user_skills_cache[u] = matching_engine.load_user_capabilities(db, u)
        print("Capabilities preloaded successfully.", flush=True)

        updated_count = 0
        for s in snapshots:
            role = roles_by_id.get(s.role_id)
            if not role:
                continue
            skills_index = user_skills_cache.get(s.owner_user_id) or {}
            
            # Evaluate using preloaded capabilities
            competencies = role.competencies or []
            evaluated_matches = [
                matching_engine.evaluate_requirement(req, skills_index)
                for req in competencies
            ]
            total_weight = sum(m["requirement_weight"] for m in evaluated_matches) or 1.0
            total_credit = sum(m["eligible_credit"] for m in evaluated_matches)
            overall_match_score = round(min(100.0, max(0.0, (total_credit / total_weight) * 100)), 1)

            core_matches = [m for m in evaluated_matches if m["requirement_type"] == "core_required"]
            core_weight = sum(m["requirement_weight"] for m in core_matches) or 1.0
            core_credit = sum(m["eligible_credit"] for m in core_matches)
            required_coverage_score = round(min(100.0, max(0.0, (core_credit / core_weight) * 100)), 1)

            sup_matches = [m for m in evaluated_matches if m["requirement_type"] in ("supporting", "preferred", "differentiating")]
            sup_weight = sum(m["requirement_weight"] for m in sup_matches) or 1.0
            sup_credit = sum(m["eligible_credit"] for m in sup_matches)
            supporting_coverage_score = round(min(100.0, max(0.0, (sup_credit / sup_weight) * 100)), 1)

            gaps = []
            for idx, m in enumerate(evaluated_matches):
                if m["gap_type"] is not None:
                    dist = max(0, m["expected_level_numeric"] - m["current_proficiency_numeric"])
                    prereqs = m.get("prerequisite_skill_ids") or []
                    gaps.append({
                        "gap_id": f"gap-{role.role_id}-{m['skill_id']}",
                        "skill_id": m["skill_id"],
                        "canonical_name": m["canonical_name"],
                        "role_id": role.role_id,
                        "role_title": role.title,
                        "gap_type": m["gap_type"],
                        "requirement_type": m["requirement_type"],
                        "importance": m["importance"],
                        "expected_level": m["expected_level"],
                        "expected_level_numeric": m["expected_level_numeric"],
                        "current_supported_level": m["current_proficiency"],
                        "current_proficiency_numeric": m["current_proficiency_numeric"],
                        "proficiency_coverage": m["proficiency_coverage"],
                        "effective_coverage": m["effective_coverage"],
                        "verification_status": m["verification_status"],
                        "evidence_status": "sufficient" if len(m["evidence_ids"]) >= 2 else ("incomplete" if m["evidence_ids"] else "none"),
                        "proficiency_distance": dist,
                        "priority_rank": idx + 1,
                        "diagnosis": m["gap_explanation"],
                        "next_step_direction": f"Produce attributable evidence demonstrating {m['canonical_name']} at {m['expected_level']} level.",
                        "relevant_evidence_ids": m["evidence_ids"],
                        "prerequisite_skill_ids": prereqs,
                        "prerequisites": prereqs,
                    })

            s.overall_match_score = overall_match_score
            s.required_coverage_score = required_coverage_score
            s.supporting_coverage_score = supporting_coverage_score
            s.match_summary = {
                "role_id": role.role_id,
                "role_title": role.title,
                "overall_match_score": overall_match_score,
                "required_coverage_score": required_coverage_score,
                "supporting_coverage_score": supporting_coverage_score,
                "competency_matches": evaluated_matches,
            }
            s.gaps_data = gaps
            updated_count += 1

        db.commit()
        print(f"Successfully recomputed and updated {updated_count} snapshots with genuine proficiency evaluation!", flush=True)
    except Exception as e:
        db.rollback()
        print(f"Error recomputing snapshots: {e}", file=sys.stderr, flush=True)
    finally:
        db.close()

if __name__ == "__main__":
    run()
