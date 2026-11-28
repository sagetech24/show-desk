import "server-only";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { sql } from "./db";
import { listCategories } from "./categories";
import type { Category } from "./types";

export type Cell = string | number | boolean | null | Date;
export type Table = { name: string; columns: string[]; rows: Cell[][] };

const safe = (c: Cell): Cell => (typeof c === "string" && /^[=+\-@\t\r]/.test(c) ? `'${c}` : c);

export async function toFile(table: Table, format: "csv" | "xlsx"): Promise<{ body: Buffer; type: string; ext: string }> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(table.name);
  ws.addRow(table.columns).font = { bold: true };
  for (const r of table.rows) ws.addRow(r.map(safe));
  ws.columns.forEach((col, i) => {
    const longest = Math.max(table.columns[i].length, ...table.rows.slice(0, 200).map((r) => String(r[i] ?? "").length));
    col.width = Math.min(Math.max(longest + 2, 8), 50);
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];
  if (format === "xlsx") {
    return {
      body: Buffer.from(await wb.xlsx.writeBuffer()),
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ext: "xlsx",
    };
  }
  const csv = await wb.csv.writeBuffer({ dateFormat: "YYYY-MM-DD HH:mm" } as never);
  return { body: Buffer.concat([Buffer.from("\ufeff"), Buffer.from(csv)]), type: "text/csv; charset=utf-8", ext: "csv" };
}

/** Comma-separated category names of the product aliased as `p`. */
const CATEGORY_NAMES = `coalesce((select string_agg(c.name, ', ' order by c.sort_order, lower(c.name))
  from product_categories pc join categories c on c.id = pc.category_id where pc.product_id = p.id), '')`;

const iso = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 16).replace("T", " ") : "");

export async function buildTable(type: string): Promise<Table | null> {
  if (type === "inventory") {
    const rows = await sql<{
      categories: string; brand: string; name: string; size: string | null; stock: number | null; reserved: number | null;
      price: number; cost: number; low_stock_threshold: number; active: boolean;
    }>(
      `select ${CATEGORY_NAMES} as categories, p.brand, p.name, v.size, v.stock, v.reserved, p.price, p.cost, p.low_stock_threshold, p.active
         from products p left join variants v on v.product_id = p.id
        order by p.brand, p.name, p.id, nullif(regexp_replace(v.size, '[^0-9.]', '', 'g'), '')::float nulls last, v.size`,
    );
    return {
      name: "Inventory",
      columns: ["categories", "brand", "name", "size", "stock", "reserved", "available", "price", "cost", "low_stock_level", "active"],
      rows: rows.map((r) => [
        r.categories, r.brand, r.name, r.size ?? "", r.stock ?? 0, r.reserved ?? 0, (r.stock ?? 0) - (r.reserved ?? 0),
        r.price, r.cost, r.low_stock_threshold, r.active ? "yes" : "no",
      ]),
    };
  }
  if (type === "orders" || type === "sales") {
    const rows = await sql<{
      id: number; created_at: Date; customer_name: string; ig_handle: string; categories: string; brand: string;
      product_name: string; size: string; qty: number; unit_price: number; status: string; paid_at: Date | null;
      completed_at: Date | null; notes: string;
    }>(
      `select o.id, o.created_at, o.customer_name, o.ig_handle, ${CATEGORY_NAMES} as categories, p.brand, p.name as product_name, v.size,
              o.qty, o.unit_price, o.status, o.paid_at, o.completed_at, o.notes
         from orders o join products p on p.id = o.product_id join variants v on v.id = o.variant_id
        ${type === "sales" ? "where o.status in ('paid','completed')" : ""}
        order by o.created_at desc, o.id desc`,
    );
    return {
      name: type === "sales" ? "Sales" : "Orders",
      columns: ["id", "date", "customer", "ig_handle", "categories", "brand", "product", "size", "qty", "unit_price", "total", "status", "paid_at", "completed_at", "notes"],
      rows: rows.map((r) => [
        r.id, iso(r.created_at), r.customer_name, r.ig_handle, r.categories, r.brand, r.product_name, r.size, r.qty,
        r.unit_price, r.qty * r.unit_price, r.status, iso(r.paid_at), iso(r.completed_at), r.notes,
      ]),
    };
  }
  return null;
}

export const TEMPLATE_CSV =
  "categories,brand,name,size,stock,price,cost\n" +
  "Running,Nike,Pegasus 41,9,4,6995,4300\n" +
  "Running,Nike,Pegasus 41,10,3,6995,4300\n" +
  '"Running; Casual",Adidas,Adizero Boston 12,9,2,7500,4700\n' +
  "Badminton,Yonex,Power Cushion 65 Z3,8,2,6990,4400\n";

export type ImportRow = {
  line: number;
  /** Existing categories this row belongs to (a product can have several). */
  categories: { id: number; name: string }[];
  brand: string;
  name: string;
  size: string;
  stock: number;
  price: number | null;
  cost: number | null;
};

const ALIASES: Record<string, string[]> = {
  category: ["categories", "category", "type", "sport"],
  brand: ["brand", "make"],
  name: ["name", "product", "model", "product name", "item"],
  size: ["size", "us size", "variant"],
  stock: ["stock", "qty", "quantity", "on hand", "count", "units"],
  price: ["price", "selling price", "srp", "retail"],
  cost: ["cost", "unit cost", "capital", "buy price"],
};

