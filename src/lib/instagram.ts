import "server-only";
import { sql } from "./db";
import { UserError } from "./errors";
import { SAMPLE_POSTS } from "./sample-posts";

type GraphMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
};

const FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";

export function igConfig() {
  const token = process.env.IG_ACCESS_TOKEN?.trim() ?? "";
  const userId = process.env.IG_USER_ID?.trim() ?? "";
  const version = process.env.IG_GRAPH_VERSION?.trim() || "v21.0";
  const baseOverride = process.env.IG_GRAPH_BASE?.trim() ?? "";
  const base = baseOverride || (userId ? "https://graph.facebook.com" : "https://graph.instagram.com");
  const path = userId ? `${version}/${encodeURIComponent(userId)}/media` : `${version}/me/media`;
  const limit = Math.min(Math.max(Number(process.env.IG_SYNC_LIMIT) || 50, 1), 200);
  return { token, userId, base, path, limit, connected: token !== "" };
}

async function graphGet(url: string): Promise<{ data?: GraphMedia[]; paging?: { next?: string }; error?: { message?: string } }> {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  const body = (await res.json().catch(() => ({}))) as {
    data?: GraphMedia[];
    paging?: { next?: string };
    error?: { message?: string };
  };
  if (!res.ok || body.error) {
    const msg = body.error?.message ?? `HTTP ${res.status}`;
    throw new UserError(`Instagram said: ${msg.replace(/access_token=[^&\s]+/g, "access_token=***")}`);
  }
  return body;
}

export async function fetchGraphPosts(): Promise<GraphMedia[]> {
  const cfg = igConfig();
  const first = new URL(`${cfg.base.replace(/\/$/, "")}/${cfg.path}`);
  first.searchParams.set("fields", FIELDS);
  first.searchParams.set("limit", String(Math.min(cfg.limit, 50)));
  first.searchParams.set("access_token", cfg.token);
  const out: GraphMedia[] = [];
  let next: string | undefined = first.toString();
  while (next && out.length < cfg.limit) {
    const page = await graphGet(next);
    out.push(...(page.data ?? []));
    const candidate = page.paging?.next;
    next = candidate && new URL(candidate).origin === first.origin ? candidate : undefined;
  }
  return out.slice(0, cfg.limit);
}

export type SyncResult = { mode: "graph" | "sample"; added: number; refreshed: number };

export async function syncPosts(): Promise<SyncResult> {
  const cfg = igConfig();
  if (cfg.connected) {
    let items: GraphMedia[];
    try {
      items = await fetchGraphPosts();
    } catch (e) {
      if (e instanceof UserError) throw e;
      throw new UserError("Couldn't reach Instagram. Check your connection and the token, then try again.");
    }
    let added = 0;
    let refreshed = 0;
    for (const m of items) {
      const image = m.media_type === "VIDEO" ? (m.thumbnail_url ?? m.media_url) : (m.media_url ?? m.thumbnail_url);
      if (!image || !m.permalink) continue;
      const rows = await sql<{ inserted: boolean }>(
        `insert into ig_posts (ig_id, caption, media_url, permalink, posted_at, source)
         values ($1,$2,$3,$4,$5,'graph')
         on conflict (ig_id) do update set media_url = excluded.media_url, caption = excluded.caption
         returning (xmax = 0) as inserted`,
        [m.id, m.caption ?? "", image, m.permalink, m.timestamp ?? null],
      );
      if (rows[0]?.inserted) added += 1;
      else refreshed += 1;
    }
    return { mode: "graph", added, refreshed };
  }

  const existing = await sql<{ ig_id: string }>("select ig_id from ig_posts where source = 'sample'");
  const have = new Set(existing.map((r) => r.ig_id));
  const batch = SAMPLE_POSTS.filter((p) => !have.has(p.igId)).slice(0, 3);
  for (const p of batch) await insertSamplePost(p);
  return { mode: "sample", added: batch.length, refreshed: 0 };
}

export async function insertSamplePost(p: (typeof SAMPLE_POSTS)[number]) {
  await sql(
    `insert into ig_posts (ig_id, caption, media_url, permalink, posted_at, source)
     values ($1,$2,$3,$4, now() - ($5 || ' hours')::interval, 'sample') on conflict (ig_id) do nothing`,
    [p.igId, p.caption, p.image(), `https://www.instagram.com/p/${p.igId}/`, String(p.hoursAgo)],
  );
}

const ALLOWED_IMAGE_HOSTS = [/\.cdninstagram\.com$/i, /\.fbcdn\.net$/i];

export async function snapshotImage(url: string): Promise<string | null> {
  try {
    if (url.startsWith("data:image/")) return url;
    const u = new URL(url);
    if (u.protocol !== "https:" || !ALLOWED_IMAGE_HOSTS.some((r) => r.test(u.hostname))) return null;
    const res = await fetch(u, { signal: AbortSignal.timeout(10000), redirect: "error" });
    const type = res.headers.get("content-type")?.split(";")[0] ?? "";
    if (!res.ok || !/^image\/(jpeg|png|webp)$/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 1_500_000) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
