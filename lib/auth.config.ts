import type { NextAuthConfig } from "next-auth";

/**
 * Configuration compatible Edge Runtime — utilisée par middleware.ts.
 * Ne doit JAMAIS importer argon2, bcrypt, Prisma ou tout module Node natif :
 * ces dépendances cassent le build du middleware (Edge Runtime). Les
 * providers (Credentials, Google) et l'adapter Prisma vivent uniquement dans
 * lib/auth.ts, chargé côté Node (route handlers, server components).
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.organizationId = (user as { organizationId?: string }).organizationId;
        token.mustChangePassword = (user as { mustChangePassword?: boolean }).mustChangePassword ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { organizationId?: string }).organizationId = token.organizationId as string;
        (session.user as { mustChangePassword?: boolean }).mustChangePassword = token.mustChangePassword as boolean;
      }
      return session;
    },
  },
};
