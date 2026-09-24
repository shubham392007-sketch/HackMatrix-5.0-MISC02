import pytest
from backend.vectorstore.repository import VectorEvidenceRepository
from backend.core.exceptions import CrossEmployeeAccessError


def test_cross_employee_vector_isolation():
    repo = VectorEvidenceRepository()

    # Index record for Alice
    repo.index_evidence(
        evidence_id="ev-alice-sec-1",
        employee_id="emp-alice-uuid",
        source="github",
        source_type="commit",
        project_name="PayrollService",
        title="Added confidential compensation calculations",
        content="Calculated executive bonuses and salaries",
        occurred_at="2026-09-24T10:00:00Z",
        ai_summary="Executive compensation payroll",
        competency_name="Backend Engineering & API Development"
    )

    # Index record for Bob
    repo.index_evidence(
        evidence_id="ev-bob-sec-1",
        employee_id="emp-bob-uuid",
        source="github",
        source_type="commit",
        project_name="PublicDocs",
        title="Updated public website footer links",
        content="Fixed broken URLs in landing footer",
        occurred_at="2026-09-24T10:00:00Z",
        ai_summary="Website links update",
        competency_name="Technical Communication & Collaboration"
    )

    # Bob searches specifically for executive compensation
    bob_results = repo.query_evidence_by_employee(
        employee_id="emp-bob-uuid",
        query_text="Executive compensation salaries bonuses",
        n_results=10
    )

    # Verify: Bob CANNOT see Alice's confidential record under ANY circumstances!
    for result in bob_results:
        assert result["metadata"]["employee_id"] == "emp-bob-uuid", "Security violation: Cross-employee leak!"
        assert result["evidence_id"] != "ev-alice-sec-1", "Security violation: Alice's record leaked to Bob!"

    # Alice searches for compensation
    alice_results = repo.query_evidence_by_employee(
        employee_id="emp-alice-uuid",
        query_text="Executive compensation salaries bonuses",
        n_results=10
    )
    assert any(r["evidence_id"] == "ev-alice-sec-1" for r in alice_results)
    for result in alice_results:
        assert result["metadata"]["employee_id"] == "emp-alice-uuid"


def test_empty_employee_id_rejected():
    repo = VectorEvidenceRepository()
    with pytest.raises(CrossEmployeeAccessError):
        repo.query_evidence_by_employee(employee_id="", query_text="test")
