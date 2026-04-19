"use client";

import { useEffect, useState } from "react";

type DetailRow = {
  itemName: string;
  unitName: string;
  totalQty: number;
  orderSuffixes?: string[];
};
type MergedRow = { itemName: string; qtyText: string; orderSuffixes: string[] };
type CategoryGroup = { categoryId: string; categoryName: string; rows: MergedRow[] };
type SupplierGroup = {
  supplierId: string;
  supplierName: string;
  categories: CategoryGroup[];
};

type FlatRow =
  | {
      kind: "supplier-only";
      supplierId: string;
      supplierName: string;
      supplierRowSpan: number;
      isFirstRowOfSupplier: true;
      categoryKey: string;
      categoryName: string;
      categoryRowSpan: number;
      isFirstRowOfCategory: true;
      itemName: string;
      qtyText: string;
      orderSuffixesLine: string;
    }
  | {
      kind: "category-only";
      supplierId: string;
      supplierName: string;
      supplierRowSpan: number;
      isFirstRowOfSupplier: boolean;
      categoryKey: string;
      categoryName: string;
      categoryRowSpan: number;
      isFirstRowOfCategory: true;
      itemName: string;
      qtyText: string;
      orderSuffixesLine: string;
    }
  | {
      kind: "detail";
      supplierId: string;
      supplierName: string;
      supplierRowSpan: number;
      isFirstRowOfSupplier: boolean;
      categoryKey: string;
      categoryName: string;
      categoryRowSpan: number;
      isFirstRowOfCategory: boolean;
      itemName: string;
      qtyText: string;
      orderSuffixesLine: string;
    };

function todayYYYYMMDD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function mergeSameItemDifferentUnits(rows: DetailRow[]): MergedRow[] {
  const map = new Map<string, Map<string, number>>();
  const suffixMap = new Map<string, Set<string>>();
  const order: string[] = [];

  for (const r of rows) {
    if (!map.has(r.itemName)) {
      map.set(r.itemName, new Map());
      suffixMap.set(r.itemName, new Set());
      order.push(r.itemName);
    }
    const unitMap = map.get(r.itemName)!;
    unitMap.set(r.unitName, (unitMap.get(r.unitName) ?? 0) + r.totalQty);
    const suf = suffixMap.get(r.itemName)!;
    for (const x of r.orderSuffixes ?? []) suf.add(x);
  }

  return order.map((itemName) => {
    const unitMap = map.get(itemName)!;
    const qtyText = Array.from(unitMap.entries())
      .filter(([, qty]) => qty > 0)
      .map(([unitName, qty]) => `${qty}${unitName}`)
      .join("");
    const orderSuffixes = Array.from(suffixMap.get(itemName) ?? []).sort();
    return { itemName, qtyText, orderSuffixes };
  });
}

const ORDER_SUFFIX_DISPLAY_MAX = 24;

function formatOrderSuffixesLine(suffixes: string[]) {
  if (suffixes.length === 0) return "";
  const shown = suffixes.slice(0, ORDER_SUFFIX_DISPLAY_MAX);
  const more = suffixes.length - shown.length;
  const tail = more > 0 ? ` …共${suffixes.length}筆` : "";
  return `訂單 ${shown.join("/")}${tail}`;
}

