"""
Developer CLI Diagnostic Tool for Learn & Grow Resource Providers.

Usage:
    venv/bin/python -m backend.app.learning.diagnostics_cli
    venv/bin/python backend/app/learning/diagnostics_cli.py [--query "your query"] [--json]

Executes live, isolated test requests against each registered learning provider
(YouTube, DEV.to, GitHub, freeCodeCamp) without exposing sensitive credentials.
Reports health, latency, HTTP response status, item count, and remediation instructions.
"""

import asyncio
import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from typing import Dict, Any, List

# Ensure parent directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

from dotenv import load_dotenv
load_dotenv("backend/.env")

from backend.app.learning.providers.youtube import YouTubeProviderAdapter
from backend.app.learning.providers.devto import DevToProviderAdapter
from backend.app.learning.providers.github import GitHubProviderAdapter
from backend.app.learning.providers.freecodecamp import FreeCodeCampProviderAdapter
from backend.app.learning.providers.base import BaseResourceProvider, ProviderStatus
from backend.app.learning.providers.aggregator import ResourceAggregator


async def run_diagnostics(query: str = "Python pandas data preprocessing tutorial") -> Dict[str, Any]:
    providers: List[BaseResourceProvider] = [
        YouTubeProviderAdapter(),
        DevToProviderAdapter(),
        GitHubProviderAdapter(),
        FreeCodeCampProviderAdapter(),
    ]

    report: Dict[str, Any] = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "test_query": query,
        "providers": {},
        "summary": {},
    }

    test_topic = "data-preprocessing"
    test_difficulty = "Intermediate"
    test_limit = 3

    for p in providers:
        name = p.provider_name()
        entry: Dict[str, Any] = {
            "provider": name,
            "implemented": True,
            "configured": p.is_available(),
            "live_request_executed": False,
            "status": None,
            "http_status_sanitised": None,
            "error_sanitised": None,
            "result_count": 0,
            "relevant_result_count": 0,
            "latency_ms": None,
            "cache_hit": False,
            "rate_limit_info": None,
            "last_tested_utc": datetime.now(timezone.utc).isoformat(),
            "remediation": None,
            "sample_titles": [],
        }

        if not p.is_available():
            entry["status"] = "NOT_CONFIGURED"
            entry["remediation"] = f"Configure credentials for '{name}' in backend/.env"
            report["providers"][name] = entry
            continue

        try:
            t0 = time.perf_counter()
            result = await p.fetch_resources(
                query=query,
                topic_slug=test_topic,
                difficulty=test_difficulty,
                limit=test_limit,
            )
            elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)

            entry["live_request_executed"] = True
            entry["latency_ms"] = elapsed_ms
            status_val = result.status.value if hasattr(result.status, "value") else str(result.status)
            entry["status"] = status_val
            entry["result_count"] = len(result.resources)
            entry["relevant_result_count"] = sum(
                1 for r in result.resources if getattr(r, "relevance_score", 0.0) >= 0.40
            )
            entry["sample_titles"] = [r.title[:60] for r in result.resources[:2]]

            # Map status to sanitized HTTP code signal
            if status_val == "success":
                entry["http_status_sanitised"] = "200 OK"
            elif status_val == "rate_limited":
                entry["http_status_sanitised"] = "429 Too Many Requests"
            elif status_val == "quota_exhausted":
                entry["http_status_sanitised"] = "403 Quota Exhausted"
            elif status_val == "timeout":
                entry["http_status_sanitised"] = "504 Gateway Timeout"
            elif status_val == "empty":
                entry["http_status_sanitised"] = "200 OK (0 items)"
            else:
                entry["http_status_sanitised"] = "5xx Error"

            if result.error_message:
                import re
                sanitized = re.sub(r"key=[A-Za-z0-9_\-]+", "key=***", result.error_message)
                sanitized = re.sub(r"token=[A-Za-z0-9_\-]+", "token=***", sanitized)
                entry["error_sanitised"] = sanitized[:250]

            # Remediation
            if status_val in ("error", "timeout", "quota_exhausted", "rate_limited"):
                hints = {
                    "youtube": "Check YouTube Data API v3 quota in Google Cloud Console. Ensure API is enabled.",
                    "devto": "DEV.to public API has rate limits. Ensure network connectivity.",
                    "github": "Add GITHUB_TOKEN to backend/.env to increase rate limits from 10 to 30 req/min.",
                    "freecodecamp": "Check network connectivity to https://www.freecodecamp.org/news/rss/.",
                }
                entry["remediation"] = hints.get(name, "Check network connectivity and provider credentials.")

        except Exception as exc:
            entry["live_request_executed"] = True
            entry["status"] = "EXCEPTION"
            entry["error_sanitised"] = str(exc)[:200]
            entry["remediation"] = f"Unexpected exception: {exc}. Inspect traceback."

        report["providers"][name] = entry

    statuses = [v["status"] for v in report["providers"].values()]
    report["summary"] = {
        "total": len(providers),
        "live_verified": statuses.count("success"),
        "empty": statuses.count("empty"),
        "failing": sum(1 for s in statuses if s in ("error", "EXCEPTION", "timeout", "quota_exhausted")),
        "not_configured": statuses.count("NOT_CONFIGURED"),
        "rate_limited": statuses.count("rate_limited"),
    }

    return report


def print_cli_table(report: Dict[str, Any]):
    print("\n" + "=" * 80)
    print(f" LEARN & GROW RESOURCE PROVIDER HEALTH DIAGNOSTICS")
    print(f" Timestamp: {report['timestamp_utc']}")
    print(f" Query:     '{report['test_query']}'")
    print("=" * 80)
    print(f"{'PROVIDER':<15} | {'STATUS':<15} | {'HTTP CODE':<12} | {'LATENCY':<10} | {'RESULTS':<8} | {'RELEVANT':<8}")
    print("-" * 80)

    for name, p in report["providers"].items():
        prov = name
        stat = str(p.get("status", "UNKNOWN"))
        http = str(p.get("http_status_sanitised") or "N/A")
        lat = f"{p.get('latency_ms', 'N/A')}ms" if p.get("latency_ms") is not None else "N/A"
        cnt = str(p.get("result_count", 0))
        rel = str(p.get("relevant_result_count", 0))
        print(f"{prov:<15} | {stat:<15} | {http:<12} | {lat:<10} | {cnt:<8} | {rel:<8}")
        if p.get("sample_titles"):
            for t in p["sample_titles"]:
                print(f"  └─ Item: {t}")
        if p.get("error_sanitised"):
            print(f"  └─ Error: {p['error_sanitised']}")
        if p.get("remediation"):
            print(f"  └─ Remediation: {p['remediation']}")
        print("-" * 80)

    summary = report["summary"]
    print(f"Summary: {summary.get('live_verified', 0)}/{summary.get('total', 0)} LIVE-VERIFIED | "
          f"{summary.get('empty', 0)} EMPTY | {summary.get('failing', 0)} FAILING | "
          f"{summary.get('not_configured', 0)} NOT CONFIGURED")
    print("=" * 80 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Learn & Grow Provider Diagnostics CLI")
    parser.add_argument("--query", default="Python pandas data preprocessing tutorial", help="Test query")
    parser.add_argument("--json", action="store_true", help="Output raw JSON")
    args = parser.parse_args()

    report = asyncio.run(run_diagnostics(query=args.query))
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print_cli_table(report)


if __name__ == "__main__":
    main()
