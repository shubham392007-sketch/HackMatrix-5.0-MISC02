#!/usr/bin/env python3
"""
Skill Passport Domain 1 - 20-Point GitHub & Ollama E2E Diagnostic Runner
Phase 11 Diagnostic Engine CLI

Evaluates all 20 end-to-end integration points:
1. PAT Validation against GitHub API
2. Authenticated account identity matching
3. Repository list pagination capability
4. Repository metadata extraction
5. Repository language statistics & byte breakdown calculation
6. README retrieval & heading structure extraction
7. Commits ingestion & contributor attribution
8. Pull requests, changed-file metadata & reviews
9. PostgreSQL EvidenceItem persistence & source mapping
10. Source-specific content hashing & normalization
11. Idempotency & duplicate prevention
12. Ollama runtime reachability
13. Target model (qwen3:8b) presence & readiness
14. Real Ollama inference execution (zero mock)
15. Strict JSON extraction output schema conformity
16. Grounded references & anti-hallucination verification
17. Evidence-to-skill candidate mapping
18. PostgreSQL analysis persistence
19. ChromaDB vector indexing
20. Frontend API contract readiness
"""

import os
import sys
import uuid
import time
import asyncio
import argparse
from pathlib import Path

# Enable UTF-8 for console output on Windows
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Setup Python path
script_dir = Path(__file__).resolve().parent
repo_root = script_dir.parent
sys.path.insert(0, str(repo_root))

from backend.app.db.session import SessionLocal
from backend.app.api.dependencies import AuthenticatedUser
from backend.app.models.connection import ConnectedSource
from backend.app.api.connections import get_github_diagnostic

# ANSI Colors
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
CYAN = "\033[96m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"


def print_banner():
    banner = f"""
{CYAN}{BOLD}================================================================================
           SKILL PASSPORT -- DOMAIN 1 GITHUB & OLLAMA E2E DIAGNOSTIC
                Phase 11: 20-Point System Verification Engine
================================================================================{RESET}
"""
    print(banner, flush=True)


async def run_diagnostic(user_id_override: str = None, verbose: bool = False):
    db = SessionLocal()
    try:
        # Determine target user
        if user_id_override:
            target_user_id = user_id_override
        else:
            # Look up active connected GitHub source
            active_src = db.query(ConnectedSource).filter(
                ConnectedSource.provider == "github",
                ConnectedSource.connection_status == "connected",
            ).first()
            if active_src:
                target_user_id = str(active_src.owner_user_id)
            else:
                target_user_id = "00000000-0000-0000-0000-000000000001"

        user = AuthenticatedUser(
            user_id=target_user_id,
            email="diagnostic-runner@skillpassport.ai",
            role="authenticated",
            metadata={"runner": "cli_diagnostic"},
        )

        print(f"{DIM}Connecting as User ID: {BOLD}{target_user_id}{RESET}")
        print(f"{DIM}Executing 20-Point Diagnostic Engine...{RESET}\n")

        t_start = time.time()
        diagnostic_res = await get_github_diagnostic(user=user, db=db)
        total_duration = round(time.time() - t_start, 2)

        checks = diagnostic_res.get("checks", [])
        passed = diagnostic_res.get("passed", 0)
        warned = diagnostic_res.get("warned", 0)
        failed = diagnostic_res.get("failed", 0)
        total = diagnostic_res.get("total", len(checks))
        score_pct = diagnostic_res.get("diagnostic_score_pct", 0)

        # Print table header
        print(f"{BOLD}{'#':<3} {'CATEGORY':<20} {'CHECK NAME':<34} {'STATUS':<8} {'LATENCY'}{RESET}")
        print("-" * 80)

        for check in checks:
            idx = check.get("id")
            category = check.get("category", "")[:19]
            name = check.get("name", "")[:33]
            status = check.get("status", "fail")
            duration_ms = check.get("duration_ms", 0)
            message = check.get("message", "")

            if status == "pass":
                status_badge = f"{GREEN}{BOLD}PASS{RESET}"
            elif status == "warn":
                status_badge = f"{YELLOW}{BOLD}WARN{RESET}"
            else:
                status_badge = f"{RED}{BOLD}FAIL{RESET}"

            latency_str = f"{duration_ms:>4}ms" if duration_ms is not None else "   - "
            print(f"{idx:<3} {category:<20} {name:<34} {status_badge:<17} {latency_str}", flush=True)
            print(f"    {DIM}+-- {message}{RESET}", flush=True)

            if verbose and check.get("details"):
                for k, v in check.get("details", {}).items():
                    print(f"       {DIM}* {k}: {v}{RESET}", flush=True)

        print("-" * 80, flush=True)

        # Summary box
        score_color = GREEN if score_pct >= 90 else (YELLOW if score_pct >= 70 else RED)
        print(f"\n{BOLD}DIAGNOSTIC SUMMARY:{RESET}", flush=True)
        print(f"  * Total Checks Evaluated : {total}", flush=True)
        print(f"  * Checks Passed          : {GREEN}{BOLD}{passed}{RESET}", flush=True)
        print(f"  * Checks Warned          : {YELLOW}{BOLD}{warned}{RESET}", flush=True)
        print(f"  * Checks Failed          : {RED}{BOLD}{failed}{RESET}", flush=True)
        print(f"  * Diagnostic Health Score: {score_color}{BOLD}{score_pct}%{RESET}", flush=True)
        print(f"  * Total Execution Time   : {total_duration}s\n", flush=True)

        if failed == 0:
            print(f"{GREEN}{BOLD}>>> ALL CRITICAL CHECKS VERIFIED: DOMAIN 1 GITHUB & OLLAMA INTEGRATION READY <<<{RESET}\n")
            return 0
        else:
            print(f"{RED}{BOLD}>>> {failed} CHECK(S) FAILED: REVIEW ERROR LOGS AND RESOLVE DEPENDENCY GAPS <<<{RESET}\n")
            return 1

    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Skill Passport Phase 11 E2E Diagnostic Runner")
    parser.add_argument("--user-id", type=str, default=None, help="Target user UUID (default: auto-detect from active GitHub connection)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Print detailed diagnostic payloads for each check")
    args = parser.parse_args()

    print_banner()
    exit_code = asyncio.run(run_diagnostic(user_id_override=args.user_id, verbose=args.verbose))
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
