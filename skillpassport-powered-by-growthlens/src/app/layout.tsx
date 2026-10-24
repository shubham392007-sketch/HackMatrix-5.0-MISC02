import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import PageTransition from "@/components/layout/PageTransition";
import SkillPassportBootScreen from "@/components/layout/SkillPassportBootScreen";
import GlobalPageTransitionLoader from "@/components/layout/GlobalPageTransitionLoader";
import AgentationProvider from "@/components/layout/AgentationProvider";
import InteractiveDotGrid from "@/components/layout/InteractiveDotGrid";
import { EvidenceProvider } from "@/context/EvidenceContext";
import { AuthProvider } from "@/context/AuthContext";

const poppins = Poppins({
  variable: "--font-primary",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SkillPassport Powered by GrowthLens — Verifiable Skills & Evidence Intelligence",
  description:
    "Turn projects, repositories, and documents into an inspectable, evidence-backed skill profile with role alignment and personalized learning.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} bg-[#F5F2EB]`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Pacifico&family=Yellowtail&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-screen flex flex-col font-[var(--font-primary)] bg-transparent relative"
        suppressHydrationWarning
      >
        <InteractiveDotGrid />
        <SkillPassportBootScreen />
        <GlobalPageTransitionLoader />
        <AuthProvider>
          <EvidenceProvider>
            <PageTransition>{children}</PageTransition>
          </EvidenceProvider>
        </AuthProvider>
        <AgentationProvider />
      </body>
    </html>
  );
}
