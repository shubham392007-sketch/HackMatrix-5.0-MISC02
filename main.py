from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.recommendations import router as recommendations_router

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
