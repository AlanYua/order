import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const err = await requireAdmin();
  if (err) return err;
  const list = await prisma.unit.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const err = await requireAdmin();
  if (err) return err;
  const body = await req.json();
  const { name } = body as { name?: string };
  if (!name?.trim()) return NextResponse.json({ error: "名稱為必填" }, { status: 400 });
  const unit = await prisma.unit.create({ data: { name: name.trim() } });
  return NextResponse.json(unit);
}
