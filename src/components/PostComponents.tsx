"use client";

import { useActionState, useEffect, useState } from "react";
import { addManualPostAction, attachPostAction, setPostStatusAction, syncPostsAction } from "@/app/actions/posts";
import { ActionButton } from "./ActionButton";
import { ImagePicker } from "./ImagePicker";

export function SyncButton({ connected }: { connected: boolean }) {
  const [msg, setMsg] = useState("");
  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <ActionButton className="btn btn-primary" action={syncPostsAction} onDone={(r) => setMsg(r?.ok ?? "")}>
        {connected ? "Sync from Instagram" : "Load sample posts"}
      </ActionButton>
      {msg && <p role="status" className="text-xs text-emerald-700">{msg}</p>}
    </div>
  );
}

export function ManualPostForm() {
  const [state, action, pending] = useActionState(addManualPostAction, undefined);
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (state?.ok) setVersion((v) => v + 1);
  }, [state]);
  return (
    <div className="card p-4">
      <button type="button" className="flex w-full items-center justify-between text-left font-semibold" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>Add a post by hand (no Instagram connection needed)</span>
        <span className="text-slate-400">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <form action={action} className="mt-4 space-y-4">
          <div>
            <label className="label" htmlFor="permalink">Post link</label>
            <input id="permalink" name="permalink" type="url" className="input" placeholder="https://www.instagram.com/p/…" />
          </div>
          <div>
            <label className="label" htmlFor="caption">Caption</label>
            <textarea id="caption" name="caption" rows={3} className="input" placeholder="Paste the caption. We'll guess brand, category and price from it." />
          </div>
          <ImagePicker key={version} label="Photo (screenshot or upload)" />
          <div>
            <label className="label" htmlFor="image_url">…or image link (optional)</label>
            <input id="image_url" name="image_url" type="url" className="input" placeholder="https://…" />
          </div>
          {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
          {state?.ok && <p role="status" className="text-sm text-emerald-700">{state.ok}</p>}
          <button className="btn btn-primary" disabled={pending}>{pending ? "Adding…" : "Add to inbox"}</button>
        </form>
      )}
    </div>
  );
}

export function AttachControl({
  postId,
  products,
  hasImage,
}: {
  postId: number;
  products: { id: number; label: string; hasPhoto: boolean }[];
  hasImage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pid, setPid] = useState("");
  const [useImage, setUseImage] = useState(true);
  const chosen = products.find((p) => String(p.id) === pid);
  if (!open) return <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>Attach to product</button>;
  return (
    <div className="w-full space-y-2 rounded-xl bg-slate-50 p-2.5">
      <select aria-label="Product" className="input" value={pid} onChange={(e) => setPid(e.target.value)}>
        <option value="">Choose a product…</option>
        {products.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
      {hasImage && (
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          <input type="checkbox" checked={useImage} onChange={(e) => setUseImage(e.target.checked)} />
          {chosen?.hasPhoto ? "Replace the product photo with this post's photo" : "Use this post's photo as product photo"}
        </label>
      )}
      <div className="flex gap-2">
        <ActionButton className="btn btn-sm btn-primary" action={() => (pid ? attachPostAction(postId, Number(pid), useImage && hasImage) : Promise.resolve({ error: "Choose a product." }))}>
          Attach
        </ActionButton>
        <button type="button" className="btn btn-sm" onClick={() => setOpen(false)}>Close</button>
      </div>
    </div>
  );
}

export function PostStatusButton({ postId, to, children, className }: { postId: number; to: "new" | "dismissed"; children: React.ReactNode; className?: string }) {
  return <ActionButton className={className ?? "btn btn-sm"} action={() => setPostStatusAction(postId, to)}>{children}</ActionButton>;
}