const CAT_SYNONYMS: [RegExp, string][] = [
  [/run|jog|trail/, "running"],
  [/badminton|shuttle/, "badminton"],
  [/tennis/, "tennis"],
  [/casual|lifestyle|sneaker|street/, "casual"],
];

/** Match one cell token to an existing category by slug, name, or a built-in synonym. */
function matchCategory(token: string, categories: Category[]): Category | null {
  const t = token.trim().toLowerCase();
  if (!t) return null;
  const exact = categories.find((c) => c.slug === t || c.name.toLowerCase() === t);
  if (exact) return exact;
  const slug = CAT_SYNONYMS.find(([re]) => re.test(t))?.[1];
  return categories.find((c) => c.slug === slug) ?? null;
}

/** "Running; Casual" -> matched categories plus any names that matched nothing. */
function parseCategories(raw: string, categories: Category[]) {
  const whole = categories.find((c) => c.name.toLowerCase() === raw.trim().toLowerCase());
  if (whole) return { matched: [whole], unknown: [] };
  const matched = new Map<number, Category>();
  const unknown: string[] = [];
  for (const token of raw.split(/[,;|/]/).map((x) => x.trim()).filter(Boolean)) {
    const c = matchCategory(token, categories);
    if (c) matched.set(c.id, c);
    else unknown.push(token);
  }
  return { matched: [...matched.values()], unknown };
}

async function readMatrix(file: File): Promise<string[][]> {
  const buf = Buffer.from(await file.arrayBuffer());
  if (/\.xlsx$/i.test(file.name)) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as never);
    const ws = wb.worksheets[0];
    if (!ws) return [];
    const out: string[][] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const vals: string[] = [];
      for (let c = 1; c <= row.cellCount; c++) {
        const cell = row.getCell(c).value;
        vals.push(
          cell == null ? "" :
          typeof cell === "object" && "result" in cell ? String(cell.result ?? "") :
          typeof cell === "object" && "text" in cell ? String(cell.text) :
          cell instanceof Date ? cell.toISOString() : String(cell),
        );
      }
      out.push(vals);
    });
    return out;
  }
  const text = buf.toString("utf8").replace(/^\ufeff/, "");
  return Papa.parse<string[]>(text, { skipEmptyLines: "greedy" }).data;
}

export async function parseInventoryFile(file: File): Promise<{ rows: ImportRow[]; errors: string[] }> {
  if (file.size > 5_000_000) return { rows: [], errors: ["File is too large (max 5 MB)."] };
  if (!/\.(csv|xlsx)$/i.test(file.name))
    return { rows: [], errors: ["Please upload a .csv or .xlsx file (in Excel: File > Save As > CSV)."] };
  let matrix: string[][];
  try {
    matrix = await readMatrix(file);
  } catch {
    return { rows: [], errors: ["That file couldn't be read. Is it a valid .csv or .xlsx?"] };
  }
  if (matrix.length < 2) return { rows: [], errors: ["The file has no data rows."] };
  const header = matrix[0].map((h) => String(h).trim().toLowerCase());
  const idx = (key: string) => header.findIndex((h) => ALIASES[key].includes(h));
  const col = Object.fromEntries(Object.keys(ALIASES).map((k) => [k, idx(k)])) as Record<string, number>;
  const missing = ["category", "name"].filter((k) => col[k] < 0);
  if (missing.length)
    return { rows: [], errors: [`Missing column(s): ${missing.join(", ")}. Found: ${header.filter(Boolean).join(", ") || "none"}.`] };

  const categories = await listCategories();
  const rows: ImportRow[] = [];
  const errors: string[] = [];
  const get = (r: string[], k: string) => (col[k] >= 0 ? String(r[col[k]] ?? "").trim() : "");
  const numOrNull = (s: string) => {
    if (!s) return null;
    const n = Number(s.replace(/[₱,\s]|php/gi, ""));
    return Number.isFinite(n) ? n : NaN;
  };
  for (let i = 1; i < matrix.length && rows.length + errors.length < 5000; i++) {
    const r = matrix[i];
    const line = i + 1;
    const name = get(r, "name");
    if (!name && !get(r, "category")) continue;
    const { matched, unknown } = parseCategories(get(r, "category"), categories);
    if (matched.length === 0 || unknown.length) {
      const bad = unknown.length ? unknown.join(", ") : get(r, "category") || "(empty)";
      errors.push(`Row ${line}: unknown category "${bad}" (available: ${categories.map((c) => c.name).join(", ") || "none, create one first"}). Separate several with ";".`);
      continue;
    }
    if (!name) { errors.push(`Row ${line}: missing product name.`); continue; }
    const stockRaw = get(r, "stock");
    const stock = stockRaw === "" ? 0 : Number(stockRaw);
    if (!Number.isInteger(stock) || stock < 0) { errors.push(`Row ${line}: stock "${stockRaw}" must be a whole number.`); continue; }
    const price = numOrNull(get(r, "price"));
    const cost = numOrNull(get(r, "cost"));
    if ((price !== null && Number.isNaN(price)) || (cost !== null && Number.isNaN(cost)) || (price ?? 0) < 0 || (cost ?? 0) < 0) {
      errors.push(`Row ${line}: price/cost must be numbers.`); continue;
    }
    rows.push({ line, categories: matched.map((c) => ({ id: c.id, name: c.name })), brand: get(r, "brand"), name, size: get(r, "size") || "One size", stock, price, cost });
  }
  return { rows, errors };
}

export type ImportSummary = {
  productsCreated: number;
  productsUpdated: number;
  sizesCreated: number;
  sizesUpdated: number;
  warnings: string[];
};
