import { prisma } from "@/lib/db";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatYYYYMMDDLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseYYYYMMDDToLocalDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(day)) return null;
  const d = new Date(y, mo - 1, day, 0, 0, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

function normalizeDates(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const set = new Set<string>();
  for (const v of input) {
    if (typeof v !== "string") continue;
    const s = v.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) continue;
    set.add(s);
  }
  return Array.from(set).sort();
}

function normalizeWeekdays(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  const set = new Set<number>();
  for (const v of input) {
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    if (!Number.isInteger(n)) continue;
    if (n < 0 || n > 6) continue;
    set.add(n);
  }
  return Array.from(set);
}

async function readJsonSetting(key: string): Promise<unknown> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row?.value) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

function isBlockedByRules(yyyyMmDd: string, blockedWeekdays: number[], blockedDates: string[]) {
  if (blockedDates.includes(yyyyMmDd)) return true;
  const d = parseYYYYMMDDToLocalDate(yyyyMmDd);
  if (!d) return false;
  const w = d.getDay();
  return blockedWeekdays.includes(w);
}

/**
 * 後台預設使用的「下次可外送日」：
 * - 從「明天」開始找
 * - 若設定有 delivery_dates（白名單），優先用其中第一個 >= 明天且沒被禁送規則擋到的日期
 * - 否則依禁送規則逐日往後找第一個可外送日（最多找 366 天）
 */
export async function getNextDeliverableYYYYMMDDLocal(now = new Date()): Promise<string> {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  start.setDate(start.getDate() + 1); // 明天

  const blockedWeekdays = normalizeWeekdays(await readJsonSetting("delivery_blocked_weekdays"));
  const blockedDates = normalizeDates(await readJsonSetting("delivery_blocked_dates"));

  const deliveryDates = normalizeDates(await readJsonSetting("delivery_dates"));
  if (deliveryDates.length > 0) {
    for (const s of deliveryDates) {
      const d = parseYYYYMMDDToLocalDate(s);
      if (!d) continue;
      if (d.getTime() < start.getTime()) continue;
      if (isBlockedByRules(s, blockedWeekdays, blockedDates)) continue;
      return s;
    }
  }

  for (let i = 0; i < 366; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const s = formatYYYYMMDDLocal(d);
    if (isBlockedByRules(s, blockedWeekdays, blockedDates)) continue;
    return s;
  }

  // 理論上不會到這裡；保底回傳明天
  return formatYYYYMMDDLocal(start);
}

export async function getDayRangeLocal(yyyyMmDd: string): Promise<{ start: Date; end: Date } | null> {
  const d = parseYYYYMMDDToLocalDate(yyyyMmDd);
  if (!d) return null;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return { start, end };
}

