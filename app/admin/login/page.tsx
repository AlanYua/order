"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "登入失敗");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-stone-900 mb-4">後台登入</h1>
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <label className="block mb-3">
          <span className="text-sm font-medium text-stone-600">帳號</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
            autoComplete="username"
          />
        </label>
        <label className="block mb-4">
          <span className="text-sm font-medium text-stone-600">密碼</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
            autoComplete="current-password"
          />
        </label>
        <button type="submit" className="w-full rounded-lg bg-stone-800 py-2 text-sm font-medium text-white hover:bg-stone-700">
          登入
        </button>
      </form>
    </main>
  );
}
