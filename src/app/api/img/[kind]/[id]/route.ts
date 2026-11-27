import { isAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ kind: string; id: string }> }) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const { kind, id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n) || (kind !== "product" && kind !== "post")) return new Response("Not found", { status: 404 });
  const rows =
    kind === "product"
      ? await sql<{ img: string | null }>("select image as img from products where id = $1", [n])
      : await sql<{ img: string | null }>("select media_url as img from ig_posts where id = $1", [n]);
  const img = rows[0]?.img;
  const m = img?.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
  if (!m) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), {
    headers: {
      "Content-Type": m[1],
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
