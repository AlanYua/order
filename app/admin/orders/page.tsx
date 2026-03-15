"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Unit = { id: string; name: string };
type Item = { id: string; name: string };
type OrderItem = {
  id: string;
  quantity: number;
  unitId: string;
  unitName: string | null;
  unit: Unit;
  item: Item;
};
type Order = {
  id: string;
  orderNumber: string | null;
  orderDate: string;
  customerName: string;
  phone: string;
  address: string;
  createdAt: string;
  orderItems: OrderItem[];
};

export default function AdminOrdersPage() {
  const [list, setList] = useState<Order[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);

  async function fetchList() {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/admin/orders?${params}`, { credentials: "include" });
    if (res.ok) setList(await res.json());
    else setList([]);
    setLoading(false);
  }

  useEffect(() => {
    fetchList();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">訂單列表</h1>
      <p className="mt-1 text-sm text-stone-500">查詢、編輯、列印訂單</p>

      <div className="mt-6 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-stone-600">從</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-stone-600">到</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
            />
          </label>
          <button
            onClick={fetchList}
            className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            篩選
          </button>
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="rounded-xl border border-stone-200 bg-white p-8 text-center text-stone-500">
            載入中...
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-xl border border-stone-200 bg-white p-8 text-center text-stone-500">
            目前無訂單，或請確認日期區間後按「篩選」。
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((o) => (
              <li
                key={o.id}
                className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-shadow hover:shadow"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-mono text-sm text-stone-500">
                      {o.orderNumber ?? o.id}
                    </span>
                    <span className="font-medium text-stone-900">
                      {new Date(o.orderDate).toLocaleDateString("zh-TW")}
                    </span>
                    <span className="text-stone-400">·</span>
                    <span className="text-stone-700">{o.customerName}</span>
                    <span className="text-stone-500">{o.phone}</span>
                  </div>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="inline-flex items-center rounded-lg bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-200"
                  >
                    查看 / 列印
                  </Link>
                </div>
                <p className="mt-1.5 text-sm text-stone-500">{o.address}</p>
                <p className="mt-1 text-sm text-stone-600">
                  {o.orderItems.map((oi) => `${oi.item.name} ${oi.quantity}${oi.unitName ?? oi.unit.name}`).join("、")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
