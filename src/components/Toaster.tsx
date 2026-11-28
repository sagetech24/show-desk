"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ActionState } from "@/lib/errors";
import { FLASH_COOKIE, type Flash, type ToastKind } from "@/lib/flash-shared";

type ToastItem = { key: number; id: string; kind: ToastKind; message: string };
type ToastOptions = { id?: string };

type ToastApi = {
  success: (message: string, opts?: ToastOptions) => void;
  error: (message: string, opts?: ToastOptions) => void;
  info: (message: string, opts?: ToastOptions) => void;
  /** Show the result of a server action: error first, otherwise ok (or `fallbackOk`). */
  fromState: (state: ActionState | void, fallbackOk?: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const DURATION: Record<ToastKind, number> = { success: 4000, info: 4000, error: 7000 };
const MAX_VISIBLE = 4;

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((key: number) => setToasts((list) => list.filter((t) => t.key !== key)), []);

  const push = useCallback((kind: ToastKind, message: string, opts?: ToastOptions) => {
    if (!message) return;
    const key = ++counter;
    const id = opts?.id ?? `${kind}:${message}`;
    // Same id replaces the existing toast (and restarts its timer) instead of stacking duplicates.
    setToasts((list) => [...list.filter((t) => t.id !== id), { key, id, kind, message }].slice(-MAX_VISIBLE));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m, o) => push("success", m, o),
      error: (m, o) => push("error", m, o),
      info: (m, o) => push("info", m, o),
      fromState: (state, fallbackOk) => {
        if (state?.error) push("error", state.error);
        else if (state?.ok) push("success", state.ok);
        else if (fallbackOk) push("success", fallbackOk);
      },
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <FlashReader push={push} />
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-20 right-4 z-[100] flex w-[calc(100vw-2rem)] flex-col items-end gap-2 sm:w-96 lg:bottom-6 lg:right-6"
      >
        {toasts.map((t) => (
          <ToastCard key={t.key} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/** Toast whenever a `useActionState` result changes. */
export function useActionToast(state: ActionState) {
  const toast = useToast();
  useEffect(() => {
    if (state) toast.fromState(state);
  }, [state, toast]);
}

/** Picks up toasts queued by server actions that redirect (see lib/flash.ts). */
function FlashReader({ push }: { push: (kind: ToastKind, message: string) => void }) {
  const pathname = usePathname();
  useEffect(() => {
    const match = document.cookie.split("; ").find((c) => c.startsWith(`${FLASH_COOKIE}=`));
    if (!match) return;
    document.cookie = `${FLASH_COOKIE}=; Max-Age=0; path=/`;
    try {
      const flash = JSON.parse(decodeURIComponent(match.slice(FLASH_COOKIE.length + 1))) as Flash;
      if (flash?.message) push(flash.kind ?? "success", flash.message);
    } catch {
      /* ignore malformed cookie */
    }
  }, [pathname, push]);
  return null;
}

const STYLE: Record<ToastKind, { box: string; closeBtn: string; symbol: string }> = {
  success: { box: "bg-emerald-600 text-white", closeBtn: "text-white/80 hover:bg-white/15 hover:text-white", symbol: "✓" },
  error: { box: "bg-red-600 text-white", closeBtn: "text-white/80 hover:bg-white/15 hover:text-white", symbol: "!" },
  info: { box: "bg-sky-600 text-white", closeBtn: "text-white/80 hover:bg-white/15 hover:text-white", symbol: "i" },
};

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (key: number) => void }) {
  const [paused, setPaused] = useState(false);
  const s = STYLE[toast.kind];
  const { key, kind } = toast;

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => onDismiss(key), DURATION[kind]);
    return () => clearTimeout(t);
  }, [paused, key, kind, onDismiss]);

  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`toast-in pointer-events-auto flex w-full items-start gap-3 rounded-2xl p-3 pr-2 opacity-60 shadow-lg ${s.box}`}
    >
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold" aria-hidden>
        {s.symbol}
      </span>
      <p className="min-w-0 flex-1 break-words py-0.5 text-sm font-medium">{toast.message}</p>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(key)}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${s.closeBtn}`}
      >
        ✕
      </button>
    </div>
  );
}
