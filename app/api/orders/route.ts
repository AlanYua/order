import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type OrderItemInput = { itemId: string; quantity: number; unitId: string };

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    orderDate,
    customerName,
    phone,
    address,
    items,
  } = body as {
    orderDate?: string;
    customerName?: string;
    phone?: string;
    address?: string;
    items?: OrderItemInput[];
  };

  if (!orderDate || !customerName?.trim() || !phone?.trim() || !address?.trim()) {
    return NextResponse.json(
      { error: "請填寫訂購日期、姓名、電話、地址" },
      { status: 400 }
    );
  }

  const orderDateObj = new Date(orderDate);
  if (isNaN(orderDateObj.getTime())) {
    return NextResponse.json({ error: "訂購日期格式錯誤" }, { status: 400 });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "請至少選擇一項品項" }, { status: 400 });
  }

  const validItems = items.filter(
    (i: OrderItemInput) => i.itemId && Number(i.quantity) > 0 && i.unitId
  );
  if (validItems.length === 0) {
    return NextResponse.json({ error: "請填寫有效的品項與數量" }, { status: 400 });
  }

  const unitIds = Array.from(new Set(validItems.map((i: OrderItemInput) => i.unitId)));
  const units = await prisma.unit.findMany({ where: { id: { in: unitIds } } });
  const unitMap = new Map(units.map((u) => [u.id, u.name]));

  const dateStr = orderDateObj.toISOString().slice(0, 10).replace(/-/g, "");
  let orderNumber: string;
  let exists: { id: string } | null;
  do {
    orderNumber = `${dateStr}-${String(Math.floor(100 + Math.random() * 900))}`;
    exists = await prisma.order.findUnique({ where: { orderNumber }, select: { id: true } });
  } while (exists);

  const order = await prisma.order.create({
    data: {
      orderNumber,
      orderDate: orderDateObj,
      customerName: customerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      orderItems: {
        create: validItems.map((i: OrderItemInput) => ({
          itemId: i.itemId,
          quantity: Number(i.quantity),
          unitId: i.unitId,
          unitName: unitMap.get(i.unitId) ?? null,
        })),
      },
    },
    include: {
      orderItems: {
        include: { item: true, unit: true },
      },
    },
  });

  return NextResponse.json({
    order,
    id: order.id,
    orderNumber: order.orderNumber ?? order.id,
  });
}
