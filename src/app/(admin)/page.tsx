import Link from "next/link";
import { SampleButton } from "@/components/SampleButton";
import { CategoryBadge, EmptyState, ProductThumb, Stat } from "@/components/ui";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/config";
import { getFormatter } from "@/lib/format";
import { dashboardStats, type SalesWindow } from "@/lib/stats";

export const metadata = { title: "Home" };

function delta(cur: number, prev: number) {
  if (prev === 0) return cur > 0 ? "new" : "–";
  const d = ((cur - prev) / prev) * 100;
  return `${d >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(d))}%`;
}

function Sales({
  label,
  w,
  prev,
  period,
  formatMoney,
}: {
  label: string;
  w: SalesWindow;
  prev: SalesWindow;
  period: string;
  formatMoney: (n: number) => string;
}) {
  return (
    <Stat
      label={label}
      value={formatMoney(w.revenue)}
      sub={
        <>
          {w.units} pair{w.units === 1 ? "" : "s"} · {w.orders} order{w.orders === 1 ? "" : "s"} ·{" "}
          <span className={w.revenue >= prev.revenue ? "text-emerald-600" : "text-red-600"}>{delta(w.revenue, prev.revenue)} vs {period}</span>
          <br />
          Est. profit {formatMoney(w.profit)}
        </>
      }
    />
  );
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ top?: string }> }) {
  const sp = await searchParams;
  const top = sp.top === "all" ? "all" : "30d";
  const [s, { formatMoney, timeAgo }] = await Promise.all([dashboardStats(top), getFormatter()]);

  if (s.totals.products === 0) {
    return (
      <div className="space-y-4">
        <h1 className="page-title">Welcome</h1>
        <EmptyState title="Your shop is empty">
          Add your first product, import your Excel stock list, or load sample data to look around.
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/products/new" className="btn btn-primary">Add a product</Link>
            <Link href="/data" className="btn">Import from Excel/CSV</Link>
            <SampleButton />
          </div>
        </EmptyState>
      </div>
    );
  }

  const maxWeek = Math.max(1, ...s.weekly.map((w) => w.revenue));
  const lowOnly = s.lowRows.filter((r) => r.available > 0);
  const outCount = s.lowRows.filter((r) => r.available <= 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="page-title">Home</h1>
        <div className="flex gap-2">
          <Link href="/orders/new" className="btn btn-primary">+ New order</Link>
          <Link href="/products/new" className="btn">+ Product</Link>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pairs in stock" value={s.totals.on_hand} sub={`${s.totals.available} available · ${s.totals.on_hand - s.totals.available} on hold`} />
        <Stat label="Stock value" value={formatMoney(s.totals.cost_value)} sub={`Retail ${formatMoney(s.totals.retail_value)} · ${s.totals.products} products`} />
        <Link href="/inventory?filter=low" className="block"><Stat label="Low stock sizes" value={lowOnly.length} tone={lowOnly.length ? "warn" : undefined} sub={`${outCount} sold out`} /></Link>
        <Link href="/orders?status=reserved" className="block"><Stat label="Open reservations" value={s.open.n} sub={`${s.open.units} pairs · ${formatMoney(s.open.value)}${s.toShip.n ? ` · ${s.toShip.n} paid to ship` : ""}`} /></Link>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <Sales label="Sales this week" w={s.week} prev={s.prevWeek} period="last week" formatMoney={formatMoney} />
        <Sales label="Sales this month" w={s.month} prev={s.prevMonth} period="last month" formatMoney={formatMoney} />
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Weekly sales (last 8 weeks)</h2>
        <div className="flex h-36 items-end gap-2 sm:gap-3" role="img" aria-label="Weekly sales bar chart">
          {s.weekly.map((w, i) => (
            <div key={w.week_start} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] font-medium text-slate-500">{w.revenue ? `${Math.round(w.revenue / 1000)}k` : ""}</span>
              <div
                className={`w-full rounded-t-md ${i === s.weekly.length - 1 ? "bg-brand-600" : "bg-brand-500/40"}`}
                style={{ height: `${Math.max(2, (w.revenue / maxWeek) * 100)}%` }}
                title={`${w.week_start}: ${formatMoney(w.revenue)}`}
              />
              <span className="text-[10px] text-slate-400">{w.week_start.slice(5)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Low stock</h2>
            <Link href="/inventory?filter=low" className="text-xs font-medium text-brand-600">See all</Link>
          </div>
          {s.lowRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Everything is well stocked.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {s.lowRows.slice(0, 8).map((r) => (
                <li key={`${r.product_id}-${r.size}`}>
                  <Link href={`/products/${r.product_id}`} className="flex items-center gap-3 py-2">
                    <ProductThumb id={r.product_id} has={r.has_image} version={r.image_version} className="h-10 w-10" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.brand} {r.name}</p>
                      <p className="text-xs text-slate-500">Size {r.size}</p>
                    </div>
                    <span className={`badge ${r.available <= 0 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-800"}`}>
                      {r.available <= 0 ? "Sold out" : `${r.available} left`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Open reservations</h2>
            <Link href="/orders?status=reserved" className="text-xs font-medium text-brand-600">See all</Link>
          </div>
          {s.reservations.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No open reservations.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {s.reservations.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.customer_name} <span className="font-normal text-slate-500">{r.ig_handle}</span></p>
                    <p className="truncate text-xs text-slate-500">{r.qty}× {r.brand} {r.product_name} · size {r.size}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{timeAgo(r.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Top sellers by category</h2>
          <div className="flex gap-1 rounded-xl bg-white p-1 text-xs font-medium shadow-sm ring-1 ring-slate-200">
            <Link href="/?top=30d" className={`rounded-lg px-3 py-1.5 ${top === "30d" ? "bg-brand-600 text-white" : "text-slate-600"}`}>Last 30 days</Link>
            <Link href="/?top=all" className={`rounded-lg px-3 py-1.5 ${top === "all" ? "bg-brand-600 text-white" : "text-slate-600"}`}>All time</Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {CATEGORIES.map((c) => {
            const items = s.top.filter((t) => t.category === c);
            const cat = s.byCategory.find((b) => b.category === c);
            return (
              <div key={c} className="card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <CategoryBadge category={c} />
                  <span className="text-xs text-slate-500">{cat?.available ?? 0} in stock</span>
                </div>
                {items.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-400">No {CATEGORY_LABEL[c].toLowerCase()} sales yet</p>
                ) : (
                  <ol className="space-y-2">
                    {items.map((t, i) => (
                      <li key={t.product_id}>
                        <Link href={`/products/${t.product_id}`} className="flex items-center gap-2">
                          <span className="w-4 text-sm font-bold text-slate-400">{i + 1}</span>
                          <ProductThumb id={t.product_id} has={t.has_image} version={t.image_version} className="h-9 w-9" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{t.brand} {t.name}</span>
                            <span className="block text-xs text-slate-500">{t.units} sold · {formatMoney(t.revenue)}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {s.newPosts > 0 && (
        <Link href="/posts" className="card flex items-center justify-between p-4 hover:bg-slate-50">
          <span className="text-sm"><strong>{s.newPosts}</strong> Instagram post{s.newPosts === 1 ? "" : "s"} waiting in your Posts inbox</span>
          <span className="text-sm font-medium text-brand-600">Review →</span>
        </Link>
      )}
    </div>
  );
}
