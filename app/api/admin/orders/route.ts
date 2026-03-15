import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const err = await requireAdmin();
    if (err) return err;
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const orderDateFilter: { gte?: Date; lte?: Date } = {};
    if (from) {
      const d = new Date(from);
      if (!isNaN(d.getTime())) orderDateFilter.gte = d;
    }
    if (to) {
      const d = new Date(to);
      d.setHours(23, 59, 59, 999);
      if (!isNaN(d.getTime())) orderDateFilter.lte = d;
    }
    const where =
      Object.keys(orderDateFilter).length > 0
        ? { orderDate: orderDateFilter }
        : undefined;

    const list = await prisma.order.findMany({
      where,
      orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }],
      include: {
        orderItems: {
          include: { item: true, unit: true },
        },
      },
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error("/api/admin/orders GET", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "伺服器錯誤" },
      { status: 500 }
    );
  }
}
