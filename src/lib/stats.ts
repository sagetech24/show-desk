import "server-only";
import { sql } from "./db";
import { listCategories } from "./categories";
import { getStoreSettings } from "./store-settings";

const SOLD_AT = `coalesce(o.paid_at, o.created_at)`;
const LOCAL_SOLD = `(${SOLD_AT} at time zone $1)`;

export type SalesWindow = { revenue: number; profit: number; orders: number; units: number };

async function salesSince(unit: "week" | "month", previous: boolean, timezone: string): Promise<SalesWindow> {
  const start = `date_trunc('${unit}', now() at time zone $1)`;
  const range = previous
    ? `${LOCAL_SOLD} >= ${start} - interval '1 ${unit}' and ${LOCAL_SOLD} < ${start}`
    : `${LOCAL_SOLD} >= ${start}`;
  const rows = await sql<SalesWindow>(
    `select coalesce(sum(o.qty * o.unit_price),0) as revenue,
            coalesce(sum(o.qty * (o.unit_price - p.cost)),0) as profit,
            count(*) as orders, coalesce(sum(o.qty),0) as units
       from orders o join products p on p.id = o.product_id
      where o.status in ('paid','completed') and ${range}`,
    [timezone],
  );
  return rows[0];
}

export async function dashboardStats(topPeriod: "30d" | "all") {
  const { timezone } = await getStoreSettings();
  const [totals] = await sql<{
    products: number;
    on_hand: number;
    available: number;
    cost_value: number;
    retail_value: number;
  }>(
    `select count(distinct p.id) as products,
            coalesce(sum(v.stock),0) as on_hand,
            coalesce(sum(v.stock - v.reserved),0) as available,
            coalesce(sum(v.stock * p.cost),0) as cost_value,
            coalesce(sum(v.stock * p.price),0) as retail_value
       from products p left join variants v on v.product_id = p.id where p.active`,
  );

  const lowRows = await sql<{
    product_id: number;
    name: string;
    brand: string;
    size: string;
    available: number;
    threshold: number;
    image_version: number;
    has_image: boolean;
  }>(
    `select p.id as product_id, p.name, p.brand, v.size, (v.stock - v.reserved) as available,
            p.low_stock_threshold as threshold, p.image_version, (p.image is not null) as has_image
       from variants v join products p on p.id = v.product_id
      where p.active and (v.stock - v.reserved) <= p.low_stock_threshold
      order by (v.stock - v.reserved), p.name, v.size`,
  );

  const [open] = await sql<{ n: number; units: number; value: number }>(
    `select count(*) as n, coalesce(sum(qty),0) as units, coalesce(sum(qty*unit_price),0) as value
       from orders where status = 'reserved'`,
  );
  const [toShip] = await sql<{ n: number }>(`select count(*) as n from orders where status = 'paid'`);

  const reservations = await sql<{
    id: number;
    customer_name: string;
    ig_handle: string;
    product_name: string;
    brand: string;
    size: string;
    qty: number;
    created_at: Date;
  }>(
    `select o.id, o.customer_name, o.ig_handle, p.name as product_name, p.brand, v.size, o.qty, o.created_at
       from orders o join products p on p.id = o.product_id join variants v on v.id = o.variant_id
      where o.status = 'reserved' order by o.created_at asc limit 6`,
  );

  const [week, prevWeek, month, prevMonth] = await Promise.all([
    salesSince("week", false, timezone),
    salesSince("week", true, timezone),
    salesSince("month", false, timezone),
    salesSince("month", true, timezone),
  ]);

  const weekly = await sql<{ week_start: string; revenue: number }>(
    `with weeks as (
       select generate_series(date_trunc('week', now() at time zone $1) - interval '7 weeks',
                              date_trunc('week', now() at time zone $1), interval '1 week') as w)
     select to_char(weeks.w, 'YYYY-MM-DD') as week_start,
            coalesce((select sum(o.qty * o.unit_price) from orders o
                       where o.status in ('paid','completed')
                         and date_trunc('week', ${LOCAL_SOLD}) = weeks.w), 0) as revenue
       from weeks order by weeks.w`,
    [timezone],
  );

  const periodFilter = topPeriod === "30d" ? `and ${SOLD_AT} >= now() - interval '30 days'` : "";
  // A product in several categories appears in the leaderboard of each one.
  const top = await sql<{
    category_id: number;
    product_id: number;
    name: string;
    brand: string;
    units: number;
    revenue: number;
    image_version: number;
    has_image: boolean;
  }>(
    `select * from (
       select c.id as category_id, p.id as product_id, p.name, p.brand, sum(o.qty) as units,
              sum(o.qty * o.unit_price) as revenue, p.image_version, (p.image is not null) as has_image,
              row_number() over (partition by c.id order by sum(o.qty) desc, sum(o.qty * o.unit_price) desc) as rn
         from orders o
         join products p on p.id = o.product_id
         join product_categories pc on pc.product_id = p.id
         join categories c on c.id = pc.category_id
        where o.status in ('paid','completed') ${periodFilter}
        group by c.id, p.id
     ) t where rn <= 3 order by category_id, rn`,
  );

  // Stock per category. A product in several categories counts in each, so these don't add up to the shop total.
  const byCategory = await sql<{ category_id: number; on_hand: number; available: number; products: number }>(
    `select c.id as category_id, coalesce(sum(v.stock),0) as on_hand, coalesce(sum(v.stock - v.reserved),0) as available,
            count(distinct p.id) as products
       from categories c
       left join product_categories pc on pc.category_id = c.id
       left join products p on p.id = pc.product_id and p.active
       left join variants v on v.product_id = p.id
      group by c.id`,
  );
  const categories = await listCategories();

  const [newPosts] = await sql<{ n: number }>(`select count(*) as n from ig_posts where status = 'new'`);

  return { totals, lowRows, open, toShip, reservations, week, prevWeek, month, prevMonth, weekly, top, byCategory, categories, newPosts: newPosts.n };
}
