import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

export const config = {
  matcher: ["/app/:path*"],
};

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("plannervids_session")?.value;

  if (!token) {
    return redirectToLogin(request);
  }

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    return redirectToLogin(request);
  }
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}
