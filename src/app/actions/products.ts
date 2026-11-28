"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth";
import { setProductCategories } from "@/lib/categories";
import { sql, tx } from "@/lib/db";
import { toState, UserError, type ActionState } from "@/lib/errors";
import { adjustVariantStock } from "@/lib/inventory";
import { setFlash } from "@/lib/flash";
import { snapshotImage } from "@/lib/instagram";

const IMAGE_RE = /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/;

type VariantInput = { id?: number; size: string; stock: number };

function num(v: FormDataEntryValue | null, label: string, min = 0): number {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  if (!Number.isFinite(n) || n < min) throw new UserError(`${label} must be a number${min > 0 ? ` of at least ${min}` : ""}.`);
  return n;
}

export async function saveProductAction(_: ActionState, form: FormData): Promise<ActionState> {
  let target = "/inventory";
  try {
    await assertAdmin();
    const id = form.get("id") ? Number(form.get("id")) : null;
    const categoryIds = form.getAll("category_id").map(Number).filter((n) => Number.isInteger(n) && n > 0);
    if (categoryIds.length === 0) throw new UserError("Choose at least one category.");
    const name = String(form.get("name") ?? "").trim();
    if (!name) throw new UserError("Product name is required.");
    const brand = String(form.get("brand") ?? "").trim();
    const description = String(form.get("description") ?? "").trim().slice(0, 2000);
    const price = num(form.get("price"), "Price");
    const cost = num(form.get("cost") || "0", "Cost");
    const threshold = Math.floor(num(form.get("low_stock_threshold") || "2", "Low-stock level"));
    const postId = form.get("post_id") ? Number(form.get("post_id")) : null;

    let variants: VariantInput[] = [];
    try {
      variants = JSON.parse(String(form.get("variants") ?? "[]"));
    } catch {
      throw new UserError("Sizes could not be read.");
    }
    variants = variants
      .map((v) => ({ id: v.id ? Number(v.id) : undefined, size: String(v.size ?? "").trim(), stock: Math.floor(Number(v.stock) || 0) }))
      .filter((v) => v.size !== "");
    if (new Set(variants.map((v) => v.size.toLowerCase())).size !== variants.length)
      throw new UserError("Each size can only appear once.");
    if (variants.some((v) => v.stock < 0)) throw new UserError("Stock can't be negative.");

    let image: string | null | undefined;
    const rawImage = String(form.get("image") ?? "");
    if (form.get("remove_image") === "1") image = null;
    else if (rawImage) {
      if (IMAGE_RE.test(rawImage) && rawImage.length < 2_000_000) image = rawImage;
      else throw new UserError("That photo couldn't be used. Try a JPG or PNG.");
    }
    const importImageFromPost = form.get("use_post_image") === "1" && postId;

    const productId = await tx(async (q) => {
      let pid = id;
      if (pid) {
        const exists = await q("select id from products where id = $1", [pid]);
        if (!exists.length) throw new UserError("Product not found.");
        await q(
          `update products set brand=$2, name=$3, description=$4, price=$5, cost=$6, low_stock_threshold=$7 where id=$1`,
          [pid, brand, name, description, price, cost, threshold],
        );
      } else {
        pid = (
          await q<{ id: number }>(
            `insert into products (brand, name, description, price, cost, low_stock_threshold)
             values ($1,$2,$3,$4,$5,$6) returning id`,
            [brand, name, description, price, cost, threshold],
          )
        )[0].id;
      }
      await setProductCategories(q, pid as number, categoryIds);

      if (image !== undefined)
        await q("update products set image = $2, image_version = image_version + 1 where id = $1", [pid, image]);

      const current = await q<{ id: number; size: string; stock: number; reserved: number }>(
        "select id, size, stock, reserved from variants where product_id = $1",
        [pid],
      );
      const keepIds = new Set(variants.filter((v) => v.id).map((v) => v.id));
      for (const old of current.filter((c) => !keepIds.has(c.id))) {
        const used = await q("select 1 from orders where variant_id = $1 limit 1", [old.id]);
        if (used.length)
          throw new UserError(`Size ${old.size} has orders, so it can't be removed. Set its stock to 0 instead.`);
        await q("delete from variants where id = $1", [old.id]);
      }
      for (const v of variants) {
        const existing = v.id ? current.find((c) => c.id === v.id) : undefined;
        if (existing) {
          if (existing.size !== v.size) await q("update variants set size = $2 where id = $1", [existing.id, v.size]);
          const delta = v.stock - existing.stock;
          if (delta !== 0) await adjustVariantStock(q, existing.id, delta, "adjust", { note: "Edited on product page" });
        } else {
          const ins = await q<{ id: number }>(
            "insert into variants (product_id, size, stock) values ($1,$2,0) returning id",
            [pid, v.size],
          );
          if (v.stock > 0)
            await adjustVariantStock(q, ins[0].id, v.stock, "restock", { note: "Opening stock", unitCost: cost || null });
        }
      }

      if (postId) {
        await q("update ig_posts set status='linked', product_id=$2 where id=$1", [postId, pid]);
      }
      return pid as number;
    }).catch((e: unknown) => {
      if (e instanceof Error && /unique/i.test(e.message)) throw new UserError("Each size can only appear once.");
      throw e;
    });

    if (importImageFromPost && image === undefined) {
      const post = (await sql<{ media_url: string }>("select media_url from ig_posts where id = $1", [postId]))[0];
      const snap = post ? await snapshotImage(post.media_url) : null;
      if (snap) await sql("update products set image = $2, image_version = image_version + 1 where id = $1", [productId, snap]);
    }

    revalidatePath("/", "layout");
    await setFlash(id ? `${name} updated.` : `${name} created.`);
    target = postId ? "/posts?tab=linked" : id ? "/inventory" : `/products/${productId}`;
  } catch (e) {
    return toState(e);
  }
  redirect(target);
}

