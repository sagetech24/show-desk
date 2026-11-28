"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/actions/auth";
import { saveStoreSettingsAction } from "@/app/actions/store";
import { useActionToast } from "./Toaster";

type StoreValues = {
  name: string;
  description: string;
  email: string;
  phone: string;
  timezone: string;
  currency: string;
};

export function StoreForm({
  values,
  timezones,
  currencies,
}: {
  values: StoreValues;
  timezones: string[];
  currencies: { code: string; label: string }[];
}) {
  const [state, action, pending] = useActionState(saveStoreSettingsAction, undefined);
  const tzList = timezones.includes(values.timezone) ? timezones : [values.timezone, ...timezones];
  const curList = currencies.some((c) => c.code === values.currency)
    ? currencies
    : [{ code: values.currency, label: values.currency }, ...currencies];
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label" htmlFor="store-name">Store name</label>
        <input id="store-name" name="name" defaultValue={values.name} maxLength={80} required className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="store-desc">Short description</label>
        <textarea id="store-desc" name="description" defaultValue={values.description} maxLength={300} rows={2} className="input" placeholder="e.g. Authentic running, badminton and tennis shoes." />
      </div>
      <div>
        <label className="label" htmlFor="store-email">Email address</label>
        <input id="store-email" name="email" type="email" defaultValue={values.email} autoComplete="off" className="input" placeholder="hello@yourstore.com" />
      </div>
      <div>
        <label className="label" htmlFor="store-phone">Contact number</label>
        <input id="store-phone" name="phone" type="tel" defaultValue={values.phone} autoComplete="off" className="input" placeholder="+63 912 345 6789" />
      </div>
      <div>
        <label className="label" htmlFor="store-tz">Time zone</label>
        <select id="store-tz" name="timezone" defaultValue={values.timezone} className="input">
          {tzList.map((tz) => <option key={tz} value={tz}>{tz.replaceAll("_", " ")}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="store-cur">Currency</label>
        <select id="store-cur" name="currency" defaultValue={values.currency} className="input">
          {curList.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
      </div>
      <div className="space-y-2 sm:col-span-2">
        {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && <p role="status" className="text-sm text-emerald-700">{state.ok}</p>}
        <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save store settings"}</button>
      </div>
    </form>
  );
}

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
