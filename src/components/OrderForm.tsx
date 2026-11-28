"use client";

import { useActionState, useMemo, useState } from "react";
import { createOrderAction } from "@/app/actions/orders";
import { CATEGORY_LABEL, ORDER_STATUSES, type Category } from "@/lib/config";
import { useActionToast } from "./Toaster";

export type OrderProductOption = {
  id: number;
  label: string;
  category: Category;
  price: number;
  variants: { id: number; size: string; available: number }[];
};

const STATUS_HELP: Record<string, string> = {
  reserved: "Holds the pair for the customer. Stock is reserved until you mark it paid, complete it, or cancel.",
  paid: "Customer paid; the pair stays held until you hand it over / ship it.",
  completed: "Sold and handed over. Stock is deducted right away.",
  cancelled: "Record only. No stock is held.",
};

export function OrderForm({
  products,
  customers,
  initialProductId,
  initialVariantId,
  today,
  currency,
  locale,
}: {
  products: OrderProductOption[];
  customers: { name: string; handle: string }[];
  initialProductId?: number;
  initialVariantId?: number;
  today: string;
  currency: string;
  locale: string;
}) {
  const [state, action, pending] = useActionState(createOrderAction, undefined);
  useActionToast(state);
  const first = products.find((p) => p.id === initialProductId);
  const [productId, setProductId] = useState<number | "">(first?.id ?? "");
  const [variantId, setVariantId] = useState<number | "">(initialVariantId ?? "");
  const [price, setPrice] = useState<string>(first ? String(first.price) : "");
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState("reserved");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");

  const product = products.find((p) => p.id === productId);
  const variant = product?.variants.find((v) => v.id === variantId);
  const total = (Number(price) || 0) * qty;

  const grouped = useMemo(() => {
    const m = new Map<Category, OrderProductOption[]>();
    for (const p of products) m.set(p.category, [...(m.get(p.category) ?? []), p]);
    return [...m.entries()];
  }, [products]);

  function fillFromHandle(h: string) {
    setHandle(h);
    const match = customers.find((c) => c.handle.toLowerCase() === h.trim().toLowerCase() || c.handle.toLowerCase() === `@${h.trim().toLowerCase()}`);
    if (match && !name) setName(match.name);
  }

  return (
    <form action={action} className="space-y-5">
      <section className="card space-y-4 p-4 sm:p-5">
        <h2 className="font-semibold">Customer</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="customer_name">Name</label>
            <input id="customer_name" name="customer_name" className="input" value={name} onChange={(e) => setName(e.target.value)} list="cust-names" autoComplete="off" placeholder="e.g. Maria Santos" />
            <datalist id="cust-names">{customers.map((c) => <option key={c.handle + c.name} value={c.name} />)}</datalist>
          </div>
          <div>
            <label className="label" htmlFor="ig_handle">Instagram handle</label>
            <input id="ig_handle" name="ig_handle" className="input" value={handle} onChange={(e) => fillFromHandle(e.target.value)} list="cust-handles" autoComplete="off" placeholder="@mariasantos" />
            <datalist id="cust-handles">{customers.filter((c) => c.handle).map((c) => <option key={c.handle} value={c.handle} />)}</datalist>
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-4 sm:p-5">
        <h2 className="font-semibold">Item</h2>
        <div>
          <label className="label" htmlFor="product">Shoe</label>
          <select id="product" className="input" value={productId} required
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : "";
              setProductId(id);
              setVariantId("");
              const p = products.find((x) => x.id === id);
              if (p) setPrice(String(p.price));
            }}>
            <option value="">Choose a shoe…</option>
            {grouped.map(([cat, list]) => (
              <optgroup key={cat} label={CATEGORY_LABEL[cat]}>
                {list.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="variant_id">Size</label>
            <select id="variant_id" name="variant_id" required className="input" value={variantId} onChange={(e) => setVariantId(e.target.value ? Number(e.target.value) : "")} disabled={!product}>
              <option value="">{product ? "Choose size…" : "Pick a shoe first"}</option>
              {product?.variants.map((v) => (
                <option key={v.id} value={v.id}>US {v.size} ({v.available} left)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="qty">Quantity</label>
            <input id="qty" name="qty" type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className="input" inputMode="numeric" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="label" htmlFor="unit_price">Price each</label>
            <input id="unit_price" name="unit_price" type="number" min={0} step="any" required value={price} onChange={(e) => setPrice(e.target.value)} className="input" inputMode="decimal" />
          </div>
        </div>
        {variant && variant.available < qty && status !== "cancelled" && (
          <p className="rounded-lg bg-orange-50 p-2 text-sm text-orange-800">Only {variant.available} available in this size.</p>
        )}
      </section>

      <section className="card space-y-4 p-4 sm:p-5">
        <h2 className="font-semibold">Status</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ORDER_STATUSES.map((s) => (
            <label key={s} className={`cursor-pointer rounded-xl border px-3 py-2.5 text-center text-sm font-medium capitalize ${status === s ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-300 bg-white text-slate-700"}`}>
              <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} className="sr-only" />
              {s}
            </label>
          ))}
        </div>
        <p className="text-sm text-slate-500">{STATUS_HELP[status]}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="date">Date</label>
            <input id="date" name="date" type="date" defaultValue={today} max={today} className="input" />
            <p className="hint">Change it to log an older sale.</p>
          </div>
          <div>
            <label className="label" htmlFor="notes">Notes (optional)</label>
            <input id="notes" name="notes" className="input" placeholder="COD, GCash, meet-up…" />
          </div>
        </div>
      </section>

      <div className="sticky bottom-20 z-10 flex items-center justify-between gap-3 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur lg:static lg:bottom-auto lg:shadow-none lg:ring-0">
        <div className="text-sm"><span className="text-slate-500">Total</span> <strong className="text-lg">{new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 0 }).format(total)}</strong></div>
        <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save order"}</button>
      </div>
    </form>
  );
}
