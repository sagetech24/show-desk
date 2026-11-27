"use client";

import { setStatusAction } from "@/app/actions/orders";
import type { OrderStatus } from "@/lib/config";
import { ActionButton } from "./ActionButton";

export function OrderActions({ id, status }: { id: number; status: OrderStatus }) {
  const go = (s: OrderStatus) => () => setStatusAction(id, s);
  return (
    <div className="flex flex-wrap items-start gap-1.5">
      {status === "reserved" && <ActionButton className="btn btn-sm btn-primary" action={go("paid")}>Mark paid</ActionButton>}
      {(status === "reserved" || status === "paid") && <ActionButton className="btn btn-sm" action={go("completed")}>Complete</ActionButton>}
      {status !== "cancelled" && (
        <ActionButton
          className="btn btn-sm btn-danger"
          confirm={status === "completed" ? "Cancel this completed sale and put the pair back in stock?" : "Cancel this order and release the held stock?"}
          action={go("cancelled")}
        >
          Cancel
        </ActionButton>
      )}
      {status === "cancelled" && <ActionButton className="btn btn-sm" action={go("reserved")}>Reopen</ActionButton>}
    </div>
  );
}
