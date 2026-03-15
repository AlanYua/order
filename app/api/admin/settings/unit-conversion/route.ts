import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const err = await requireAdmin();
  if (err) return err;
  const row = await prisma.setting.findUnique({ where: { key: "unit_conversion" } });
  return NextResponse.json({ text: row?.value ?? "" });
}

export async function PUT(req: NextRequest) {
  const err = await requireAdmin();
  if (err) return err;
  const body = await req.json();
  const text = typeof body?.text === "string" ? body.text : "";
  await prisma.setting.upsert({
    where: { key: "unit_conversion" },
    update: { value: text },
    create: { key: "unit_conversion", value: text },
  });
  return NextResponse.json({ ok: true });
}
