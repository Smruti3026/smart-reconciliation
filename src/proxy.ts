import { type NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";

/**
 * Next.js 16 proxy (replaces the deprecated middleware.ts).
 *
 * Runs on every matched request before rendering. Responsibilities:
 * 1. Verify the JWT session cookie.
 * 2. Redirect unauthenticated users away from protected (app) routes.
 * 3. Redirect authenticated users away from /login and /signup.
 *
 * Auth mode: standalone PostgreSQL + JWT (no Supabase).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password";
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/customer-reconciliation") ||
    pathname.startsWith("/vendor-reconciliation") ||
    pathname.startsWith("/profile");

  const session = getSessionFromRequest(request);

  // Unauthenticated user trying to access a protected route → send to login
  if (!session && isProtectedRoute) {
    const loginUrl = new URL("/login", request.url);
    return Response.redirect(loginUrl);
  }

  // Authenticated user trying to access auth pages → send to dashboard
  if (session && isAuthRoute) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return Response.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - api/auth/* (auth API routes must never be blocked)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/auth).*)",
  ],
};
