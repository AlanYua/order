import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Prisma `@default(cuid())` 常見長度與字元集 */
function looksLikeCuid(s: string) {
  return /^c[a-z0-9]{24}$/i.test(s);
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("orderNumber")?.trim() ?? "";
  if (!raw) {
    return NextResponse.json({ error: "請輸入訂單編號" }, { status: 400 });
  }
  if (raw.length < 8 || raw.length > 80) {
    return NextResponse.json({ error: "訂單編號格式不正確" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: looksLikeCuid(raw) ? { OR: [{ id: raw }, { orderNumber: raw }] } : { orderNumber: raw },
    include: {
      orderItems: {
        include: { item: true, unit: true },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "查無此訂單" }, { status: 404 });
  }

  return NextResponse.json({
    lines: order.orderItems.map((oi) => ({
      itemName: oi.item.name,
      quantity: oi.quantity,
      unitName: oi.unitName ?? oi.unit.name,
    })),
  });
}
