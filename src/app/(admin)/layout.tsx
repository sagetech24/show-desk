import { Nav } from "@/components/Nav";
import { requireAdmin } from "@/lib/auth";
import { config } from "@/lib/config";
import { dbMode } from "@/lib/db";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [row] = await sql<{ reserved: number; posts: number }>(
    `select (select count(*) from orders where status = 'reserved') as reserved,
            (select count(*) from ig_posts where status = 'new') as posts`,
  );
  const mode = dbMode();
  return (
    <div className="min-h-screen lg:pl-60">
      <Nav appName={config.appName} badges={{ "/orders": row.reserved, "/posts": row.posts }} />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-8">
        {mode === "memory" && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            Data is stored in temporary memory and will be lost on restart. Set the <code>DATABASE_URL</code> environment variable to a Postgres database to keep it.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
