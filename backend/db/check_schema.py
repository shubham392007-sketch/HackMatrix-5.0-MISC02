from backend.db.client import get_supabase_client


def check():
    client = get_supabase_client()
    candidates = [
        "employees",
        "competencies",
        "skills",
        "evidence",
        "evidence_skills",
        "evidence_competencies",
        "ingestion_runs",
        "recommendations",
        "recommendation_evidence",
        "competency_trajectories",
        "user_integrations",
        "integration_identities",
        "users",
        "profiles",
        "tbl_recommendation_catalog",
        "recommendation_catalog",
        "tbl_mentorship_pairings",
        "mentorship_pairings",
    ]
    for c in candidates:
        try:
            res = client.table(c).select("*").limit(1).execute()
            print(f"Table '{c}': EXISTS (count: {len(res.data)})")
        except Exception as e:
            err = str(e)
            if "PGRST205" in err:
                print(f"Table '{c}': NOT FOUND")
            else:
                print(f"Table '{c}': ERROR {err[:80]}")


if __name__ == "__main__":
    check()
