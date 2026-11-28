import { config } from "./config";
import { getStoreSettings } from "./store-settings";

type FormatOptions = { currency: string; timezone: string };

export function makeFormatter({ currency, timezone }: FormatOptions) {
  const money = new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
  const toDate = (d: Date | string) => (d instanceof Date ? d : new Date(d));

  const formatMoney = (n: number | string | null | undefined) => money.format(Number(n ?? 0));

  function formatDate(d: Date | string | null | undefined, withTime = false): string {
    if (!d) return "";
    return new Intl.DateTimeFormat(config.locale, {
      timeZone: timezone,
      month: "short",
      day: "numeric",
      year: "numeric",
      ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    }).format(toDate(d));
  }

  function timeAgo(d: Date | string | null | undefined): string {
    if (!d) return "";
    const s = Math.max(0, (Date.now() - toDate(d).getTime()) / 1000);
    if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
    if (s < 86400) return `${Math.round(s / 3600)}h ago`;
    if (s < 86400 * 30) return `${Math.round(s / 86400)}d ago`;
    return formatDate(d);
  }

  return { formatMoney, formatDate, timeAgo };
}

/** Formatters bound to the store's saved currency and time zone. Call once per page. */
export async function getFormatter() {
  const { currency, timezone } = await getStoreSettings();
  return makeFormatter({ currency, timezone });
}

export function cleanHandle(raw: string): string {
  const h = raw.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?#].*$/, "").replace(/^@+/, "");
  return h ? `@${h}` : "";
}
