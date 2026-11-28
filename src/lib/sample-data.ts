import "server-only";
import { tx } from "./db";
import { UserError } from "./errors";
import { productArt } from "./shoe-art";
import { SAMPLE_POSTS } from "./sample-posts";
import { insertSamplePost } from "./instagram";
import { sql } from "./db";
import { DEFAULT_CATEGORIES } from "./config";

/** [category slugs, brand, name, price, cost, palette, sizes] */
type P = [string[], string, string, number, number, number, string[]];

const SIZES_MEN = ["7", "8", "9", "10", "11", "12"];
const SIZES_BAD = ["6", "7", "8", "9", "10", "11"];
const SIZES_CAS = ["6", "7", "8", "9", "10", "11"];

const PRODUCTS: P[] = [
  [["running", "casual"], "Nike", "Pegasus 41", 6995, 4300, 0, SIZES_MEN],
  [["running"], "ASICS", "Gel-Kayano 31", 9995, 6400, 1, SIZES_MEN],
  [["running", "tennis"], "Adidas", "Adizero Boston 12", 7500, 4700, 2, SIZES_MEN],
  [["running"], "Hoka", "Clifton 9", 8995, 5800, 8, SIZES_MEN],
  [["running"], "Brooks", "Ghost 16", 8200, 5200, 3, SIZES_MEN],
  [["running"], "New Balance", "Fresh Foam 880v14", 6495, 4000, 6, SIZES_MEN],
  [["running"], "Mizuno", "Wave Rider 28", 7295, 4600, 4, SIZES_MEN],
  [["badminton"], "Yonex", "Power Cushion 65 Z3", 6990, 4400, 4, SIZES_BAD],
  [["badminton"], "Yonex", "Aerus Z2", 8490, 5500, 8, SIZES_BAD],
  [["badminton"], "Li-Ning", "Saga Lite", 3990, 2400, 2, SIZES_BAD],
  [["badminton"], "Victor", "P9200", 5290, 3300, 1, SIZES_BAD],
  [["badminton"], "Victor", "A970ACE", 6190, 3900, 7, SIZES_BAD],
  [["badminton", "tennis"], "ASICS", "Gel-Rocket 11", 4695, 2900, 3, SIZES_BAD],
  [["tennis"], "Wilson", "Rush Pro 4.0", 7995, 5000, 6, SIZES_MEN],
  [["tennis"], "Babolat", "Jet Mach 3", 7490, 4700, 1, SIZES_MEN],
  [["tennis"], "HEAD", "Sprint Pro 3.5", 6595, 4100, 5, SIZES_MEN],
  [["tennis", "casual"], "Nike", "Court Vapor Lite 2", 4995, 3100, 8, SIZES_MEN],
  [["tennis"], "Adidas", "Barricade", 8995, 5700, 9, SIZES_MEN],
  [["tennis"], "ASICS", "Gel-Resolution 9", 9495, 6000, 0, SIZES_MEN],
  [["casual"], "Nike", "Air Force 1 '07", 5895, 3700, 5, SIZES_CAS],
  [["casual"], "Adidas", "Samba OG", 5400, 3400, 6, SIZES_CAS],
  [["casual"], "Converse", "Chuck Taylor All Star", 3295, 1900, 2, SIZES_CAS],
  [["casual"], "Vans", "Old Skool", 3799, 2300, 7, SIZES_CAS],
  [["casual", "running"], "New Balance", "574", 4995, 3100, 3, SIZES_CAS],
  [["casual"], "Puma", "Suede Classic", 3995, 2400, 4, SIZES_CAS],
  [["casual"], "Adidas", "Gazelle", 5200, 3300, 9, SIZES_CAS],
];

const CUSTOMERS: [string, string][] = [
  ["Maria Santos", "@mariasantos.run"], ["Jerome Reyes", "@jeromereyes_"], ["Camille Dizon", "@camille.dzn"],
  ["Paolo Villanueva", "@paolo.v"], ["Angela Cruz", "@gelacruz"], ["Marco Bautista", "@marcobautista88"],
  ["Trisha Ramos", "@trishramos"], ["Kenneth Lim", "@kenlim.shuttle"], ["Bea Garcia", "@beagarcia"],
  ["Rafael Mendoza", "@rafa.mendoza"], ["Nicole Tan", "@nicoletan.co"], ["Jomar Aquino", "@jomaraquino"],
  ["Hannah Castillo", "@hannahcstl"], ["Migs Navarro", "@migsnavarro"], ["Patricia Flores", "@patflores"],
  ["Carlo Domingo", "@carlo.dmg"], ["Isabel Torres", "@isabeltorres_"], ["Dennis Uy", "@dennis.uy"],
];

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function productCount(): Promise<number> {
  return (await sql<{ n: number }>("select count(*) as n from products"))[0].n;
}

