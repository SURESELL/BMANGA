import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/forgot-password", "/reset-password", "/pricing", "/features", "/about", "/contact", "/privacy", "/terms", "/legal"];
const AUTH_ROUTES = ["/login", "/register"];
const CHANGE_PASSWORD_ROUTE = "/change-password";

export default auth((req: NextRequest & { auth?: { user?: { id?: string; mustChangePassword?: boolean } } | null }) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth?.user;
  const mustChangePassword = !!req.auth?.user?.mustChangePassword;

  // Allow API routes through (handled separately)
  if (pathname.startsWith("/api")) return NextResponse.next();

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Protect dashboard routes
  const isDashboardRoute = !PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  if (isDashboardRoute && !isAuthenticated && !pathname.startsWith("/api")) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Changement de mot de passe obligatoire (mot de passe temporaire / imposé) :
  // bloque l'accès au reste de l'application tant qu'il n'est pas fait.
  if (isAuthenticated && mustChangePassword && pathname !== CHANGE_PASSWORD_ROUTE) {
    return NextResponse.redirect(new URL(CHANGE_PASSWORD_ROUTE, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
