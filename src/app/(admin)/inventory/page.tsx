import Link from "next/link";
import { StockStepper } from "@/components/StockStepper";
import { CategoryBadges, EmptyState, ProductThumb, StockBadge } from "@/components/ui";
import { listCategories } from "@/lib/categories";
import { getFormatter } from "@/lib/format";
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

const STATE_ACCENT = {
  ok: "border-l-transparent",
  low: "border-l-orange-400",
  out: "border-l-red-500",
} as const;

export default async function InventoryPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { formatMoney } = await getFormatter();
  const categories = await listCategories();
  const category = categories.find((c) => c.slug === sp.category);
  const all = await listProducts({
    category: category?.slug,
    q: sp.q,
    onlyArchived: sp.filter === "archived",
  });
  const summarized = all.map((p) => ({ p, s: productSummary(p) }));
  const rows = summarized.filter(({ s }) =>
    sp.filter === "low" ? s.state !== "ok" : sp.filter === "out" ? s.state === "out" : true,
  );

  const pairs = rows.reduce((n, r) => n + r.s.totalAvailable, 0);
  const held = rows.reduce((n, r) => n + r.s.totalReserved, 0);
  const lowCount = summarized.filter(({ s }) => s.state === "low").length;
  const outCount = summarized.filter(({ s }) => s.state === "out").length;
  const hasFilters = !!(category || sp.q || sp.filter);

  const chip = (active: boolean) =>
    `inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
      active
        ? "bg-brand-600 text-white shadow-sm"
        : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300"
    }`;
  const toggle = (value: string) => (sp.filter === value ? undefined : value);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Stock</h1>
          <p className="text-sm text-slate-500">Tap − / + on any size to adjust stock. Changes save instantly.</p>
        </div>
        <Link href="/products/new" className="btn btn-primary">+ Add product</Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryTile label="Products" value={rows.length} />
        <SummaryTile label="Pairs available" value={pairs} sub={held > 0 ? `${held} held for orders` : undefined} />
        <SummaryTile
          label="Low stock"
          value={lowCount}
          tone={lowCount > 0 ? "warn" : undefined}
          href={href(sp, { filter: "low" })}
        />
        <SummaryTile
          label="Out of stock"
          value={outCount}
          tone={outCount > 0 ? "bad" : undefined}
          href={href(sp, { filter: "out" })}
        />
      </div>

      {/* Sticky toolbar */}
      <div className="sticky top-[3.1rem] z-10 lg:top-0 -mx-4 space-y-3 bg-slate-100/95 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0">
        <form action="/inventory" role="search" className="flex gap-2">
          {category && <input type="hidden" name="category" value={category.slug} />}
          {sp.filter && <input type="hidden" name="filter" value={sp.filter} />}
          <div className="relative flex-1">
            <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="9" cy="9" r="6" />
              <path d="m14 14 3.5 3.5" />
            </svg>
            <input name="q" type="search" defaultValue={sp.q} placeholder="Search brand or name…" className="input pl-9" aria-label="Search products" />
          </div>
          <button className="btn">Search</button>
        </form>

        <nav aria-label="Filters" className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <Link href={href(sp, { category: undefined })} aria-current={!category ? "true" : undefined} className={chip(!category)}>All</Link>
          {categories.map((c) => (
            <Link key={c.id} href={href(sp, { category: c.slug })} aria-current={category?.id === c.id ? "true" : undefined} className={chip(category?.id === c.id)}>{c.name}</Link>
          ))}
          <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-slate-300" />
          <Link href={href(sp, { filter: toggle("low") })} aria-current={sp.filter === "low" ? "true" : undefined} className={chip(sp.filter === "low")}>Needs restock</Link>
          <Link href={href(sp, { filter: toggle("out") })} aria-current={sp.filter === "out" ? "true" : undefined} className={chip(sp.filter === "out")}>Out of stock</Link>
          <Link href={href(sp, { filter: toggle("archived") })} aria-current={sp.filter === "archived" ? "true" : undefined} className={chip(sp.filter === "archived")}>Archived</Link>
          {hasFilters && (
            <Link href="/inventory" className="ml-1 whitespace-nowrap text-sm font-medium text-brand-600 hover:underline">Clear all</Link>
          )}
        </nav>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No products found">
          {hasFilters ? "Nothing matches these filters." : "Add your first product to start tracking stock."}
          <div className="mt-4 flex justify-center gap-2">
            {hasFilters && <Link href="/inventory" className="btn">Clear filters</Link>}
            <Link href="/products/new" className="btn btn-primary">+ Add product</Link>
          </div>
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <section aria-label="Products" className="space-y-3">
              <div className="grid gap-3 xl:grid-cols-2">
                {rows.map(({ p, s }) => (
                  <article
                    key={p.id}
                    className={`card border-l-4 p-3 transition hover:shadow-md sm:p-4 ${STATE_ACCENT[s.state]} ${p.active ? "" : "opacity-75"}`}
                  >
                    <div className="flex items-start gap-3">
                      <Link href={`/products/${p.id}`} className="shrink-0" aria-label={`Edit ${p.brand} ${p.name}`}>
                        <ProductThumb id={p.id} has={!!p.image} version={p.image_version} className="h-16 w-16" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/products/${p.id}`} className="block truncate font-semibold hover:text-brand-700">
                          {p.brand} {p.name}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <CategoryBadges categories={p.categories} />
                          <StockBadge state={s.state} />
                          {!p.active && <span className="badge bg-slate-200 text-slate-600">Archived</span>}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          <span className="font-medium text-slate-900">{formatMoney(p.price)}</span>
                          <span className="mx-1.5 text-slate-300">·</span>
                          <span className="tabular-nums">{s.totalAvailable}</span> available
                          {s.totalReserved > 0 && <span className="text-amber-700"> · {s.totalReserved} held</span>}
                        </p>
                      </div>
                      <Link href={`/products/${p.id}`} className="btn btn-sm shrink-0">Edit</Link>
                    </div>
                    {p.variants.length > 0 ? (
                      <div className="mt-3 grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-3 2xl:grid-cols-4">
                        {p.variants.map((v) => (
                          <StockStepper key={v.id} variantId={v.id} size={v.size} stock={v.stock} reserved={v.reserved} threshold={p.low_stock_threshold} />
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500">
                        No sizes yet. <Link href={`/products/${p.id}`} className="font-medium text-brand-600 hover:underline">Add sizes</Link>
                      </p>
                    )}
                  </article>
                ))}
              </div>
          </section>
        </div>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  sub,
  tone,
  href,
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: "warn" | "bad";
  href?: string;
}) {
  const color = tone === "bad" ? "text-red-600" : tone === "warn" ? "text-orange-600" : "text-slate-900";
  const body = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </>
  );
  const cls = "card block px-3 py-2.5";
  return href && value > 0 ? (
    <Link href={href} className={`${cls} transition hover:border-slate-300 hover:shadow-md`}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
