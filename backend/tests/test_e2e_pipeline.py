"""End-to-end integration test executing the complete GrowthLens evidence pipeline."""
import asyncio
import uuid
import pytest
from datetime import datetime, timezone
from backend.db.client import get_supabase_client
from backend.schemas.evidence import CanonicalEvidence
from backend.services.ingestion import EvidenceIngestionService
from backend.evidence.identity_resolver import IdentityResolver
from backend.rag.service import RAGService
from backend.rag.schemas import RAGSearchRequest, JustificationRequest


@pytest.mark.asyncio
async def test_full_evidence_and_rag_pipeline():
    client = get_supabase_client()
    ingestion_svc = EvidenceIngestionService()
    identity_resolver = IdentityResolver()
    rag_svc = RAGService()

    # 1. Create Test Employee in Supabase
    emp_id = str(uuid.uuid4())
    client.table("employees").insert({
        "id": emp_id,
        "name": "Maya Sharma",
        "email": f"maya.{emp_id[:8]}@example.com",
        "role": "Senior Data & Backend Engineer",
        "department": "Core Intelligence"
    }).execute()

    try:
        # 2. Map external identities
        identity_resolver.map_identity(
            employee_id=emp_id,
            provider="github",
            external_username="mayasharma-dev"
        )
        identity_resolver.map_identity(
            employee_id=emp_id,
            provider="jira",
            external_email=f"maya.{emp_id[:8]}@example.com"
        )

        # 3. Simulate GitHub Commit Activity
        commit_ref = f"growthlens/core#{uuid.uuid4().hex[:10]}"
        github_evidence = CanonicalEvidence(
            employee_id=emp_id,
            source="github",
            source_type="commit",
            source_reference=commit_ref,
            project_id="growthlens/core",
            project_name="core",
            title="Refactor dataframe pipeline with vectorized Pandas operations",
            content="Optimized missing-value imputation on large datasets and resolved memory bottlenecks using vectorized Pandas chunking.",
            occurred_at=datetime.now(timezone.utc),
            evidence_type="commit",
            evidence_strength=0.9,
            is_mapped=True
        )

        # Ingest and run AI extraction + vector indexing
        await ingestion_svc._process_single_evidence(github_evidence, run_ai=True)

        # 4. Simulate Jira Task Activity
        jira_ref = f"growthlens.atlassian.net#DATA-{uuid.uuid4().hex[:4].upper()}"
        jira_evidence = CanonicalEvidence(
            employee_id=emp_id,
            source="jira",
            source_type="issue",
            source_reference=jira_ref,
            project_id="DATA",
            project_name="DataPlatform",
            title="[DATA-104] Resolve database connection pool exhaustion",
            content="Diagnosed connection pool starvation under peak load and configured Supabase pooled connection retry logic.",
            occurred_at=datetime.now(timezone.utc),
            evidence_type="task",
            evidence_strength=0.88,
            is_mapped=True
        )

        await ingestion_svc._process_single_evidence(jira_evidence, run_ai=True)

        # 5. Verify Structured Storage in Supabase
        records = client.table("evidence").select("*").eq("employee_id", emp_id).execute()
        assert len(records.data) >= 2, "Both GitHub and Jira evidence records must be present in Supabase"

        # 6. Test RAG Semantic Search
        search_res = rag_svc.search_evidence(RAGSearchRequest(
            employee_id=emp_id,
            query="Pandas dataframe optimization and missing values",
            limit=5
        ))
        assert search_res.retrieved_count > 0, "Semantic retrieval must return relevant evidence"
        assert search_res.employee_id == emp_id

        # 7. Test Evidence Justification Engine
        justification = await rag_svc.justify_competency(JustificationRequest(
            employee_id=emp_id,
            competency="Data Processing & Analytics",
            request_context="Analyze recent project activity and propose next development action"
        ))

        assert justification.competency is not None
        assert justification.evidence_sufficiency in ("sufficient", "limited")
        assert len(justification.justification) > 10
        # References must point to actual ingested evidence
        assert len(justification.evidence_refs) > 0
        assert all(isinstance(ref, str) for ref in justification.evidence_refs)

        # 8. Test Traceability to Source
        first_ref = justification.evidence_refs[0]
        ev_record = client.table("evidence").select("*").eq("id", first_ref).execute()
        assert len(ev_record.data) == 1, "Evidence reference must be resolvable in Supabase"
        assert ev_record.data[0]["employee_id"] == emp_id
        assert ev_record.data[0]["source_reference"] is not None

        # 9. Test Insufficient Evidence Handling
        insufficient_res = await rag_svc.justify_competency(JustificationRequest(
            employee_id=emp_id,
            competency="Aerospace Engineering & Orbital Mechanics",
            request_context="Assess capability to design propulsion systems"
        ))
        assert insufficient_res.evidence_sufficiency == "insufficient"
        assert insufficient_res.action is None
        assert len(insufficient_res.evidence_refs) == 0

    finally:
        # Cleanup test employee and cascading evidence
        client.table("evidence").delete().eq("employee_id", emp_id).execute()
        client.table("integration_identities").delete().eq("employee_id", emp_id).execute()
        client.table("recommendations").delete().eq("employee_id", emp_id).execute()
        client.table("employees").delete().eq("id", emp_id).execute()
