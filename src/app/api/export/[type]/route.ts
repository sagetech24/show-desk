import { isAdmin } from "@/lib/auth";
import { buildTable, toFile } from "@/lib/tabular";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ type: string }> }) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const { type } = await ctx.params;
  const table = await buildTable(type);
  if (!table) return new Response("Not found", { status: 404 });
  const format = new URL(req.url).searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const file = await toFile(table, format);
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.type,
      "Content-Disposition": `attachment; filename="${type}-${stamp}.${file.ext}"`,
      "Cache-Control": "no-store",
    },
  });
}
