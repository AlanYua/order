import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type OrderItemInput = { itemId: string; quantity: number; unitId: string };

async function getAllowedDeliveryDates(): Promise<string[]> {
  const row = await prisma.setting.findUnique({ where: { key: "delivery_dates" } });
  if (!row?.value) return [];
  try {
    const v = JSON.parse(row.value) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((s): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s));
  } catch {
    return [];
  }
}

function computeSampleCount(orderItems: Array<{ itemId: string }> | null | undefined) {
  if (!orderItems || orderItems.length === 0) return 0;
  return new Set(orderItems.map((oi) => oi.itemId)).size;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    orderDate,
    deliveryDate,
    customerName,
    phone,
    address,
    items,
  } = body as {
    orderDate?: string;
    deliveryDate?: string;
    customerName?: string;
    phone?: string;
    address?: string;
    items?: OrderItemInput[];
  };

  if (
    !orderDate ||
    !deliveryDate ||
    !customerName?.trim() ||
    !phone?.trim() ||
    !address?.trim()
  ) {
    return NextResponse.json(
      { error: "請填寫訂購日期、外送日期、姓名、電話、地址" },
      { status: 400 }
    );
  }

  const orderDateObj = new Date(orderDate);
  if (isNaN(orderDateObj.getTime())) {
    return NextResponse.json({ error: "訂購日期格式錯誤" }, { status: 400 });
  }

  const deliveryDateObj = new Date(deliveryDate);
  if (isNaN(deliveryDateObj.getTime())) {
    return NextResponse.json({ error: "外送日期格式錯誤" }, { status: 400 });
  }

  const allowedDates = await getAllowedDeliveryDates();
  if (allowedDates.length > 0 && !allowedDates.includes(deliveryDate)) {
    return NextResponse.json({ error: "外送日期不在可選範圍" }, { status: 400 });
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

  const dateStr = deliveryDateObj.toISOString().slice(0, 10).replace(/-/g, "");
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
      deliveryDate: deliveryDateObj,
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
    sampleCount: computeSampleCount(order.orderItems),
  });
}
