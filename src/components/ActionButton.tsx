"use client";

import { useState, useTransition } from "react";
import type { ActionState } from "@/lib/errors";

export function ActionButton({
  action,
  children,
  className = "btn btn-sm",
  confirm,
  onDone,
}: {
  action: () => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  confirm?: string;
  onDone?: (r: ActionState) => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          setError(undefined);
          start(async () => {
            const r = await action();
            if (r?.error) setError(r.error);
            onDone?.(r);
          });
        }}
      >
        {pending ? "…" : children}
      </button>
      {error && <span role="alert" className="mt-1 max-w-56 text-xs text-red-600">{error}</span>}
    </span>
  );
}
