from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import get_settings
from backend.core.logging import setup_logging, get_logger
from backend.core.exceptions import GrowthLensError
from backend.api.routes import health

logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown."""
    settings = get_settings()
    setup_logging(debug=settings.debug)
    logger.info("GrowthLens backend starting", extra={"version": settings.app_version})
    yield
    logger.info("GrowthLens backend shutting down")


app = FastAPI(
    title="GrowthLens",
    description="AI-Driven Evidence Extraction & RAG Pipeline for Continuous Talent Intelligence",
    version=get_settings().app_version,
    lifespan=lifespan,
)

# CORS - permissive for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler for GrowthLens errors
@app.exception_handler(GrowthLensError)
async def growthlens_error_handler(request: Request, exc: GrowthLensError):
    """Handle all GrowthLens custom exceptions."""
    logger.error(
        f"{exc.error_code}: {exc.message}",
        extra={"error_category": exc.error_code},
    )
    return JSONResponse(
        status_code=_error_code_to_status(exc.error_code),
        content={
            "error": exc.error_code,
            "message": exc.message,
            "details": exc.details,
        },
    )


def _error_code_to_status(error_code: str) -> int:
    """Map error codes to HTTP status codes."""
    mapping = {
        "database_unavailable": 503,
        "github_integration_error": 502,
        "jira_integration_error": 502,
        "llm_service_unavailable": 503,
        "vector_store_unavailable": 503,
        "employee_mapping_required": 422,
        "insufficient_evidence": 200,  # Valid response, not an error
        "cross_employee_access_denied": 403,
        "internal_error": 500,
    }
    return mapping.get(error_code, 500)


import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from backend.api.routes import health, github, jira, identities, evidence, rag, ingestion, employees, auth

# Register routers
app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(employees.router, prefix="/api")
app.include_router(github.router, prefix="/api")
app.include_router(jira.router, prefix="/api")
app.include_router(identities.router, prefix="/api")
app.include_router(evidence.router, prefix="/api")
app.include_router(rag.router, prefix="/api")
app.include_router(ingestion.router, prefix="/api")

# Mount static folder
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/", include_in_schema=False)
@app.get("/dev", include_in_schema=False)
async def serve_developer_workbench():
    """Serves the Feature 1 Developer Testing Workbench."""
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "GrowthLens API is active. Go to /docs for Swagger UI."}

@app.get("/auth", include_in_schema=False)
@app.get("/login", include_in_schema=False)
async def serve_auth_page():
    """Serves the Authentication & Onboarding Page."""
    auth_file = os.path.join(static_dir, "auth.html")
    if os.path.exists(auth_file):
        return FileResponse(auth_file)
    return {"message": "Auth page missing"}
