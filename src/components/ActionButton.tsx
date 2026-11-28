"use client";

import { useTransition } from "react";
import type { ActionState } from "@/lib/errors";
import { useToast } from "./Toaster";

export function ActionButton({
  action,
  children,
  className = "btn btn-sm",
  confirm,
  successMessage,
  onDone,
}: {
  action: () => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  confirm?: string;
  /** Shown when the action succeeds without returning its own message. */
  successMessage?: string;
  onDone?: (r: ActionState) => void;
}) {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          try {
            const r = await action();
            toast.fromState(r, successMessage);
            onDone?.(r);
          } catch {
            toast.error("Something went wrong. Please try again.");
          }
        });
      }}
    >
      {pending ? "…" : children}
    </button>
  );
}
