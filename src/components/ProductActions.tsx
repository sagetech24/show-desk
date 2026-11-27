"use client";

import { useActionState } from "react";
import { archiveProductAction, deleteProductAction, restockAction } from "@/app/actions/products";
import { ActionButton } from "./ActionButton";

export function RestockForm({ variants }: { variants: { id: number; size: string }[] }) {
  const [state, action, pending] = useActionState(restockAction, undefined);
  if (variants.length === 0) return <p className="text-sm text-slate-500">Add sizes first to record a purchase.</p>;
  return (
    <form action={action} className="grid grid-cols-2 gap-3">
      <div>
        <label className="label" htmlFor="rs-size">Size</label>
        <select id="rs-size" name="variant_id" className="input">{variants.map((v) => <option key={v.id} value={v.id}>US {v.size}</option>)}</select>
      </div>
      <div>
        <label className="label" htmlFor="rs-qty">Pairs bought</label>
        <input id="rs-qty" name="qty" type="number" min={1} defaultValue={1} required className="input" inputMode="numeric" />
      </div>
      <div>
        <label className="label" htmlFor="rs-cost">Cost each</label>
        <input id="rs-cost" name="unit_cost" type="number" min={0} step="any" className="input" inputMode="decimal" placeholder="optional" />
      </div>
      <div>
        <label className="label" htmlFor="rs-note">Note</label>
        <input id="rs-note" name="note" className="input" placeholder="Supplier, batch…" />
      </div>
      <div className="col-span-2">
        <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Add purchase to stock"}</button>
        {state?.ok && <span className="ml-3 text-sm text-emerald-700">{state.ok}</span>}
        {state?.error && <span role="alert" className="ml-3 text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

export function ProductDangerZone({ id, active }: { id: number; active: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton className="btn btn-sm" action={() => archiveProductAction(id, !active)}>
        {active ? "Archive product" : "Restore product"}
      </ActionButton>
      <ActionButton className="btn btn-sm btn-danger" confirm="Delete this product and its sizes? This can't be undone." action={() => deleteProductAction(id)}>
        Delete
      </ActionButton>
    </div>
  );
}
