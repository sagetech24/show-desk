import Link from "next/link";
import { ImportForm } from "@/components/ImportForm";

export const metadata = { title: "Import / Export" };

const EXPORTS = [
  { type: "inventory", title: "Inventory", desc: "One row per product size: stock, held, available, price, cost." },
  { type: "sales", title: "Sales", desc: "Paid and completed orders. Good for KPI sheets." },
  { type: "orders", title: "All orders", desc: "Every order and reservation, including cancelled." },
];

export default function DataPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Import &amp; export</h1>
        <p className="text-sm text-slate-500">Move data in and out of Excel. Downloads open directly in Excel or Google Sheets.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Export</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {EXPORTS.map((e) => (
            <div key={e.type} className="card flex flex-col gap-3 p-4">
              <div>
                <p className="font-semibold">{e.title}</p>
                <p className="text-sm text-slate-500">{e.desc}</p>
              </div>
              <div className="mt-auto flex gap-2">
                <a className="btn btn-sm" href={`/api/export/${e.type}?format=xlsx`}>Excel (.xlsx)</a>
                <a className="btn btn-sm" href={`/api/export/${e.type}?format=csv`}>CSV</a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-4 p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-semibold">Import inventory</h2>
          <p className="text-sm text-slate-500">
            Upload your existing stock sheet. Needed columns: <code>category</code> and <code>name</code>. Recommended: <code>brand</code>, <code>size</code>, <code>stock</code>, <code>price</code>, <code>cost</code>. One row per size.
            Use the names of your <Link href="/categories" className="font-medium text-brand-600">categories</Link>. A shoe in several categories goes in one cell separated by <code>;</code> (e.g. <code>Running; Casual</code>). Importing adds categories to an existing product and never removes any.
          </p>
          <a href="/api/import" className="mt-1 inline-block text-sm font-medium text-brand-600">Download a CSV template</a>
        </div>
        <ImportForm />
      </section>
    </div>
  );
}
