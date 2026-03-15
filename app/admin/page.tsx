import Link from "next/link";

const LINKS = [
  { href: "/admin/orders", label: "訂單列表", desc: "查詢、編輯、列印訂單" },
  { href: "/admin/items", label: "品項管理", desc: "商品與單位、分類、季節、供應商" },
  { href: "/admin/units", label: "單位管理", desc: "斤、包、顆等計量單位" },
  { href: "/admin/categories", label: "分類管理", desc: "品項分類" },
  { href: "/admin/seasons", label: "季節管理", desc: "產季設定" },
  { href: "/admin/suppliers", label: "供應商管理", desc: "供應商名單" },
  { href: "/admin/statistics", label: "供應商統計", desc: "依日期統計出貨" },
  { href: "/admin/settings", label: "網站設定", desc: "公告、單位換算說明" },
];

export default function AdminDashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">後台首頁</h1>
        <p className="mt-1 text-sm text-stone-500">管理品項、訂單與網站設定</p>
      </div>
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 transition-colors hover:border-emerald-300 hover:bg-emerald-100"
      >
        <div>
          <span className="font-medium text-emerald-800">前往訂購頁（前端）</span>
          <p className="mt-0.5 text-sm text-emerald-600">開啟顧客下單頁面</p>
        </div>
        <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LINKS.map(({ href, label, desc }) => (
          <li key={href}>
            <Link
              href={href}
              className="block rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-colors hover:border-stone-300 hover:shadow"
            >
              <span className="font-medium text-stone-900">{label}</span>
              <p className="mt-1 text-sm text-stone-500">{desc}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
