"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { toState, UserError, type ActionState } from "@/lib/errors";
import { isValidCurrency, isValidTimezone, saveStoreSettings } from "@/lib/store-settings";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9][0-9\s().-]{5,24}$/;

export async function saveStoreSettingsAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await assertAdmin();
    const get = (k: string) => String(form.get(k) ?? "").trim();

    const name = get("name");
    const description = get("description");
    const email = get("email");
    const phone = get("phone");
    const timezone = get("timezone");
    const currency = get("currency").toUpperCase();

    if (!name) throw new UserError("Enter a store name.");
    if (name.length > 80) throw new UserError("Store name is too long (80 characters max).");
    if (description.length > 300) throw new UserError("Short description is too long (300 characters max).");
    if (email && (email.length > 254 || !EMAIL_RE.test(email))) throw new UserError("That email address doesn't look right.");
    if (phone && !PHONE_RE.test(phone)) throw new UserError("That contact number doesn't look right. Use digits, spaces, + ( ) - only.");
    if (!isValidTimezone(timezone)) throw new UserError("Choose a valid time zone.");
    if (!isValidCurrency(currency)) throw new UserError("Choose a valid currency.");

    await saveStoreSettings({ name, description, email, phone, timezone, currency });
    revalidatePath("/", "layout");
    return { ok: "Store settings saved." };
  } catch (e) {
    return toState(e);
  }
}
