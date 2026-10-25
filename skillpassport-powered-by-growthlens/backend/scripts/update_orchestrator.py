def update_orchestrator():
    path = "backend/app/career/orchestrator.py"
    with open(path, "r", encoding="utf-8") as f:
        text = f.read().replace("\r\n", "\n")

    # 1. Add httpx import if missing
    if "import httpx" not in text:
        text = text.replace("import asyncio\n", "import asyncio\nimport httpx\n")

    # 2. Add synthesize_mode_a_query_with_ollama method right before _generate_cache_key
    method_code = '''    async def synthesize_mode_a_query_with_ollama(self, skills: List[str]) -> str:
        """
        Synthesizes a targeted, high-recall job search query grounded in the user's
        real verified skills using local Ollama (qwen3:8b), falling back cleanly to
        deterministic domain heuristics if Ollama is offline or times out.
        """
        if not skills:
            return "Software Engineer"

        fallback_query = self.construct_mode_a_query(skills)

        try:
            ollama_url = getattr(self.settings, "ollama_base_url", "http://localhost:11434").rstrip("/")
            model = getattr(self.settings, "ollama_qwen_model", "qwen3:8b")
            skill_list_str = ", ".join(skills[:5])

            prompt = (
                f"Given these verified candidate technical skills: {skill_list_str}\\n"
                "Generate exactly ONE standard, realistic job title (2 to 4 words, e.g. 'LLM Security Engineer' or 'Distributed Systems Engineer') "
                "that best represents openings seeking this competency profile.\\n"
                "Return ONLY the job title text with no explanation, punctuation, quotes, or markdown."
            )

            async with httpx.AsyncClient(timeout=2.0) as client:
                resp = await client.post(
                    f"{ollama_url}/api/chat",
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "stream": False,
                        "options": {"temperature": 0.1, "num_predict": 15},
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    msg = data.get("message", {}).get("content", "").strip()
                    cleaned = re.sub(r'["\'\\*\\#\\.\\n]', '', msg).strip()
                    if 4 <= len(cleaned) <= 50 and any(w in cleaned.lower() for w in ["engineer", "developer", "architect", "scientist", "specialist", "analyst"]):
                        logger.info(f"Ollama synthesized Mode A query: '{cleaned}' from skills {skills[:4]}")
                        return cleaned
        except Exception as e:
            logger.debug(f"Ollama query generation bypassed ({e}); using deterministic query '{fallback_query}'")

        return fallback_query

    def _generate_cache_key'''

    text = text.replace("    def _generate_cache_key", method_code)

    # 3. Call synthesize_mode_a_query_with_ollama in discover_jobs
    old_call = '                search_query = self.construct_mode_a_query(influencing_skills)'
    new_call = '                search_query = await self.synthesize_mode_a_query_with_ollama(influencing_skills)'
    text = text.replace(old_call, new_call)

    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print("Updated orchestrator.py cleanly")

if __name__ == "__main__":
    update_orchestrator()