function buildFlatRows(
  list: SupplierGroup[],
  expandedSupplier: Set<string>,
  expandedCategory: Set<string>
): FlatRow[] {
  const flat: FlatRow[] = [];
  for (const sup of list) {
    const supOpen = expandedSupplier.has(sup.supplierId);
    if (!supOpen) {
      flat.push({
        kind: "supplier-only",
        supplierId: sup.supplierId,
        supplierName: sup.supplierName,
        supplierRowSpan: 1,
        isFirstRowOfSupplier: true,
        categoryKey: "",
        categoryName: "",
        categoryRowSpan: 1,
        isFirstRowOfCategory: true,
        itemName: "",
        qtyText: "",
        orderSuffixesLine: "",
      });
      continue;
    }
    let supplierRowCount = 0;
    for (const cat of sup.categories) {
      const catOpen = expandedCategory.has(`${sup.supplierId}-${cat.categoryId}`);
      if (!catOpen) supplierRowCount += 1;
      else supplierRowCount += cat.rows.length;
    }
    let supFirst = true;
    for (const cat of sup.categories) {
      const catKey = `${sup.supplierId}-${cat.categoryId}`;
      const catOpen = expandedCategory.has(catKey);
      if (!catOpen) {
        flat.push({
          kind: "category-only",
          supplierId: sup.supplierId,
          supplierName: sup.supplierName,
          supplierRowSpan: supFirst ? supplierRowCount : 0,
          isFirstRowOfSupplier: supFirst,
          categoryKey: catKey,
          categoryName: cat.categoryName,
          categoryRowSpan: 1,
          isFirstRowOfCategory: true,
          itemName: "",
          qtyText: "",
          orderSuffixesLine: "",
        });
        supFirst = false;
        continue;
      }
      for (let i = 0; i < cat.rows.length; i++) {
        const d = cat.rows[i];
        flat.push({
          kind: "detail",
          supplierId: sup.supplierId,
          supplierName: sup.supplierName,
          supplierRowSpan: supFirst ? supplierRowCount : 0,
          isFirstRowOfSupplier: supFirst,
          categoryKey: catKey,
          categoryName: cat.categoryName,
          categoryRowSpan: i === 0 ? cat.rows.length : 0,
          isFirstRowOfCategory: i === 0,
          itemName: d.itemName,
          qtyText: d.qtyText,
          orderSuffixesLine: formatOrderSuffixesLine(d.orderSuffixes),
        });
        supFirst = false;
      }
    }
  }
  return flat;
}

