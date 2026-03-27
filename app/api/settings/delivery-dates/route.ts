import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function parseDates(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((s): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s));
  } catch {
    return [];
  }
}

export async function GET() {
  const row = await prisma.setting.findUnique({ where: { key: "delivery_dates" } });
  return NextResponse.json({ dates: parseDates(row?.value) });
}

