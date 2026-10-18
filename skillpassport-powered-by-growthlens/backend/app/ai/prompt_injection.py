import re
import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.models.ai_governance import PromptInjectionFinding
from backend.app.core.logging import get_logger

logger = get_logger("ai.prompt_injection")

INJECTION_PATTERNS = [
    {
        "pattern": r"(?i)(ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|prompts|directives))",
        "label": "Instruction Override",
        "risk": "high",
        "action": "Strip override directive and flag for human review",
    },
    {
        "pattern": r"(?i)(you\s+are\s+now\s+(in\s+)?(developer|admin|god|root|jailbreak)\s+mode)",
        "label": "Role-play / Jailbreak Directive",
        "risk": "high",
        "action": "Strip role-play directive and flag",
    },
    {
        "pattern": r"(?i)(grant\s+(full\s+)?verification|grant\s+.*(?:expert|verified)|mark\s+(all\s+skills\s+as\s+)?verified|bypass\s+verification)",
        "label": "Privilege Escalation Request",
        "risk": "critical",
        "action": "Block verification escalation and log security finding",
    },
    {
        "pattern": r"(?i)(\[system\]|<system>|<!--\s*system|###\s*system|###\s*instruction|\"role\":\s*\"system\"|system\s+instruction)",
        "label": "System Prompt Delimiter Injection",
        "risk": "high",
        "action": "Escape markdown/json delimiter tags",
    },
    {
        "pattern": r"(?i)(print|show|reveal|output|display)\s+(your\s+)?(system\s+prompt|initial\s+instructions|secret\s+key|api\s+token)",
        "label": "Prompt Leaking Attempt",
        "risk": "medium",
        "action": "Strip exfiltration directive",
    },
    {
        "pattern": r"(?i)(<\s*script[^>]*>|javascript:|on\w+\s*=)",
        "label": "HTML / Script Injection",
        "risk": "critical",
        "action": "Sanitize HTML script tags",
    },
]


class PromptInjectionGuardService:
    def scan_content(self, text: str) -> Dict[str, Any]:
        """
        Scans imported content (commit messages, READMEs, PR bodies, documents)
        for adversarial prompt injections or override directives.
        """
        if not text:
            return {"is_suspicious": False, "risk_level": "low", "findings": []}

        findings = []
        highest_risk = "low"
        risk_rank = {"low": 1, "medium": 2, "high": 3, "critical": 4}

        for item in INJECTION_PATTERNS:
            regex = re.compile(item["pattern"])
            matches = list(regex.finditer(text))
            for m in matches:
                span_text = m.group(0)
                start_p = max(0, m.start() - 30)
                end_p = min(len(text), m.end() + 30)
                excerpt = text[start_p:end_p].strip()

                risk = item["risk"]
                if risk_rank.get(risk, 1) > risk_rank.get(highest_risk, 1):
                    highest_risk = risk

                findings.append({
                    "pattern": item["label"],
                    "matched_text": span_text,
                    "excerpt": excerpt,
                    "risk_level": risk,
                    "action_taken": item["action"],
                })

        return {
            "is_suspicious": len(findings) > 0,
            "risk_level": highest_risk,
            "findings": findings,
        }

    def sanitize_content(self, text: str) -> str:
        """
        Safely neutralizes injection attempts before feeding into LLM prompts.
        """
        if not text:
            return ""

        sanitized = text
        for item in INJECTION_PATTERNS:
            regex = re.compile(item["pattern"])
            sanitized = regex.sub(r"[QUARANTINED_UNTRUSTED_INSTRUCTION]", sanitized)

        return sanitized

    def record_findings_if_any(
        self,
        db: Session,
        owner_user_id: uuid.UUID,
        evidence_id: uuid.UUID,
        source_type: str,
        text: str,
    ) -> List[PromptInjectionFinding]:
        """
        Scans and persists prompt-injection findings into database.
        """
        scan = self.scan_content(text)
        if not scan["is_suspicious"]:
            return []

        recorded = []
        for f in scan["findings"]:
            record = PromptInjectionFinding(
                id=uuid.uuid4(),
                owner_user_id=owner_user_id,
                evidence_id=evidence_id,
                source_type=source_type,
                risk_level=f["risk_level"],
                detected_pattern=f["pattern"],
                quarantined_excerpt=f["excerpt"][:500],
                handling_outcome="quarantined",
                action_taken=f["action_taken"],
            )
            db.add(record)
            recorded.append(record)

        try:
            db.commit()
            logger.info(f"Recorded {len(recorded)} prompt injection findings for evidence {evidence_id}")
        except Exception as e:
            db.rollback()
            logger.warning(f"Failed to commit prompt injection findings: {e}")

        return recorded


prompt_injection_guard = PromptInjectionGuardService()
