"use client";

import { useEffect, useState } from "react";

export default function AdminSettingsPage() {
  const [announcement, setAnnouncement] = useState("");
  const [unitConversion, setUnitConversion] = useState("");
  const [blockedWeekdays, setBlockedWeekdays] = useState<number[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [newBlockedDate, setNewBlockedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/settings/announcement").then((r) => r.json()),
      fetch("/api/admin/settings/unit-conversion").then((r) => r.json()),
      fetch("/api/admin/settings/delivery-rules").then((r) => r.json()),
    ])
      .then(([a, u, d]) => {
        setAnnouncement(a.text ?? "");
        setUnitConversion(u.text ?? "");
        setBlockedWeekdays(Array.isArray(d?.blockedWeekdays) ? (d.blockedWeekdays as number[]) : []);
        setBlockedDates(Array.isArray(d?.blockedDates) ? (d.blockedDates as string[]) : []);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleWeekday(w: number) {
    setBlockedWeekdays((prev) => {
      const set = new Set(prev);
      if (set.has(w)) set.delete(w);
      else set.add(w);
      return Array.from(set).sort((a, b) => a - b);
    });
  }

  function addBlockedDate() {
    const s = newBlockedDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return;
    setBlockedDates((prev) => Array.from(new Set([...prev, s])).sort());
    setNewBlockedDate("");
  }

  function removeBlockedDate(s: string) {
    setBlockedDates((prev) => prev.filter((d) => d !== s));
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
      fetch("/api/admin/settings/delivery-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedWeekdays, blockedDates }),
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
      <p className="mt-1 text-sm text-stone-500">首頁公告、單位換算、禁送規則</p>

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
            外送禁送規則
          </label>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-stone-700 mb-2">禁送星期</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { w: 0, label: "日" },
                  { w: 1, label: "一" },
                  { w: 2, label: "二" },
                  { w: 3, label: "三" },
                  { w: 4, label: "四" },
                  { w: 5, label: "五" },
                  { w: 6, label: "六" },
                ].map(({ w, label }) => {
                  const on = blockedWeekdays.includes(w);
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => toggleWeekday(w)}
                      className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                        on
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                      }`}
                    >
                      週{label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-stone-500">勾選的星期，前台選到會提示不外送，後端也會擋。</p>
            </div>

            <div>
              <div className="text-sm font-medium text-stone-700 mb-2">禁送指定日期</div>
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-stone-500">新增禁送日期</span>
                  <input
                    type="date"
                    value={newBlockedDate}
                    onChange={(e) => setNewBlockedDate(e.target.value)}
                    className="rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
                  />
                </label>
                <button
                  type="button"
                  onClick={addBlockedDate}
                  className="h-10 rounded-lg bg-stone-800 px-4 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
                  disabled={!newBlockedDate}
                >
                  加入
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {blockedDates.length === 0 ? (
                  <p className="text-sm text-stone-500">尚未設定禁送日期。</p>
                ) : (
                  blockedDates.map((d) => (
                    <span
                      key={d}
                      className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm text-stone-700"
                    >
                      <span className="font-mono">{d}</span>
                      <button
                        type="button"
                        onClick={() => removeBlockedDate(d)}
                        className="rounded-full px-2 py-0.5 text-stone-500 hover:bg-stone-200 hover:text-stone-700"
                        aria-label={`刪除 ${d}`}
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
              <p className="mt-1.5 text-xs text-stone-500">這些日期不外送（即使不是禁送星期也一樣）。</p>
            </div>
          </div>
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
