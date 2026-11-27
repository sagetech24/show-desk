import { redirect } from "next/navigation";
import { LoginForm } from "@/components/AuthForms";
import { isAdmin, needsSetup } from "@/lib/auth";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/");
  if (await needsSetup()) redirect("/setup");
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl text-white">👟</div>
        <h1 className="text-2xl font-bold">{config.appName}</h1>
        <p className="text-sm text-slate-500">Sign in to manage your shop</p>
      </div>
      <div className="card p-5"><LoginForm /></div>
    </main>
  );
}
