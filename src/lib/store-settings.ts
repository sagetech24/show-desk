import "server-only";
import { cache } from "react";
import { sql, tx } from "./db";
import { config } from "./config";

export type StoreSettings = {
  name: string;
  description: string;
  email: string;
  phone: string;
  timezone: string;
  currency: string;
};

const KEYS = {
  name: "store_name",
  description: "store_description",
  email: "store_email",
  phone: "store_phone",
  timezone: "store_timezone",
  currency: "store_currency",
} as const satisfies Record<keyof StoreSettings, string>;

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  name: config.appName,
  description: "",
  email: "",
  phone: "",
  timezone: config.timezone,
  currency: config.currency,
};

/** Saved values win; environment variables (APP_NAME, APP_TIMEZONE, APP_CURRENCY) are the fallback. */
export const getStoreSettings = cache(async (): Promise<StoreSettings> => {
  const rows = await sql<{ key: string; value: string }>("select key, value from settings where key = any($1)", [
    Object.values(KEYS),
  ]);
  const saved = new Map(rows.map((r) => [r.key, r.value]));
  const out = { ...DEFAULT_STORE_SETTINGS };
  for (const field of Object.keys(KEYS) as (keyof StoreSettings)[]) {
    const v = saved.get(KEYS[field]);
    if (v !== undefined && (v !== "" || field === "description" || field === "email" || field === "phone")) {
      out[field] = v;
    }
  }
  return out;
});

export async function saveStoreSettings(s: StoreSettings): Promise<void> {
  await tx(async (q) => {
    for (const field of Object.keys(KEYS) as (keyof StoreSettings)[]) {
      await q(
        "insert into settings (key, value) values ($1, $2) on conflict (key) do update set value = excluded.value",
        [KEYS[field], s[field]],
      );
    }
  });
}

export function timezoneOptions(): string[] {
  try {
    const zones = Intl.supportedValuesOf("timeZone");
    return zones.includes("UTC") ? zones : ["UTC", ...zones];
  } catch {
    return [config.timezone, "UTC"];
  }
}

export function currencyOptions(): { code: string; label: string }[] {
  let codes: string[];
  try {
    codes = Intl.supportedValuesOf("currency");
  } catch {
    codes = [config.currency];
  }
  let names: Intl.DisplayNames | undefined;
  try {
    names = new Intl.DisplayNames(["en"], { type: "currency" });
  } catch {}
  return codes.map((code) => ({ code, label: `${code} — ${names?.of(code) ?? code}` }));
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function isValidCurrency(code: string): boolean {
  if (!/^[A-Z]{3}$/.test(code)) return false;
  try {
    new Intl.NumberFormat("en", { style: "currency", currency: code });
    return true;
  } catch {
    return false;
  }
}
