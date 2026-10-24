def fix_line():
    with open("backend/app/career/orchestrator.py", "r", encoding="utf-8") as f:
        lines = f.readlines()

    for i, line in enumerate(lines):
        if "cleaned = re.sub" in line:
            lines[i] = "                    cleaned = re.sub(r'''[\"'*#.\\n]''', '', msg).strip()\n"
            break

    with open("backend/app/career/orchestrator.py", "w", encoding="utf-8") as f:
        f.writelines(lines)
    print("Fixed orchestrator regex using triple quotes")

if __name__ == "__main__":
    fix_line()
