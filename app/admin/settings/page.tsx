"use client";

import { useEffect, useState } from "react";

export default function AdminSettingsPage() {
  const [announcement, setAnnouncement] = useState("");
  const [unitConversion, setUnitConversion] = useState("");
  const [deliveryDates, setDeliveryDates] = useState<string[]>([]);
  const [newDeliveryDate, setNewDeliveryDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/settings/announcement").then((r) => r.json()),
      fetch("/api/admin/settings/unit-conversion").then((r) => r.json()),
      fetch("/api/admin/settings/delivery-dates").then((r) => r.json()),
    ])
      .then(([a, u, d]) => {
        setAnnouncement(a.text ?? "");
        setUnitConversion(u.text ?? "");
        const dates = Array.isArray(d?.dates) ? (d.dates as string[]) : [];
        setDeliveryDates(dates);
      })
      .finally(() => setLoading(false));
  }, []);

  function addDeliveryDate() {
    const s = newDeliveryDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return;
    setDeliveryDates((prev) => Array.from(new Set([...prev, s])).sort());
    setNewDeliveryDate("");
  }

  function removeDeliveryDate(s: string) {
    setDeliveryDates((prev) => prev.filter((d) => d !== s));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const [resA, resU, resD] = await Promise.all([
      fetch("/api/admin/settings/announcement", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: announcement }),
      }),
      fetch("/api/admin/settings/unit-conversion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: unitConversion }),
      }),
      fetch("/api/admin/settings/delivery-dates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates: deliveryDates }),
      }),
    ]);
    setSaving(false);
    if (resA.ok && resU.ok && resD.ok) alert("已儲存");
    else alert("儲存失敗");
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-8 text-center text-stone-500">
        載入中...
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">網站設定</h1>
      <p className="mt-1 text-sm text-stone-500">首頁公告、單位換算、外送日期</p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-6">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium text-stone-700 mb-2">
            首頁公告欄文字
          </label>
          <textarea
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
            placeholder="歡迎訂購，請於訂購日期前一日完成下單。&#10;若有特殊需求或疑問請來電告知。"
          />
          <p className="mt-1.5 text-xs text-stone-500">換行會保留顯示。</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium text-stone-700 mb-2">
            單位換算說明
          </label>
          <input
            type="text"
            value={unitConversion}
            onChange={(e) => setUnitConversion(e.target.value)}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
            placeholder="常用換算：1斤＝600g、1包＝1份、1顆＝1粒、1把＝約300g"
          />
          <p className="mt-1.5 text-xs text-stone-500">顯示在訂單頁「單位換算」區塊。</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium text-stone-700 mb-2">
            可選外送日期
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-stone-500">新增日期</span>
              <input
                type="date"
                value={newDeliveryDate}
                onChange={(e) => setNewDeliveryDate(e.target.value)}
                className="rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
            </label>
            <button
              type="button"
              onClick={addDeliveryDate}
              className="h-10 rounded-lg bg-stone-800 px-4 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
              disabled={!newDeliveryDate}
            >
              加入
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {deliveryDates.length === 0 ? (
              <p className="text-sm text-stone-500">尚未設定（前台會改成自由選擇日期）。</p>
            ) : (
              deliveryDates.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm text-stone-700"
                >
                  <span className="font-mono">{d}</span>
                  <button
                    type="button"
                    onClick={() => removeDeliveryDate(d)}
                    className="rounded-full px-2 py-0.5 text-stone-500 hover:bg-stone-200 hover:text-stone-700"
                    aria-label={`刪除 ${d}`}
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
          <p className="mt-1.5 text-xs text-stone-500">
            設定後前台只能從下拉選擇；留空＝前台改成自由選擇日期（日期欄仍必填）。
          </p>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
          disabled={saving}
        >
          {saving ? "儲存中..." : "儲存"}
        </button>
      </form>
    </div>
  );
}
