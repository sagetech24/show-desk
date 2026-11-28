import "server-only";
import { sql, type Q } from "./db";
import { UserError } from "./errors";
import type { Category, CategoryWithCount } from "./types";

export async function listCategories(q: Q = sql): Promise<Category[]> {
  return q<Category>("select * from categories order by sort_order, lower(name)");
}

export async function listCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  return sql<CategoryWithCount>(
    `select c.*, count(pc.product_id) as product_count
       from categories c left join product_categories pc on pc.category_id = c.id
      group by c.id order by c.sort_order, lower(c.name)`,
  );
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Replace the set of categories a product belongs to. Runs inside the caller's transaction. */
export async function setProductCategories(q: Q, productId: number, categoryIds: number[]): Promise<void> {
  const ids = [...new Set(categoryIds)];
  if (ids.length === 0) throw new UserError("Choose at least one category.");
  const found = await q<{ id: number }>("select id from categories where id = any($1::int[])", [ids]);
  if (found.length !== ids.length) throw new UserError("One of the chosen categories no longer exists.");
  await q("delete from product_categories where product_id = $1 and category_id <> all($2::int[])", [productId, ids]);
  await q(
    "insert into product_categories (product_id, category_id) select $1, unnest($2::int[]) on conflict do nothing",
    [productId, ids],
  );
}

/** Add categories to a product without removing the ones it already has. */
export async function addProductCategories(q: Q, productId: number, categoryIds: number[]): Promise<void> {
  if (categoryIds.length === 0) return;
  await q(
    "insert into product_categories (product_id, category_id) select $1, unnest($2::int[]) on conflict do nothing",
    [productId, [...new Set(categoryIds)]],
  );
}