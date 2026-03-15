import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
  return null;
}
