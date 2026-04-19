"use client";

import { useEffect, useState } from "react";

type Unit = { id: string; name: string };
type Category = { id: string; name: string };
type Season = { id: string; name: string };
type Supplier = { id: string; name: string };
type Item = {
  id: string;
  name: string;
  active: boolean;
  unitId: string;
  categoryId: string;
  seasonId: string;
  supplierId: string;
  unit: Unit;
  category: Category;
  season: Season;
  supplier: Supplier;
};

export default function AdminItemsPage() {
  const [list, setList] = useState<Item[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filter, setFilter] = useState({ categoryId: "", seasonId: "", supplierId: "" });
  const [itemQuery, setItemQuery] = useState("");
  const [debouncedItemQuery, setDebouncedItemQuery] = useState("");
  const [form, setForm] = useState({
    name: "",
    unitId: "",
    categoryId: "",
    seasonId: "",
    supplierId: "",
    active: true,
  });
  const [editing, setEditing] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchOptions() {
    const [u, c, s, sup] = await Promise.all([
      fetch("/api/admin/units").then((r) => r.json()),
      fetch("/api/admin/categories").then((r) => r.json()),
      fetch("/api/admin/seasons").then((r) => r.json()),
      fetch("/api/admin/suppliers").then((r) => r.json()),
    ]);
    setUnits(u);
    setCategories(c);
    setSeasons(s);
    setSuppliers(sup);
  }

  async function fetchList() {
    const params = new URLSearchParams();
    if (filter.categoryId) params.set("categoryId", filter.categoryId);
    if (filter.seasonId) params.set("seasonId", filter.seasonId);
    if (filter.supplierId) params.set("supplierId", filter.supplierId);
    if (debouncedItemQuery) params.set("q", debouncedItemQuery);
    const res = await fetch(`/api/admin/items?${params}`);
    if (res.ok) setList(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedItemQuery(itemQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [itemQuery]);

  useEffect(() => {
    fetchList();
  }, [filter.categoryId, filter.seasonId, filter.supplierId, debouncedItemQuery]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ name: "", unitId: "", categoryId: "", seasonId: "", supplierId: "", active: true });
      fetchList();
    } else {
      const d = await res.json();
      alert(d.error ?? "新增失敗");
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const res = await fetch(`/api/admin/items/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editing.name,
        unitId: editing.unitId,
        categoryId: editing.categoryId,
        seasonId: editing.seasonId,
        supplierId: editing.supplierId,
        active: editing.active,
      }),
    });
    if (res.ok) {
      setEditing(null);
      fetchList();
    } else {
      const d = await res.json();
      alert(d.error ?? "更新失敗");
    }
  }

  async function handleDelete(item: Item) {
    if (!confirm(`確定刪除「${item.name}」？`)) return;
    const res = await fetch(`/api/admin/items/${item.id}`, { method: "DELETE" });
    if (res.ok) fetchList();
    else {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? "刪除失敗");
    }
  }

  if (loading && list.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-8 text-center text-stone-500">
        載入中...
      </div>
    );
  }

  const inputCls = "rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400";
  const btnPrimary = "rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700";

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">品項管理</h1>
      <p className="mt-1 text-sm text-stone-500">商品與單位、分類、季節、供應商</p>

      <div className="mt-6 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <select
            value={filter.categoryId}
            onChange={(e) => setFilter((f) => ({ ...f, categoryId: e.target.value }))}
            className={inputCls}
          >
            <option value="">全部分類</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={filter.seasonId}
            onChange={(e) => setFilter((f) => ({ ...f, seasonId: e.target.value }))}
            className={inputCls}
          >
            <option value="">全部季節</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={filter.supplierId}
            onChange={(e) => setFilter((f) => ({ ...f, supplierId: e.target.value }))}
            className={inputCls}
          >
            <option value="">全部供應商</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input
            type="search"
            value={itemQuery}
            onChange={(e) => setItemQuery(e.target.value)}
            placeholder="品項查詢"
            aria-label="品項查詢"
            className={`${inputCls} min-w-[140px] flex-1 max-w-xs`}
          />
        </div>
      </div>
      <form onSubmit={handleCreate} className="mt-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm space-y-3 max-w-2xl">
        <h2 className="text-sm font-medium text-stone-700">新增品項</h2>
        <div className="flex flex-wrap gap-2">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="品項名稱"
            className={`${inputCls} flex-1 min-w-[120px]`}
            required
          />
          <select value={form.unitId} onChange={(e) => setForm((f) => ({ ...f, unitId: e.target.value }))} className={inputCls} required>
            <option value="">單位</option>
            {units.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
          </select>
          <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} className={inputCls} required>
            <option value="">分類</option>
            {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <select value={form.seasonId} onChange={(e) => setForm((f) => ({ ...f, seasonId: e.target.value }))} className={inputCls} required>
            <option value="">季節</option>
            {seasons.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
          <select value={form.supplierId} onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))} className={inputCls} required>
            <option value="">供應商</option>
            {suppliers.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
          上架
        </label>
        <button type="submit" className={btnPrimary}>新增</button>
      </form>
      <div className="mt-4 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50">
            <th className="p-3 text-left text-sm font-medium text-stone-700">品項</th>
            <th className="p-3 text-center text-sm font-medium text-stone-700">單位</th>
            <th className="p-3 text-center text-sm font-medium text-stone-700">分類</th>
            <th className="p-3 text-center text-sm font-medium text-stone-700">季節</th>
            <th className="p-3 text-center text-sm font-medium text-stone-700">供應商</th>
            <th className="p-3 text-center text-sm font-medium text-stone-700">上架</th>
            <th className="p-3 text-sm font-medium text-stone-700">操作</th>
          </tr>
        </thead>
        <tbody>
          {list.map((item) => (
            <tr key={item.id} className="border-b border-stone-100 last:border-0">
              {editing?.id === item.id ? (
                <td colSpan={7} className="p-3">
                  <form onSubmit={handleUpdate} className="flex flex-wrap items-center gap-2">
                    <input
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      className={`${inputCls} w-28`}
                    />
                    <select value={editing.unitId} onChange={(e) => setEditing({ ...editing, unitId: e.target.value })} className={inputCls}>
                      {units.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
                    </select>
                    <select value={editing.categoryId} onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })} className={inputCls}>
                      {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                    <select value={editing.seasonId} onChange={(e) => setEditing({ ...editing, seasonId: e.target.value })} className={inputCls}>
                      {seasons.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                    </select>
                    <select value={editing.supplierId} onChange={(e) => setEditing({ ...editing, supplierId: e.target.value })} className={inputCls}>
                      {suppliers.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                    </select>
                    <label className="flex items-center gap-1 text-sm text-stone-600">
                      <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                      上架
                    </label>
                    <button type="submit" className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm text-white hover:bg-stone-700">儲存</button>
                    <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50">取消</button>
                  </form>
                </td>
              ) : (
                <>
                  <td className="p-3 font-medium text-stone-800">{item.name}</td>
                  <td className="p-3 text-center text-stone-600">{item.unit.name}</td>
                  <td className="p-3 text-center text-stone-600">{item.category.name}</td>
                  <td className="p-3 text-center text-stone-600">{item.season.name}</td>
                  <td className="p-3 text-center text-stone-600">{item.supplier.name}</td>
                  <td className="p-3 text-center text-stone-600">{item.active ? "是" : "否"}</td>
                  <td className="p-3">
                    <button onClick={() => setEditing(item)} className="text-sm text-stone-600 underline hover:text-stone-900 mr-2">編輯</button>
                    <button onClick={() => handleDelete(item)} className="text-sm text-red-600 hover:underline">刪除</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