export default function AdminStatisticsPage() {
  const [list, setList] = useState<SupplierGroup[]>([]);
  const [from, setFrom] = useState(() => "");
  const [to, setTo] = useState(() => "");
  const [loading, setLoading] = useState(true);
  const [expandedSupplier, setExpandedSupplier] = useState<Set<string>>(new Set());
  const [expandedCategory, setExpandedCategory] = useState<Set<string>>(new Set());
  const [textOutput, setTextOutput] = useState("");

  async function fetchList() {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("format", "detail");
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/admin/statistics?${params}`);
    if (res.ok) {
      const raw = await res.json();
      const data: SupplierGroup[] = (raw as any[]).map((s) => ({
        supplierId: s.supplierId,
        supplierName: s.supplierName,
        categories: (s.categories as any[]).map((c) => ({
          categoryId: c.categoryId,
          categoryName: c.categoryName,
          rows: mergeSameItemDifferentUnits(c.rows as DetailRow[]),
        })),
      }));
      setList(data);
      setExpandedSupplier(new Set(data.map((s) => s.supplierId)));
      setExpandedCategory(
        new Set(data.flatMap((s) => s.categories.map((c) => `${s.supplierId}-${c.categoryId}`)))
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/settings/next-delivery-date", {
          credentials: "include",
        });
        if (res.ok) {
          const data = (await res.json()) as { date?: string };
          const d = typeof data?.date === "string" ? data.date : "";
          setFrom(d);
          setTo(d);
        } else {
          const t = todayYYYYMMDD();
          setFrom(t);
          setTo(t);
        }
      } catch {
        const t = todayYYYYMMDD();
        setFrom(t);
        setTo(t);
      } finally {
        fetchList();
      }
    })();
  }, []);

  const toggleSupplier = (id: string) => {
    setExpandedSupplier((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCategory = (key: string) => {
    setExpandedCategory((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handlePrint = () => window.print();

  const handleExportText = () => {
    const lines: string[] = [];
    for (const sup of list) {
      lines.push(sup.supplierName);
      for (const cat of sup.categories) {
        for (const row of cat.rows) {
          lines.push(`    ${row.itemName}${row.qtyText}`);
          if (row.orderSuffixes.length) {
            lines.push(`        ${formatOrderSuffixesLine(row.orderSuffixes)}`);
          }
        }
      }
      lines.push("");
    }
    setTextOutput(lines.join("\n").trimEnd());
  };

  const flatRows = buildFlatRows(list, expandedSupplier, expandedCategory);

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">供應商訂單統計</h1>
      <p className="mt-1 text-sm text-stone-500">
        依供應商、分類分組之明細與合計，可列印
      </p>

      <div className="no-print mt-6 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-stone-600">外送日期從</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-stone-600">外送日期到</span>
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
          <button
            onClick={handlePrint}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            列印
          </button>
          <button
            type="button"
            onClick={handleExportText}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            輸出文字
          </button>
        </div>
      </div>

      {textOutput && (
        <div className="no-print mt-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm font-medium text-stone-700">供應商訂單統計文字輸出（可選取複製）</div>
          <textarea
            className="h-48 w-full resize-none rounded-lg border border-stone-200 bg-stone-50 p-2 text-sm font-mono text-stone-800"
            value={textOutput}
            readOnly
          />
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm print:rounded-none print:border print:shadow-none">
        {loading ? (
          <div className="p-8 text-center text-stone-500">載入中...</div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-stone-500">此區間無訂單資料</div>
        ) : (
          <div id="statistics-report" className="statistics-report">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-stone-300 bg-stone-100">
                  <th className="border border-stone-200 p-2 text-left text-sm font-semibold text-stone-800">
                    <span className="inline-flex items-center gap-1">
                      供應商
                      <span className="text-stone-400" aria-hidden>▼</span>
                    </span>
                  </th>
                  <th className="border border-stone-200 p-2 text-left text-sm font-semibold text-stone-800 print-hide-col">
                    <span className="inline-flex items-center gap-1">
                      分類
                      <span className="text-stone-400" aria-hidden>▼</span>
                    </span>
                  </th>
                  <th className="border border-stone-200 p-2 text-left text-sm font-semibold text-stone-800">
                    <span className="inline-flex items-center gap-1">
                      明細
                      <span className="text-stone-400" aria-hidden>▼</span>
                    </span>
                  </th>
                  <th className="border border-stone-200 p-2 text-left text-sm font-semibold text-stone-800">
                    <span className="inline-flex items-center gap-1">
                      統計
                      <span className="text-stone-400" aria-hidden>▼</span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {flatRows.map((row, idx) => (
                  <tr
                    key={`${row.supplierId}-${row.categoryKey}-${idx}`}
                    className={
                      idx % 2 === 0
                        ? "bg-sky-50/50 print:bg-sky-50/50"
                        : "bg-white"
                    }
                  >
                    {row.isFirstRowOfSupplier && (row.supplierRowSpan > 0 || row.kind === "supplier-only") ? (
                      <td
                        className="border border-stone-200 p-2 align-top"
                        rowSpan={row.kind === "supplier-only" ? 1 : row.supplierRowSpan}
                      >
                        <span className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleSupplier(row.supplierId)}
                            className="no-print inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-stone-300 bg-white text-stone-500 hover:bg-stone-50 print:hidden"
                            aria-label={row.kind === "supplier-only" ? "展開" : "收合"}
                          >
                            {row.kind === "supplier-only" ? "+" : "−"}
                          </button>
                          <span className="print:inline">{row.supplierName}</span>
                        </span>
                      </td>
                    ) : null}
                    {row.isFirstRowOfCategory && (row.categoryRowSpan > 0 || row.kind === "category-only") ? (
                      <td
                        className="border border-stone-200 p-2 align-top print-hide-col"
                        rowSpan={row.kind === "category-only" ? 1 : row.categoryRowSpan}
                      >
                        {row.categoryKey ? (
                          <span className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleCategory(row.categoryKey)}
                              className="no-print inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-stone-300 bg-white text-stone-500 hover:bg-stone-50 print:hidden"
                              aria-label={row.kind === "category-only" ? "展開" : "收合"}
                            >
                              {row.kind === "category-only" ? "+" : "−"}
                            </button>
                            <span className="print:inline">{row.categoryName}</span>
                          </span>
                        ) : (
                          <span className="print:inline">{row.categoryName}</span>
                        )}
                      </td>
                    ) : null}
                    <td className="border border-stone-200 p-2 text-stone-800">
                      {row.itemName ? (
                        <div className="flex flex-col gap-0.5">
                          <span>{row.itemName}</span>
                          {row.orderSuffixesLine ? (
                            <span className="text-xs font-normal text-stone-500 print:text-[11px]">
                              {row.orderSuffixesLine}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="border border-stone-200 p-2 text-stone-700">
                      {row.qtyText || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