export async function loadSampleData(): Promise<void> {
  if ((await productCount()) > 0) throw new UserError("Sample data can only be loaded into an empty shop.");
  const rand = rng(20261127);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

  await tx(async (q) => {
    type V = { id: number; productId: number; price: number; size: string; completed: number; held: number; sizeWeight: number };
    const variants: V[] = [];
    const productIds: number[] = [];
    const weights: number[] = [];

    // Make sure the starter categories exist (they may have been renamed or removed).
    for (const [i, c] of DEFAULT_CATEGORIES.entries()) {
      await q(
        `insert into categories (slug, name, color, sort_order) values ($1,$2,$3,$4)
         on conflict do nothing`,
        [c.slug, c.name, c.color, i + 1],
      );
    }
    const categoryId = new Map(
      (await q<{ id: number; slug: string }>("select id, slug from categories")).map((c) => [c.slug, c.id]),
    );

    for (const [slugs, brand, name, price, cost, palette, sizes] of PRODUCTS) {
      const [{ id }] = await q<{ id: number }>(
        `insert into products (brand, name, description, image, price, cost, low_stock_threshold, created_at)
         values ($1,$2,'',$3,$4,$5,2, now() - interval '70 days') returning id`,
        [brand, name, productArt(palette), price, cost],
      );
      const ids = slugs.map((s) => categoryId.get(s)).filter((x): x is number => x !== undefined);
      if (ids.length) await q("insert into product_categories (product_id, category_id) select $1, unnest($2::int[])", [id, ids]);
      productIds.push(id);
      weights.push(0.4 + rand() * 2);
      for (const size of sizes) {
        const w = [0.5, 1, 1.6, 1.6, 1, 0.5][sizes.indexOf(size)];
        const [{ id: vid }] = await q<{ id: number }>(
          "insert into variants (product_id, size, stock, reserved) values ($1,$2,0,0) returning id",
          [id, size],
        );
        variants.push({ id: vid, productId: id, price, size, completed: 0, held: 0, sizeWeight: w });
      }
    }

    const byProduct = new Map<number, V[]>();
    for (const v of variants) byProduct.set(v.productId, [...(byProduct.get(v.productId) ?? []), v]);
    const totalW = weights.reduce((a, b) => a + b, 0);
    const pickProduct = () => {
      let r = rand() * totalW;
      for (let i = 0; i < productIds.length; i++) {
        r -= weights[i];
        if (r <= 0) return productIds[i];
      }
      return productIds[0];
    };
    const pickVariant = (pid: number) => {
      const vs = byProduct.get(pid)!;
      let r = rand() * vs.reduce((a, v) => a + v.sizeWeight, 0);
      for (const v of vs) {
        r -= v.sizeWeight;
        if (r <= 0) return v;
      }
      return vs[0];
    };

    const DAY = 86400_000;
    const now = Date.now();
    type O = { c: [string, string]; v: V; qty: number; status: string; created: number; notes: string };
    const orders: O[] = [];
    for (let i = 0; i < 78; i++) {
      const ageDays = Math.pow(rand(), 1.15) * 58;
      const created = now - ageDays * DAY - rand() * DAY * 0.3;
      let status = "completed";
      if (ageDays < 7) {
        const r = rand();
        status = r < 0.5 ? "completed" : r < 0.7 ? "paid" : r < 0.92 ? "reserved" : "cancelled";
      } else if (ageDays < 14 && rand() < 0.08) status = "reserved";
      else if (rand() < 0.07) status = "cancelled";
      const v = pickVariant(pickProduct());
      const qty = rand() < 0.88 ? 1 : 2;
      orders.push({
        c: pick(CUSTOMERS), v, qty, status, created,
        notes: rand() < 0.3 ? pick(["COD Metro Manila", "GCash paid, ship via LBC", "Meet-up at BGC", "Asked for size exchange option", "Pickup Saturday"]) : "",
      });
    }
    orders.sort((a, b) => a.created - b.created);
    for (const o of orders) {
      if (o.status === "completed") o.v.completed += o.qty;
      if (o.status === "reserved" || o.status === "paid") o.v.held += o.qty;
    }

    const leftovers = [0, 1, 2, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 8, 8, 9, 10, 12, 3, 4, 5, 6];
    for (const v of variants) {
      const left = pick(leftovers);
      const stock = v.held + left;
      const initial = stock + v.completed;
      await q("update variants set stock = $2, reserved = $3 where id = $1", [v.id, stock, v.held]);
      await q(
        "insert into stock_movements (variant_id, delta, reason, unit_cost, note, created_at) values ($1,$2,'restock',null,'Opening stock', now() - interval '70 days')",
        [v.id, initial],
      );
    }

    for (const o of orders) {
      const created = new Date(o.created);
      const paidAt = ["paid", "completed"].includes(o.status) ? new Date(Math.min(now, o.created + rand() * DAY)) : null;
      const completedAt = o.status === "completed" ? new Date(Math.min(now, (paidAt as Date).getTime() + (1 + rand() * 2) * DAY)) : null;
      const cancelledAt = o.status === "cancelled" ? new Date(Math.min(now, o.created + rand() * 2 * DAY)) : null;
      await q(
        `insert into orders (customer_name, ig_handle, product_id, variant_id, qty, unit_price, status, notes, created_at, paid_at, completed_at, cancelled_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [o.c[0], o.c[1], o.v.productId, o.v.id, o.qty, o.v.price, o.status, o.notes, created, paidAt, completedAt, cancelledAt],
      );
      if (o.status === "completed")
        await q("insert into stock_movements (variant_id, delta, reason, created_at) values ($1,$2,'sale',$3)", [
          o.v.id, -o.qty, completedAt,
        ]);
    }
  });

  for (const p of SAMPLE_POSTS.slice(0, 6)) await insertSamplePost(p);

  const first = await sql<{ id: number }>("select id from products where brand='Hoka' and name='Clifton 9'");
  const hokaPost = await sql<{ id: number }>("select id from ig_posts where ig_id = 'sample_C1c'");
  if (first[0] && hokaPost[0])
    await sql("update ig_posts set status='linked', product_id=$1 where id=$2", [first[0].id, hokaPost[0].id]);
}
