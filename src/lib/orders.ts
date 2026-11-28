import "server-only";
import { sql, tx, type Q } from "./db";
import { UserError } from "./errors";
import type { OrderStatus } from "./config";
import type { Order, OrderView, Variant } from "./types";

const effect = (status: OrderStatus, qty: number) => ({
  hold: status === "reserved" || status === "paid" ? qty : 0,
  deduct: status === "completed" ? qty : 0,
});

async function applyStockEffect(
  q: Q,
  variantId: number,
  oldS: OrderStatus | null,
  newS: OrderStatus,
  qty: number,
) {
  const o = oldS ? effect(oldS, qty) : { hold: 0, deduct: 0 };
  const n = effect(newS, qty);
  const dh = n.hold - o.hold;
  const dd = n.deduct - o.deduct;
  if (dh === 0 && dd === 0) return;
  const v = (await q<Variant>("select * from variants where id = $1 for update", [variantId]))[0];
  if (!v) throw new UserError("That size no longer exists.");
  const stock = v.stock - dd;
  const reserved = v.reserved + dh;
  if (stock < 0 || reserved > stock || reserved < 0) {
    const free = v.stock - v.reserved;
    throw new UserError(`Not enough stock for size ${v.size}: only ${Math.max(0, free)} available.`);
  }
  await q("update variants set stock = $2, reserved = $3 where id = $1", [variantId, stock, reserved]);
  if (dd !== 0)
    await q("insert into stock_movements (variant_id, delta, reason, note) values ($1,$2,$3,$4)", [
      variantId,
      -dd,
      dd > 0 ? "sale" : "sale reversed",
      "",
    ]);
}

export type NewOrder = {
  customer_name: string;
  ig_handle: string;
  variant_id: number;
  qty: number;
  unit_price: number;
  status: OrderStatus;
  notes: string;
  date?: Date;
};

export async function createOrder(input: NewOrder): Promise<number> {
  return tx(async (q) => {
    const v = (
      await q<{ product_id: number }>("select product_id from variants where id = $1", [input.variant_id])
    )[0];
    if (!v) throw new UserError("Choose a product and size.");
    const when = input.date ?? new Date();
    const paid = input.status === "paid" || input.status === "completed" ? when : null;
    const completed = input.status === "completed" ? when : null;
    const cancelled = input.status === "cancelled" ? when : null;
    await applyStockEffect(q, input.variant_id, null, input.status, input.qty);
    const rows = await q<{ id: number }>(
      `insert into orders (customer_name, ig_handle, product_id, variant_id, qty, unit_price, status, notes, created_at, paid_at, completed_at, cancelled_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning id`,
      [
        input.customer_name,
        input.ig_handle,
        v.product_id,
        input.variant_id,
        input.qty,
        input.unit_price,
        input.status,
        input.notes,
        when,
        paid,
        completed,
        cancelled,
      ],
    );
    return rows[0].id;
  });
}

export async function setOrderStatus(orderId: number, status: OrderStatus): Promise<void> {
  await tx(async (q) => {
    const o = (await q<Order>("select * from orders where id = $1 for update", [orderId]))[0];
    if (!o) throw new UserError("Order not found.");
    if (o.status === status) return;
    await applyStockEffect(q, o.variant_id, o.status, status, o.qty);
    await q(
      `update orders set status = $2,
         paid_at = case when $2 in ('paid','completed') then coalesce(paid_at, now()) else paid_at end,
         completed_at = case when $2 = 'completed' then now() else null end,
         cancelled_at = case when $2 = 'cancelled' then now() else null end
       where id = $1`,
      [orderId, status],
    );
  });
}

export async function listOrders(opts: { status?: string; q?: string; limit?: number } = {}): Promise<OrderView[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.status && opts.status !== "all") {
    params.push(opts.status);
    where.push(`o.status = $${params.length}`);
  }
  if (opts.q?.trim()) {
    params.push(`%${opts.q.trim()}%`);
    where.push(`(o.customer_name ilike $${params.length} or o.ig_handle ilike $${params.length} or p.name ilike $${params.length} or p.brand ilike $${params.length})`);
  }
  return sql<OrderView>(
    `select o.*, p.name as product_name, p.brand, v.size,
            coalesce((select json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name, 'color', c.color) order by c.sort_order, lower(c.name))
                        from product_categories pc join categories c on c.id = pc.category_id
                       where pc.product_id = p.id), '[]'::json) as categories,
            (p.image is not null) as has_image, p.image_version
       from orders o join products p on p.id = o.product_id join variants v on v.id = o.variant_id
       ${where.length ? "where " + where.join(" and ") : ""}
       order by case o.status when 'reserved' then 0 when 'paid' then 1 else 2 end, o.created_at desc, o.id desc
       limit ${Math.min(opts.limit ?? 300, 2000)}`,
    params,
  );
}
