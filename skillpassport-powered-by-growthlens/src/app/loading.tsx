import LoadingAnimation from "@/components/ui/LoadingAnimation";

export default function RootLoading() {
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-6 text-center select-none"
      style={{
        background: "transparent",
      }}
    >
      <div className="relative flex items-center justify-center max-w-sm w-full mx-4">
        {/* Ambient glow behind card */}
        <div className="absolute -inset-2 bg-[#1A1918]/5 rounded-3xl blur-xl pointer-events-none" />

        {/* Centered Cream Card Strictly Containing Everything Inside */}
        <div className="relative p-8 rounded-3xl bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[5px_5px_0_0_#1C1C1C] flex flex-col items-center justify-center w-full overflow-hidden">
          <LoadingAnimation size="md" className="relative z-10" />

          <div className="mt-4 flex flex-col items-center gap-1.5 relative z-10 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1E3A5F] text-[#FAF8F5] border border-[#1A1918] border border-[#1C1C1C] text-[10px] font-black uppercase tracking-wider mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FAF8F5] animate-ping" />
              <span>SYNCHRONIZING</span>
            </div>
            <p
              className="text-xs font-black tracking-widest uppercase text-[#1C1C1C]"
              style={{ letterSpacing: "0.2em" }}
            >
              PREPARING SKILL PASSPORT ···
            </p>
            <span className="text-[11px] font-medium text-[#1C1C1C]/70 tracking-wide">
              Loading verified evidence intelligence
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
