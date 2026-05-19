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
    <div className="min-h-screen bg-background text-on-background overflow-x-hidden">
      <TopNav />
      <Sidebar />
      <div className="lg:pl-[72px] pt-16">
        <main className="h-[calc(100vh-64px)] overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}