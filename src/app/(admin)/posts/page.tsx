import Link from "next/link";
import { AttachControl, ManualPostForm, PostStatusButton, SyncButton } from "@/components/PostComponents";
import { EmptyState } from "@/components/ui";
import { sql } from "@/lib/db";
import { getFormatter } from "@/lib/format";
import { guessFromCaption } from "@/lib/ig-parse";
import { igConfig } from "@/lib/instagram";
import type { IgPost } from "@/lib/types";

export const metadata = { title: "Posts" };

const TABS = [
  { key: "new", label: "Inbox" },
  { key: "linked", label: "Linked" },
  { key: "dismissed", label: "Dismissed" },
] as const;

export default async function PostsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const { formatMoney, timeAgo } = await getFormatter();
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "new";
  const ig = igConfig();
  const [posts, counts, products] = await Promise.all([
    sql<IgPost & { product_label: string | null }>(
      `select ig.*, nullif(trim(p.brand || ' ' || p.name), '') as product_label
         from ig_posts ig left join products p on p.id = ig.product_id
        where ig.status = $1 order by ig.posted_at desc nulls last, ig.id desc limit 100`,
      [tab],
    ),
    sql<{ status: string; n: number }>("select status, count(*) as n from ig_posts group by status"),
    sql<{ id: number; label: string; hasPhoto: boolean }>(
      "select id, trim(brand || ' ' || name) as label, (image is not null) as \"hasPhoto\" from products where active order by brand, name",
    ),
  ]);
  const count = (k: string) => counts.find((c) => c.status === k)?.n ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Instagram posts</h1>
          <p className="text-sm text-slate-500">Turn posts into products, or attach them to a product you already have.</p>
        </div>
        <SyncButton connected={ig.connected} />
      </div>

      {ig.connected ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
          Connected to the Instagram Graph API. “Sync” pulls your latest posts into the inbox.
        </div>
      ) : (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-900">
          <strong>Sample mode:</strong> no <code>IG_ACCESS_TOKEN</code> is set, so “Load sample posts” adds example posts. Add posts by hand below, or see <Link href="/settings" className="underline">Settings</Link> to connect Instagram.
        </div>
      )}

      <ManualPostForm />

      <div className="flex gap-2">
        {TABS.map((t) => (
          <Link key={t.key} href={`/posts?tab=${t.key}`}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${tab === t.key ? "bg-brand-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
            {t.label} <span className="opacity-70">{count(t.key)}</span>
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <EmptyState title={tab === "new" ? "Inbox is empty" : "Nothing here"}>
          {tab === "new" ? (ig.connected ? "Tap Sync to pull your latest Instagram posts." : "Load sample posts, or add one by hand above.") : "Posts will show up here."}
        </EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((p) => {
            const g = guessFromCaption(p.caption);
            const img = p.media_url ? (p.media_url.startsWith("data:") ? `/api/img/post/${p.id}` : p.media_url) : "";
            return (
              <li key={p.id} className="card flex flex-col overflow-hidden">
                <div className="aspect-square bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {img ? <img src={img} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-4xl text-slate-300">📸</div>}
                </div>
                <div className="flex flex-1 flex-col gap-3 p-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="badge bg-slate-100 text-slate-600">{p.source === "graph" ? "Instagram" : p.source === "sample" ? "Sample" : "Manual"}</span>
                    <span>{timeAgo(p.posted_at ?? p.created_at)}</span>
                  </div>
                  <p className="line-clamp-4 whitespace-pre-line text-sm text-slate-700">{p.caption || "(no caption)"}</p>
                  {tab === "new" && (g.brand || g.price) && (
                    <p className="text-xs text-slate-500">Looks like: {[g.brand, g.name].filter(Boolean).join(" ")}{g.price ? ` · ${formatMoney(g.price)}` : ""}</p>
                  )}
                  {p.permalink && <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand-600">View on Instagram ↗</a>}
                  <div className="mt-auto flex flex-wrap items-start gap-2">
                    {tab === "new" && (
                      <>
                        <Link href={`/products/new?post=${p.id}`} className="btn btn-sm btn-primary">Create product</Link>
                        <AttachControl postId={p.id} products={products} hasImage={!!p.media_url} />
                        <PostStatusButton postId={p.id} to="dismissed" className="btn btn-sm">Dismiss</PostStatusButton>
                      </>
                    )}
                    {tab === "linked" && (
                      <>
                        {p.product_id && <Link href={`/products/${p.product_id}`} className="btn btn-sm">→ {p.product_label}</Link>}
                        <PostStatusButton postId={p.id} to="new">Unlink</PostStatusButton>
                      </>
                    )}
                    {tab === "dismissed" && <PostStatusButton postId={p.id} to="new">Move back to inbox</PostStatusButton>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
