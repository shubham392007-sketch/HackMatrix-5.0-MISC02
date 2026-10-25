def fix():
    # 1. Fix backend/app/api/career.py
    with open("backend/app/api/career.py", "r", encoding="utf-8") as f:
        api_text = f.read().replace("\r\n", "\n")

    if "from urllib.parse import urlparse" not in api_text:
        api_text = api_text.replace("import re\n", "import re\nfrom urllib.parse import urlparse\n")
        with open("backend/app/api/career.py", "w", encoding="utf-8") as f:
            f.write(api_text)
        print("Added urlparse import to career.py")

    # 2. Fix backend/app/career/orchestrator.py
    with open("backend/app/career/orchestrator.py", "r", encoding="utf-8") as f:
        orch_text = f.read().replace("\r\n", "\n")

    old_heuristics = '''        combined = " ".join(skills).lower()

        if any(k in combined for k in ["machine learning", "ai", "artificial intelligence", "deep learning"]):'''

    new_heuristics = '''        combined = " ".join(skills).lower()

        # Specific specialized security and cryptography career families
        if any(k in combined for k in ["llm security", "prompt injection", "red teaming", "ai safety", "guardrail"]):
            return "LLM Security Engineer"
        if any(k in combined for k in ["cryptography", "zero knowledge", "zero-knowledge", "zkp", "elliptic curve", "cipher", "encryption"]):
            return "Cryptography Engineer"
        if any(k in combined for k in ["forensics", "dfir", "incident response", "malware", "reverse engineering"]):
            return "DFIR Specialist"
        if any(k in combined for k in ["penetration test", "penetration testing", "pentest", "offensive security", "ctf", "exploit", "ethical hacking"]):
            return "Penetration Tester"

        if any(k in combined for k in ["machine learning", "ai", "artificial intelligence", "deep learning"]):'''

    if old_heuristics in orch_text:
        orch_text = orch_text.replace(old_heuristics, new_heuristics)
        with open("backend/app/career/orchestrator.py", "w", encoding="utf-8") as f:
            f.write(orch_text)
        print("Added security heuristics to orchestrator.py")

if __name__ == "__main__":
    fix()
