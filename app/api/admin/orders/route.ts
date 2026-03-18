import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function parseDateOnlyLocal(s: string) {
  // s: "YYYY-MM-DD"
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  const dt = new Date(y, mo - 1, d);
  return isNaN(dt.getTime()) ? null : dt;
}

export async function GET(req: NextRequest) {
  try {
    const err = await requireAdmin();
    if (err) return err;
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const fromDate = from ? parseDateOnlyLocal(from) : null;
    const toDate = to ? parseDateOnlyLocal(to) : null;

    const gte = fromDate ?? todayStart;
    const lte = (() => {
      const base = toDate ?? todayEnd;
      const end = new Date(base);
      end.setHours(23, 59, 59, 999);
      return end;
    })();

    const where = { orderDate: { gte, lte } };

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
