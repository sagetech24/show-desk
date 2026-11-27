import type { Category, OrderStatus } from "./config";

export type Variant = { id: number; product_id: number; size: string; stock: number; reserved: number };

export type Product = {
  id: number;
  category: Category;
  brand: string;
  name: string;
  description: string;
  image: string | null;
  image_version: number;
  price: number;
  cost: number;
  low_stock_threshold: number;
  active: boolean;
  created_at: Date;
};

export type ProductWithVariants = Product & { variants: Variant[] };

export type Order = {
  id: number;
  customer_name: string;
  ig_handle: string;
  product_id: number;
  variant_id: number;
  qty: number;
  unit_price: number;
  status: OrderStatus;
  notes: string;
  created_at: Date;
  paid_at: Date | null;
  completed_at: Date | null;
  cancelled_at: Date | null;
};

export type OrderView = Order & {
  product_name: string;
  brand: string;
  category: Category;
  size: string;
  has_image: boolean;
  image_version: number;
};

export type IgPost = {
  id: number;
  ig_id: string | null;
  caption: string;
  media_url: string;
  permalink: string;
  posted_at: Date | null;
  status: "new" | "linked" | "dismissed";
  product_id: number | null;
  source: "graph" | "sample" | "manual";
  created_at: Date;
};
