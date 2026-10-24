"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import { listUserRoadmaps } from "@/lib/evidenceApi";
import AppTopBar from "@/components/app/AppTopBar";
import { Map, Loader2, Sparkles, GraduationCap } from "lucide-react";

export default function RoadmapsIndexPage() {
  const router = useRouter();
  const { activeRoadmap } = useEvidence();
  const [isResolving, setIsResolving] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function resolveActiveRoadmap() {
      try {
        const res = await listUserRoadmaps().catch(() => ({ roadmaps: [] }));
        if (!isMounted) return;

        const roadmaps: any[] = res?.roadmaps || [];
        if (roadmaps.length > 0) {
          const inProgress = roadmaps.find((r) => r.status === "in_progress") || roadmaps[0];
          if (inProgress?.path_id) {
            router.replace(`/app/learning/roadmaps/${inProgress.path_id}`);
            return;
          }
        }

        // If no roadmaps in database, check context
        if (activeRoadmap?.path_id) {
          router.replace(`/app/learning/roadmaps/${activeRoadmap.path_id}`);
          return;
        }

        // Otherwise send to learning overview to remediate and synthesize
        setIsResolving(false);
      } catch (err) {
        if (isMounted) setIsResolving(false);
      }
    }

    resolveActiveRoadmap();

    return () => {
      isMounted = false;
    };
  }, [router, activeRoadmap]);

  if (isResolving) {
    return (
      <div className="flex-1 flex flex-col">
        <AppTopBar
          title="Personalized Learning Roadmap"
          description="Sequenced, prerequisite-aware learning journey tailored to your skill gaps."
          badge="Resolving Active Roadmap..."
        />
        <div className="flex-1 p-8 max-w-7xl w-full mx-auto flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-ink-muted" />
          <p className="text-xs font-mono text-ink-muted">Resolving your personalized curriculum roadmap...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Personalized Learning Roadmap"
        description="A sequenced, prerequisite-aware learning journey tailored to your skill gaps."
        badge="Roadmaps Hub"
      />
      <div className="flex-1 p-8 max-w-lg w-full mx-auto flex flex-col items-center justify-center space-y-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-sand/30 border border-ink/15 flex items-center justify-center mx-auto text-ink">
          <GraduationCap className="w-6 h-6 text-ink" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-ink">No Active Learning Roadmap Found</h3>
          <p className="text-xs text-ink/70">
            Generate your first personalized curriculum roadmap by remediating a prioritized skill gap from your Career Intelligence evaluation.
          </p>
        </div>
        <Link
          href="/app/learning"
          className="pill-btn pill-btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Remediate Skill Gaps &rarr;
        </Link>
      </div>
    </div>
  );
}
