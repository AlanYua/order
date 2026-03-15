import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (!path.startsWith("/admin")) return NextResponse.next();
  if (path === "/admin/login") return NextResponse.next();

  const session = await getSessionFromRequest(req);
  if (!session.isLoggedIn) {
    const login = new URL("/admin/login", req.url);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
