import LandingPage from "@/components/LandingPage";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await auth();

  if (session) {
    redirect("/resume");
  }

  return <LandingPage />;
}
