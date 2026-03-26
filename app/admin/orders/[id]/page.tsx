"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import html2canvas from "html2canvas";

type Unit = { id: string; name: string };
type Item = { id: string; name: string; unitId: string; unit: Unit };
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
  sampleCount?: number;
  itemCount?: number;
};

type EditRow = { id?: string; itemId: string; quantity: number; unitId: string };

export default function AdminOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    orderDate: "",
    customerName: "",
    phone: "",
    address: "",
    rows: [] as EditRow[],
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [capturingForPrint, setCapturingForPrint] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const id = params.id;

  function fetchOrder() {
    if (!id) return;
    fetch(`/api/admin/orders/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then(setOrder)
      .catch(() => setOrder(null));
  }

  useEffect(() => {
    fetchOrder();
  }, [id]);

  useEffect(() => {
    fetch("/api/admin/items", { credentials: "include" })
      .then((r) => r.json())
      .then(setItems);
    fetch("/api/admin/units", { credentials: "include" })
      .then((r) => r.json())
      .then(setUnits);
  }, []);

  function startEdit() {
    if (!order) return;
    setEditForm({
      orderDate: new Date(order.orderDate).toISOString().slice(0, 10),
      customerName: order.customerName,
      phone: order.phone,
      address: order.address,
      rows: order.orderItems.map((oi) => ({
        id: oi.id,
        itemId: oi.item.id,
        quantity: oi.quantity,
        unitId: oi.unitId,
      })),
    });
    setEditing(true);
  }

  function addRow() {
    const first = items[0];
    const firstUnit = units[0];
    if (!first || !firstUnit) return;
    setEditForm((f) => ({
      ...f,
      rows: [
        ...f.rows,
        {
          itemId: first.id,
          quantity: 1,
          unitId: first.unitId || firstUnit.id,
        },
      ],
    }));
  }

  function removeRow(idx: number) {
    setEditForm((f) => ({
      ...f,
      rows: f.rows.filter((_, i) => i !== idx),
    }));
  }

  function updateRow(idx: number, patch: Partial<EditRow>) {
    setEditForm((f) => ({
      ...f,
      rows: f.rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    }));
  }

  async function saveEdit() {
    if (!id || editForm.rows.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orderDate: editForm.orderDate,
          customerName: editForm.customerName.trim(),
          phone: editForm.phone.trim(),
          address: editForm.address.trim(),
          items: editForm.rows.map((r) => ({
            id: r.id,
            itemId: r.itemId,
            quantity: Number(r.quantity),
            unitId: r.unitId,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "儲存失敗");
        return;
      }
      const updated = await res.json();
      setOrder(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id || !confirm("確定要刪除此訂單？")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) router.push("/admin/orders");
      else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "刪除失敗");
      }
    } finally {
      setDeleting(false);
    }
  }

  function handlePrint() {
    setCapturingForPrint(true);
  }

  useEffect(() => {
    if (!capturingForPrint || !receiptRef.current) return;
    const el = receiptRef.current;
    html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#fff", logging: false })
      .then((canvas) => {
        const dataUrl = canvas.toDataURL("image/png");
        const w = window.open("", "_blank");
        if (!w) {
          setCapturingForPrint(false);
          return;
        }
        w.document.write(`
          <!DOCTYPE html><html><head><title>列印收據</title>
          <style>@media print{html,body{margin:0;padding:0;height:auto!important;min-height:0!important;}img{display:block;vertical-align:top;}}</style></head>
          <body style="margin:0;padding:0;">
            <img src="${dataUrl}" style="width:80mm;max-width:80mm;height:auto;display:block;" />
          </body></html>
        `);
        w.document.close();
        w.focus();
        w.onafterprint = () => w.close();
        setTimeout(() => w.print(), 300);
      })
      .catch(() => setCapturingForPrint(false))
      .finally(() => setCapturingForPrint(false));
  }, [capturingForPrint]);

  if (!order) return <p>{id ? "載入中..." : "訂單不存在"}</p>;

  const orderDateStr = new Date(order.orderDate).toLocaleDateString("zh-TW");
  const itemCount = order.itemCount ?? order.orderItems.length;
  const sampleCount =
    order.sampleCount ??
    new Set(order.orderItems.map((oi) => oi.item.id)).size;

  return (
    <div>
      <div className="no-print mb-6 flex flex-wrap items-center gap-2">
        <Link
          href="/admin/orders"
          className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
        >
          ← 訂單列表
        </Link>
        <button
          onClick={handlePrint}
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          列印訂單
        </button>
        {!editing ? (
          <>
            <button
              onClick={startEdit}
              className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              編輯
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              {deleting ? "刪除中…" : "刪除訂單"}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={saveEdit}
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "儲存中…" : "儲存"}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
            >
              取消
            </button>
          </>
        )}
      </div>

      {/* 一般畫面：檢視或編輯 */}
      <div className="print-area no-print-block">
        {!editing ? (
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-bold text-stone-900 mb-4">訂單</h1>
            <p><strong>訂單編號</strong> {order.orderNumber ?? order.id}</p>
            <p><strong>訂購日期</strong> {orderDateStr}</p>
            <p><strong>姓名</strong> {order.customerName}</p>
            <p><strong>電話</strong> {order.phone}</p>
            <p><strong>地址</strong> {order.address}</p>
            <p><strong>品項數</strong> {itemCount}</p>
            <p><strong>樣數</strong> {sampleCount}</p>
            <table className="w-full mt-4 border-collapse border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">品項</th>
                  <th className="border p-2 text-right">數量</th>
                  <th className="border p-2 text-left">單位</th>
                </tr>
              </thead>
              <tbody>
                {order.orderItems.map((oi) => (
                  <tr key={oi.id}>
                    <td className="border p-2">{oi.item.name}</td>
                    <td className="border p-2 text-right">{oi.quantity}</td>
                    <td className="border p-2">{oi.unitName ?? oi.unit.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-stone-900">編輯訂單</h2>
            <div className="grid gap-2 max-w-md">
              <label className="block">
                <span className="text-sm font-medium text-stone-600">訂購日期</span>
                <input
                  type="date"
                  value={editForm.orderDate}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, orderDate: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-stone-600">客戶</span>
                <input
                  value={editForm.customerName}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, customerName: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-stone-600">電話</span>
                <input
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-stone-600">地址</span>
                <input
                  value={editForm.address}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, address: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </label>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-stone-700">品項</span>
                <button
                  type="button"
                  onClick={addRow}
                  className="text-sm text-stone-600 underline hover:text-stone-900"
                >
                  新增一筆
                </button>
              </div>
              <table className="w-full border-collapse rounded-lg border border-stone-200 overflow-hidden">
                <thead>
                  <tr className="bg-stone-50">
                    <th className="border border-stone-200 p-2 text-left text-sm font-medium text-stone-700">商品名稱</th>
                    <th className="border border-stone-200 p-2 w-24 text-right text-sm font-medium text-stone-700">數量</th>
                    <th className="border border-stone-200 p-2 text-left text-sm font-medium text-stone-700">單位</th>
                    <th className="border border-stone-200 p-2 w-10 no-print" />
                  </tr>
                </thead>
                <tbody>
                  {editForm.rows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="border border-stone-200 p-1">
                          <select
                            value={row.itemId}
                            onChange={(e) =>
                              updateRow(idx, {
                                itemId: e.target.value,
                                unitId:
                                  items.find((i) => i.id === e.target.value)
                                    ?.unitId ?? row.unitId,
                              })
                            }
                            className="w-full min-w-[120px] rounded border border-stone-200 px-2 py-1.5 text-sm focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
                          >
                            {items.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border border-stone-200 p-1">
                          <input
                            type="number"
                            min={0.1}
                            step={0.1}
                            value={row.quantity}
                            onChange={(e) =>
                              updateRow(idx, {
                                quantity: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full rounded border border-stone-200 px-2 py-1.5 text-right text-sm focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
                          />
                        </td>
                        <td className="border border-stone-200 p-1">
                          <select
                            value={row.unitId}
                            onChange={(e) =>
                              updateRow(idx, { unitId: e.target.value })
                            }
                            className="w-full rounded border border-stone-200 px-2 py-1.5 text-sm focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
                          >
                            {units.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border border-stone-200 p-1 no-print">
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            className="text-sm text-red-600 hover:underline"
                          >
                            刪
                          </button>
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 熱感應紙：以圖列印用（先擷圖再送印，避免亂碼） */}
      <div
        ref={receiptRef}
        className={capturingForPrint ? "thermal-receipt receipt-canvas-source" : "thermal-receipt"}
        style={
          capturingForPrint
            ? { display: "block", position: "fixed", left: -9999, top: 0, zIndex: -1 }
            : { display: "none" }
        }
      >
        <div className="receipt-paper">
          <h2 className="receipt-title">阿森蔬菜訂購 · 訂單明細</h2>
          <div className="receipt-header">
            <div className="receipt-row">
              <span className="receipt-label">訂單編號</span>
              <span className="receipt-value">{order.orderNumber ?? order.id}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">訂購日期</span>
              <span className="receipt-value">{orderDateStr}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">姓名</span>
              <span className="receipt-value">{order.customerName}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">電話</span>
              <span className="receipt-value">{order.phone}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">地址</span>
              <span className="receipt-value">{order.address}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">品項數</span>
              <span className="receipt-value">{order.orderItems.length}</span>
            </div>
          </div>
          <table className="receipt-table">
            <thead>
              <tr>
                <th className="receipt-th receipt-th-item">品項</th>
                <th className="receipt-th receipt-th-qty">數量單位</th>
              </tr>
            </thead>
            <tbody>
              {order.orderItems.map((oi) => (
                <tr key={oi.id}>
                  <td className="receipt-td receipt-td-item">{oi.item.name}</td>
                  <td className="receipt-td receipt-td-qty">
                    {oi.quantity}
                    {oi.unitName ?? oi.unit.name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {capturingForPrint && (
        <p className="no-print fixed bottom-4 left-1/2 -translate-x-1/2 rounded bg-stone-800 px-4 py-2 text-sm text-white">
          正在產生列印預覽…
        </p>
      )}
    </div>
  );
}
