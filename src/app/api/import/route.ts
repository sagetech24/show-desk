import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { applyInventoryImport } from "@/lib/import-inventory";
import { parseInventoryFile } from "@/lib/tabular";
import { TEMPLATE_CSV } from "@/lib/tabular";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  return new Response(TEMPLATE_CSV, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="inventory-template.csv"' },
  });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Not signed in" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose a file first." }, { status: 400 });
  const { rows, errors } = await parseInventoryFile(file);
  const commit = form.get("commit") === "1";
  const mode = form.get("mode") === "add" ? "add" : "set";
  if (!commit) {
    const products = new Set(rows.map((r) => `${r.brand}|${r.name}`.toLowerCase())).size;
    return Response.json({ preview: { rows: rows.length, products, errors, sample: rows.slice(0, 8) } });
  }
  if (!rows.length) return Response.json({ error: errors[0] ?? "Nothing to import." }, { status: 400 });
  try {
    const summary = await applyInventoryImport(rows, mode);
    revalidatePath("/", "layout");
    return Response.json({ summary: { ...summary, skipped: errors.length, errors: errors.slice(0, 20) } });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Import failed, nothing was changed." }, { status: 500 });
  }
}
