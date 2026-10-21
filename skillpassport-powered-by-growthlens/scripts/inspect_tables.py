import os
import sys

from sqlalchemy import inspect, text
from backend.app.db.session import engine

inspector = inspect(engine)
tables = inspector.get_table_names(schema="public")
print(f"Total tables found: {len(tables)}")
print("=" * 60)

with engine.connect() as conn:
    for t in sorted(tables):
        try:
            cnt = conn.execute(text(f'SELECT count(*) FROM public."{t}"')).scalar()
            print(f"{t}: {cnt} rows")
        except Exception as e:
            print(f"{t}: error ({e})")
