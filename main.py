from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from routers.recommendations import router as recommendations_router

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="Next-Action Recommendation Engine",
    description="Backend API for skill-gap recommendations and mentorship matching.",
    version="1.0.0",
)

# ── CORS configuration ───────────────────────────────────────────
# Allow the Next.js frontend running on localhost:3000 to
# communicate with this backend without being blocked by the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Router registration ──────────────────────────────────────────
app.include_router(recommendations_router)

# ── Static files & dashboard ─────────────────────────────────────
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")


@app.get("/")
async def root():
    """Serve the dashboard UI."""
    return FileResponse(str(BASE_DIR / "static" / "index.html"))

