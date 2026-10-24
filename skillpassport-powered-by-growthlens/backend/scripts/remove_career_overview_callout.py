import re

def remove_callout():
    path = "src/app/app/career/page.tsx"
    with open(path, "r", encoding="utf-8") as f:
        text = f.read().replace("\r\n", "\n")

    # Match the entire philosophy callout card
    pattern = r'\{\/\* Core Architectural Philosophy Callout \*\/\}[\s\S]*?<div className="gl-card p-5 bg-white border border-ink/10">[\s\S]*?<\/div>\s*<\/div>\s*'
    new_text = re.sub(pattern, "", text)

    with open(path, "w", encoding="utf-8") as f:
        f.write(new_text)
    print("Removed philosophy callout section from src/app/app/career/page.tsx")

if __name__ == "__main__":
    remove_callout()
