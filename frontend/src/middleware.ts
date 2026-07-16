import { NextResponse, type NextRequest } from "next/server";
import { decodeToken, isTokenExpired } from "@/lib/jwt";

const PUBLIC_PATHS = ["/login", "/register"];
const STAFF_ONLY_PREFIXES = ["/admin", "/checkpoint"];
const ADMIN_ONLY_PREFIXES = ["/admin/users"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("spms_token")?.value;
  const isAuthenticated = Boolean(token) && !isTokenExpired(token!);

  if (PUBLIC_PATHS.includes(pathname)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = decodeToken(token!)?.role;

  if (
    ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) &&
    role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  if (
    STAFF_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) &&
    role === "CUSTOMER"
  ) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
