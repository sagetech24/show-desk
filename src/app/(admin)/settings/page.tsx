import { PasswordForm } from "@/components/SettingsForms";
import { passwordFromEnv } from "@/lib/auth";
import { config } from "@/lib/config";
import { dbMode } from "@/lib/db";
import { igConfig } from "@/lib/instagram";
import { sql } from "@/lib/db";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await sql("select 1");
  const ig = igConfig();
  const mode = dbMode();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="page-title">Settings</h1>

      <section className="card space-y-3 p-4 sm:p-5">
        <h2 className="font-semibold">Instagram connection</h2>
        <p className="text-sm">
          Status:{" "}
          {ig.connected ? (
            <span className="badge bg-emerald-100 text-emerald-800">Connected{ig.userId ? " (Facebook Login, business account)" : " (Instagram Login)"}</span>
          ) : (
            <span className="badge bg-sky-100 text-sky-800">Not connected — sample mode</span>
          )}
        </p>
        <p className="text-sm text-slate-600">
          The access token is read from the <code>IG_ACCESS_TOKEN</code> environment variable on the server. It is never stored in the database or shown here.
          {ig.connected ? "" : " Set it where the app is hosted, restart, and “Sync from Instagram” appears on the Posts page."}
        </p>
        <ul className="list-inside list-disc text-sm text-slate-600">
          <li><code>IG_ACCESS_TOKEN</code>: {ig.connected ? "set" : "not set"}</li>
          <li><code>IG_USER_ID</code> (optional, Facebook Login flow): {ig.userId ? "set" : "not set"}</li>
        </ul>
        <p className="text-xs text-slate-500">Long-lived Instagram tokens expire after about 60 days. Refresh them before then (see the README).</p>
      </section>

      <section className="card space-y-3 p-4 sm:p-5">
        <h2 className="font-semibold">Admin password</h2>
        {passwordFromEnv() ? (
          <p className="text-sm text-slate-600">The password is set with the <code>ADMIN_PASSWORD</code> environment variable. Change it there and restart.</p>
        ) : (
          <PasswordForm />
        )}
      </section>

      <section className="card space-y-1 p-4 text-sm text-slate-600 sm:p-5">
        <h2 className="mb-1 font-semibold text-slate-900">About this install</h2>
        <p>Database: {mode === "postgres" ? "Postgres (DATABASE_URL)" : mode === "local-file" ? "Local file database (.data/pglite)" : "Temporary in-memory database"}</p>
        <p>Time zone for “this week / month”: {config.timezone} · Currency: {config.currency}</p>
      </section>
    </div>
  );
}
