import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtDecode } from "jwt-decode";

const PUBLIC_ROUTES = ["/login", "/forgot-password", "/reset-password"];
const AUTH_ROUTES = ["/login", "/forgot-password", "/reset-password"];

function isTokenValid(token: string): boolean {
  try {
    const decoded = jwtDecode<{ exp: number }>(token);
    return typeof decoded.exp === "number" && decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

/** Página inicial según el rol: el MATRIZADOR "puro" aterriza en /forms. */
function landingPath(token: string): string {
  try {
    const { roles = [] } = jwtDecode<{ roles?: string[] }>(token);
    const isMatrizador = roles.includes("MATRIZADOR");
    const isAdminOrNotario =
      roles.includes("SUPER_ADMIN") || roles.includes("NOTARIO");
    if (isMatrizador && !isAdminOrNotario) return "/forms";
  } catch {
    /* token ilegible → dashboard por defecto */
  }
  return "/dashboard";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rawToken = request.cookies.get("notaria_access_token")?.value;
  const accessToken = rawToken && isTokenValid(rawToken) ? rawToken : null;

  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isRootPath = pathname === "/";

  if (isRootPath) {
    if (accessToken) {
      return NextResponse.redirect(new URL(landingPath(accessToken), request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!accessToken && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (accessToken && isAuthRoute) {
    return NextResponse.redirect(new URL(landingPath(accessToken), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)",
  ],
};
