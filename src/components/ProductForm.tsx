"use client";

import { useActionState, useState } from "react";
import { saveProductAction } from "@/app/actions/products";
import { CATEGORIES, CATEGORY_LABEL, DEFAULT_SIZES, type Category } from "@/lib/config";
import { ImagePicker } from "./ImagePicker";
import { useActionToast } from "./Toaster";

type VariantState = { id?: number; size: string; stock: number; reserved: number };

export type ProductFormInitial = {
  id?: number;
  category: Category;
  brand: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  low_stock_threshold: number;
  imageSrc?: string | null;
  variants: VariantState[];
};

export function ProductForm({
  initial,
  post,
}: {
  initial: ProductFormInitial;
  post?: { id: number; image: string; hasImportableImage: boolean };
}) {
  const [state, action, pending] = useActionState(saveProductAction, undefined);
  useActionToast(state);
  const [category, setCategory] = useState<Category>(initial.category);
  const [variants, setVariants] = useState<VariantState[]>(initial.variants);

  const addSizes = () => {
    const have = new Set(variants.map((v) => v.size));
    setVariants([
      ...variants,
      ...DEFAULT_SIZES[category].filter((s) => !have.has(s)).map((size) => ({ size, stock: 0, reserved: 0 })),
    ]);
  };

  return (
    <form action={action} className="space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {post && <input type="hidden" name="post_id" value={post.id} />}
      <input type="hidden" name="variants" value={JSON.stringify(variants)} />

      <section className="card space-y-4 p-4 sm:p-5">
        <h2 className="font-semibold">Details</h2>
        {post && (
          <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-3 text-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {post.image && <img src={post.image} alt="" className="h-14 w-14 rounded-lg object-cover" />}
            <div>
              <p className="font-medium text-brand-700">Created from an Instagram post</p>
              <p className="text-xs text-slate-600">We guessed the fields from the caption. Please check them.</p>
              {post.hasImportableImage && (
                <label className="mt-1 flex items-center gap-1.5 text-xs">
                  <input type="checkbox" name="use_post_image" value="1" defaultChecked /> Use the post photo as product photo
                </label>
              )}
            </div>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="category">Category</label>
            <select id="category" name="category" className="input" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="brand">Brand</label>
            <input id="brand" name="brand" className="input" defaultValue={initial.brand} placeholder="e.g. Nike" list="brands" />
            <datalist id="brands">
              {["Nike", "Adidas", "ASICS", "Yonex", "Li-Ning", "Victor", "Wilson", "Babolat", "HEAD", "New Balance", "Hoka", "Brooks", "Mizuno", "Converse", "Vans", "Puma"].map((b) => <option key={b} value={b} />)}
            </datalist>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="name">Product name</label>
          <input id="name" name="name" required className="input" defaultValue={initial.name} placeholder="e.g. Pegasus 41" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="price">Selling price</label>
            <input id="price" name="price" type="number" inputMode="decimal" min={0} step="any" required className="input" defaultValue={initial.price || ""} />
          </div>
          <div>
            <label className="label" htmlFor="cost">Your cost</label>
            <input id="cost" name="cost" type="number" inputMode="decimal" min={0} step="any" className="input" defaultValue={initial.cost || ""} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="label" htmlFor="low">Low-stock level</label>
            <input id="low" name="low_stock_threshold" type="number" inputMode="numeric" min={0} className="input" defaultValue={initial.low_stock_threshold} />
            <p className="hint">Flag a size at or below this many pairs.</p>
          </div>
        </div>
        <ImagePicker currentSrc={initial.imageSrc} allowRemove={!!initial.id} />
        <div>
          <label className="label" htmlFor="description">Notes (optional)</label>
          <textarea id="description" name="description" rows={2} className="input" defaultValue={initial.description} />
        </div>
      </section>

      <section className="card space-y-3 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Sizes &amp; stock</h2>
          <button type="button" className="btn btn-sm" onClick={addSizes}>+ Add {CATEGORY_LABEL[category].toLowerCase()} sizes</button>
        </div>
        {variants.length === 0 && <p className="text-sm text-slate-500">No sizes yet. Add the common sizes, or add one at a time.</p>}
        <div className="space-y-2">
          {variants.map((v, i) => (
            <div key={v.id ?? `new-${i}`} className="flex items-center gap-2">
              <div className="w-24">
                <input aria-label="Size" className="input" value={v.size} placeholder="Size"
                  onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, size: e.target.value } : x)))} />
              </div>
              <div className="flex-1">
                <input aria-label={`Stock for size ${v.size}`} type="number" inputMode="numeric" min={v.reserved} className="input" value={v.stock}
                  onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, stock: Number(e.target.value) } : x)))} />
              </div>
              <span className="w-16 text-xs text-slate-500">{v.reserved > 0 ? `${v.reserved} held` : "pairs"}</span>
              <button type="button" aria-label={`Remove size ${v.size}`} className="btn btn-sm btn-danger" onClick={() => setVariants(variants.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-sm" onClick={() => setVariants([...variants, { size: "", stock: 0, reserved: 0 }])}>+ Add one size</button>
      </section>

      <div className="flex gap-2">
        <button className="btn btn-primary flex-1 sm:flex-none" disabled={pending}>{pending ? "Saving…" : initial.id ? "Save changes" : "Create product"}</button>
      </div>
    </form>
  );
}
