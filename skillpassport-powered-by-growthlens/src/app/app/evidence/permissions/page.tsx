"use client";

import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
import { Lock, ShieldCheck, Trash2, AlertTriangle } from "lucide-react";

export default function PermissionsPage() {
  const { sources, disconnectSource } = useEvidence();

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Data &amp; Permissions"
        description="Inspect how your work evidence is scoped, control connected integrations, and manage privacy settings."
        backHref="/app/evidence"
        backLabel="Evidence Center"
      />

      <main className="p-6 lg:p-10 space-y-8 max-w-4xl">
        {/* Privacy by Design Card */}
        <div className="p-6 rounded-[28px] border-[1.5px] border-[#1C1C1C] bg-[#DFE968]/30 space-y-3 shadow-[3px_3px_0_0_#1C1C1C]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#4A7A4E]" />
            <h3 className="text-base font-black text-[#1C1C1C]">Local Privacy &amp; Data Sovereignty</h3>
          </div>
          <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
            All repository diffs, Jira worklogs, and document uploads stay strictly on your local infrastructure. No private code repositories or personal credentials are sent to external third-party networks.
          </p>
        </div>

        {/* Connected Integrations & Disconnect Actions */}
        <section className="space-y-4">
          <div className="border-b border-[#1C1C1C]/15 pb-2">
            <h3 className="text-lg font-black text-[#1C1C1C]">Connected Integrations</h3>
            <p className="text-xs text-[#1C1C1C]/60">Manage authorized services and revoke access.</p>
          </div>

          <div className="space-y-3">
            {sources.map((src) => (
              <div
                key={src.id}
                className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[2px_2px_0_0_#1C1C1C]"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-black text-[#1C1C1C]">{src.name}</h4>
                    <span className="text-[10px] font-bold text-[#1C1C1C]/50 uppercase">
                      ({src.accountIdentity})
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#1C1C1C]/70">
                    <span>Permissions: {src.permissions.join(", ")}</span>
                  </div>
                </div>

                <div className="shrink-0">
                  {src.status === "demo_connected" || src.status === "connected" ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Disconnect and revoke access for ${src.name}?`)) {
                          disconnectSource(src.id);
                        }
                      }}
                      className="pill-btn pill-btn-secondary text-xs text-[#C85A54] py-1.5 px-3 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>DISCONNECT</span>
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-[#1C1C1C]/50">NOT CONNECTED</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Evidence Visibility Boundaries */}
        <section className="space-y-4">
          <div className="border-b border-[#1C1C1C]/15 pb-2">
            <h3 className="text-lg font-black text-[#1C1C1C]">Evidence Scoping</h3>
            <p className="text-xs text-[#1C1C1C]/60">How evidence artifacts are viewed across the workspace.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
            <div className="p-5 rounded-2xl border border-[#1C1C1C] bg-[#FBF1CF]">
              <span className="font-black block mb-1 uppercase">1. Workspace Internal</span>
              <p className="text-[#1C1C1C]/80 leading-relaxed">
                Raw code diffs, author timestamps, and unreviewed documents are visible only to you within your personal Evidence Center.
              </p>
            </div>
            <div className="p-5 rounded-2xl border border-[#1C1C1C] bg-white">
              <span className="font-black block mb-1 uppercase">2. Shareable Recruiter Passport</span>
              <p className="text-[#1C1C1C]/80 leading-relaxed">
                Only verified, corroborated competencies and authorized citation links will be displayed on your external recruiter passport.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
