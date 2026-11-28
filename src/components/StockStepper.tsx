"use client";

import { useEffect, useState, useTransition } from "react";
import { adjustStockAction } from "@/app/actions/products";
import { useToast } from "./Toaster";

export function StockStepper({
  variantId,
  size,
  stock,
  reserved,
  threshold,
}: {
  variantId: number;
  size: string;
  stock: number;
  reserved: number;
  threshold: number;
}) {
  const [value, setValue] = useState(stock);
  const toast = useToast();
  const [pending, start] = useTransition();
  useEffect(() => setValue(stock), [stock]);

  const avail = value - reserved;
  const tone = avail <= 0 ? "border-red-200 bg-red-50" : avail <= threshold ? "border-orange-200 bg-orange-50" : "border-slate-200 bg-white";

  function change(delta: number) {
    const prev = value;
    setValue(prev + delta);
    start(async () => {
      const r = await adjustStockAction(variantId, delta);
      if (r?.error) {
        setValue(prev);
        toast.error(r.error);
      } else {
        // Same id per size, so rapid +/- taps update one toast instead of stacking.
        toast.success(`US ${size} stock ${delta > 0 ? "increased" : "decreased"}.`, { id: `stock-${variantId}` });
      }
    });
  }

  return (
    <div className={`rounded-xl border p-2 text-center ${tone}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">US {size}</div>
      <div className="my-1 flex items-center justify-between gap-1">
        <button type="button" aria-label={`Remove one from size ${size}`} disabled={pending || avail <= 0} onClick={() => change(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 active:scale-95 disabled:opacity-40">−</button>
        <div className="min-w-0 flex-1">
          <div className={`text-xl font-bold leading-none ${avail <= 0 ? "text-red-600" : "text-slate-900"}`}>{avail}</div>
          {reserved > 0 && <div className="mt-0.5 text-[10px] text-amber-700">+{reserved} held</div>}
        </div>
        <button type="button" aria-label={`Add one to size ${size}`} disabled={pending} onClick={() => change(1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 active:scale-95 disabled:opacity-40">+</button>
      </div>
    </div>
  );
}
