import LoadingAnimation from "@/components/ui/LoadingAnimation";

export default function OnboardingLoading() {
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-6 text-center select-none"
      style={{
        background: "linear-gradient(180deg, #FBF1CF 0%, #F6C8D6 52%, #F3A878 100%)",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="relative p-8 rounded-3xl bg-[#FBF6DF]/90 border-[1.5px] border-[#1C1C1C] shadow-[5px_5px_0_0_#1C1C1C] flex flex-col items-center justify-center max-w-sm w-full mx-4">
        <div className="absolute -inset-2 bg-[#DFE968]/30 rounded-3xl blur-xl pointer-events-none" />

        <LoadingAnimation size="md" className="relative z-10" />

        <div className="mt-4 flex flex-col items-center gap-1.5 relative z-10 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DFE968] border border-[#1C1C1C] text-[10px] font-black uppercase tracking-wider mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1C1C1C] animate-ping" />
            <span>SETUP WIZARD</span>
          </div>
          <p
            className="text-xs font-black tracking-widest uppercase text-[#1C1C1C]"
            style={{ letterSpacing: "0.2em" }}
          >
            INITIALIZING WIZARD ···
          </p>
          <span className="text-[11px] font-medium text-[#1C1C1C]/70 tracking-wide">
            Preparing your evidence sources and profile configuration
          </span>
        </div>
      </div>
    </div>
  );
}
