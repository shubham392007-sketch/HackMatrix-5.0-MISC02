"""
Evaluation metrics computation module for SkillPassport Ollama Qwen3 8B audit.
Computes multi-level metrics:
- Content Extraction Completeness & Character Rates
- Skill Precision, Recall, F1, False Positive, and Unsupported Rate
- Attribution Accuracy (Personal vs Collaborative vs Third-Party vs Indeterminate)
- Grounding & Citation Validity (Verbatim substring match, lexical overlap, fabrication rate)
- Authenticity Classification (Checks Passed, Unverified, Suspicious, Invalid/Revoked)
- Output Reliability (Valid JSON, Pydantic Schema, Token Evaluation, Latency)
"""

import re
from typing import Dict, Any, List, Set, Tuple


def normalize_skill_name(name: str) -> str:
    """Normalizes skill name for fuzzy set comparison."""
    if not name:
        return ""
    n = name.lower().strip()
    n = re.sub(r"[^\w\s]", "", n)
    # Canonical aliases
    alias_map = {
        "rag": "retrieval augmented generation rag",
        "retrieval augmented generation": "retrieval augmented generation rag",
        "llm": "large language models",
        "large language model": "large language models",
        "llms": "large language models",
        "fastapi": "api architecture & design",
        "api architecture": "api architecture & design",
        "pytest": "automated testing",
        "unit testing": "automated testing",
        "github actions": "ci/cd",
        "chromadb": "vector retrieval & semantic indexing",
    }
    return alias_map.get(n, n)


def compute_skill_metrics(
    predicted_skills: List[str],
    expected_skills: List[str],
    forbidden_skills: List[str],
) -> Dict[str, Any]:
    """
    Computes precision, recall, F1, false positive rate, and unsupported rate.
    """
    norm_pred = [normalize_skill_name(s) for s in predicted_skills if s.strip()]
    norm_exp = [normalize_skill_name(s) for s in expected_skills if s.strip()]
    norm_forbid = [normalize_skill_name(s) for s in forbidden_skills if s.strip()]

    # If forbidden_skills contains "*", any predicted skill is a violation / false positive
    all_forbidden = "*" in forbidden_skills

    tp = 0
    fp = 0
    matched_expected = set()

    for p in norm_pred:
        if all_forbidden:
            fp += 1
            continue

        # Check if in forbidden
        is_forbidden = any(f in p or p in f for f in norm_forbid)
        if is_forbidden:
            fp += 1
            continue

        # Check match with expected
        match_found = False
        for exp in norm_exp:
            if p == exp or p in exp or exp in p:
                tp += 1
                matched_expected.add(exp)
                match_found = True
                break
        if not match_found:
            fp += 1

    fn = len(norm_exp) - len(matched_expected)

    precision = round(tp / (tp + fp), 4) if (tp + fp) > 0 else (1.0 if len(norm_exp) == 0 else 0.0)
    recall = round(tp / (tp + fn), 4) if (tp + fn) > 0 else (1.0 if len(norm_pred) == 0 else 0.0)
    f1 = round(2 * precision * recall / (precision + recall), 4) if (precision + recall) > 0 else 0.0

    return {
        "true_positives": tp,
        "false_positives": fp,
        "false_negatives": fn,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "predicted_count": len(predicted_skills),
        "expected_count": len(expected_skills),
    }


def compute_citation_validity(
    justifications: List[str],
    source_text: str,
) -> Dict[str, Any]:
    """
    Computes exact-quotation validity and lexical grounding against source text.
    """
    if not justifications:
        return {
            "total_citations": 0,
            "verbatim_valid": 0,
            "verbatim_ratio": 1.0,
            "fabricated_count": 0,
            "fabricated_ratio": 0.0,
        }

    clean_source = re.sub(r"\s+", " ", source_text.lower()).strip()
    clean_src_alphanum = re.sub(r"[^\w\s]", "", clean_source)

    verbatim_count = 0
    fabricated_count = 0

    for just in justifications:
        if not just or not just.strip():
            fabricated_count += 1
            continue

        j_clean = re.sub(r"\s+", " ", just.lower()).strip()
        j_alphanum = re.sub(r"[^\w\s]", "", j_clean)

        # 1. Exact substring check
        if j_clean in clean_source or j_alphanum in clean_src_alphanum:
            verbatim_count += 1
            continue

        # 2. Word overlap check (80% threshold for fuzzy punctuation diffs)
        words = [w for w in j_alphanum.split() if len(w) > 3]
        if words:
            matches = sum(1 for w in words if w in clean_src_alphanum)
            overlap = matches / len(words)
            if overlap >= 0.80:
                verbatim_count += 1
            else:
                fabricated_count += 1
        else:
            fabricated_count += 1

    total = len(justifications)
    return {
        "total_citations": total,
        "verbatim_valid": verbatim_count,
        "verbatim_ratio": round(verbatim_count / total, 4) if total > 0 else 1.0,
        "fabricated_count": fabricated_count,
        "fabricated_ratio": round(fabricated_count / total, 4) if total > 0 else 0.0,
    }


def compute_authenticity_accuracy(
    predicted_status: str,
    expected_status: str,
) -> bool:
    """
    Compares predicted artifact authenticity against ground truth status:
    - checks_passed
    - unverified
    - suspicious
    - invalid_revoked
    """
    p = predicted_status.lower().replace("-", "_").strip()
    e = expected_status.lower().replace("-", "_").strip()
    if p == e:
        return True
    # Aliases
    if p in ["checks_passed", "verified"] and e in ["checks_passed", "verified"]:
        return True
    if p in ["suspicious", "needs_review"] and e in ["suspicious", "needs_review"]:
        return True
    if p in ["invalid", "revoked", "invalid_revoked"] and e in ["invalid", "revoked", "invalid_revoked"]:
        return True
    return False
