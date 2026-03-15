import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const err = await requireAdmin();
  if (err) return err;
  const { id } = await params;
  const body = await req.json();
  const { name, unitId, categoryId, seasonId, supplierId, active } = body as {
    name?: string;
    unitId?: string;
    categoryId?: string;
    seasonId?: string;
    supplierId?: string;
    active?: boolean;
  };
  if (!name?.trim()) return NextResponse.json({ error: "名稱為必填" }, { status: 400 });
  if (!unitId || !categoryId || !seasonId || !supplierId) {
    return NextResponse.json({ error: "單位、分類、季節、供應商為必填" }, { status: 400 });
  }
  const item = await prisma.item.update({
    where: { id },
    data: {
      name: name.trim(),
      unitId,
      categoryId,
      seasonId,
      supplierId,
      active: active ?? true,
    },
    include: { unit: true, category: true, season: true, supplier: true },
  });
  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const err = await requireAdmin();
  if (err) return err;
  const { id } = await params;
  try {
    await prisma.item.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2003") {
      return NextResponse.json({ error: "品項不可刪除（已有訂單使用此品項）" }, { status: 400 });
    }
    throw e;
  }
}
