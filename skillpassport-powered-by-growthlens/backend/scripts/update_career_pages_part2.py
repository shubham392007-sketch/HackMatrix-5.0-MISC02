import re

def update_discover_page():
    path = "src/app/app/career/discover/page.tsx"
    with open(path, "r", encoding="utf-8") as f:
        text = f.read().replace("\r\n", "\n")

    # 1. Mode A header: Remove Sparkles and green dot
    old_mode_a = """                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink">
                    <Sparkles className="w-4 h-4 text-amber-700" />
                    Mode A — Find Jobs That Fit My Skills
                  </span>
                  {mode === "mode_a_skills" && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  )}
                </div>"""
    new_mode_a = """                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink">
                    Mode A — Find Jobs That Fit My Skills
                  </span>
                </div>"""
    if old_mode_a in text:
        text = text.replace(old_mode_a, new_mode_a)
    else:
        text = re.sub(
            r'<div className="flex items-center justify-between mb-1\.5">\s*<span className="inline-flex items-center gap-1\.5 text-xs font-bold text-ink">\s*<Sparkles[^>]*\/>\s*Mode A — Find Jobs That Fit My Skills\s*<\/span>\s*\{mode === "mode_a_skills" && \(\s*<span className="w-2 h-2 rounded-full bg-emerald-600" \/>\s*\)\}\s*<\/div>',
            new_mode_a,
            text
        )

    # 2. Mode B header: Remove green dot
    old_mode_b = """                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink">
                    <Search className="w-4 h-4 text-ink" />
                    Mode B — Search for a Role I Choose
                  </span>
                  {mode === "mode_b_role" && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  )}
                </div>"""
    new_mode_b = """                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink">
                    <Search className="w-4 h-4 text-ink" />
                    Mode B — Search for a Role I Choose
                  </span>
                </div>"""
    if old_mode_b in text:
        text = text.replace(old_mode_b, new_mode_b)
    else:
        text = re.sub(
            r'<div className="flex items-center justify-between mb-1\.5">\s*<span className="inline-flex items-center gap-1\.5 text-xs font-bold text-ink">\s*<Search[^>]*\/>\s*Mode B — Search for a Role I Choose\s*<\/span>\s*\{mode === "mode_b_role" && \(\s*<span className="w-2 h-2 rounded-full bg-emerald-600" \/>\s*\)\}\s*<\/div>',
            new_mode_b,
            text
        )

    # 3. Standardize ShieldCheck styling and remove count span
    old_skills_label = """                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    Influencing Skills from your Skill Intelligence Profile:
                  </label>
                  <span className="text-[11px] font-mono text-ink-muted">
                    {selectedSkillIds.length} of 8 selected
                  </span>
                </div>"""
    new_skills_label = """                <div className="flex items-center">
                  <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-ink" />
                    Influencing Skills from your Skill Intelligence Profile:
                  </label>
                </div>"""
    if old_skills_label in text:
        text = text.replace(old_skills_label, new_skills_label)
    else:
        text = re.sub(
            r'<div className="flex items-center justify-between">\s*<label className="text-xs font-bold text-ink flex items-center gap-1\.5">\s*<ShieldCheck className="w-4 h-4 text-emerald-700" \/>\s*Influencing Skills from your Skill Intelligence Profile:\s*<\/label>\s*<span className="text-\[11px\] font-mono text-ink-muted">\s*\{selectedSkillIds\.length\} of 8 selected\s*<\/span>\s*<\/div>',
            new_skills_label,
            text
        )

    # 4. Mode B: Add Option "Can't find your job? Parse a job description"
    old_mode_b_input = """              <div className="space-y-1.5">
                <label htmlFor="role-query-input" className="block text-xs font-bold text-ink">
                  What role do you want to become?
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                  <input
                    id="role-query-input"
                    type="text"
                    value={roleQuery}
                    onChange={(e) => setRoleQuery(e.target.value)}
                    placeholder="e.g. AI Engineer, Machine Learning Engineer, MLOps Specialist, Backend Developer..."
                    className="w-full bg-white border border-ink/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-ink placeholder:text-ink-muted/70 focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
                    autoComplete="off"
                  />
                </div>
              </div>"""
    new_mode_b_input = """              <div className="space-y-2.5">
                <div className="space-y-1.5">
                  <label htmlFor="role-query-input" className="block text-xs font-bold text-ink">
                    What role do you want to become?
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                    <input
                      id="role-query-input"
                      type="text"
                      value={roleQuery}
                      onChange={(e) => setRoleQuery(e.target.value)}
                      placeholder="e.g. AI Engineer, Machine Learning Engineer, MLOps Specialist, Backend Developer..."
                      className="w-full bg-white border border-ink/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-ink placeholder:text-ink-muted/70 focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-0.5 px-0.5">
                  <span className="text-ink-muted text-[11px]">
                    Can&apos;t find your job?
                  </span>
                  <Link
                    href="/app/career/job-parser"
                    className="text-xs font-bold text-ink hover:underline inline-flex items-center gap-1 text-[11px]"
                  >
                    Parse a job description &rarr;
                  </Link>
                </div>
              </div>"""
    if old_mode_b_input in text:
        text = text.replace(old_mode_b_input, new_mode_b_input)
    else:
        text = re.sub(
            r'<div className="space-y-1\.5">\s*<label htmlFor="role-query-input" className="block text-xs font-bold text-ink">\s*What role do you want to become\?\s*<\/label>[\s\S]*?autoComplete="off"\s*\/>\s*<\/div>\s*<\/div>',
            new_mode_b_input,
            text
        )

    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print("Updated discover/page.tsx")

