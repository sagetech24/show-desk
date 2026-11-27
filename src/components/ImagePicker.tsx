"use client";

import { useState } from "react";

async function resize(file: File, max = 800): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function ImagePicker({
  name = "image",
  currentSrc,
  allowRemove,
  label = "Photo",
}: {
  name?: string;
  currentSrc?: string | null;
  allowRemove?: boolean;
  label?: string;
}) {
  const [data, setData] = useState("");
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState("");
  const shown = data || (removed ? null : currentSrc);
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-3">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-3xl text-slate-400">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {shown ? <img src={shown} alt="" className="h-full w-full object-cover" /> : "👟"}
        </div>
        <div className="space-y-2">
          <label className="btn btn-sm cursor-pointer">
            {shown ? "Change photo" : "Choose photo"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  setError("");
                  setData(await resize(f));
                  setRemoved(false);
                } catch {
                  setError("Couldn't read that image.");
                }
              }}
            />
          </label>
          {allowRemove && shown && (
            <button type="button" className="btn btn-sm btn-danger ml-2" onClick={() => { setData(""); setRemoved(true); }}>
              Remove
            </button>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
      <input type="hidden" name={name} value={data} />
      {removed && <input type="hidden" name="remove_image" value="1" />}
    </div>
  );
}
