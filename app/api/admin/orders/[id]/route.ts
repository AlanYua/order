import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

type OrderItemPayload = {
  id?: string;
  itemId: string;
  quantity: number;
  unitId: string;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const err = await requireAdmin();
  if (err) return err;
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      orderItems: {
        include: { item: true, unit: true },
      },
    },
  });
  if (!order) return NextResponse.json({ error: "訂單不存在" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const err = await requireAdmin();
  if (err) return err;
  const { id } = await params;
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
    items?: OrderItemPayload[];
  };

  const existing = await prisma.order.findUnique({
    where: { id },
    include: { orderItems: true },
  });
  if (!existing) return NextResponse.json({ error: "訂單不存在" }, { status: 404 });

  if (!customerName?.trim() || !phone?.trim() || !address?.trim()) {
    return NextResponse.json(
      { error: "請填寫姓名或Line名稱、電話、地址" },
      { status: 400 }
    );
  }
  const orderDateObj = orderDate ? new Date(orderDate) : existing.orderDate;
  if (isNaN(orderDateObj.getTime())) {
    return NextResponse.json({ error: "訂購日期格式錯誤" }, { status: 400 });
  }

  const validItems = Array.isArray(items)
    ? items.filter(
        (i) => i.itemId && Number(i.quantity) > 0 && i.unitId
      ) as OrderItemPayload[]
    : undefined;

  if (validItems && validItems.length === 0) {
    return NextResponse.json({ error: "請至少保留一項品項" }, { status: 400 });
  }

  const unitIds = validItems
    ? Array.from(new Set(validItems.map((i) => i.unitId)))
    : [];
  const units =
    unitIds.length > 0
      ? await prisma.unit.findMany({ where: { id: { in: unitIds } } })
      : [];
  const unitMap = new Map(units.map((u) => [u.id, u.name]));

  const keptItemIds = new Set(
    (validItems ?? [])
      .filter((i): i is OrderItemPayload & { id: string } => !!i.id)
      .map((i) => i.id)
  );
  const toDeleteIds = existing.orderItems
    .map((oi) => oi.id)
    .filter((oid) => !keptItemIds.has(oid));

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: {
        orderDate: orderDateObj,
        customerName: customerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
      },
    });

    if (validItems !== undefined) {
      if (toDeleteIds.length > 0) {
        await tx.orderItem.deleteMany({
          where: { orderId: id, id: { in: toDeleteIds } },
        });
      }

      for (const row of validItems) {
        const payload = {
          itemId: row.itemId,
          quantity: Number(row.quantity),
          unitId: row.unitId,
          unitName: unitMap.get(row.unitId) ?? null,
        };
        if (row.id && keptItemIds.has(row.id)) {
          await tx.orderItem.update({
            where: { id: row.id, orderId: id },
            data: payload,
          });
        } else {
          await tx.orderItem.create({
            data: { orderId: id, ...payload },
          });
        }
      }
    }
  });

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      orderItems: {
        include: { item: true, unit: true },
      },
    },
  });
  return NextResponse.json(order!);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const err = await requireAdmin();
  if (err) return err;
  const { id } = await params;
  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "訂單不存在" }, { status: 404 });
  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
