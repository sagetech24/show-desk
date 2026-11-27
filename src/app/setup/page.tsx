import { redirect } from "next/navigation";
import { SetupForm } from "@/components/AuthForms";
import { needsSetup } from "@/lib/auth";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Set up" };

export default async function SetupPage() {
  if (!(await needsSetup())) redirect("/login");
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl text-white">👟</div>
        <h1 className="text-2xl font-bold">Welcome to {config.appName}</h1>
        <p className="text-sm text-slate-500">First-time setup: create the admin password.</p>
      </div>
      <div className="card p-5"><SetupForm /></div>
      <p className="mt-4 text-center text-xs text-slate-500">
        Tip: you can also set the ADMIN_PASSWORD environment variable instead.
      </p>
    </main>
  );
}
