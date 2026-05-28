import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const authConfig = {
  providers: [Google],
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // @ts-ignore
        token.plan = user.plan;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        // @ts-ignore
        session.user.plan = token.plan;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.id) {
        const { initializeCredits } = await import("@/lib/credits");
        await initializeCredits(user.id).catch(() => {});
      }
    },
  },
  pages: {
    signIn: "/",
  },
} satisfies NextAuthConfig;
