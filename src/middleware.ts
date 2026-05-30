import NextAuth from "next-auth";
import { authConfig } from "@/config/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnResume = req.nextUrl.pathname.startsWith("/resume");

  if (isOnResume && !isLoggedIn) {
    return Response.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
