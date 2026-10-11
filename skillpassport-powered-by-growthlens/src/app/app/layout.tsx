import AppSidebar from "@/components/app/AppSidebar";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen max-h-screen overflow-hidden flex text-[#1C1C1C]">
      {/* Persistent App Sidebar */}
      <AppSidebar />

      {/* Main Workspace Scroll Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#FBF1CF] h-screen max-h-screen overflow-y-auto custom-scrollbar">
        {children}
      </main>
    </div>
  );
}
