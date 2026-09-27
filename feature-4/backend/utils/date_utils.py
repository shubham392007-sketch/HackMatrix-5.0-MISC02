"""Date and evaluation period utilities for Feature 4."""
from datetime import datetime
from typing import Optional, Tuple


def parse_date_str(d_str: str) -> Optional[datetime]:
    """Parses date string safely across common ISO and date formats, returning timezone-naive datetime."""
    if not d_str:
        return None
    try:
        # If string contains timezone 'Z' or offset, clean it for naive comparison
        clean_str = d_str.replace('Z', '').split('+')[0]
        if 'T' in clean_str:
            return datetime.fromisoformat(clean_str)
        return datetime.strptime(clean_str.strip(), "%Y-%m-%d")
    except Exception:
        try:
            return datetime.strptime(d_str[:10], "%Y-%m-%d")
        except Exception:
            return None


def is_within_period(date_str: str, start_str: str, end_str: str) -> bool:
    """Checks whether date_str is inside [start_str, end_str] inclusively."""
    dt = parse_date_str(date_str)
    start_dt = parse_date_str(start_str)
    end_dt = parse_date_str(end_str)

    if not dt or not start_dt or not end_dt:
        return True  # Fallback to permissive if unparseable

    return start_dt <= dt <= end_dt


def get_quarter_label(start_str: str, end_str: str) -> str:
    """Infers quarter label (e.g. Q2 2026) from start and end dates."""
    start_dt = parse_date_str(start_str)
    if not start_dt:
        return f"{start_str} to {end_str}"

    month = start_dt.month
    year = start_dt.year
    quarter = (month - 1) // 3 + 1
    return f"Q{quarter} {year}"
