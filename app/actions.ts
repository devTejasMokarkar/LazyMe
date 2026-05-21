"use server";

import { signIn, signOut } from "@/auth";

export async function signInAction(formData: FormData) {
  const redirectTo = (formData.get("redirectTo") as string) || "/resume";
  await signIn("google", { redirectTo });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
