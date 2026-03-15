import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const err = await requireAdmin();
  if (err) return err;
  const list = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const err = await requireAdmin();
  if (err) return err;
  const body = await req.json();
  const { name, contact } = body as { name?: string; contact?: string };
  if (!name?.trim()) return NextResponse.json({ error: "名稱為必填" }, { status: 400 });
  const supplier = await prisma.supplier.create({
    data: { name: name.trim(), contact: contact?.trim() || null },
  });
  return NextResponse.json(supplier);
}
