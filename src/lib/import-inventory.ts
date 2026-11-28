import "server-only";
import { tx } from "./db";
import { addProductCategories } from "./categories";
import { adjustVariantStock } from "./inventory";
import type { ImportRow, ImportSummary } from "./tabular";

export async function applyInventoryImport(rows: ImportRow[], mode: "set" | "add"): Promise<ImportSummary> {
  const summary: ImportSummary = { productsCreated: 0, productsUpdated: 0, sizesCreated: 0, sizesUpdated: 0, warnings: [] };
  await tx(async (q) => {
    const cache = new Map<string, number>();
    for (const r of rows) {
      const key = `${r.brand.toLowerCase()}|${r.name.toLowerCase()}`;
      let pid = cache.get(key);
      if (pid === undefined) {
        const found = await q<{ id: number }>(
          "select id from products where lower(brand) = lower($1) and lower(name) = lower($2) order by active desc, id limit 1",
          [r.brand, r.name],
        );
        if (found[0]) {
          pid = found[0].id;
          await q(
            `update products set active = true,
               price = coalesce($2, price), cost = coalesce($3, cost) where id = $1`,
            [pid, r.price, r.cost],
          );
          summary.productsUpdated += 1;
        } else {
          pid = (
            await q<{ id: number }>(
              "insert into products (brand, name, price, cost) values ($1,$2,$3,$4) returning id",
              [r.brand, r.name, r.price ?? 0, r.cost ?? 0],
            )
          )[0].id;
          summary.productsCreated += 1;
        }
        cache.set(key, pid);
      } else if (r.price !== null || r.cost !== null) {
        await q("update products set price = coalesce($2, price), cost = coalesce($3, cost) where id = $1", [pid, r.price, r.cost]);
      }
      // Categories from the file are added to the product; existing ones are kept.
      await addProductCategories(q, pid, r.categories.map((c) => c.id));

      const existing = (
        await q<{ id: number; stock: number; reserved: number }>(
          "select id, stock, reserved from variants where product_id = $1 and lower(size) = lower($2)",
          [pid, r.size],
        )
      )[0];
      if (!existing) {
        const id = (await q<{ id: number }>("insert into variants (product_id, size, stock) values ($1,$2,0) returning id", [pid, r.size]))[0].id;
        if (r.stock > 0) await adjustVariantStock(q, id, r.stock, "import", { note: "Imported from file" });
        summary.sizesCreated += 1;
      } else {
        let target = mode === "add" ? existing.stock + r.stock : r.stock;
        if (target < existing.reserved) {
          summary.warnings.push(`Row ${r.line}: ${r.brand} ${r.name} size ${r.size} has ${existing.reserved} on hold, so stock was set to ${existing.reserved} instead of ${target}.`);
          target = existing.reserved;
        }
        if (target !== existing.stock)
          await adjustVariantStock(q, existing.id, target - existing.stock, "import", { note: "Imported from file" });
        summary.sizesUpdated += 1;
      }
    }
  });
  return summary;
}
