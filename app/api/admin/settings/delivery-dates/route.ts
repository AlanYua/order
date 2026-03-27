import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function normalizeDates(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const dedup = new Set<string>();
  for (const v of input) {
    if (typeof v !== "string") continue;
    const s = v.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) continue;
    dedup.add(s);
  }
  return Array.from(dedup).sort();
}

export async function GET() {
  const err = await requireAdmin();
  if (err) return err;
  const row = await prisma.setting.findUnique({ where: { key: "delivery_dates" } });
  let dates: string[] = [];
  try {
    dates = normalizeDates(row?.value ? JSON.parse(row.value) : []);
  } catch {
    dates = [];
  }
  return NextResponse.json({ dates });
}

export async function PUT(req: NextRequest) {
  const err = await requireAdmin();
  if (err) return err;
  const body = await req.json().catch(() => ({}));
  const dates = normalizeDates((body as any)?.dates);
  await prisma.setting.upsert({
    where: { key: "delivery_dates" },
    update: { value: JSON.stringify(dates) },
    create: { key: "delivery_dates", value: JSON.stringify(dates) },
  });
  return NextResponse.json({ ok: true, dates });
}

