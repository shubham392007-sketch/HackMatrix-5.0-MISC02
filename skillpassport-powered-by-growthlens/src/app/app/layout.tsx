import AppSidebar from "@/components/app/AppSidebar";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex text-[#1C1C1C]">
      {/* Persistent App Sidebar */}
      <AppSidebar />

      {/* Main Workspace Scroll Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#FBF1CF]">
        {children}
      </div>
    </div>
  );
}
