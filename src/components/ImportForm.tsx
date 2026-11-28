"use client";

import { useRef, useState } from "react";
import { useToast } from "./Toaster";

type Preview = {
  rows: number;
  products: number;
  errors: string[];
  sample: { line: number; category: string; brand: string; name: string; size: string; stock: number; price: number | null }[];
};
type Summary = {
  productsCreated: number;
  productsUpdated: number;
  sizesCreated: number;
  sizesUpdated: number;
  warnings: string[];
  skipped: number;
  errors: string[];
};

export function ImportForm() {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"set" | "add">("set");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(commit: boolean) {
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("mode", mode);
    if (commit) fd.set("commit", "1");
    try {
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Import failed");
      if (commit) {
        setSummary(body.summary);
        const s: Summary = body.summary;
        toast.success(`Import finished: ${s.productsCreated} new, ${s.productsUpdated} updated products.`);
        setPreview(null);
        setFile(null);
        if (input.current) input.current.value = "";
      } else {
        setPreview(body.preview);
        toast.info(`File checked: ${body.preview.rows} rows ready to import.`);
        setSummary(null);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Import failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="file">Excel (.xlsx) or CSV file</label>
        <input
          id="file"
          ref={input}
          type="file"
          accept=".csv,.xlsx"
          className="input file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm"
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); setSummary(null); }}
        />
      </div>
      <fieldset className="space-y-2">
        <legend className="label">If a size already exists</legend>
        <label className="flex items-start gap-2 text-sm"><input type="radio" checked={mode === "set"} onChange={() => setMode("set")} className="mt-1" /> <span><strong>Replace</strong> the stock count with the number in the file (use for a stock-take)</span></label>
        <label className="flex items-start gap-2 text-sm"><input type="radio" checked={mode === "add"} onChange={() => setMode("add")} className="mt-1" /> <span><strong>Add</strong> the number to current stock (use for a delivery)</span></label>
      </fieldset>
      <button className="btn" disabled={!file || busy} onClick={() => send(false)}>{busy && !preview ? "Checking…" : "Check file"}</button>

      {preview && (
        <div className="space-y-3 rounded-xl border border-slate-200 p-3">
          <p className="text-sm"><strong>{preview.rows}</strong> rows → <strong>{preview.products}</strong> products ready to import{preview.errors.length ? <>, <span className="text-red-600">{preview.errors.length} problem row(s) will be skipped</span></> : null}.</p>
          {preview.sample.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-500"><tr><th className="py-1 pr-3">Category</th><th className="pr-3">Brand</th><th className="pr-3">Name</th><th className="pr-3">Size</th><th className="pr-3">Stock</th><th>Price</th></tr></thead>
                <tbody>
                  {preview.sample.map((r) => (
                    <tr key={r.line} className="border-t border-slate-100"><td className="py-1 pr-3 capitalize">{r.category}</td><td className="pr-3">{r.brand}</td><td className="pr-3">{r.name}</td><td className="pr-3">{r.size}</td><td className="pr-3">{r.stock}</td><td>{r.price ?? "–"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {preview.errors.length > 0 && (
            <ul className="list-inside list-disc text-xs text-red-700">{preview.errors.slice(0, 8).map((e) => <li key={e}>{e}</li>)}{preview.errors.length > 8 && <li>…and {preview.errors.length - 8} more</li>}</ul>
          )}
          <button className="btn btn-primary" disabled={busy || preview.rows === 0} onClick={() => send(true)}>{busy ? "Importing…" : `Import ${preview.rows} rows`}</button>
        </div>
      )}

      {summary && (
        <div role="status" className="space-y-1 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
          <p className="font-semibold">Import finished.</p>
          <p>{summary.productsCreated} new products, {summary.productsUpdated} updated · {summary.sizesCreated} new sizes, {summary.sizesUpdated} updated{summary.skipped ? ` · ${summary.skipped} rows skipped` : ""}.</p>
          {summary.warnings.map((w) => <p key={w} className="text-xs text-amber-800">{w}</p>)}
          <p><a href="/inventory" className="font-medium underline">View stock →</a></p>
        </div>
      )}
    </div>
  );
}
