from fastapi import APIRouter
from backend.app.api.health import router as health_router
from backend.app.api.connections import router as connections_router
from backend.app.api.documents import router as documents_router
from backend.app.api.portfolio import router as portfolio_router
from backend.app.api.evidence import router as evidence_router
from backend.app.api.ingestion_runs import router as ingestion_runs_router
from backend.app.api.profile import router as profile_router
from backend.app.api.ai import router as ai_router

api_router = APIRouter()

# Health endpoints
api_router.include_router(health_router)

# User Profile & Onboarding
api_router.include_router(profile_router)

# Connected Sources (GitHub & Jira)
api_router.include_router(connections_router)

# Document Upload & Extraction
api_router.include_router(documents_router)

# Portfolio & Web Scraping (SSRF protected)
api_router.include_router(portfolio_router)

# Evidence Intelligence & Library
api_router.include_router(evidence_router)

# Ingestion Runs & Telemetry
api_router.include_router(ingestion_runs_router)

# AI Intelligence & Trust Governance
api_router.include_router(ai_router)
