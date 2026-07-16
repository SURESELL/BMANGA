import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { buildSecurityHeaders } from "@/lib/security-headers";

// Instance Edge-safe distincte de lib/auth.ts : le middleware tourne dans
// l'Edge Runtime, incompatible avec argon2/Prisma (modules Node natifs) que
// lib/auth.ts charge pour le provider Credentials complet.
const { auth } = NextAuth(authConfig);

const PUBLIC_ROUTES = ["/", "/login", "/register", "/forgot-password", "/reset-password", "/pricing", "/features", "/about", "/contact", "/privacy", "/terms", "/legal"];
const AUTH_ROUTES = ["/login", "/register"];
const CHANGE_PASSWORD_ROUTE = "/change-password";

// CSP par nonce (pattern officiel App Router) : un nonce est généré à chaque
// requête, transmis à Next.js via l'en-tête de requête `x-nonce` (lu par
// app/layout.tsx via `headers()`, ce qui permet à Next.js d'appliquer
// automatiquement le nonce à ses propres scripts inline de streaming/hydratation)
// et injecté dans l'en-tête de réponse Content-Security-Policy.
function withSecurityHeaders(res: NextResponse, nonce: string) {
  const headers = buildSecurityHeaders(nonce);
  for (const [key, value] of Object.entries(headers)) {
    res.headers.set(key, value);
  }
  return res;
}

export default auth((req: NextRequest & { auth?: { user?: { id?: string; mustChangePassword?: boolean } } | null }) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth?.user;
  const mustChangePassword = !!req.auth?.user?.mustChangePassword;

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const next = () => withSecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), nonce);
  const redirect = (url: URL) => withSecurityHeaders(NextResponse.redirect(url), nonce);

  // Allow API routes through (handled separately)
  if (pathname.startsWith("/api")) return next();

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    return redirect(new URL("/dashboard", req.url));
  }

  // Protect dashboard routes
  const isDashboardRoute = !PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  if (isDashboardRoute && !isAuthenticated && !pathname.startsWith("/api")) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return redirect(loginUrl);
  }

  // Changement de mot de passe obligatoire (mot de passe temporaire / imposé) :
  // bloque l'accès au reste de l'application tant qu'il n'est pas fait.
  if (isAuthenticated && mustChangePassword && pathname !== CHANGE_PASSWORD_ROUTE) {
    return redirect(new URL(CHANGE_PASSWORD_ROUTE, req.url));
  }

  return next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
