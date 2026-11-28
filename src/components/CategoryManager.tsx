"use client";

import { useActionState, useEffect, useRef } from "react";
import { deleteCategoryAction, saveCategoryAction } from "@/app/actions/categories";
import { CATEGORY_COLOR_KEYS } from "@/lib/config";
import type { CategoryWithCount } from "@/lib/types";
import { ActionButton } from "./ActionButton";
import { useActionToast } from "./Toaster";
import { CategoryBadge, categoryStyle } from "./ui";

function CategoryForm({ category }: { category?: CategoryWithCount }) {
  const [state, action, pending] = useActionState(saveCategoryAction, undefined);
  useActionToast(state);
  const ref = useRef<HTMLFormElement>(null);
  const uid = category ? `c${category.id}` : "new";

  useEffect(() => {
    if (!category && state?.ok) ref.current?.reset();
  }, [state, category]);

  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      {category && <input type="hidden" name="id" value={category.id} />}
      <div>
        <label className="label" htmlFor={`${uid}-name`}>Name</label>
        <input id={`${uid}-name`} name="name" required maxLength={40} className="input" defaultValue={category?.name} placeholder="e.g. Basketball" />
      </div>
      <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : category ? "Save" : "Add category"}</button>
      <fieldset className="sm:col-span-2">
        <legend className="label">Colour</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLOR_KEYS.map((c, i) => (
            <label key={c} className="cursor-pointer">
              <input type="radio" name="color" value={c} defaultChecked={(category?.color ?? "sky") === c || (!category && i === 0)} className="peer sr-only" />
              <span className={`badge capitalize ring-2 ring-transparent peer-checked:ring-slate-500 peer-focus-visible:ring-brand-500 ${categoryStyle(c)}`}>{c}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </form>
  );
}

export function CategoryManager({ categories }: { categories: CategoryWithCount[] }) {
  return (
    <div className="space-y-5">
      <section className="card space-y-3 p-4 sm:p-5">
        <h2 className="font-semibold">Add a category</h2>
        <CategoryForm />
      </section>

      {categories.length === 0 ? (
        <p className="card p-6 text-center text-sm text-slate-500">No categories yet. Add your first one above.</p>
      ) : (
        <ul className="space-y-3">
          {categories.map((c) => (
            <li key={c.id}>
              <details className="card group p-4">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
                  <CategoryBadge category={c} />
                  <span className="text-sm text-slate-600">
                    {c.product_count} product{c.product_count === 1 ? "" : "s"}
                  </span>
                  <span className="ml-auto text-sm font-medium text-brand-600 group-open:hidden">Edit</span>
                </summary>
                <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                  <CategoryForm category={c} />
                  <ActionButton
                    className="btn btn-sm btn-danger"
                    confirm={
                      c.product_count > 0
                        ? `Delete "${c.name}"? Its ${c.product_count} product(s) are kept, they just lose this category.`
                        : `Delete "${c.name}"?`
                    }
                    action={() => deleteCategoryAction(c.id)}
                  >
                    Delete category
                  </ActionButton>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
