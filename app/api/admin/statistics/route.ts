import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const err = await requireAdmin();
  if (err) return err;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: { orderDate?: { gte?: Date; lte?: Date } } = {};
  if (from) {
    const d = new Date(from);
    if (!isNaN(d.getTime())) where.orderDate = { ...where.orderDate, gte: d };
  }
  if (to) {
    const d = new Date(to);
    d.setHours(23, 59, 59, 999);
    if (!isNaN(d.getTime())) where.orderDate = { ...where.orderDate, lte: d };
  }

  const orders = await prisma.order.findMany({
    where: Object.keys(where).length ? where : undefined,
    include: {
      orderItems: {
        include: {
          item: { include: { supplier: true, category: true, unit: true } },
          unit: true,
        },
      },
    },
  });

  const format = searchParams.get("format");

  if (format === "detail") {
    // 供應商 → 分類 → 明細(品名, 單位, 合計)
    type DetailRow = { itemName: string; unitName: string; totalQty: number };
    type CatGroup = { categoryId: string; categoryName: string; rows: DetailRow[] };
    type SupGroup = { supplierId: string; supplierName: string; categories: CatGroup[] };
    const bySupplier: Record<string, SupGroup> = {};

    for (const order of orders) {
      for (const oi of order.orderItems) {
        const sid = oi.item.supplierId;
        const sname = oi.item.supplier.name;
        const cid = oi.item.categoryId;
        const cname = oi.item.category.name;
        const itemName = oi.item.name;
        const unitName = oi.unitName ?? oi.unit.name;
        const qty = oi.quantity;

        if (!bySupplier[sid]) {
          bySupplier[sid] = { supplierId: sid, supplierName: sname, categories: [] };
        }
        const sup = bySupplier[sid];
        let cat = sup.categories.find((c) => c.categoryId === cid);
        if (!cat) {
          cat = { categoryId: cid, categoryName: cname, rows: [] };
          sup.categories.push(cat);
        }
        const detail = cat.rows.find(
          (r) => r.itemName === itemName && r.unitName === unitName
        );
        if (detail) detail.totalQty += qty;
        else cat.rows.push({ itemName, unitName, totalQty: qty });
      }
    }

    const list = Object.values(bySupplier).map((s) => ({
      ...s,
      categories: s.categories.sort((a, b) =>
        a.categoryName.localeCompare(b.categoryName)
      ),
    }));
    list.sort((a, b) => a.supplierName.localeCompare(b.supplierName));
    return NextResponse.json(list);
  }

  const bySupplier: Record<
    string,
    { supplierName: string; orderIds: Set<string>; totalQty: number }
  > = {};

  for (const order of orders) {
    for (const oi of order.orderItems) {
      const sid = oi.item.supplierId;
      const sname = oi.item.supplier.name;
      if (!bySupplier[sid]) {
        bySupplier[sid] = { supplierName: sname, orderIds: new Set(), totalQty: 0 };
      }
      bySupplier[sid].orderIds.add(order.id);
      bySupplier[sid].totalQty += oi.quantity;
    }
  }

  const list = Object.entries(bySupplier).map(([supplierId, data]) => ({
    supplierId,
    supplierName: data.supplierName,
    orderCount: data.orderIds.size,
    totalQty: data.totalQty,
  }));

  return NextResponse.json(list);
}
