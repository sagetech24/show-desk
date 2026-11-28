"use client";

import { useActionState } from "react";
import { loginAction, setupAction } from "@/app/actions/auth";
import { useActionToast } from "./Toaster";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  useActionToast(state);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="password">Admin password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus className="input" />
      </div>
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

export function SetupForm() {
  const [state, action, pending] = useActionState(setupAction, undefined);
  useActionToast(state);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="password">Choose an admin password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="input" />
        <p className="hint">At least 8 characters.</p>
      </div>
      <div>
        <label className="label" htmlFor="confirm">Repeat password</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required className="input" />
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" name="sample" defaultChecked className="mt-1 h-4 w-4" />
        <span>Start with sample data (26 shoes, orders and Instagram posts) so I can explore. You can import your own stock later.</span>
      </label>
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Setting up…" : "Create admin & start"}</button>
    </form>
  );
}
