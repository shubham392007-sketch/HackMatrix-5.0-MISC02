from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from routers.recommendations import router as recommendations_router
from routers.retention import router as retention_router
from services.retention_service import RetentionService

BASE_DIR = Path(__file__).resolve().parent

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Warm up retention models and dataset on server boot."""
    print("[GROWTHLENS] Initializing Skill Retention Intelligence Engine...")
    try:
        RetentionService.get_instance()
        print("[GROWTHLENS] Retention Intelligence Engine loaded and ready.")
    except Exception as e:
        print(f"[GROWTHLENS] Warning: Could not preload RetentionService: {e}")
    yield

app = FastAPI(
    title="GrowthLens Talent Intelligence Platform",
    description="Skill retention & decay risk prediction, what-if counterfactual simulation, and next-action recommendation engine.",
    version="2.0.0",
    lifespan=lifespan
)

# ── CORS configuration ───────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Feature 1: Evidence Extraction & RAG Pipeline ───────────────
try:
    from backend.api.routes import health, auth, profile, employees, github, jira, identities, evidence, rag, ingestion, ai
    app.include_router(health.router)
    app.include_router(health.router, prefix="/api")
    app.include_router(ai.router, prefix="/api")
    app.include_router(auth.router, prefix="/api")
    app.include_router(profile.router, prefix="/api")
    app.include_router(employees.router, prefix="/api")
    app.include_router(github.router, prefix="/api")
    app.include_router(jira.router, prefix="/api")
    app.include_router(identities.router, prefix="/api")
    app.include_router(evidence.router, prefix="/api")
    app.include_router(rag.router, prefix="/api")
    app.include_router(ingestion.router, prefix="/api")
    print("[GROWTHLENS] Feature 1 & Profile core routers registered at /api")
except Exception as e:
    print(f"[GROWTHLENS] Note: Feature 1 routers could not be loaded: {e}")

# ── Feature 2: Continuous Competency Trajectory & ML Engine ──────
try:
    from backend.feature2.api import router as feature2_router
    app.include_router(feature2_router)
    print("[GROWTHLENS] Feature 2 PyTorch LSTM Trajectory router registered at /api/v1")
except Exception as e:
    print(f"[GROWTHLENS] Note: Feature 2 router could not be loaded: {e}")

# ── Router registration (Feature 2 & Recommendations) ────────────
app.include_router(recommendations_router)
app.include_router(retention_router)

# ── Feature 4: Growth Intelligence & Manager Insights ────────────
try:
    import importlib.util
    feat4_mount_path = BASE_DIR / "feature-4" / "mount.py"
    if feat4_mount_path.exists():
        spec = importlib.util.spec_from_file_location("feature4_mount", str(feat4_mount_path))
        if spec and spec.loader:
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            mod.mount_feature_4(app)
except Exception as e:
    print(f"[GROWTHLENS] Note: Feature 4 could not be mounted: {e}")

# ── Static files & dashboards for all features ───────────────────
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

backend_static_dir = BASE_DIR / "backend" / "static"
if backend_static_dir.exists():
    app.mount("/backend-static", StaticFiles(directory=str(backend_static_dir)), name="backend_static")

@app.get("/")
@app.get("/retention")
@app.get("/dashboard")
async def root():
    """Serve the Feature 2 & What-If simulator dashboard UI."""
    return FileResponse(str(BASE_DIR / "static" / "index.html"))

@app.get("/dev", include_in_schema=False)
async def serve_developer_workbench():
    """Serves the Feature 1 Developer Testing Workbench."""
    index_file = backend_static_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"message": "Workbench UI missing"}

@app.get("/auth", include_in_schema=False)
@app.get("/login", include_in_schema=False)
async def serve_auth_page():
    """Serves the Authentication & Profile Onboarding Page."""
    auth_file = backend_static_dir / "auth.html"
    if auth_file.exists():
        return FileResponse(str(auth_file))
    return {"message": "Auth page missing"}

