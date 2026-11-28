import "server-only";
import { sql, type Q } from "./db";
import { UserError } from "./errors";
import type { CategoryRef, Product, ProductWithVariants, Variant } from "./types";

export const available = (v: Pick<Variant, "stock" | "reserved">) => v.stock - v.reserved;

export function sortSizes<T extends { size: string }>(variants: T[]): T[] {
  return [...variants].sort((a, b) => {
    const na = parseFloat(a.size);
    const nb = parseFloat(b.size);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
    return a.size.localeCompare(b.size, undefined, { numeric: true });
  });
}

export type StockState = "ok" | "low" | "out";

export function variantState(v: Variant, threshold: number): StockState {
  const a = available(v);
  if (a <= 0) return "out";
  return a <= threshold ? "low" : "ok";
}

export function productSummary(p: ProductWithVariants) {
  const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
  const totalReserved = p.variants.reduce((s, v) => s + v.reserved, 0);
  const totalAvailable = totalStock - totalReserved;
  const lowSizes = p.variants.filter((v) => variantState(v, p.low_stock_threshold) === "low").length;
  const state: StockState =
    p.variants.length === 0 || totalAvailable <= 0 ? "out" : lowSizes > 0 ? "low" : "ok";
  return { totalStock, totalReserved, totalAvailable, lowSizes, state };
}

type ProductQuery = {
  /** Category slug. Matches products that belong to this category (among others). */
  category?: string;
  q?: string;
  includeArchived?: boolean;
  onlyArchived?: boolean;
};

const PRODUCT_SELECT = `
  select p.*, coalesce(
    (select json_agg(json_build_object('id', v.id, 'product_id', v.product_id, 'size', v.size, 'stock', v.stock, 'reserved', v.reserved))
       from variants v where v.product_id = p.id), '[]'::json) as variants,
  coalesce(
    (select json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name, 'color', c.color) order by c.sort_order, lower(c.name))
       from product_categories pc join categories c on c.id = pc.category_id where pc.product_id = p.id), '[]'::json) as categories
  from products p`;

type ProductRow = Product & { variants: Variant[]; categories: CategoryRef[] };

function normalize(rows: ProductRow[]): ProductWithVariants[] {
  return rows.map((r) => ({ ...r, variants: sortSizes(r.variants) }));
}

export async function listProducts(opts: ProductQuery = {}): Promise<ProductWithVariants[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.onlyArchived) where.push("p.active = false");
  else if (!opts.includeArchived) where.push("p.active = true");
  if (opts.category) {
    params.push(opts.category);
    where.push(
      `exists (select 1 from product_categories pc join categories c on c.id = pc.category_id
                where pc.product_id = p.id and c.slug = $${params.length})`,
    );
  }
  if (opts.q?.trim()) {
    params.push(`%${opts.q.trim()}%`);
    where.push(`(p.name ilike $${params.length} or p.brand ilike $${params.length})`);
  }
  const rows = await sql<ProductRow>(
    `${PRODUCT_SELECT} ${where.length ? "where " + where.join(" and ") : ""} order by p.brand, p.name`,
    params,
  );
  return normalize(rows);
}

export async function getProduct(id: number): Promise<ProductWithVariants | null> {
  if (!Number.isInteger(id)) return null;
  const rows = await sql<ProductRow>(`${PRODUCT_SELECT} where p.id = $1`, [id]);
  return rows[0] ? normalize(rows)[0] : null;
}

export async function adjustVariantStock(
  q: Q,
  variantId: number,
  delta: number,
  reason: string,
  opts: { unitCost?: number | null; note?: string } = {},
): Promise<Variant> {
  const rows = await q<Variant>("select * from variants where id = $1 for update", [variantId]);
  const v = rows[0];
  if (!v) throw new UserError("That size no longer exists.");
  const next = v.stock + delta;
  if (next < 0) throw new UserError(`Stock can't go below zero (size ${v.size} has ${v.stock}).`);
  if (next < v.reserved)
    throw new UserError(
      `${v.reserved} pair(s) of size ${v.size} are held by reservations. Cancel or complete them before lowering stock below that.`,
    );
  const updated = await q<Variant>("update variants set stock = $2 where id = $1 returning *", [variantId, next]);
  if (delta !== 0)
    await q("insert into stock_movements (variant_id, delta, reason, unit_cost, note) values ($1,$2,$3,$4,$5)", [
      variantId,
      delta,
      reason,
      opts.unitCost ?? null,
      opts.note ?? "",
    ]);
  return updated[0];
}