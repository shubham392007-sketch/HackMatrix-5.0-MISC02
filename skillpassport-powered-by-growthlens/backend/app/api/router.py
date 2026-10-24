from fastapi import APIRouter
from backend.app.api.health import router as health_router
from backend.app.api.connections import router as connections_router
from backend.app.api.documents import router as documents_router
from backend.app.api.portfolio import router as portfolio_router
from backend.app.api.evidence import router as evidence_router
from backend.app.api.ingestion_runs import router as ingestion_runs_router
from backend.app.api.profile import router as profile_router
from backend.app.api.ai import router as ai_router
from backend.app.api.passport import router as passport_router
from backend.app.api.career import router as career_router
from backend.app.api.auth import router as auth_router
from backend.app.api.vault import router as vault_router
from backend.app.api.sharing import router as sharing_router

api_router = APIRouter()

# Health endpoints
api_router.include_router(health_router)

# Authentication Provisioning & Rate Limit Fallback
api_router.include_router(auth_router)

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

# Skill Intelligence & Passport (Domain 2)
api_router.include_router(passport_router)

# Career Intelligence & Job Discovery (Domain 3)
api_router.include_router(career_router)

# Evidence Vault & Persistent Archive (Domain 1 & Settings)
api_router.include_router(vault_router)

# Sharing & Recruiter Experience (Domain 6)
api_router.include_router(sharing_router)
