import { sealData, unsealData } from "iron-session";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE_NAME = "order_admin_session";
const PASSWORD = process.env.SESSION_SECRET!;
const MAX_AGE = 60 * 60 * 24;

export interface SessionData {
  adminId?: string;
  username?: string;
  isLoggedIn: boolean;
}

export async function getSession(): Promise<SessionData> {
  if (!PASSWORD || PASSWORD.length < 32) return { isLoggedIn: false };
  const cookieStore = await cookies();
  const encrypted = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!encrypted) return { isLoggedIn: false };
  try {
    const data = await unsealData<SessionData>(encrypted, { password: PASSWORD, ttl: MAX_AGE });
    return data ?? { isLoggedIn: false };
  } catch {
    return { isLoggedIn: false };
  }
}

export async function setSession(data: SessionData): Promise<string> {
  const encrypted = await sealData(data, { password: PASSWORD, ttl: MAX_AGE });
  return `${SESSION_COOKIE_NAME}=${encrypted}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionData> {
  const encrypted = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!encrypted) return { isLoggedIn: false };
  try {
    const data = await unsealData<SessionData>(encrypted, { password: PASSWORD, ttl: MAX_AGE });
    return data ?? { isLoggedIn: false };
  } catch {
    return { isLoggedIn: false };
  }
}
