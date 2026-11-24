const CURRENCY = import.meta.env.VITE_CURRENCY ?? "USD";
const LOCALE = "es-CL";

const money = new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY });
const compact = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  notation: "compact",
  maximumFractionDigits: 1,
});

const percent = new Intl.NumberFormat(LOCALE, { style: "percent", maximumFractionDigits: 1, minimumFractionDigits: 1 });

export const formatMoney = (v: string | number) => money.format(Number(v));
/** 42.6 -> "42,6 %" */
export const formatPct = (v: number) => percent.format(v / 100);
export const formatCompact = (v: number) => compact.format(v);

export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** "2026-11" -> "nov 2026" (or "nov" when short). */
export function formatMonth(ym: string, short = false) {
  const [y, m] = ym.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString(LOCALE, {
    month: "short",
    ...(short ? {} : { year: "numeric" }),
  });
  return label.replace(".", "");
}

const pad = (n: number) => String(n).padStart(2, "0");
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const isoMonth = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
export const today = () => isoDate(new Date());

export function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  return isoMonth(new Date(y, m - 1 + delta, 1));
}
