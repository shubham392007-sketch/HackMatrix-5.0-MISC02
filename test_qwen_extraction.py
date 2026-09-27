import asyncio
from backend.app.ai.qwen_service import QwenService

async def main():
    service = QwenService()
    print("Testing QwenService.extract_evidence...")
    result = await service.extract_evidence(
        source="github",
        source_type="commit",
        title="Refactor dataframe pipeline with vectorized Pandas operations",
        content="Optimized missing-value imputation on large datasets and resolved memory bottlenecks using vectorized Pandas chunking.",
        evidence_id="commit-9281",
        known_competencies=["Data Processing & Analytics", "Backend Engineering & API Development"],
    )
    print("Competency candidates:", result.competency_candidates)
    print("Evidence type:", result.evidence_type)
    print("Evidence summary:", result.evidence_summary)
    print("Evidence refs:", result.evidence_refs)
    print("Confidence:", result.confidence)
    assert "commit-9281" in result.evidence_refs
    print("ALL ASSERTIONS PASSED!")

if __name__ == "__main__":
    asyncio.run(main())
