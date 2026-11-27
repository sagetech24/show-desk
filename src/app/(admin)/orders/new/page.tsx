import { OrderForm, type OrderProductOption } from "@/components/OrderForm";
import { config } from "@/lib/config";
import { sql } from "@/lib/db";
import { available, listProducts } from "@/lib/inventory";

export const metadata = { title: "New order" };

export default async function NewOrder({ searchParams }: { searchParams: Promise<{ product?: string; variant?: string }> }) {
  const sp = await searchParams;
  const products = await listProducts();
  const options: OrderProductOption[] = products.map((p) => ({
    id: p.id,
    label: `${p.brand} ${p.name}`.trim(),
    category: p.category,
    price: p.price,
    variants: p.variants.map((v) => ({ id: v.id, size: v.size, available: available(v) })),
  }));
  const customers = await sql<{ name: string; handle: string }>(
    `select distinct on (lower(customer_name), lower(ig_handle)) customer_name as name, ig_handle as handle
       from orders order by lower(customer_name), lower(ig_handle) limit 500`,
  );
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: config.timezone }).format(new Date());
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="page-title">New order</h1>
        <p className="text-sm text-slate-500">Log a DM order, reservation or walk-in sale.</p>
      </div>
      <OrderForm
        products={options}
        customers={customers}
        initialProductId={sp.product ? Number(sp.product) : undefined}
        initialVariantId={sp.variant ? Number(sp.variant) : undefined}
        today={today}
        currency={config.currency}
        locale={config.locale}
      />
    </div>
  );
}
