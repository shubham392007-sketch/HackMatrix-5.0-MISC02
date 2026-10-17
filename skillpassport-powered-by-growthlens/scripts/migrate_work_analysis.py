import sys
import os

# Add repo to python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.db.session import engine
from sqlalchemy import text, inspect

queries = [
    "ALTER TABLE work_analysis_results ADD COLUMN IF NOT EXISTS analysis_method VARCHAR(50) DEFAULT 'ollama';",
    "ALTER TABLE work_analysis_results ADD COLUMN IF NOT EXISTS model_name VARCHAR(100);",
    "ALTER TABLE work_analysis_results ADD COLUMN IF NOT EXISTS model_version VARCHAR(50);",
    "ALTER TABLE work_analysis_results ADD COLUMN IF NOT EXISTS fallback_used BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE work_analysis_results ADD COLUMN IF NOT EXISTS fallback_reason VARCHAR(100);",
    "ALTER TABLE work_analysis_results ADD COLUMN IF NOT EXISTS analysis_status VARCHAR(50) DEFAULT 'completed';",
    "ALTER TABLE work_analysis_results ADD COLUMN IF NOT EXISTS validation_status VARCHAR(50) DEFAULT 'valid';"
]

with engine.connect() as conn:
    for q in queries:
        conn.execute(text(q))
    conn.commit()

inspector = inspect(engine)
cols = [c['name'] for c in inspector.get_columns('work_analysis_results')]
print("Migration complete. Updated columns:", cols)
