import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const err = await requireAdmin();
  if (err) return err;
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const seasonId = searchParams.get("seasonId") ?? undefined;
  const supplierId = searchParams.get("supplierId") ?? undefined;
  const list = await prisma.item.findMany({
    where: { categoryId, seasonId, supplierId },
    orderBy: { name: "asc" },
    include: { unit: true, category: true, season: true, supplier: true },
  });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const err = await requireAdmin();
  if (err) return err;
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
  const item = await prisma.item.create({
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
