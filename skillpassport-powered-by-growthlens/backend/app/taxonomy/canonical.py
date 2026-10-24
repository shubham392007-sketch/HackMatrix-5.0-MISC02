"""
Canonical 6-Level Proficiency Scale, Verification Weights, and Skill Taxonomy Standards.
Authoritative source for Skill Intelligence & Canonical Matching Engine.
"""
from typing import Dict, List, Optional

# Canonical 6-level ordinal proficiency scale (0 to 5)
PROFICIENCY_SCALE: Dict[str, int] = {
    "Not Established": 0,
    "Foundation": 1,
    "Foundational": 1,
    "Working": 2,
    "Practitioner": 3,
    "Intermediate": 3,  # Intermediate maps to Practitioner tier
    "Advanced": 4,
    "Expert": 5,
}

NUMERIC_TO_PROFICIENCY: Dict[int, str] = {
    0: "Not Established",
    1: "Foundation",
    2: "Working",
    3: "Practitioner",
    4: "Advanced",
    5: "Expert",
}

# Verification Eligibility Factor (V_i) per governance state
VERIFICATION_FACTORS: Dict[str, float] = {
    "verified": 1.00,
    "candidate": 0.60,
    "insufficient_evidence": 0.50,
    "insufficient": 0.50,
    "conflicting": 0.35,
    "rejected": 0.00,
    "not_established": 0.00,
    "unverified": 0.00,
}

# Canonical domain prerequisite DAG (prerequisite skill slugs strictly required before dependent skill)
CANONICAL_PREREQUISITES: Dict[str, List[str]] = {
    # Web & API
    "skill-fastapi": ["skill-python"],
    "skill-django": ["skill-python"],
    "skill-flask": ["skill-python"],
    # AI & ML
    "skill-machine-learning": ["skill-python"],
    "skill-deep-learning": ["skill-machine-learning", "skill-python"],
    "skill-pytorch": ["skill-machine-learning", "skill-python"],
    "skill-tensorflow": ["skill-machine-learning", "skill-python"],
    "skill-llm-ops": ["skill-machine-learning", "skill-python"],
    "skill-rag-architecture": ["skill-machine-learning", "skill-python"],
    # DevOps & Infrastructure
    "skill-kubernetes": ["skill-docker"],
    "skill-helm": ["skill-kubernetes", "skill-docker"],
    "skill-terraform": ["skill-cloud-infrastructure"],
    # Security & Cryptography
    "skill-elliptic-curve-cryptography": ["skill-number-theory"],
    "skill-zero-knowledge-proofs": ["skill-number-theory", "skill-cryptography-foundations"],
    "skill-smart-contract-audit": ["skill-smart-contracts", "skill-solidity"],
}


def level_to_numeric(level_str: Optional[str]) -> int:
    """Converts proficiency string to canonical ordinal integer (0-5)."""
    if not level_str:
        return 0
    cleaned = level_str.strip()
    return PROFICIENCY_SCALE.get(cleaned, PROFICIENCY_SCALE.get(cleaned.capitalize(), 0))


def numeric_to_level(num: int) -> str:
    """Converts numeric score (0-5) to canonical proficiency level name."""
    rounded = max(0, min(5, round(num)))
    return NUMERIC_TO_PROFICIENCY.get(rounded, "Not Established")


def resolve_verification_factor(
    verification_status: str,
    confidence: Optional[float] = None,
) -> float:
    """
    Computes V_i: 1.0 for verified, 0.60 for candidate (calibrated by confidence if provided),
    0.50 for insufficient_evidence, 0.35 for conflicting, 0.0 for rejected/absent.
    Guarantees factor is bounded in [0.0, 1.0].
    """
    status = (verification_status or "unverified").lower().strip()
    if status == "verified":
        return 1.00
    elif status == "candidate":
        if confidence is not None and confidence > 0:
            conf_norm = confidence if confidence <= 1.0 else confidence / 100.0
            # Calibrated candidate factor clamped within [0.50, 0.75], ensuring never >= 1.0
            return min(0.75, max(0.50, conf_norm))
        return 0.60
    elif status in ("insufficient_evidence", "insufficient"):
        return 0.50
    elif status == "conflicting":
        return 0.35
    return 0.00
