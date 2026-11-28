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
  const state = avail <= 0 ? "out" : avail <= threshold ? "low" : "ok";
  const tone = {
    out: "border-red-200 bg-red-50",
    low: "border-orange-200 bg-orange-50",
    ok: "border-slate-200 bg-white",
  }[state];
  const numColor = { out: "text-red-600", low: "text-orange-600", ok: "text-slate-900" }[state];
  const btn =
    "flex h-6 w-6 shrink-0 items-center border border-slate-200 justify-center items-center rounded-lg bg-white text-lg font-semibold leading-none text-slate-700 transition hover:bg-slate-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white";

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
    <div className={`rounded-xl border p-2 text-center transition-colors ${tone}`}>
      <div className="flex items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        US {size}
        {state !== "ok" && (
          <span className={`rounded px-1 text-[9px] ${state === "out" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
            {state === "out" ? "OUT" : "LOW"}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-1 mt-2">
        <button type="button" aria-label={`Remove one from size ${size}`} disabled={pending || avail <= 0} onClick={() => change(-1)} className={btn}>−</button>
        <div className="min-w-0 flex-1 mt-3" aria-live="polite">
          <div className={`text-xl font-bold leading-none tabular-nums ${numColor}`}>{avail}</div>
          <div className="mt-1 h-3 text-[10px] leading-3 text-amber-700">{reserved > 0 ? `+${reserved} held` : ""}</div>
        </div>
        <button type="button" aria-label={`Add one to size ${size}`} disabled={pending} onClick={() => change(1)} className={btn}>+</button>
      </div>
    </div>
  );
}
