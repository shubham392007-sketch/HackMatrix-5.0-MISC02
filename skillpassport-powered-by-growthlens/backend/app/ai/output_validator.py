import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.models.ai_governance import OutputValidationRun
from backend.app.core.logging import get_logger

logger = get_logger("ai.validator")

ALLOWED_CATEGORIES = {
    "AI Engineering",
    "Backend Engineering",
    "Frontend Engineering",
    "System Architecture",
    "Data Engineering",
    "Quality Engineering",
    "DevOps & Cloud",
    "Project Governance",
    "Mobile Engineering",
    "Mobile & Release Engineering",
    "Security Engineering",
    "General Engineering",
    "Leadership & Strategy",
    "Document Intelligence",
    "Engineering Practices",
}

ALLOWED_PROFICIENCIES = {"foundational", "intermediate", "advanced", "expert", "Foundation", "Working", "Practitioner", "Advanced"}


class OutputValidationService:
    def validate_work_analysis_output(
        self,
        raw_output: Dict[str, Any],
        db: Optional[Session] = None,
        owner_user_id: Optional[uuid.UUID] = None,
        run_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        """
        Validates the schema and semantic integrity of an AI Work Analysis output.
        """
        missing_fields = []
        invalid_refs = []
        errors = []

        # 1. Structural schema validation
        required_keys = ["summary", "role", "observed_facts", "claimed_information", "inferred_attributes"]
        for k in required_keys:
            if k not in raw_output:
                missing_fields.append(k)

        # Check types
        if "observed_facts" in raw_output and not isinstance(raw_output["observed_facts"], list):
            errors.append("'observed_facts' must be an array of facts")
        if "claimed_information" in raw_output and not isinstance(raw_output["claimed_information"], list):
            errors.append("'claimed_information' must be an array of claims")
        if "inferred_attributes" in raw_output and not isinstance(raw_output["inferred_attributes"], list):
            errors.append("'inferred_attributes' must be an array of attributes")

        schema_valid = len(missing_fields) == 0 and len(errors) == 0

        # 2. Semantic validation
        semantic_valid = True
        summary = raw_output.get("summary", "")
        if not summary or len(summary.strip()) < 5:
            errors.append("Summary is empty or too short")
            semantic_valid = False

        status = "valid" if (schema_valid and semantic_valid) else "invalid"

        result = {
            "schema_valid": schema_valid,
            "semantic_valid": semantic_valid,
            "missing_fields": missing_fields,
            "invalid_references": invalid_refs,
            "errors": errors,
            "final_status": status,
        }

        # Persist validation run if db is provided
        if db and owner_user_id:
            try:
                record = OutputValidationRun(
                    id=uuid.uuid4(),
                    owner_user_id=owner_user_id,
                    run_id=run_id,
                    target_type="work_analysis",
                    schema_valid=schema_valid,
                    missing_fields=missing_fields,
                    invalid_references=invalid_refs,
                    semantic_valid=semantic_valid,
                    error_messages=errors,
                    retry_count=0,
                    final_status=status,
                    validator_version="v1.0",
                )
                db.add(record)
                db.commit()
            except Exception as e:
                db.rollback()
                logger.warning(f"Failed to persist work analysis validation run: {e}")

        return result

    def validate_skill_extraction_output(
        self,
        raw_output: Dict[str, Any],
        db: Optional[Session] = None,
        owner_user_id: Optional[uuid.UUID] = None,
        run_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        """
        Validates candidate skill extraction schema and boundary constraints.
        """
        missing_fields = []
        invalid_refs = []
        errors = []

        if "competencies" not in raw_output:
            missing_fields.append("competencies")
        elif not isinstance(raw_output["competencies"], list):
            errors.append("'competencies' must be a list")

        competencies = raw_output.get("competencies")
        if isinstance(competencies, list):
            for idx, comp in enumerate(competencies):
                if not isinstance(comp, dict):
                    errors.append(f"competencies[{idx}] must be an object")
                    continue
                c_name = comp.get("name")
                c_cat = comp.get("category")
                c_conf = comp.get("confidence_score")
                c_just = comp.get("justification")

                if not c_name:
                    missing_fields.append(f"competencies[{idx}].name")
                if not c_just:
                    missing_fields.append(f"competencies[{idx}].justification")

                if c_conf is not None:
                    if not isinstance(c_conf, (int, float)) or c_conf < 0.0 or c_conf > 1.0:
                        errors.append(f"competencies[{idx}].confidence_score must be between 0.0 and 1.0 (got {c_conf})")

                if c_cat and c_cat not in ALLOWED_CATEGORIES:
                    errors.append(f"competencies[{idx}].category '{c_cat}' is not in the canonical ontology")

        schema_valid = len(missing_fields) == 0 and len(errors) == 0
        semantic_valid = len(errors) == 0
        status = "valid" if (schema_valid and semantic_valid) else "invalid"

        result = {
            "schema_valid": schema_valid,
            "semantic_valid": semantic_valid,
            "missing_fields": missing_fields,
            "invalid_references": invalid_refs,
            "errors": errors,
            "final_status": status,
        }

        if db and owner_user_id:
            try:
                record = OutputValidationRun(
                    id=uuid.uuid4(),
                    owner_user_id=owner_user_id,
                    run_id=run_id,
                    target_type="skill_extraction",
                    schema_valid=schema_valid,
                    missing_fields=missing_fields,
                    invalid_references=invalid_refs,
                    semantic_valid=semantic_valid,
                    error_messages=errors,
                    retry_count=0,
                    final_status=status,
                    validator_version="v1.0",
                )
                db.add(record)
                db.commit()
            except Exception as e:
                db.rollback()
                logger.warning(f"Failed to persist skill extraction validation run: {e}")

        return result


output_validator = OutputValidationService()
