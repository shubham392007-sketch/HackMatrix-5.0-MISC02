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

# ── Router registration ──────────────────────────────────────────
app.include_router(recommendations_router)
app.include_router(retention_router)

# ── Static files & dashboard ─────────────────────────────────────
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

@app.get("/")
async def root():
    """Serve the dashboard UI."""
    return FileResponse(str(BASE_DIR / "static" / "index.html"))
