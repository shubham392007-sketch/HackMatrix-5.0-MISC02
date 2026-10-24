import re

def update_career_overview():
    path = "src/app/app/career/page.tsx"
    with open(path, "r", encoding="utf-8") as f:
        text = f.read().replace("\r\n", "\n")

    # 1. Add MarkdownContent import if not present
    if "import MarkdownContent from" not in text:
        text = text.replace(
            'import TargetRoleSelectorBar from "@/components/app/TargetRoleSelectorBar";',
            'import TargetRoleSelectorBar from "@/components/app/TargetRoleSelectorBar";\nimport MarkdownContent from "@/components/MarkdownContent";'
        )

    # 2. Replace gradient callout with solid white card
    old_callout = '<div className="gl-card p-5 bg-gradient-to-r from-lime/30 via-sand/20 to-white border border-ink/15">'
    new_callout = '<div className="gl-card p-5 bg-white border border-ink/10">'
    if old_callout in text:
        text = text.replace(old_callout, new_callout)
    else:
        print("Note: old_callout pattern not matched directly, checking regex")
        text = re.sub(
            r'<div className="gl-card p-5 bg-gradient-to-r[^"]*">',
            '<div className="gl-card p-5 bg-white border border-ink/10">',
            text
        )

    # 3. Replace raw description with MarkdownContent
    old_desc = """                <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                  {activeRole.description}
                </p>"""
    new_desc = """                <MarkdownContent
                  content={activeRole.description}
                  className="mt-2 text-xs text-ink/80 leading-relaxed"
                />"""
    if old_desc in text:
        text = text.replace(old_desc, new_desc)
    else:
        print("Regex replacing description")
        text = re.sub(
            r'<p className="text-xs text-ink-muted mt-1 leading-relaxed">\s*\{activeRole\.description\}\s*</p>',
            new_desc,
            text
        )

    # 4. Remove small text-[11px] span (Model Provenance) and adjust footer
    old_footer = """            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-ink/10">
              <span className="text-[11px] text-ink-muted font-mono">
                Model Provenance: {activeRole.provenance}
              </span>
              <div className="flex items-center gap-2">
                <Link
                  href="/app/career/match"
                  className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
                >
                  Full Role Match Breakdown <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>"""
    new_footer = """            {/* Bottom Actions */}
            <div className="flex items-center justify-end pt-3 border-t border-ink/10">
              <Link
                href="/app/career/match"
                className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
              >
                Full Role Match Breakdown <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>"""
    if old_footer in text:
        text = text.replace(old_footer, new_footer)
    else:
        print("Regex replacing footer")
        text = re.sub(
            r'\{\/\* Bottom Actions \*\/\}[\s\S]*?<div className="flex items-center justify-between pt-2 border-t border-ink/10">[\s\S]*?<\/div>\s*<\/div>',
            new_footer,
            text
        )

    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print("Successfully updated src/app/app/career/page.tsx")

if __name__ == "__main__":
    update_career_overview()