def update_roles_page():
    path = "src/app/app/career/roles/page.tsx"
    with open(path, "r", encoding="utf-8") as f:
        text = f.read().replace("\r\n", "\n")

    # Remove Explore Catalogue Benchmarks tab button
    old_tabs = """        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-ink/10 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("targets")}
              className={`pill-btn text-xs py-2 px-4 flex items-center gap-2 font-bold transition-all ${
                activeTab === "targets"
                  ? "bg-ink text-white shadow"
                  : "bg-white text-ink hover:bg-sand/30 border border-ink/10"
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              My Target Roles ({savedTargetRoles.length})
            </button>
            <button
              onClick={() => setActiveTab("catalogue")}
              className={`pill-btn text-xs py-2 px-4 flex items-center gap-2 font-bold transition-all ${
                activeTab === "catalogue"
                  ? "bg-ink text-white shadow"
                  : "bg-white text-ink hover:bg-sand/30 border border-ink/10"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Explore Catalogue Benchmarks ({catalogueRoles.length})
            </button>
          </div>"""
    new_tabs = """        {/* Navigation / Header */}
        <div className="flex items-center justify-between border-b border-ink/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="pill-btn bg-ink text-white shadow text-xs py-2 px-4 flex items-center gap-2 font-bold">
              <Target className="w-3.5 h-3.5" />
              My Target Roles ({savedTargetRoles.length})
            </span>
          </div>"""
    if old_tabs in text:
        text = text.replace(old_tabs, new_tabs)

    # Empty state button: remove Explore Catalogue Benchmarks
    old_empty_btn = """              <button
                onClick={() => setActiveTab("catalogue")}
                className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" /> Explore Catalogue Benchmarks
              </button>"""
    if old_empty_btn in text:
        text = text.replace(old_empty_btn, "")

    old_empty_btn2 = """              <button
                type="button"
                onClick={() => setActiveTab("catalogue")}
                className="pill-btn pill-btn-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Briefcase className="w-3.5 h-3.5" />
                Explore Catalogue Roles
              </button>"""
    if old_empty_btn2 in text:
        text = text.replace(old_empty_btn2, "")

    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print("Updated roles/page.tsx")

def update_match_page():
    path = "src/app/app/career/match/page.tsx"
    with open(path, "r", encoding="utf-8") as f:
        text = f.read().replace("\r\n", "\n")

    # Remove UI text: Calculated against {activeRole.version} demand model on {activeMatch.calculated_at}.
    old_version_p = """              <p className="text-xs text-ink-muted max-w-lg">
                Calculated against <strong>{activeRole.version}</strong> demand model on{" "}
                {activeMatch.calculated_at}.
              </p>"""
    if old_version_p in text:
        text = text.replace(old_version_p, "")
    else:
        text = re.sub(
            r'<p className="text-xs text-ink-muted max-w-lg">\s*Calculated against <strong>\{activeRole\.version\}<\/strong> demand model on\{" "\}\s*\{activeMatch\.calculated_at\}\.\s*<\/p>',
            "",
            text
        )

    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print("Updated match/page.tsx")

