"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { slugify } from "@/lib/categories";
import { CATEGORY_COLORS } from "@/lib/config";
import { sql } from "@/lib/db";
import { toState, UserError, type ActionState } from "@/lib/errors";

const isUnique = (e: unknown) => e instanceof Error && /unique|duplicate/i.test(e.message);

export async function saveCategoryAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await assertAdmin();
    const id = form.get("id") ? Number(form.get("id")) : null;
    const name = String(form.get("name") ?? "").trim().replace(/\s+/g, " ");
    if (!name) throw new UserError("Category name is required.");
    if (name.length > 40) throw new UserError("Category name is too long (40 characters max).");
    const color = String(form.get("color") ?? "slate");
    if (!Object.hasOwn(CATEGORY_COLORS, color)) throw new UserError("Choose a colour.");
    try {
      if (id) {
        const rows = await sql(
          "update categories set name = $2, color = $3 where id = $1 returning id",
          [id, name, color],
        );
        if (!rows.length) throw new UserError("Category not found.");
      } else {
        const base = slugify(name);
        if (!base) throw new UserError("Use letters or numbers in the category name.");
        const taken = new Set(
          (await sql<{ slug: string }>("select slug from categories where slug = $1 or slug like $2", [base, `${base}-%`])).map((r) => r.slug),
        );
        let slug = base;
        for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
        await sql(
          `insert into categories (slug, name, color, sort_order)
           values ($1,$2,$3, coalesce((select max(sort_order) from categories), 0) + 1)`,
          [slug, name, color],
        );
      }
    } catch (e) {
      if (isUnique(e)) throw new UserError(`You already have a category called "${name}".`);
      throw e;
    }
    revalidatePath("/", "layout");
    return { ok: id ? `${name} updated.` : `${name} added.` };
  } catch (e) {
    return toState(e);
  }
}

export async function deleteCategoryAction(id: number): Promise<ActionState> {
  try {
    await assertAdmin();
    // Products stay; they just lose this category tag (product_categories rows cascade).
    const rows = await sql<{ name: string }>("delete from categories where id = $1 returning name", [Number(id)]);
    if (!rows.length) throw new UserError("Category not found.");
    revalidatePath("/", "layout");
    return { ok: `${rows[0].name} deleted. Products in it were kept.` };
  } catch (e) {
    return toState(e);
  }
}
