"use client";

import Link from "next/link";
import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
import { SourceStatusBadge } from "@/components/app/StatusBadges";
import {
  GitBranch,
  Layers,
  UploadCloud,
  FileCode,
  Globe,
  Award,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Check,
} from "lucide-react";

export default function ConnectedSourcesPage() {
  const { sources, initialLoading, isLoadingEvidence } = useEvidence();
  const isDataLoading = initialLoading || (isLoadingEvidence && sources.length === 0);
  const githubSource = sources.find((s) => s.type === "github");
  const jiraSource = sources.find((s) => s.type === "jira");

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Connected Sources"
        description="Manage connected platforms, code repositories, and work document channels."
        backHref="/app/evidence"
        backLabel="Evidence Center"
      >
        <Link
          href="/app/evidence/upload"
          className="pill-btn pill-btn-primary text-xs py-2 px-4"
        >
          UPLOAD NEW FILE
        </Link>
      </AppTopBar>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">
        {/* Account Integrations */}
        <section className="space-y-4">
          <div className="border-b border-[#1C1C1C]/15 pb-2">
            <h2 className="text-xl font-black text-[#1C1C1C]">Version Control &amp; Project Trackers</h2>
            <p className="text-xs font-medium text-[#1C1C1C]/75">
              Live integration pipelines with encrypted credential storage for automated commit and ticket extraction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* GitHub Card */}
            <div className="gl-card p-6 flex flex-col justify-between bg-[#FBF6DF]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center shadow-[1.5px_1.5px_0_0_#1C1C1C]">
                    <GitBranch className="w-6 h-6 text-[#1C1C1C]" />
                  </div>
                  <SourceStatusBadge status={isDataLoading ? "syncing" : (githubSource?.status || "not_connected")} />
                </div>
                <h3 className="text-xl font-black text-[#1C1C1C] mb-1">GitHub</h3>
                <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed mb-4">
                  Import authorized repositories and reviewable activity such as commits, pull requests, issues, and code reviews with cryptographic SHA attribution.
                </p>

                <div className="p-3 bg-[#FBF1CF] rounded-xl border border-[#1C1C1C] text-xs font-mono mb-4 space-y-2">
                  <div>
                    <span className="block font-bold mb-1">Active Repositories:</span>
                    {isDataLoading ? (
                      <div className="h-4 w-36 bg-[#1C1C1C]/15 rounded animate-pulse" />
                    ) : (
                      <span className={githubSource?.selectedEntities?.length ? "text-[#4A7A4E] font-black break-all" : "text-[#1C1C1C]/50"}>
                        {githubSource?.selectedEntities?.length ? githubSource.selectedEntities.join(" • ") : "No repositories connected"}
                      </span>
                    )}
                  </div>
                  {(githubSource as any)?.languageSummary?.languages?.length > 0 && (
                    <div className="pt-2 border-t border-[#1C1C1C]/15">
                      <span className="block font-bold mb-1 text-[11px]">Repository Languages Detected:</span>
                      <div className="flex flex-wrap gap-1">
                        {(githubSource as any).languageSummary.languages.map((l: string) => (
                          <span key={l} className="px-1.5 py-0.5 rounded bg-white border border-[#1C1C1C]/30 text-[10px] font-bold">
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-[#1C1C1C]/10">
                <Link
                  href="/app/evidence/sources/github"
                  className="pill-btn pill-btn-primary flex-1 text-xs py-2.5"
                >
                  MANAGE GITHUB REPOS <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Jira Card */}
            <div className="gl-card p-6 flex flex-col justify-between bg-[#FBF6DF]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#F6BB84] border border-[#1C1C1C] flex items-center justify-center shadow-[1.5px_1.5px_0_0_#1C1C1C]">
                    <Layers className="w-6 h-6 text-[#1C1C1C]" />
                  </div>
                  <SourceStatusBadge status={isDataLoading ? "syncing" : (jiraSource?.status || "not_connected")} />
                </div>
                <h3 className="text-xl font-black text-[#1C1C1C] mb-1">Jira Software</h3>
                <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed mb-4">
                  Import authorized project work, sprint tasks, issue descriptions, acceptance criteria, and resolution worklogs.
                </p>

                <div className="p-3 bg-[#FBF1CF] rounded-xl border border-[#1C1C1C] text-xs font-mono mb-4">
                  <span className="block font-bold mb-1">Active Projects:</span>
                  {isDataLoading ? (
                    <div className="h-4 w-36 bg-[#1C1C1C]/15 rounded animate-pulse" />
                  ) : (
                    <span className={jiraSource?.selectedEntities?.length ? "text-[#4A7A4E] font-black break-all" : "text-[#1C1C1C]/50"}>
                      {jiraSource?.selectedEntities?.length ? jiraSource.selectedEntities.join(" • ") : "No projects connected"}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-[#1C1C1C]/10">
                <Link
                  href="/app/evidence/sources/jira"
                  className="pill-btn pill-btn-secondary flex-1 text-xs py-2.5"
                >
                  MANAGE JIRA PROJECTS <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Upload & Document Categories */}
        <section className="space-y-4">
          <div className="border-b border-[#1C1C1C]/15 pb-2">
            <h2 className="text-xl font-black text-[#1C1C1C]">Manual Work &amp; Document Intakes</h2>
            <p className="text-xs font-medium text-[#1C1C1C]/75">
              Self-hosted document parsing channels with OCR and citation grounding.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Certificates",
                desc: "PDFs, credentials, and course awards with issuer validation.",
                icon: Award,
                cat: "certificates",
              },
              {
                title: "Project Reports",
                desc: "Technical specs, architecture RFCs, and Capstone reports.",
                icon: FileCode,
                cat: "projects",
              },
              {
                title: "Research Papers",
                desc: "Published manuscripts, DOI citations, and conference decks.",
                icon: BookOpen,
                cat: "research",
              },
              {
                title: "Portfolio URLs",
                desc: "Public project links, case study pages, and web repos.",
                icon: Globe,
                cat: "portfolio",
              },
            ].map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.title}
                  className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] flex flex-col justify-between shadow-[2px_2px_0_0_#1C1C1C]"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#1C1C1C] flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-[#1C1C1C]" />
                    </div>
                    <h4 className="text-sm font-black text-[#1C1C1C] mb-1">{cat.title}</h4>
                    <p className="text-xs font-medium text-[#1C1C1C]/75 leading-relaxed mb-4">
                      {cat.desc}
                    </p>
                  </div>
                  <Link
                    href={`/app/evidence/upload?category=${cat.cat}`}
                    className="pill-btn pill-btn-secondary text-[11px] py-1.5 w-full text-center"
                  >
                    ADD {cat.title.toUpperCase()}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
