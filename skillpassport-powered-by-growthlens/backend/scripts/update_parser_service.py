import re

def update_parser_service():
    path = "backend/app/career/parser_service.py"
    with open(path, "r", encoding="utf-8") as f:
        text = f.read().replace("\r\n", "\n")

    # 1. Update _infer_title to return Optional[str] instead of hardcoding "Software Engineer"
    old_infer = """    def _infer_title(self, text: str) -> str:
        lines = [line.strip() for line in text.split("\\n") if line.strip()]
        for line in lines[:3]:
            if len(line) < 60 and re.search(r"(?i)\\b(engineer|developer|architect|scientist|lead|manager|analyst)\\b", line):
                return line
        return "Software Engineer\""""

    new_infer = """    def _infer_title(self, text: str) -> Optional[str]:
        lines = [line.strip() for line in text.split("\\n") if line.strip()]
        for line in lines[:5]:
            if 4 <= len(line) <= 60 and re.search(r"(?i)\\b(engineer|developer|architect|scientist|lead|manager|analyst|specialist|consultant|administrator|researcher|designer|coordinator|auditor)\\b", line):
                cleaned = re.sub(r"(?i)^(role|title|position|job\\s*title)\\s*[:\\-]\\s*", "", line).strip()
                if cleaned:
                    return cleaned
        return None"""

    if old_infer in text:
        text = text.replace(old_infer, new_infer)
    else:
        text = re.sub(
            r'def _infer_title\(self, text: str\) -> str:[\s\S]*?return "Software Engineer"',
            new_infer,
            text
        )

    # 2. Update parse_job_text to handle inferred_title and company_name without faking
    old_step1 = """        # 1. Infer Title and Seniority if not provided
        inferred_title = title.strip() if title and title.strip() else self._infer_title(cleaned_text)
        inferred_seniority = seniority.strip() if seniority and seniority.strip() else self._infer_seniority(cleaned_text)
        inferred_context = context.strip() if context and context.strip() else "Engineering\""""

    new_step1 = """        # 1. Infer Title and Seniority if not provided
        inferred_title = (title or "").strip()
        if not inferred_title:
            inferred_title = self._infer_title(cleaned_text) or "Not specified in source"
        inferred_seniority = seniority.strip() if seniority and seniority.strip() else self._infer_seniority(cleaned_text)
        inferred_context = context.strip() if context and context.strip() else "Engineering\""""

    if old_step1 in text:
        text = text.replace(old_step1, new_step1)

    old_comp_ret = '"company_name": company.strip() if company else "Target Company",'
    new_comp_ret = '"company_name": company.strip() if company and company.strip() else "Not specified in source",'
    text = text.replace(old_comp_ret, new_comp_ret)

    # 3. Update _fallback_keyword_extraction to use actual source spans
    old_fallback = """        results = []
        for kw, cat in tech_keywords:
            if re.search(r"(?i)\\b" + re.escape(kw) + r"\\b", text):
                results.append({
                    "skill_id": f"skill-{kw.lower().replace(' ', '-')}",
                    "canonical_skill_id": None,
                    "original_label": kw,
                    "canonical_name": kw,
                    "category": cat,
                    "requirement_type": "core_required",
                    "importance": "high",
                    "expected_level": "Advanced" if "Senior" in seniority else "Practitioner",
                    "expected_level_numeric": 4 if "Senior" in seniority else 3,
                    "evidence_expectation": f"Demonstrated engineering experience with {kw}.",
                    "source_span": f"Explicitly mentioned requirement for {kw}.",
                    "status": "mapped",
                })
        return results"""

    new_fallback = """        results = []
        for kw, cat in tech_keywords:
            pattern = r"(?i)\\b" + re.escape(kw) + r"\\b"
            match = re.search(pattern, text)
            if match:
                start = max(0, match.start() - 40)
                end = min(len(text), match.end() + 60)
                matched_span = text[start:end].strip()
                results.append({
                    "skill_id": f"skill-{kw.lower().replace(' ', '-')}",
                    "canonical_skill_id": None,
                    "original_label": kw,
                    "canonical_name": kw,
                    "category": cat,
                    "requirement_type": "core_required",
                    "importance": "high",
                    "expected_level": "Advanced" if "Senior" in seniority else "Practitioner",
                    "expected_level_numeric": 4 if "Senior" in seniority else 3,
                    "evidence_expectation": f"Demonstrated engineering experience with {kw}.",
                    "source_span": matched_span,
                    "status": "mapped",
                })
        return results"""

    if old_fallback in text:
        text = text.replace(old_fallback, new_fallback)

    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print("Updated parser_service.py")

if __name__ == "__main__":
    update_parser_service()
