"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/actions/auth";
import { useActionToast } from "./Toaster";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  useActionToast(state);
  return (
    <form action={action} className="grid max-w-md gap-3">
      <div><label className="label" htmlFor="current">Current password</label><input id="current" name="current" type="password" autoComplete="current-password" required className="input" /></div>
      <div><label className="label" htmlFor="new">New password</label><input id="new" name="password" type="password" autoComplete="new-password" minLength={8} required className="input" /></div>
      <div><label className="label" htmlFor="again">Repeat new password</label><input id="again" name="confirm" type="password" autoComplete="new-password" minLength={8} required className="input" /></div>
      <div><button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Change password"}</button></div>
    </form>
  );
}
