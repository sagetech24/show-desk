import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/ProductForm";
import { ProductDangerZone, RestockForm } from "@/components/ProductActions";
import { StatusBadge } from "@/components/ui";
import type { OrderStatus } from "@/lib/config";
import { sql } from "@/lib/db";
import { getFormatter } from "@/lib/format";
import { getProduct } from "@/lib/inventory";
import type { IgPost } from "@/lib/types";

export const metadata = { title: "Edit product" };

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const product = await getProduct(Number((await params).id));
  if (!product) notFound();
  const { formatDate, formatMoney } = await getFormatter();

  const [posts, movements, orders] = await Promise.all([
    sql<IgPost>("select * from ig_posts where product_id = $1 order by posted_at desc nulls last", [product.id]),
    sql<{ id: number; created_at: Date; size: string; delta: number; reason: string; unit_cost: number | null; note: string }>(
      `select m.id, m.created_at, v.size, m.delta, m.reason, m.unit_cost, m.note
         from stock_movements m join variants v on v.id = m.variant_id
        where v.product_id = $1 order by m.created_at desc, m.id desc limit 12`,
      [product.id],
    ),
    sql<{ id: number; customer_name: string; ig_handle: string; size: string; qty: number; status: OrderStatus; created_at: Date; unit_price: number }>(
      `select o.id, o.customer_name, o.ig_handle, v.size, o.qty, o.status, o.created_at, o.unit_price
         from orders o join variants v on v.id = o.variant_id where o.product_id = $1
        order by o.created_at desc limit 8`,
      [product.id],
    ),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/inventory" className="text-sm text-slate-500 hover:text-slate-800">← Back to stock</Link>
          <h1 className="page-title">{product.brand} {product.name}</h1>
          {!product.active && <span className="badge bg-slate-200 text-slate-600">Archived</span>}
        </div>
        <Link
          href={`/orders/new?product=${product.id}`}
          className="btn btn-primary"
        >
          + New order for this shoe
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ProductForm
          initial={{
            id: product.id,
            category: product.category,
            brand: product.brand,
            name: product.name,
            description: product.description,
            price: product.price,
            cost: product.cost,
            low_stock_threshold: product.low_stock_threshold,
            imageSrc: product.image ? `/api/img/product/${product.id}?v=${product.image_version}` : null,
            variants: product.variants.map((v) => ({ id: v.id, size: v.size, stock: v.stock, reserved: v.reserved })),
          }}
        />

        <div className="space-y-5">
          <section className="card space-y-3 p-4">
            <h2 className="font-semibold">Record a purchase (restock)</h2>
            <p className="text-xs text-slate-500">Use this when you buy more pairs from your supplier. Stock goes up and the purchase is logged.</p>
            <RestockForm variants={product.variants.map((v) => ({ id: v.id, size: v.size }))} />
          </section>

          <section className="card p-4">
            <h2 className="mb-2 font-semibold">Instagram posts ({posts.length})</h2>
            {posts.length === 0 ? (
              <p className="text-sm text-slate-500">No posts linked. Link one from the <Link href="/posts" className="text-brand-600">Posts inbox</Link>.</p>
            ) : (
              <ul className="space-y-2">
                {posts.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.media_url && <img src={p.media_url.startsWith("data:") ? `/api/img/post/${p.id}` : p.media_url} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                    <span className="line-clamp-2 min-w-0 flex-1 text-slate-600">{p.caption || "(no caption)"}</span>
                    {p.permalink && <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-medium text-brand-600">Open ↗</a>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-4">
            <h2 className="mb-2 font-semibold">Recent orders</h2>
            {orders.length === 0 ? <p className="text-sm text-slate-500">No orders yet.</p> : (
              <ul className="divide-y divide-slate-100 text-sm">
                {orders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="min-w-0 truncate">{o.customer_name} · {o.qty}× size {o.size}<span className="block text-xs text-slate-400">{formatDate(o.created_at)} · {formatMoney(o.unit_price * o.qty)}</span></span>
                    <StatusBadge status={o.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-4">
            <h2 className="mb-2 font-semibold">Stock history</h2>
            {movements.length === 0 ? <p className="text-sm text-slate-500">Nothing yet.</p> : (
              <ul className="divide-y divide-slate-100 text-sm">
                {movements.map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-1.5">
                    <span>Size {m.size} · <span className="capitalize">{m.reason}</span>{m.note ? ` (${m.note})` : ""}<span className="block text-xs text-slate-400">{formatDate(m.created_at, true)}</span></span>
                    <span className={m.delta > 0 ? "font-semibold text-emerald-600" : "font-semibold text-slate-700"}>{m.delta > 0 ? "+" : ""}{m.delta}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <ProductDangerZone id={product.id} active={product.active} />
        </div>
      </div>
    </div>
  );
}
