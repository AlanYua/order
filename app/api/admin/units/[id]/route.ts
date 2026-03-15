import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const err = await requireAdmin();
  if (err) return err;
  const { id } = await params;
  const body = await req.json();
  const { name } = body as { name?: string };
  if (!name?.trim()) return NextResponse.json({ error: "名稱為必填" }, { status: 400 });
  const unit = await prisma.unit.update({ where: { id }, data: { name: name.trim() } });
  return NextResponse.json(unit);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const err = await requireAdmin();
  if (err) return err;
  const { id } = await params;
  await prisma.unit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
