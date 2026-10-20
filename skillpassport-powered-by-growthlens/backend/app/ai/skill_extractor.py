import re
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from backend.app.core.logging import get_logger
from backend.app.models.evidence import EvidenceItem
from backend.app.models.taxonomy import CompetencyTaxonomy, EvidenceCompetencyMapping
from backend.app.models.ai_governance import AIAnalysisRun, WorkAnalysisResult
from backend.app.ai.extractor import ai_extractor, compute_dynamic_confidence_score
from backend.app.ai.guard import hallucination_guard
from backend.app.ai.output_validator import output_validator

logger = get_logger("ai.skill_extractor")


class SkillExtractionService:
    async def extract_candidate_skills(
        self,
        db: Session,
        evidence_id: uuid.UUID,
        owner_user_id: uuid.UUID,
    ) -> List[Dict[str, Any]]:
        """
        Extracts candidate skills from a persisted EvidenceItem, maps them to the canonical
        taxonomy, validates citations with Hallucination Guard, and stores them in
        EvidenceCompetencyMapping with status="candidate".
        """
        evidence = db.query(EvidenceItem).filter(
            EvidenceItem.id == evidence_id,
            EvidenceItem.owner_user_id == owner_user_id,
        ).first()

        if not evidence:
            raise ValueError(f"Evidence {evidence_id} not found or not owned by user")

        # 1. Run extraction AI (or deterministic fallback)
        extracted = await ai_extractor.extract_structured_evidence(
            text_content=evidence.extracted_excerpt or evidence.description,
            source_provider=evidence.source_provider,
            db=db,
            source_metadata=evidence.normalized_metadata,
        )

        # 2. Output validation
        output_validator.validate_skill_extraction_output(
            raw_output=extracted,
            db=db,
            owner_user_id=owner_user_id,
        )

        candidates = extracted.get("competencies", [])
        saved_mappings = []

        for comp in candidates:
            c_name = comp.get("name", "").strip()
            c_cat = comp.get("category", "General Engineering")
            c_just = comp.get("justification", "").strip()
            c_level = comp.get("demonstration_level", "intermediate")
            c_tax_id = comp.get("canonical_taxonomy_id")

            # Dynamically compute or normalize confidence score (never hardcoded)
            c_score = compute_dynamic_confidence_score(
                comp.get("confidence_score") or comp.get("relevance_score"),
                text_content=evidence.extracted_excerpt or evidence.description,
                justification=c_just,
                demonstration_level=c_level,
                skill_name=c_name,
            )

            if not c_name or not c_just:
                continue

            # Ensure canonical taxonomy record exists
            if not c_tax_id:
                tax_rec = db.query(CompetencyTaxonomy).filter(
                    CompetencyTaxonomy.normalized_name == c_name.lower()
                ).first()
                if not tax_rec:
                    tax_rec = CompetencyTaxonomy(
                        id=uuid.uuid4(),
                        canonical_name=c_name,
                        normalized_name=c_name.lower(),
                        category=c_cat,
                        description=f"Demonstrated capability in {c_name}",
                        status="active",
                        taxonomy_version="v1.0",
                    )
                    db.add(tax_rec)
                    db.flush()
                c_tax_id = str(tax_rec.id)

            # 3. Evaluate claim against Hallucination Guard
            guard_res = hallucination_guard.evaluate_claim(
                db=db,
                owner_user_id=owner_user_id,
                evidence_id=evidence.id,
                claim_text=f"Demonstrated candidate skill {c_name}",
                supporting_excerpt=c_just,
                claimed_skill_name=c_name,
            )

            # If guard outcome is BLOCK, do not create a valid mapping, skip or mark insufficient
            mapping_status = "candidate"
            if guard_res["guard_outcome"] == "BLOCK":
                logger.warning(f"Guard blocked candidate skill '{c_name}' on evidence {evidence.id}: {guard_res['reason_codes']}")
                continue
            elif guard_res["guard_outcome"] == "INSUFFICIENT_EVIDENCE":
                mapping_status = "insufficient"

            # 4. Upsert EvidenceCompetencyMapping (INVARIANT: Status is candidate, NEVER verified!)
            tax_uuid = uuid.UUID(c_tax_id) if isinstance(c_tax_id, str) else c_tax_id
            existing_map = db.query(EvidenceCompetencyMapping).filter(
                EvidenceCompetencyMapping.evidence_id == evidence.id,
                EvidenceCompetencyMapping.competency_id == tax_uuid,
            ).first()

            # Normalize proficiency display level
            prof_map = {
                "foundational": "Foundation",
                "intermediate": "Working",
                "advanced": "Practitioner",
                "expert": "Advanced",
            }
            display_prof = prof_map.get(c_level.lower(), "Practitioner")

            if existing_map:
                existing_map.relevance_score = c_score
                existing_map.supporting_excerpt = c_just
                existing_map.rationale = f"Observed in {evidence.source_name}: {c_just[:150]}"
                existing_map.status = mapping_status
                existing_map.proficiency_level = display_prof
                mapping_record = existing_map
            else:
                mapping_record = EvidenceCompetencyMapping(
                    id=uuid.uuid4(),
                    evidence_id=evidence.id,
                    competency_id=tax_uuid,
                    owner_user_id=owner_user_id,
                    mapping_method="llm_proposal",
                    relevance_score=c_score,
                    supporting_excerpt=c_just,
                    rationale=f"Observed in {evidence.source_name}: {c_just[:150]}",
                    status=mapping_status,
                    proficiency_level=display_prof,
                )
                db.add(mapping_record)

            db.flush()

            saved_mappings.append({
                "mapping_id": str(mapping_record.id),
                "candidate_id": str(mapping_record.id),
                "evidence_id": str(evidence.id),
                "evidence_title": evidence.title,
                "competency_id": str(tax_uuid),
                "name": c_name,
                "category": c_cat,
                "confidence_score": c_score,
                "proficiency_level": display_prof,
                "supporting_excerpt": c_just,
                "status": mapping_status,
                "guard_outcome": guard_res["guard_outcome"],
                "rationale": mapping_record.rationale,
            })

        db.commit()
        return saved_mappings


skill_extractor = SkillExtractionService()
