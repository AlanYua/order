import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function normalizeWeekdays(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  const set = new Set<number>();
  for (const v of input) {
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    if (!Number.isInteger(n)) continue;
    if (n < 0 || n > 6) continue;
    set.add(n);
  }
  return Array.from(set).sort((a, b) => a - b);
}

function normalizeDates(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const set = new Set<string>();
  for (const v of input) {
    if (typeof v !== "string") continue;
    const s = v.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) continue;
    set.add(s);
  }
  return Array.from(set).sort();
}

async function readJsonSetting(key: string): Promise<unknown> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row?.value) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

export async function GET() {
  const blockedWeekdays = normalizeWeekdays(await readJsonSetting("delivery_blocked_weekdays"));
  const blockedDates = normalizeDates(await readJsonSetting("delivery_blocked_dates"));
  return NextResponse.json({ blockedWeekdays, blockedDates });
}

