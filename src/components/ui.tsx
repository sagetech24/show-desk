import type { Category, OrderStatus } from "@/lib/config";
import { CATEGORY_LABEL } from "@/lib/config";

const CAT_STYLE: Record<Category, string> = {
  running: "bg-sky-100 text-sky-800",
  badminton: "bg-emerald-100 text-emerald-800",
  tennis: "bg-amber-100 text-amber-800",
  casual: "bg-violet-100 text-violet-800",
};

export function CategoryBadge({ category }: { category: Category }) {
  return <span className={`badge ${CAT_STYLE[category]}`}>{CATEGORY_LABEL[category]}</span>;
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  reserved: "bg-amber-100 text-amber-800",
  paid: "bg-sky-100 text-sky-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-200 text-slate-600",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge capitalize ${STATUS_STYLE[status]}`}>{status}</span>;
}

export function StockBadge({ state }: { state: "ok" | "low" | "out" }) {
  if (state === "ok") return null;
  return (
    <span className={`badge ${state === "low" ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-700"}`}>
      {state === "low" ? "Low stock" : "Out of stock"}
    </span>
  );
}

export function ProductThumb({
  id,
  has,
  version,
  className = "h-14 w-14",
}: {
  id: number;
  has: boolean;
  version: number;
  className?: string;
}) {
  if (!has)
    return <div className={`${className} flex shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl text-slate-400`}>👟</div>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/img/product/${id}?v=${version}`} alt="" loading="lazy" className={`${className} shrink-0 rounded-xl bg-slate-100 object-cover`} />
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="text-base font-semibold text-slate-800">{title}</p>
      {children && <div className="max-w-md text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "warn" | "good" }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone === "warn" ? "text-orange-600" : "text-slate-900"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}
