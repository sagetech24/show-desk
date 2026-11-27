import Link from "next/link";
import { OrderActions } from "@/components/OrderActions";
import { CategoryBadge, EmptyState, ProductThumb, StatusBadge } from "@/components/ui";
import { ORDER_STATUSES } from "@/lib/config";
import { sql } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { listOrders } from "@/lib/orders";

export const metadata = { title: "Orders" };

type SP = { status?: string; q?: string };

const TABS: { key: string; label: string }[] = [
  { key: "reserved", label: "Reserved" },
  { key: "paid", label: "Paid" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const status = sp.status && (ORDER_STATUSES as readonly string[]).concat("all").includes(sp.status) ? sp.status : "reserved";
  const [orders, counts] = await Promise.all([
    listOrders({ status, q: sp.q }),
    sql<{ status: string; n: number }>("select status, count(*) as n from orders group by status"),
  ]);
  const count = (k: string) => (k === "all" ? counts.reduce((a, c) => a + c.n, 0) : (counts.find((c) => c.status === k)?.n ?? 0));
  const tabHref = (k: string) => `/orders?status=${k}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Orders &amp; reservations</h1>
          <p className="text-sm text-slate-500">Reserved and paid orders hold stock. Cancel to release it.</p>
        </div>
        <Link href="/orders/new" className="btn btn-primary">+ New order</Link>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <Link key={t.key} href={tabHref(t.key)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium ${status === t.key ? "bg-brand-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
            {t.label} <span className="opacity-70">{count(t.key)}</span>
          </Link>
        ))}
      </div>

      <form className="flex gap-2" action="/orders">
        <input type="hidden" name="status" value={status} />
        <input name="q" defaultValue={sp.q} placeholder="Search customer, @handle or shoe…" className="input" aria-label="Search orders" />
        <button className="btn">Search</button>
      </form>

      {orders.length === 0 ? (
        <EmptyState title="Nothing here">No {status === "all" ? "" : status} orders{sp.q ? " match your search" : " yet"}.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="card p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <ProductThumb id={o.product_id} has={o.has_image} version={o.image_version} className="h-14 w-14" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold">{o.customer_name}</span>
                    {o.ig_handle && (
                      <a href={`https://www.instagram.com/${o.ig_handle.slice(1)}/`} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:underline">{o.ig_handle}</a>
                    )}
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="mt-0.5 text-sm text-slate-700">
                    {o.qty}× <Link href={`/products/${o.product_id}`} className="hover:underline">{o.brand} {o.product_name}</Link> · size {o.size}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <CategoryBadge category={o.category} />
                    {formatDate(o.created_at)} · #{o.id}
                    {o.notes && <span className="italic">“{o.notes}”</span>}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-bold">{formatMoney(o.qty * o.unit_price)}</p>
                  {o.qty > 1 && <p className="text-xs text-slate-500">{formatMoney(o.unit_price)} ea</p>}
                </div>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3"><OrderActions id={o.id} status={o.status} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