export async function adjustStockAction(variantId: number, delta: number): Promise<ActionState> {
  try {
    await assertAdmin();
    if (!Number.isInteger(delta) || Math.abs(delta) > 1000) throw new UserError("Invalid amount.");
    await tx((q) => adjustVariantStock(q, Number(variantId), delta, "adjust", { note: "Quick adjust" }));
    revalidatePath("/", "layout");
    return { ok: delta > 0 ? "Stock increased." : "Stock decreased." };
  } catch (e) {
    return toState(e);
  }
}

export async function restockAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await assertAdmin();
    const variantId = Number(form.get("variant_id"));
    const qty = Math.floor(num(form.get("qty"), "Quantity", 1));
    const costRaw = String(form.get("unit_cost") ?? "").trim();
    const unitCost = costRaw ? num(costRaw, "Unit cost") : null;
    const note = String(form.get("note") ?? "").trim().slice(0, 200);
    await tx(async (q) => {
      await adjustVariantStock(q, variantId, qty, "restock", { unitCost, note });
      if (unitCost !== null) {
        await q(
          "update products set cost = $2 where id = (select product_id from variants where id = $1)",
          [variantId, unitCost],
        );
      }
    });
    revalidatePath("/", "layout");
    return { ok: `Added ${qty} to stock.` };
  } catch (e) {
    return toState(e);
  }
}

export async function archiveProductAction(productId: number, active: boolean): Promise<ActionState> {
  try {
    await assertAdmin();
    await sql("update products set active = $2 where id = $1", [Number(productId), active]);
    revalidatePath("/", "layout");
    return { ok: active ? "Product restored." : "Product archived." };
  } catch (e) {
    return toState(e);
  }
}

export async function deleteProductAction(productId: number): Promise<ActionState> {
  try {
    await assertAdmin();
    const used = await sql("select 1 from orders where product_id = $1 limit 1", [Number(productId)]);
    if (used.length) throw new UserError("This product has orders, so it can't be deleted. Archive it instead.");
    await sql("delete from products where id = $1", [Number(productId)]);
    await setFlash("Product deleted.");
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/", "layout");
  redirect("/inventory");
}
