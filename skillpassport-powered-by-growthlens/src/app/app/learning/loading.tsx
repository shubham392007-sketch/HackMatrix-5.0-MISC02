import LoadingAnimation from "@/components/ui/LoadingAnimation";

export default function LearningLoading() {
  return (
    <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center p-8 text-center select-none">
      <div className="relative flex items-center justify-center max-w-sm w-full mx-4">
        <div className="absolute -inset-2 bg-[#DFE968]/30 rounded-3xl blur-lg pointer-events-none" />

        <div className="relative p-8 rounded-3xl bg-[#FBF6DF]/90 border-[1.5px] border-[#1C1C1C] shadow-[4px_4px_0_0_#1C1C1C] flex flex-col items-center justify-center w-full overflow-hidden">
          <LoadingAnimation size="md" className="relative z-10" />

          <div className="mt-3 flex flex-col items-center gap-1.5 relative z-10 text-center">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DFE968] border border-[#1C1C1C] text-[9px] font-black uppercase tracking-wider mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1C1C1C] animate-ping" />
              <span>LEARNING ENGINE</span>
            </div>
            <p
              className="text-xs font-black tracking-widest uppercase text-[#1C1C1C]"
              style={{ letterSpacing: "0.2em" }}
            >
              PERSONALIZED LEARNING ···
            </p>
            <span className="text-[11px] font-medium text-[#1C1C1C]/70">
              Synthesizing skill pathways &amp; targeted course recommendations
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
