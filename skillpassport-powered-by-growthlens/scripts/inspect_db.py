import sys
import os
sys.path.insert(0, os.path.abspath("."))
from sqlalchemy import create_engine, text
from backend.app.core.config import get_settings

def inspect():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        print("=== PUBLIC TABLES & ROW COUNTS ===")
        tables = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        """)).fetchall()
        for (t,) in tables:
            try:
                cnt = conn.execute(text(f'SELECT count(1) FROM public."{t}"')).scalar()
                print(f"  {t}: {cnt} rows")
            except Exception as e:
                print(f"  {t}: error ({e})")

        print("\n=== AUTH USERS ===")
        try:
            users = conn.execute(text("SELECT id, email, created_at FROM auth.users")).fetchall()
            print(f"Total auth.users: {len(users)}")
            for u in users:
                print(f"  {u.id} | {u.email} | {u.created_at}")
        except Exception as e:
            print(f"Error reading auth.users: {e}")

if __name__ == "__main__":
    inspect()
