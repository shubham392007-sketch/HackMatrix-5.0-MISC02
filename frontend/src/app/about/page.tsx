import GlobalHeader from "@/components/layout/GlobalHeader";

export default function AboutPage() {
  const steps = [
    {
      num: "01",
      title: "Collect Evidence",
      desc: "We bring together data from GitHub, Jira, assessments, feedback, and more — building a continuous stream of real work signals.",
    },
    {
      num: "02",
      title: "Analyze & Understand",
      desc: "AI extracts insights, finds patterns, and maps your competencies. Evidence-grounded — never invented.",
    },
    {
      num: "03",
      title: "Guide & Grow",
      desc: "Get personalized recommendations, learning paths, and mentorship opportunities backed by your real trajectory.",
    },
  ];

  return (
    <>
      <GlobalHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-[1400px] mx-auto px-5 md:px-10 pt-16 pb-20">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4 tracking-tight">
              More than data.
              <br />
              It&apos;s your{" "}
              <span style={{ fontFamily: "'Yellowtail', cursive" }} className="text-4xl md:text-6xl">
                growth
              </span>{" "}
              story.
            </h1>
            <p className="text-sm md:text-base font-medium opacity-70 max-w-xl mx-auto leading-relaxed">
              GrowthLens is a continuous talent intelligence platform that turns
              real work, project activity, and performance signals into
              meaningful insights about your skills, trajectory, and next best
              actions.
            </p>
          </div>
        </section>

        {/* How It Works */}
        <section className="max-w-[1400px] mx-auto px-5 md:px-10 pb-20">
          <h2 className="text-center text-[11px] font-bold tracking-[0.12em] uppercase mb-10 opacity-50">
            HOW IT WORKS
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div
                key={step.num}
                className="gl-card p-6 stagger-item"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="w-10 h-10 rounded-full bg-[var(--color-cta)] border border-[var(--color-ink)] flex items-center justify-center text-sm font-bold mb-4">
                  {step.num}
                </div>
                <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-sm font-medium opacity-60 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Philosophy */}
        <section className="max-w-[1400px] mx-auto px-5 md:px-10 pb-20 text-center">
          <blockquote
            className="text-2xl md:text-4xl leading-snug font-medium opacity-80"
            style={{ fontFamily: "'Yellowtail', cursive" }}
          >
            Real evidence. Deeper insights.
            <br />
            Continuous growth.
          </blockquote>
        </section>

        {/* Evidence → Competency → Trajectory → Action → Growth Flow */}
        <section className="max-w-[1400px] mx-auto px-5 md:px-10 pb-20">
          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-bold tracking-[0.1em] uppercase">
            {["EVIDENCE", "COMPETENCIES", "TRAJECTORIES", "ACTIONS", "GROWTH"].map(
              (label, i) => (
                <span key={label} className="flex items-center gap-3">
                  {i > 0 && <span className="text-lg opacity-40">↓</span>}
                  <span className="px-4 py-2 rounded-full border border-[var(--color-ink)] bg-[var(--color-card)]">
                    {label}
                  </span>
                </span>
              )
            )}
          </div>
        </section>
      </main>
    </>
  );
}
