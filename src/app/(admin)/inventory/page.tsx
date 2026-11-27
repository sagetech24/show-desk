import Link from "next/link";
import { StockStepper } from "@/components/StockStepper";
import { CategoryBadge, EmptyState, ProductThumb, StockBadge } from "@/components/ui";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/config";
import { formatMoney } from "@/lib/format";
import { listProducts, productSummary } from "@/lib/inventory";

export const metadata = { title: "Stock" };

type SP = { category?: string; q?: string; filter?: string };

function href(sp: SP, patch: Partial<SP>) {
  const next = { ...sp, ...patch };
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
  const s = p.toString();
  return `/inventory${s ? `?${s}` : ""}`;
}

export default async function InventoryPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const all = await listProducts({
    category: CATEGORIES.includes(sp.category as never) ? sp.category : undefined,
    q: sp.q,
    onlyArchived: sp.filter === "archived",
  });
  const rows = all
    .map((p) => ({ p, s: productSummary(p) }))
    .filter(({ s }) => (sp.filter === "low" ? s.state !== "ok" : sp.filter === "out" ? s.state === "out" : true));
  const pairs = rows.reduce((n, r) => n + r.s.totalAvailable, 0);

  const chip = (active: boolean) =>
    `whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium ${active ? "bg-brand-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Stock</h1>
          <p className="text-sm text-slate-500">{rows.length} products · {pairs} pairs available. Tap − / + to adjust quickly.</p>
        </div>
        <Link href="/products/new" className="btn btn-primary">+ Add product</Link>
      </div>

      <form action="/inventory" className="flex gap-2">
        {sp.category && <input type="hidden" name="category" value={sp.category} />}
        {sp.filter && <input type="hidden" name="filter" value={sp.filter} />}
        <input name="q" defaultValue={sp.q} placeholder="Search brand or name…" className="input" aria-label="Search" />
        <button className="btn">Search</button>
      </form>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Link href={href(sp, { category: undefined })} className={chip(!sp.category)}>All</Link>
        {CATEGORIES.map((c) => (
          <Link key={c} href={href(sp, { category: c })} className={chip(sp.category === c)}>{CATEGORY_LABEL[c]}</Link>
        ))}
        <span className="mx-1 hidden w-px bg-slate-300 sm:block" />
        <Link href={href(sp, { filter: sp.filter === "low" ? undefined : "low" })} className={chip(sp.filter === "low")}>Low / out</Link>
        <Link href={href(sp, { filter: sp.filter === "archived" ? undefined : "archived" })} className={chip(sp.filter === "archived")}>Archived</Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No products found">Try a different filter, or add a product.</EmptyState>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {rows.map(({ p, s }) => (
            <article key={p.id} className="card p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <Link href={`/products/${p.id}`}><ProductThumb id={p.id} has={!!p.image} version={p.image_version} className="h-16 w-16" /></Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${p.id}`} className="block truncate font-semibold hover:text-brand-700">{p.brand} {p.name}</Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <CategoryBadge category={p.category} />
                    <StockBadge state={s.state} />
                    {!p.active && <span className="badge bg-slate-200 text-slate-600">Archived</span>}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{formatMoney(p.price)} · {s.totalAvailable} available</p>
                </div>
                <Link href={`/products/${p.id}`} className="btn btn-sm">Edit</Link>
              </div>
              {p.variants.length > 0 ? (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6 xl:grid-cols-3 2xl:grid-cols-6">
                  {p.variants.map((v) => (
                    <StockStepper key={v.id} variantId={v.id} size={v.size} stock={v.stock} reserved={v.reserved} threshold={p.low_stock_threshold} />
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">No sizes yet. <Link href={`/products/${p.id}`} className="text-brand-600">Add sizes</Link></p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
