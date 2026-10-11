import AppSidebar from "@/components/app/AppSidebar";
import MobileTopNav from "@/components/app/MobileTopNav";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col lg:flex-row text-[#1C1C1C]">
      {/* Persistent App Sidebar on Desktop & Slide-out Drawer on Mobile/Tablet */}
      <AppSidebar />

      {/* Main Workspace Scroll Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#FBF1CF] h-screen max-h-screen overflow-y-auto custom-scrollbar">
        {/* Mobile / Tablet Top Navigation Bar (Hidden on lg and wider) */}
        <MobileTopNav />

        {/* Page Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
}
