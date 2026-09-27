"""Mount helper to cleanly register Feature 4 into FastAPI application."""
import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles


def mount_feature_4(app: FastAPI):
    """Mounts Feature 4 API routers and standalone frontend dashboard."""
    feat4_dir = Path(__file__).resolve().parent
    feat4_str = str(feat4_dir)

    # Save existing root backend modules to avoid namespace collision
    saved_modules = {k: v for k, v in sys.modules.items() if k == "backend" or k.startswith("backend.")}
    for k in list(saved_modules.keys()):
        del sys.modules[k]

    old_path = sys.path[:]
    sys.path.insert(0, feat4_str)

    try:
        from backend.api.router import feature4_router
        app.include_router(feature4_router, prefix="/api/v1")
        print("[GROWTHLENS] Feature 4 router mounted at /api/v1/feature4")
    except Exception as e:
        print(f"[GROWTHLENS] Warning: Could not register Feature 4 router: {e}")
    finally:
        sys.path = old_path
        # Restore root backend modules so Feature 1 continues uninterrupted
        for k, v in saved_modules.items():
            sys.modules[k] = v

    # Mount frontend static files
    frontend_dir = feat4_dir / "frontend"
    if frontend_dir.exists():
        app.mount("/feature4", StaticFiles(directory=str(frontend_dir), html=True), name="feature4_frontend")
        print("[GROWTHLENS] Feature 4 frontend mounted at /feature4")
