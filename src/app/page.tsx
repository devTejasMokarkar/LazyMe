import LandingPage from "@/components/landing/LandingPage";
import { auth } from "@/config/auth";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await auth();

  if (session) {
    redirect("/resume");
  }

  return <LandingPage />;
}
