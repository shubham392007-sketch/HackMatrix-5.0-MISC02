"""Run database migration against Supabase using Management API."""
import os
import sys
import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SERVICE_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    sys.exit(1)

# Extract project ref from URL
project_ref = SUPABASE_URL.replace("https://", "").split(".")[0]
print(f"Project ref: {project_ref}")

# Read migration
migration_path = os.path.join("backend", "db", "migrations", "001_initial_schema.sql")
with open(migration_path, "r") as f:
    sql = f.read()

print(f"SQL length: {len(sql)} characters")

# Use Supabase's pooler connection via service role key
# The service role key can access the database via the PostgREST /rpc endpoint
# But for DDL, we need the database URL

# Try using the Supabase database URL with the service role JWT
# Supabase exposes a special SQL execution endpoint
db_url = f"https://{project_ref}.supabase.co/rest/v1/rpc/exec_raw_sql"

# Since PostgREST doesn't support raw DDL, use the Supabase SQL webhook
# Actually, the correct approach for remote Supabase is to use the 
# pg-meta API endpoint which is available at port 8080 internally

# Best approach: Use Supabase's own JavaScript/SQL API
# For Python, we use the database connection pooler

# Connection pooler URL (transaction mode)
# Format: postgresql://postgres.[project-ref]:[password]@[region]-pooler.supabase.com:6543/postgres
# But we don't have the password

# Alternative: Create an RPC function via PostgREST that executes DDL
# First check if we can use the /rest/v1/ endpoint to create tables via SQL function

# The most reliable way: use the Supabase Dashboard SQL Editor API
# It's available at: https://api.supabase.com/platform/pg/{project_ref}/query
# But requires a dashboard access token

# Let's try another approach - use the Supabase client to check connection
# and then break the SQL into individual CREATE TABLE statements
# that we can execute via a workaround

from supabase import create_client
client = create_client(SUPABASE_URL, SERVICE_KEY)

# Supabase Python client v2 supports rpc calls
# We can create a simple function first

# Actually the simplest approach is to check if tables already exist
try:
    result = client.table("employees").select("id").limit(1).execute()
    print("Tables already exist!")
    sys.exit(0)
except Exception as e:
    if "PGRST205" in str(e) or "schema cache" in str(e):
        print("Tables don't exist yet. Need to create them.")
    else:
        print(f"Connection error: {e}")

print("\n" + "="*60)
print("MANUAL STEP REQUIRED")
print("="*60)
print()
print("Please run the migration SQL in the Supabase Dashboard:")
print(f"  1. Go to: {SUPABASE_URL.replace('.co', '.co')}")
print(f"     Or: https://supabase.com/dashboard/project/{project_ref}/sql")
print("  2. Open the SQL Editor")
print("  3. Paste the contents of:")
print(f"     backend/db/migrations/001_initial_schema.sql")
print("  4. Click 'Run'")
print()
print("Alternatively, if you have the database password, add it to .env:")
print("  DATABASE_URL=postgresql://postgres:[PASSWORD]@db.{}.supabase.co:5432/postgres".format(project_ref))
print("  Then re-run this script.")
print()

# Check if DATABASE_URL is set
db_url = os.getenv("DATABASE_URL")
if db_url:
    print("DATABASE_URL found! Attempting direct connection...")
    try:
        import psycopg2
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Execute the full migration
        cursor.execute(sql)
        
        print("SUCCESS: Migration applied via direct PostgreSQL connection!")
        
        # Verify tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        print(f"\nCreated {len(tables)} tables:")
        for t in tables:
            print(f"  - {t[0]}")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)
else:
    print("No DATABASE_URL found. Please use one of the methods above.")
    sys.exit(1)
