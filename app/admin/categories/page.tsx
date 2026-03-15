"use client";

import { useEffect, useState } from "react";

type Cat = { id: string; name: string };

export default function AdminCategoriesPage() {
  const [list, setList] = useState<Cat[]>([]);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<Cat | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchList() {
    const res = await fetch("/api/admin/categories");
    if (res.ok) setList(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchList();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setName("");
      fetchList();
    } else {
      const d = await res.json();
      alert(d.error ?? "新增失敗");
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const res = await fetch(`/api/admin/categories/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editing.name }),
    });
    if (res.ok) {
      setEditing(null);
      fetchList();
    } else {
      const d = await res.json();
      alert(d.error ?? "更新失敗");
    }
  }

  async function handleDelete(c: Cat) {
    if (!confirm(`確定刪除「${c.name}」？`)) return;
    const res = await fetch(`/api/admin/categories/${c.id}`, { method: "DELETE" });
    if (res.ok) fetchList();
    else alert("刪除失敗（可能有品項使用中）");
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
      <h1 className="text-2xl font-bold text-stone-900">分類管理</h1>
      <p className="mt-1 text-sm text-stone-500">品項分類（如：葉菜、根莖）</p>

      <form onSubmit={handleCreate} className="mt-6 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="分類名稱（如：葉菜、根莖）"
            className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 sm:max-w-xs"
          />
          <button
            type="submit"
            className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            新增
          </button>
        </div>
      </form>

      <ul className="mt-4 space-y-2">
        {list.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm"
          >
            {editing?.id === c.id ? (
              <form onSubmit={handleUpdate} className="flex flex-1 flex-wrap items-center gap-2">
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
                <button type="submit" className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm text-white hover:bg-stone-700">
                  儲存
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
                >
                  取消
                </button>
              </form>
            ) : (
              <>
                <span className="font-medium text-stone-800">{c.name}</span>
                <button onClick={() => setEditing(c)} className="text-sm text-stone-600 underline hover:text-stone-900">編輯</button>
                <button onClick={() => handleDelete(c)} className="text-sm text-red-600 hover:underline">刪除</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
