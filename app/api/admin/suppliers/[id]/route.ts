import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const err = await requireAdmin();
  if (err) return err;
  const { id } = await params;
  const body = await req.json();
  const { name, contact } = body as { name?: string; contact?: string };
  if (!name?.trim()) return NextResponse.json({ error: "名稱為必填" }, { status: 400 });
  const supplier = await prisma.supplier.update({
    where: { id },
    data: { name: name.trim(), contact: contact?.trim() || null },
  });
  return NextResponse.json(supplier);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const err = await requireAdmin();
  if (err) return err;
  const { id } = await params;
  await prisma.supplier.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
