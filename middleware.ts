import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/forgot-password", "/pricing", "/features", "/about", "/contact", "/privacy", "/terms", "/legal"];
const AUTH_ROUTES = ["/login", "/register"];

export default auth((req: NextRequest & { auth?: { user?: { id?: string } } | null }) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth?.user;

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

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
