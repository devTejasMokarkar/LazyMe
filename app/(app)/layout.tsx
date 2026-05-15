import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      <TopNav />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 md:ml-[240px] h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
