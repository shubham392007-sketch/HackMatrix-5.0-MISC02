import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import time
import httpx
import uuid
import sqlalchemy
from sqlalchemy import text
from fastapi.testclient import TestClient
from backend.app.core.config import get_settings
from backend.app.db.session import engine, SessionLocal
from backend.app.models.evidence import EvidenceItem
from backend.app.models.connection import ConnectedSource
from backend.app.models.user_profile import UserProfile
from backend.app.main import app
from backend.app.api.dependencies import get_current_user, AuthenticatedUser

def measure_database_layer():
    print("=" * 70)
    print("PHASE 0 — DATABASE LAYER LATENCY & POOL BENCHMARK")
    print("=" * 70)
    settings = get_settings()

    # 1. New connection checkout time
    t0 = time.perf_counter()
    with engine.connect() as conn:
        t_connect = time.perf_counter()
        res = conn.execute(text("SELECT 1")).scalar()
        t_query = time.perf_counter()
    print(f"[DB] Fresh connection checkout: {(t_connect - t0)*1000:7.2f} ms")
    print(f"[DB] Ping query execution:      {(t_query - t_connect)*1000:7.2f} ms")

    # 2. Reused connection checkout time (from pool)
    t0 = time.perf_counter()
    with engine.connect() as conn:
        t_reconnect = time.perf_counter()
        res = conn.execute(text("SELECT 1")).scalar()
        t_requery = time.perf_counter()
    print(f"[DB] Pooled connection checkout: {(t_reconnect - t0)*1000:7.2f} ms")
    print(f"[DB] Pooled query execution:    {(t_requery - t_reconnect)*1000:7.2f} ms")

    # 3. EvidenceItems query baseline
    db = SessionLocal()
    try:
        t0 = time.perf_counter()
        count = db.query(EvidenceItem).filter(EvidenceItem.is_deleted == False).count()
        t1 = time.perf_counter()
        print(f"[DB] Evidence count query:      {(t1 - t0)*1000:7.2f} ms (count={count})")

        t2 = time.perf_counter()
        items = db.query(EvidenceItem).filter(EvidenceItem.is_deleted == False).limit(20).all()
        t3 = time.perf_counter()
        print(f"[DB] Evidence fetch limit 20:   {(t3 - t2)*1000:7.2f} ms (items={len(items)})")
    finally:
        db.close()

def measure_api_layer():
    print("\n" + "=" * 70)
    print("PHASE 0 — FASTAPI & SUPABASE ENDPOINT LATENCY BENCHMARK (AUTHENTICATED)")
    print("=" * 70)
    
    db = SessionLocal()
    active_src = db.query(ConnectedSource).filter(
        ConnectedSource.provider == "github",
        ConnectedSource.connection_status == "connected",
    ).first()
    target_user_id = str(active_src.owner_user_id) if active_src else "38c2a0a0-1314-466f-8940-6b1e16fd0991"
    db.close()

    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        user_id=target_user_id,
        email="shubham392007@gmail.com",
        role="authenticated",
        metadata={"full_name": "Shubham Pokale"},
    )

    client = TestClient(app)

    endpoints = [
        ("GET", "/api/v1/health/live"),
        ("GET", "/api/v1/profile/me"),
        ("GET", "/api/v1/evidence?page=1&page_size=20"),
        ("GET", "/api/v1/connections"),
        ("GET", "/api/v1/connections/github/languages/summary"),
        ("GET", "/api/v1/ai/overview"),
    ]

    for method, path in endpoints:
        latencies = []
        payload_size = 0
        status_code = 0
        # Run 3 iterations
        for i in range(3):
            t0 = time.perf_counter()
            try:
                resp = client.request(method, path)
                t1 = time.perf_counter()
                latencies.append((t1 - t0) * 1000)
                payload_size = len(resp.content)
                status_code = resp.status_code
            except Exception as e:
                latencies.append(-1)
                print(f"Error calling {path}: {e}")
                break
        
        clean_lats = [l for l in latencies if l > 0]
        if clean_lats:
            avg_lat = sum(clean_lats) / len(clean_lats)
            min_lat = min(clean_lats)
            print(f"[{status_code}] {path:<45} | Min: {min_lat:7.1f} ms | Avg: {avg_lat:7.1f} ms | Size: {payload_size:6} B")

    app.dependency_overrides.pop(get_current_user, None)

if __name__ == "__main__":
    measure_database_layer()
    measure_api_layer()
