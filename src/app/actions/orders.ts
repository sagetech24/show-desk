"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/config";
import { toState, UserError, type ActionState } from "@/lib/errors";
import { cleanHandle } from "@/lib/format";
import { setFlash } from "@/lib/flash";
import { createOrder, setOrderStatus } from "@/lib/orders";

export async function createOrderAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await assertAdmin();
    const customer = String(form.get("customer_name") ?? "").trim();
    const handle = cleanHandle(String(form.get("ig_handle") ?? ""));
    if (!customer && !handle) throw new UserError("Add the customer's name or IG handle.");
    const variantId = Number(form.get("variant_id"));
    if (!variantId) throw new UserError("Choose a product and a size.");
    const qty = Math.floor(Number(form.get("qty")));
    if (!Number.isFinite(qty) || qty < 1 || qty > 100) throw new UserError("Quantity must be between 1 and 100.");
    const price = Number(String(form.get("unit_price") ?? "").replace(/,/g, ""));
    if (!Number.isFinite(price) || price < 0) throw new UserError("Enter the price per pair.");
    const status = String(form.get("status")) as OrderStatus;
    if (!ORDER_STATUSES.includes(status)) throw new UserError("Choose a status.");
    const dateStr = String(form.get("date") ?? "");
    let date: Date | undefined;
    if (dateStr) {
      const d = new Date(`${dateStr}T12:00:00+08:00`);
      if (!Number.isNaN(d.getTime())) date = d > new Date() ? new Date() : d;
    }
    await createOrder({
      customer_name: customer || handle,
      ig_handle: handle,
      variant_id: variantId,
      qty,
      unit_price: price,
      status,
      notes: String(form.get("notes") ?? "").trim().slice(0, 500),
      date,
    });
    revalidatePath("/", "layout");
    await setFlash("Order saved.");
  } catch (e) {
    return toState(e);
  }
  redirect("/orders?status=" + String(form.get("status")));
}

export async function setStatusAction(orderId: number, status: OrderStatus): Promise<ActionState> {
  try {
    await assertAdmin();
    if (!ORDER_STATUSES.includes(status)) throw new UserError("Invalid status.");
    await setOrderStatus(Number(orderId), status);
    revalidatePath("/", "layout");
    return { ok: status === "cancelled" ? "Order cancelled." : status === "reserved" ? "Order reopened." : `Order marked ${status}.` };
  } catch (e) {
    return toState(e);
  }
}
