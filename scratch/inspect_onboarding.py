import sys
import os

sys.path.insert(0, r"E:\Projects\HackMatrix-MISC02\.venv\Lib\site-packages")
sys.path.insert(0, r"E:\Projects\HackMatrix-MISC02\skillpassport-powered-by-growthlens")

from backend.app.db.session import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("--- user_profiles by email ---")
    rows = conn.execute(text("SELECT id, email, display_name, onboarding_status, onboarding_current_step FROM user_profiles")).fetchall()
    for r in rows:
        print(f"Profile ID: {r.id} | Email: {r.email} | Display: {r.display_name} | Status: {r.onboarding_status} | Step: {r.onboarding_current_step}")
    
    print("\n--- auth.users ---")
    users = conn.execute(text("SELECT id, email, confirmed_at, email_confirmed_at, raw_user_meta_data FROM auth.users")).fetchall()
    for u in users:
        print(f"Auth ID: {u.id} | Email: {u.email} | Confirmed: {u.email_confirmed_at or u.confirmed_at} | Meta: {u.raw_user_meta_data}")
