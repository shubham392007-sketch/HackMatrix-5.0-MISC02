import re

def refine():
    path = "src/app/app/career/roles/page.tsx"
    with open(path, "r", encoding="utf-8") as f:
        text = f.read().replace("\r\n", "\n")

    # Replace empty state 1 buttons
    old1 = """            <div className="flex items-center justify-center gap-3 pt-2">

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-ink text-xs py-2 px-4 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Custom Role
              </button>
            </div>"""

    new1 = """            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/app/career/discover"
                className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold shadow-sm"
              >
                <Globe className="w-3.5 h-3.5" /> Discover Jobs
              </Link>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-ink text-xs py-2 px-4 flex items-center gap-1.5 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add Custom Role
              </button>
            </div>"""

    old2 = """            <div className="flex items-center justify-center gap-3 pt-2">

              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-ink text-xs py-2 px-4 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Custom Role
              </button>
            </div>"""

    new2 = """            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/app/career/discover"
                className="pill-btn pill-btn-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Globe className="w-3.5 h-3.5" />
                Discover Jobs
              </Link>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-ink text-xs py-2 px-4 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Custom Role
              </button>
            </div>"""

    text = text.replace(old1, new1).replace(old2, new2)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print("Refined empty states in roles/page.tsx")

if __name__ == "__main__":
    refine()