def update_gaps_page():
    path = "src/app/app/career/gaps/page.tsx"
    with open(path, "r", encoding="utf-8") as f:
        text = f.read().replace("\r\n", "\n")

    # 1. Remove philosophy banner
    old_banner = """      {/* Philosophy Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-200/60 border border-amber-400/50 flex items-center justify-center shrink-0 mt-0.5">
          <Info className="w-4 h-4 text-amber-900" />
        </div>
        <div className="text-xs text-ink/80 space-y-1">
          <span className="font-bold text-ink block">
            Evidence-Aware Gap Principle
          </span>
          <p>
            Traditional platforms assume lack of self-reported keywords equals complete absence of skill.
            GrowthLens differentiates between a <strong>Skill Gap</strong> (unestablished ability),
            a <strong>Depth Gap</strong> (working knowledge needing practitioner mastery), and an <strong>Evidence Gap</strong> (work has been done, but formal verification artifacts are insufficient).
          </p>
        </div>
      </div>"""
    if old_banner in text:
        text = text.replace(old_banner, "")
    else:
        text = re.sub(
            r'\{\/\* Philosophy Banner \*\/\}[\s\S]*?<div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50[\s\S]*?<\/div>\s*<\/div>',
            "",
            text
        )

    # 2. Fix search input padding
    old_search = """          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search gaps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pill-input text-xs py-1.5 pl-8 pr-3 w-40 md:w-52 bg-white"
            />
          </div>"""
    new_search = """          <div className="relative">
            <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
            <input
              type="text"
              placeholder="Search gaps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pill-input text-xs py-1.5 !pl-10 pr-3 w-40 md:w-52 bg-white"
              style={{ paddingLeft: "2.5rem" }}
            />
          </div>"""
    if old_search in text:
        text = text.replace(old_search, new_search)
    else:
        text = re.sub(
            r'<div className="relative">\s*<Search className="w-3\.5 h-3\.5 text-ink-muted absolute left-3 top-1\/2 -translate-y-1\/2" \/>\s*<input[^>]*placeholder="Search gaps\.\.\."[^>]*\/>\s*<\/div>',
            new_search,
            text
        )

    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print("Updated gaps/page.tsx")

def update_readiness_page():
    path = "src/app/app/career/readiness/page.tsx"
    with open(path, "r", encoding="utf-8") as f:
        text = f.read().replace("\r\n", "\n")

    old_explanation = """            <p className="text-xs md:text-sm text-ink-muted max-w-xl leading-relaxed">
              Your profile satisfies the core baseline competencies, with strong evidence in core engineering.
              Advancing to <em>High Readiness</em> requires formalizing verification for candidate skills and establishing production depth in {activeReadiness.critical_blockers.length} critical requirement areas.
            </p>"""

    new_explanation = """            <p className="text-xs md:text-sm text-ink-muted max-w-xl leading-relaxed">
              {(() => {
                const corePct = activeReadiness.required_supported_pct ?? activeMatch?.required_coverage_score ?? 0;
                const blockerCount = activeReadiness.critical_blockers?.length ?? 0;
                const blockerNames = (activeReadiness.critical_blockers || [])
                  .slice(0, 3)
                  .map((b) => b.skill_name)
                  .join(", ");
                const tier = activeReadiness.readiness_tier;

                let baselineSentence = "";
                if (corePct >= 80) {
                  baselineSentence = `Your profile demonstrates robust coverage (${corePct}%) of core baseline competencies.`;
                } else if (corePct >= 50) {
                  baselineSentence = `Your profile establishes moderate coverage (${corePct}%) across core baseline competencies.`;
                } else if (corePct > 0) {
                  baselineSentence = `Your profile shows developing baseline coverage (${corePct}%) with foundational competencies in progress.`;
                } else {
                  baselineSentence = `Your profile currently lacks verified evidence for core baseline competencies.`;
                }

                let nextSentence = "";
                if (tier === "High Readiness") {
                  nextSentence = blockerCount > 0
                    ? `Advancing further involves resolving ${blockerCount} minor blocker${blockerCount > 1 ? "s" : ""} (${blockerNames}).`
                    : "Your evidence profile aligns comprehensively across all evaluated demand dimensions.";
                } else if (tier === "Moderate Alignment") {
                  nextSentence = blockerCount > 0
                    ? `Advancing to High Readiness requires establishing verified production depth in ${blockerCount} critical blocker${blockerCount > 1 ? "s" : ""}${blockerNames ? `: ${blockerNames}` : ""}.`
                    : "Advancing to High Readiness requires strengthening formal verification across candidate skills.";
                } else if (tier === "Developing Foundations") {
                  nextSentence = blockerCount > 0
                    ? `Advancing toward Moderate Alignment requires closing foundational skill gaps in ${blockerCount} requirement area${blockerCount > 1 ? "s" : ""}${blockerNames ? `: ${blockerNames}` : ""}.`
                    : "Advancing toward Moderate Alignment requires demonstrating attributable work artifacts.";
                } else {
                  nextSentence = "Focus initial effort on establishing demonstrable project artifacts for core prerequisite requirements.";
                }

                return `${baselineSentence} ${nextSentence}`;
              })()}
            </p>"""

    if old_explanation in text:
        text = text.replace(old_explanation, new_explanation)
    else:
        text = re.sub(
            r'<p className="text-xs md:text-sm text-ink-muted max-w-xl leading-relaxed">\s*Your profile satisfies the core baseline competencies[\s\S]*?critical requirement areas\.\s*<\/p>',
            new_explanation,
            text
        )

    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print("Updated readiness/page.tsx")

if __name__ == "__main__":
    update_discover_page()
    update_roles_page()
    update_match_page()
    update_gaps_page()
    update_readiness_page()
