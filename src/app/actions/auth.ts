"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  assertAdmin,
  checkPassword,
  clearLoginFailures,
  endSession,
  loginThrottled,
  needsSetup,
  passwordFromEnv,
  recordLoginFailure,
  setStoredPassword,
  startSession,
} from "@/lib/auth";
import { setFlash } from "@/lib/flash";
import { toState, UserError, type ActionState } from "@/lib/errors";
import { loadSampleData, productCount } from "@/lib/sample-data";

export async function loginAction(_: ActionState, form: FormData): Promise<ActionState> {
  const h = await headers();
  const key = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (loginThrottled(key)) return { error: "Too many attempts. Wait a few minutes and try again." };
  const password = String(form.get("password") ?? "");
  if (!(await checkPassword(password))) {
    recordLoginFailure(key);
    await new Promise((r) => setTimeout(r, 600));
    return { error: "Wrong password." };
  }
  clearLoginFailures(key);
  await startSession();
  await setFlash("Signed in.");
  redirect("/");
}

export async function setupAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    if (!(await needsSetup())) throw new UserError("Setup is already done. Please sign in.");
    const password = String(form.get("password") ?? "");
    if (password.length < 8) throw new UserError("Use at least 8 characters.");
    if (password !== String(form.get("confirm") ?? "")) throw new UserError("Passwords don't match.");
    await setStoredPassword(password);
    if (form.get("sample") === "on" && (await productCount()) === 0) await loadSampleData();
    await startSession();
    await setFlash("Admin password created. Welcome!");
  } catch (e) {
    return toState(e);
  }
  redirect("/");
}

export async function logoutAction() {
  await endSession();
  await setFlash("Signed out.", "info");
  redirect("/login");
}

export async function changePasswordAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await assertAdmin();
    if (passwordFromEnv())
      throw new UserError("The password is set by the ADMIN_PASSWORD environment variable. Change it there.");
    if (!(await checkPassword(String(form.get("current") ?? "")))) throw new UserError("Current password is wrong.");
    const next = String(form.get("password") ?? "");
    if (next.length < 8) throw new UserError("Use at least 8 characters.");
    if (next !== String(form.get("confirm") ?? "")) throw new UserError("New passwords don't match.");
    await setStoredPassword(next);
    await startSession();
    return { ok: "Password changed." };
  } catch (e) {
    return toState(e);
  }
}

export async function loadSampleAction(): Promise<ActionState> {
  try {
    await assertAdmin();
    await loadSampleData();
    revalidatePath("/", "layout");
    return { ok: "Sample data loaded." };
  } catch (e) {
    return toState(e);
  }
}
