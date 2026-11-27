export const config = {
  appName: process.env.APP_NAME?.trim() || "Shoe Desk",
  timezone: process.env.APP_TIMEZONE?.trim() || "Asia/Manila",
  currency: process.env.APP_CURRENCY?.trim() || "PHP",
  locale: process.env.APP_LOCALE?.trim() || "en-PH",
};

export const CATEGORIES = ["running", "badminton", "tennis", "casual"] as const;
export type Category = (typeof CATEGORIES)[number];

export const ORDER_STATUSES = ["reserved", "paid", "completed", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  running: "Running",
  badminton: "Badminton",
  tennis: "Tennis",
  casual: "Casual",
};

export const DEFAULT_SIZES: Record<Category, string[]> = {
  running: ["7", "8", "9", "10", "11", "12"],
  badminton: ["6", "7", "8", "9", "10", "11"],
  tennis: ["7", "8", "9", "10", "11", "12"],
  casual: ["6", "7", "8", "9", "10", "11"],
};
