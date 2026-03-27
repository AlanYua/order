import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type OrderItemPayload = {
  id?: string;
  itemId: string;
  quantity: number;
  unitId: string;
};

function computeSampleCount(orderItems: Array<{ itemId: string }> | null | undefined) {
  if (!orderItems || orderItems.length === 0) return 0;
  return new Set(orderItems.map((oi) => oi.itemId)).size;
}

function computeItemCount(orderItems: Array<unknown> | null | undefined) {
  return orderItems?.length ?? 0;
}

async function readJsonSetting(key: string): Promise<unknown> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row?.value) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

function normalizeWeekdays(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  const set = new Set<number>();
  for (const v of input) {
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    if (!Number.isInteger(n)) continue;
    if (n < 0 || n > 6) continue;
    set.add(n);
  }
  return Array.from(set);
}

function normalizeDates(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const set = new Set<string>();
  for (const v of input) {
    if (typeof v !== "string") continue;
    const s = v.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) continue;
    set.add(s);
  }
  return Array.from(set);
}

function weekdayLocalFromYYYYMMDD(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  const w = dt.getDay();
  return Number.isFinite(w) ? w : null;
}

async function assertDeliveryAllowed(deliveryDate: string) {
  const blockedWeekdays = normalizeWeekdays(await readJsonSetting("delivery_blocked_weekdays"));
  const blockedDates = normalizeDates(await readJsonSetting("delivery_blocked_dates"));

  if (blockedDates.includes(deliveryDate)) {
    return { ok: false as const, error: "此日期不外送" };
  }
  const w = weekdayLocalFromYYYYMMDD(deliveryDate);
  if (w !== null && blockedWeekdays.includes(w)) {
    return { ok: false as const, error: "此星期不外送" };
  }
  return { ok: true as const };
}

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
  return NextResponse.json({
    ...order,
    sampleCount: computeSampleCount(order.orderItems),
    itemCount: computeItemCount(order.orderItems),
  });
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

  const deliveryDateObj = deliveryDate ? new Date(deliveryDate) : existing.deliveryDate;
  if (isNaN(deliveryDateObj.getTime())) {
    return NextResponse.json({ error: "外送日期格式錯誤" }, { status: 400 });
  }
  if (deliveryDate) {
    const allowed = await assertDeliveryAllowed(deliveryDate);
    if (!allowed.ok) {
      return NextResponse.json({ error: allowed.error }, { status: 400 });
    }
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
        deliveryDate: deliveryDateObj,
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
  return NextResponse.json({
    ...order!,
    sampleCount: computeSampleCount(order!.orderItems),
    itemCount: computeItemCount(order!.orderItems),
  });
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
