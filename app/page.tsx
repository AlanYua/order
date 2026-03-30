"use client";

import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";

type Unit = { id: string; name: string };
type Category = { id: string; name: string };
type Season = { id: string; name: string };
type Item = {
  id: string;
  name: string;
  unitId: string;
  unit: Unit;
  category: Category;
  season: Season;
};

type CartLine = {
  item: Item;
  quantity: number;
  unitId: string;
};

type OrderSnapshot = {
  orderDate: string;
  deliveryDate: string;
  customerName: string;
  phone: string;
  address: string;
  orderNumber: string;
  lines: { itemName: string; unitName: string; quantity: number }[];
};

const DEFAULT_UNIT_CONVERSION = "常用換算：1斤＝600g、1包＝1份、1顆＝1粒、1把＝約300g";

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [mobileTab, setMobileTab] = useState<"items" | "cart">("items");
  const [orderDate, setOrderDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [blockedWeekdays, setBlockedWeekdays] = useState<number[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [tabCategoryId, setTabCategoryId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [orderSnapshot, setOrderSnapshot] = useState<OrderSnapshot | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState("");
  const [unitConversion, setUnitConversion] = useState("");

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setOrderDate(today);
    setDeliveryDate(today);
  }, []);

  useEffect(() => {
    fetch("/api/items")
      .then((r) => r.json())
      .then(setItems);
    fetch("/api/units")
      .then((r) => r.json())
      .then(setUnits);
    fetch("/api/settings/announcement")
      .then((r) => r.json())
      .then((d) => setAnnouncement(d.text ?? ""));
    fetch("/api/settings/unit-conversion")
      .then((r) => r.json())
      .then((d) => setUnitConversion(d.text ?? ""));
    fetch("/api/settings/delivery-rules")
      .then((r) => r.json())
      .then((d) => {
        setBlockedWeekdays(Array.isArray(d?.blockedWeekdays) ? (d.blockedWeekdays as number[]) : []);
        setBlockedDates(Array.isArray(d?.blockedDates) ? (d.blockedDates as string[]) : []);
      })
      .catch(() => {
        setBlockedWeekdays([]);
        setBlockedDates([]);
      });
  }, []);

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

  function isDeliveryBlocked(dateStr: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    if (blockedDates.includes(dateStr)) return true;
    const w = weekdayLocalFromYYYYMMDD(dateStr);
    if (w !== null && blockedWeekdays.includes(w)) return true;
    return false;
  }

  const categories = Array.from(new Map(items.map((i) => [i.category.id, i.category])).values());
  const filtered = !tabCategoryId
    ? items
    : items.filter((i) => i.category.id === tabCategoryId);

  function addToCart(item: Item, qty: number, unitId: string) {
    if (qty <= 0) return;
    setCart((prev) => {
      const rest = prev.filter((l) => l.item.id !== item.id || l.unitId !== unitId);
      return [...rest, { item, quantity: qty, unitId }];
    });
  }

  function updateCartQuantity(idx: number, delta: number) {
    setCart((prev) => {
      const next = [...prev];
      const line = next[idx];
      line.quantity = Math.max(0, line.quantity + delta);
      if (line.quantity === 0) next.splice(idx, 1);
      return next;
    });
  }

  function updateCartUnit(idx: number, unitId: string) {
    setCart((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], unitId };
      return next;
    });
  }

  function removeFromCart(idx: number) {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmitOrder(e: React.FormEvent) {
    e.preventDefault();
    if (isDeliveryBlocked(deliveryDate || "")) {
      alert("此外送日期不提供外送，請改選其他日期");
      return;
    }
    if (cart.length === 0) {
      alert("請至少選擇一項品項");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderDate: orderDate || new Date().toISOString().slice(0, 10),
          deliveryDate: deliveryDate || new Date().toISOString().slice(0, 10),
          customerName,
          phone,
          address,
          items: cart.map((l) => ({
            itemId: l.item.id,
            quantity: l.quantity,
            unitId: l.unitId,
          })),
        }),
      });
      const raw = await res.text();
      let data: { error?: string; orderNumber?: string; id?: string } = {};
      if (raw) {
        try {
          data = JSON.parse(raw) as typeof data;
        } catch {
          alert(`伺服器回應異常（${res.status}），請聯絡管理員或稍後再試`);
          return;
        }
      }
      if (res.ok) {
        const num = data.orderNumber ?? data.id ?? "";
        const unitNameMap = new Map(units.map((u) => [u.id, u.name]));
        setOrderSnapshot({
          orderDate: orderDate || new Date().toISOString().slice(0, 10),
          deliveryDate: deliveryDate || new Date().toISOString().slice(0, 10),
          customerName,
          phone,
          address,
          orderNumber: num,
          lines: cart.map((l) => ({
            itemName: l.item.name,
            unitName: unitNameMap.get(l.unitId) ?? l.unitId,
            quantity: l.quantity,
          })),
        });
        setOrderNumber(num);
        setCart([]);
      } else {
        alert(data.error ?? `送出失敗（${res.status}）`);
      }
    } catch {
      alert("無法連線或請求逾時，請檢查網路後再試");
    } finally {
      setSubmitting(false);
    }
  }

  async function downloadReceiptImage() {
    if (!receiptRef.current) return;
    const canvas = await html2canvas(receiptRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });
    const link = document.createElement("a");
    link.download = `訂單-${orderNumber ?? "order"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  if (orderNumber) {
    if (!orderSnapshot) {
      return (
        <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-stone-800 mb-2">訂單已送出</h1>
            <p className="text-stone-600 mb-6">您的訂單編號</p>
            <p className="text-xl font-mono font-semibold text-emerald-700 bg-emerald-50 rounded-lg py-3 px-4 border border-emerald-200">
              {orderNumber}
            </p>
            <button
              type="button"
              onClick={() => { setOrderNumber(null); setStep(1); }}
              className="mt-8 w-full py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
            >
              再訂一單
            </button>
          </div>
        </main>
      );
    }
    const snap = orderSnapshot;
    const orderDateStr = new Date(snap.orderDate).toLocaleDateString("zh-TW");
    const deliveryDateStr = new Date(snap.deliveryDate).toLocaleDateString("zh-TW");
    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-stone-800 mb-2">訂單已送出</h1>
          <p className="text-stone-600 mb-4">您的訂單編號</p>
          <p className="text-xl font-mono font-semibold text-emerald-700 bg-emerald-50 rounded-lg py-3 px-4 border border-emerald-200 mb-6">
            {orderNumber}
          </p>

          <div
            ref={receiptRef}
            className="w-full max-w-sm mx-auto bg-white rounded-xl border border-stone-200 p-5 text-left shadow-sm"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            <h2 className="text-lg font-bold text-stone-800 border-b border-stone-200 pb-2 mb-3">
              阿森蔬菜訂購 · 訂單明細
            </h2>
            <p className="text-sm text-stone-600"><strong>訂單編號</strong> {snap.orderNumber}</p>
            <p className="text-sm text-stone-600"><strong>訂購日期</strong> {orderDateStr}</p>
            <p className="text-sm text-stone-600"><strong>外送日期</strong> {deliveryDateStr}</p>
            <p className="text-sm text-stone-600"><strong>姓名</strong> {snap.customerName}</p>
            <p className="text-sm text-stone-600"><strong>電話</strong> {snap.phone}</p>
            <p className="text-sm text-stone-600 mb-3"><strong>地址</strong> {snap.address}</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-stone-600">
                  <th className="text-left py-1.5">品項</th>
                  <th className="text-right py-1.5">數量</th>
                  <th className="text-left py-1.5">單位</th>
                </tr>
              </thead>
              <tbody>
                {snap.lines.map((line, i) => (
                  <tr key={i} className="border-b border-stone-100">
                    <td className="py-1.5 text-stone-800">{line.itemName}</td>
                    <td className="text-right py-1.5 font-medium">{line.quantity}</td>
                    <td className="py-1.5 text-stone-600">{line.unitName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={downloadReceiptImage}
            className="mt-4 w-full py-3 rounded-xl border-2 border-emerald-600 text-emerald-600 font-medium hover:bg-emerald-50 transition"
          >
            下載訂單圖片
          </button>
          <button
            type="button"
            onClick={() => {
              setOrderNumber(null);
              setOrderSnapshot(null);
              setStep(1);
            }}
            className="mt-3 w-full py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
          >
            再訂一單
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/80 to-stone-50">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-stone-800 tracking-tight">
            阿森蔬菜訂購
          </h1>
          <p className="text-stone-500 mt-1">填寫資料後選擇品項即可送出</p>
        </div>

        <div className="mb-6 bg-amber-50/80 border border-amber-200/80 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">公告欄</h3>
          <p className="text-sm text-amber-900/90 whitespace-pre-line">
            {announcement || "歡迎訂購，請於訂購日期前一日完成下單。\n若有特殊需求或疑問請來電告知。"}
          </p>
        </div>

        {step === 1 && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 p-6 md:p-8">
              <h2 className="text-lg font-semibold text-stone-800 mb-5">訂單資訊</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setStep(2);
                }}
                className="space-y-4"
              >
                <label className="block">
                  <span className="text-sm font-medium text-stone-600">訂購日期</span>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-stone-200 px-4 py-3 text-stone-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-stone-600">外送日期</span>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className={`mt-1.5 w-full rounded-xl border px-4 py-3 text-stone-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition ${
                      deliveryDate && isDeliveryBlocked(deliveryDate)
                        ? "border-red-300 bg-red-50"
                        : "border-stone-200"
                    }`}
                    required
                  />
                  {deliveryDate && isDeliveryBlocked(deliveryDate) && (
                    <p className="mt-1.5 text-sm text-red-600">此日期不外送，請改選其他日期。</p>
                  )}
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-stone-600">姓名</span>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-stone-200 px-4 py-3 text-stone-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                    placeholder="請輸入姓名或Line名稱"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-stone-600">電話</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-stone-200 px-4 py-3 text-stone-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                    placeholder="請輸入電話"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-stone-600">地址</span>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-stone-200 px-4 py-3 text-stone-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                    placeholder="請輸入配送地址"
                    required
                  />
                </label>
                <button
                  type="submit"
                  className="w-full mt-6 py-3.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition"
                >
                  下一步：選擇品項
                </button>
              </form>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex items-center justify-between gap-2 mb-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                ← 修改訂單資訊
              </button>
              <span className="text-sm text-stone-500 truncate">
                {deliveryDate || orderDate} · {customerName} · {phone}
              </span>
            </div>

            <div className="flex gap-2 mb-4 flex-wrap border-b border-stone-200 pb-3">
              <button
                type="button"
                onClick={() => setTabCategoryId("")}
                className={`px-4 py-2 rounded-t-lg text-sm font-medium transition ${
                  tabCategoryId === ""
                    ? "bg-emerald-600 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                全部
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setTabCategoryId(c.id)}
                  className={`px-4 py-2 rounded-t-lg text-sm font-medium transition ${
                    tabCategoryId === c.id
                      ? "bg-emerald-600 text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* 手機：品項 / 已選 分頁切換，避免一直往下捲 */}
            <div className="md:hidden space-y-4">
              <div className="flex rounded-xl bg-stone-100 p-1 text-sm font-medium">
                <button
                  type="button"
                  onClick={() => setMobileTab("items")}
                  className={`flex-1 py-2 rounded-lg transition ${
                    mobileTab === "items"
                      ? "bg-white text-emerald-600 shadow-sm"
                      : "text-stone-500"
                  }`}
                >
                  選擇品項
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab("cart")}
                  className={`flex-1 py-2 rounded-lg transition ${
                    mobileTab === "cart"
                      ? "bg-white text-emerald-600 shadow-sm"
                      : "text-stone-500"
                  }`}
                >
                  已選品項 ({cart.length})
                </button>
              </div>

              {mobileTab === "items" && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 p-5 overflow-hidden">
                    <h2 className="font-semibold text-stone-800 mb-3">選擇品項</h2>
                    <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                      {filtered.map((item) => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          units={units}
                          addToCart={addToCart}
                        />
                      ))}
                      {filtered.length === 0 && (
                        <li className="text-stone-400 py-4 text-center text-sm">此分類暫無品項</li>
                      )}
                    </ul>
                  </div>
                  <div className="bg-stone-50 rounded-xl border border-stone-200/80 p-4">
                    <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                      單位換算
                    </h3>
                    <p className="text-sm text-stone-600">{unitConversion || DEFAULT_UNIT_CONVERSION}</p>
                  </div>
                </div>
              )}

              {mobileTab === "cart" && (
                <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 p-5 flex flex-col">
                  <h2 className="font-semibold text-stone-800 mb-3">已選品項</h2>
                  <div className="space-y-4 flex-1 min-h-0 max-h-[60vh] overflow-y-auto">
                    {(() => {
                      const byCategory = cart.reduce<{ cat: Category; lines: { line: CartLine; idx: number }[] }[]>(
                        (acc, line, idx) => {
                          const cat = line.item.category;
                          const group = acc.find((g) => g.cat.id === cat.id);
                          if (group) group.lines.push({ line, idx });
                          else acc.push({ cat, lines: [{ line, idx }] });
                          return acc;
                        },
                        []
                      );
                      if (byCategory.length === 0) {
                        return <p className="text-stone-400 py-4 text-center text-sm">尚未選擇品項</p>;
                      }
                      return byCategory.map(({ cat, lines }) => (
                        <div key={cat.id}>
                          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 border-b border-stone-100 pb-1">
                            {cat.name}
                          </h3>
                          <ul className="space-y-2">
                            {lines.map(({ line, idx }) => (
                              <li
                                key={`${line.item.id}-${line.unitId}-${idx}`}
                                className="flex items-center gap-2 text-sm flex-wrap"
                              >
                                <span className="flex-1 min-w-0 text-stone-800">{line.item.name}</span>
                                <select
                                  value={line.unitId}
                                  onChange={(e) => updateCartUnit(idx, e.target.value)}
                                  className="rounded-lg border border-stone-200 px-2 py-1 text-xs w-16"
                                >
                                  {units.map((u) => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                  ))}
                                </select>
                                <span className="font-medium text-stone-700 w-10 text-right">{line.quantity}</span>
                                <div className="flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => updateCartQuantity(idx, -1)}
                                    className="w-7 h-7 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 flex items-center justify-center"
                                  >
                                    −
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateCartQuantity(idx, 1)}
                                    className="w-7 h-7 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 flex items-center justify-center"
                                  >
                                    +
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(idx)}
                                  className="text-red-500 hover:text-red-600 text-xs"
                                >
                                  移除
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ));
                    })()}
                  </div>
                  <form onSubmit={handleSubmitOrder} className="mt-4 pt-4 border-t border-stone-100">
                    <button
                      type="submit"
                      disabled={submitting || cart.length === 0}
                      className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {submitting ? "送出中..." : "送出訂單"}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* 桌機：維持左右兩欄佈局 */}
            <div className="hidden md:grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 p-5 overflow-hidden">
                  <h2 className="font-semibold text-stone-800 mb-3">選擇品項</h2>
                  <ul className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                    {filtered.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        units={units}
                        addToCart={addToCart}
                      />
                    ))}
                    {filtered.length === 0 && (
                      <li className="text-stone-400 py-4 text-center text-sm">此分類暫無品項</li>
                    )}
                  </ul>
                </div>
                <div className="bg-stone-50 rounded-xl border border-stone-200/80 p-4">
                  <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                    單位換算
                  </h3>
                  <p className="text-sm text-stone-600">{unitConversion || DEFAULT_UNIT_CONVERSION}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 p-5 flex flex-col">
                <h2 className="font-semibold text-stone-800 mb-3">已選品項</h2>
                <div className="space-y-4 flex-1 min-h-0 overflow-y-auto">
                  {(() => {
                    const byCategory = cart.reduce<{ cat: Category; lines: { line: CartLine; idx: number }[] }[]>(
                      (acc, line, idx) => {
                        const cat = line.item.category;
                        const group = acc.find((g) => g.cat.id === cat.id);
                        if (group) group.lines.push({ line, idx });
                        else acc.push({ cat, lines: [{ line, idx }] });
                        return acc;
                      },
                      []
                    );
                    if (byCategory.length === 0) {
                      return <p className="text-stone-400 py-4 text-center text-sm">尚未選擇品項</p>;
                    }
                    return byCategory.map(({ cat, lines }) => (
                      <div key={cat.id}>
                        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 border-b border-stone-100 pb-1">
                          {cat.name}
                        </h3>
                        <ul className="space-y-2">
                          {lines.map(({ line, idx }) => (
                            <li
                              key={`${line.item.id}-${line.unitId}-${idx}`}
                              className="flex items-center gap-2 text-sm flex-wrap"
                            >
                              <span className="flex-1 min-w-0 text-stone-800">{line.item.name}</span>
                              <select
                                value={line.unitId}
                                onChange={(e) => updateCartUnit(idx, e.target.value)}
                                className="rounded-lg border border-stone-200 px-2 py-1 text-xs w-16"
                              >
                                {units.map((u) => (
                                  <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                              </select>
                              <span className="font-medium text-stone-700 w-10 text-right">{line.quantity}</span>
                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => updateCartQuantity(idx, -1)}
                                  className="w-7 h-7 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 flex items-center justify-center"
                                >
                                  −
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateCartQuantity(idx, 1)}
                                  className="w-7 h-7 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 flex items-center justify-center"
                                >
                                  +
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFromCart(idx)}
                                className="text-red-500 hover:text-red-600 text-xs"
                              >
                                移除
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ));
                  })()}
                </div>
                <form onSubmit={handleSubmitOrder} className="mt-4 pt-4 border-t border-stone-100">
                  <button
                    type="submit"
                    disabled={submitting || cart.length === 0}
                    className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {submitting ? "送出中..." : "送出訂單"}
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function ItemRow({
  item,
  units,
  addToCart,
}: {
  item: Item;
  units: Unit[];
  addToCart: (item: Item, qty: number, unitId: string) => void;
}) {
  const [qty, setQty] = useState(1);
  const [unitId, setUnitId] = useState(item.unitId);

  useEffect(() => {
    setUnitId(item.unitId);
  }, [item.unitId]);

  return (
    <li className="flex items-center gap-2 flex-wrap border-b border-stone-100 pb-2 last:border-0">
      <span className="flex-1 min-w-0 font-medium text-stone-800">{item.name}</span>
      <input
        type="number"
        min="0.1"
        step="0.1"
        value={qty}
        onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
        className="w-16 rounded-lg border border-stone-200 px-2 py-1.5 text-right text-sm focus:border-emerald-500 outline-none"
      />
      <select
        value={unitId}
        onChange={(e) => setUnitId(e.target.value)}
        className="rounded-lg border border-stone-200 px-2 py-1.5 text-sm w-14"
      >
        {units.map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => addToCart(item, qty, unitId)}
        className="text-sm rounded-lg bg-emerald-500 text-white px-3 py-1.5 hover:bg-emerald-600 transition"
      >
        加入
      </button>
    </li>
  );
}
