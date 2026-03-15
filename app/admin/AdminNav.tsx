"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/admin", label: "首頁" },
  { href: "/admin/orders", label: "訂單" },
  { href: "/admin/items", label: "品項" },
  { href: "/admin/units", label: "單位" },
  { href: "/admin/categories", label: "分類" },
  { href: "/admin/seasons", label: "季節" },
  { href: "/admin/suppliers", label: "供應商" },
  { href: "/admin/statistics", label: "統計" },
  { href: "/admin/settings", label: "設定" },
];

export default function AdminNav() {
  const pathname = usePathname();
  if (pathname === "/admin/login") return null;

  return (
    <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link
            href="/admin"
            className="text-lg font-semibold text-stone-800 hover:text-stone-900"
          >
            後台
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
            {NAV_LINKS.filter((l) => l.href !== "/admin").map(({ href, label }) => {
              const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(href + "/"));
              return (
                <Link
                  key={href}
                  href={href}
                  className={
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors " +
                    (isActive
                      ? "bg-stone-100 text-stone-900"
                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-900")
                  }
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <span>前往訂購頁</span>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-900"
            >
              登出
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
