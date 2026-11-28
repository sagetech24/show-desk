export const config = {
  appName: process.env.APP_NAME?.trim() || "Shoe Desk",
  timezone: process.env.APP_TIMEZONE?.trim() || "Asia/Manila",
  currency: process.env.APP_CURRENCY?.trim() || "PHP",
  locale: process.env.APP_LOCALE?.trim() || "en-PH",
};

export const ORDER_STATUSES = ["reserved", "paid", "completed", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Badge colours a category can use. Full class names so Tailwind picks them up. */
export const CATEGORY_COLORS = {
  sky: "bg-sky-100 text-sky-800",
  emerald: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  violet: "bg-violet-100 text-violet-800",
  rose: "bg-rose-100 text-rose-800",
  orange: "bg-orange-100 text-orange-800",
  teal: "bg-teal-100 text-teal-800",
  slate: "bg-slate-200 text-slate-700",
} as const;
export type CategoryColor = keyof typeof CATEGORY_COLORS;
export const CATEGORY_COLOR_KEYS = Object.keys(CATEGORY_COLORS) as CategoryColor[];

/** The size run offered by "Add sizes" on a new product. */
export const STANDARD_SIZES = ["6", "7", "8", "9", "10", "11", "12"];

/** The categories every shop starts with (same as the 002 migration seed). */
export const DEFAULT_CATEGORIES: { slug: string; name: string; color: CategoryColor }[] = [
  { slug: "running", name: "Running", color: "sky" },
  { slug: "badminton", name: "Badminton", color: "emerald" },
  { slug: "tennis", name: "Tennis", color: "amber" },
  { slug: "casual", name: "Casual", color: "violet" },
];
