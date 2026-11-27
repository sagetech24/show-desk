export type Palette = { upper: string; accent: string; sole: string; bg: [string, string] };

export const PALETTES: Palette[] = [
  { upper: "#1f2937", accent: "#f97316", sole: "#f3f4f6", bg: ["#fff7ed", "#fed7aa"] },
  { upper: "#2563eb", accent: "#fbbf24", sole: "#e5e7eb", bg: ["#eff6ff", "#bfdbfe"] },
  { upper: "#e11d48", accent: "#ffffff", sole: "#fafafa", bg: ["#fff1f2", "#fecdd3"] },
  { upper: "#0f766e", accent: "#a7f3d0", sole: "#f5f5f4", bg: ["#f0fdfa", "#99f6e4"] },
  { upper: "#7c3aed", accent: "#fde047", sole: "#f4f4f5", bg: ["#f5f3ff", "#ddd6fe"] },
  { upper: "#f5f5f4", accent: "#16a34a", sole: "#d6d3d1", bg: ["#f7fee7", "#d9f99d"] },
  { upper: "#111827", accent: "#ef4444", sole: "#e5e7eb", bg: ["#f3f4f6", "#d1d5db"] },
  { upper: "#facc15", accent: "#1d4ed8", sole: "#fefce8", bg: ["#fefce8", "#fde68a"] },
  { upper: "#f8fafc", accent: "#0ea5e9", sole: "#cbd5e1", bg: ["#f0f9ff", "#bae6fd"] },
  { upper: "#92400e", accent: "#fef3c7", sole: "#fffbeb", bg: ["#fffbeb", "#fcd34d"] },
];

function shoe(p: Palette, transform = ""): string {
  return `<g transform="${transform}">
  <ellipse cx="215" cy="306" rx="170" ry="12" fill="#000" opacity="0.12"/>
  <path d="M70 250 L72 142 Q74 118 98 116 L142 119 Q160 142 192 152 L236 166 Q292 176 332 206 Q362 226 366 252 Z" fill="${p.upper}"/>
  <path d="M98 116 Q122 128 142 119 L152 150 Q122 152 96 142 Z" fill="#000" opacity="0.28"/>
  <path d="M104 238 Q205 212 318 204" stroke="${p.accent}" stroke-width="11" fill="none" stroke-linecap="round"/>
  <g stroke="${p.accent}" stroke-width="5" stroke-linecap="round" opacity="0.95">
    <path d="M186 156 l18 30"/><path d="M206 162 l18 30"/><path d="M226 168 l18 30"/><path d="M246 174 l16 28"/>
  </g>
  <path d="M62 252 L368 252 Q374 284 342 291 L98 291 Q64 288 62 252 Z" fill="${p.sole}"/>
  <path d="M62 262 L370 262" stroke="#000" stroke-opacity="0.12" stroke-width="3"/>
  <path d="M72 142 Q58 190 70 250" stroke="${p.accent}" stroke-width="7" fill="none" stroke-linecap="round"/>
</g>`;
}

const svgUrl = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

export function productArt(paletteIndex: number): string {
  const p = PALETTES[paletteIndex % PALETTES.length];
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 400">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.bg[0]}"/><stop offset="1" stop-color="${p.bg[1]}"/></linearGradient></defs>
<rect width="440" height="400" fill="url(#g)"/>${shoe(p, "translate(0 10)")}</svg>`);
}

export function postArt(paletteIndex: number, label: string): string {
  const p = PALETTES[paletteIndex % PALETTES.length];
  const safe = label.replace(/[<>&"]/g, "");
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 440">
<defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${p.bg[1]}"/><stop offset="1" stop-color="${p.bg[0]}"/></linearGradient></defs>
<rect width="440" height="440" fill="url(#g)"/><circle cx="330" cy="110" r="90" fill="${p.accent}" opacity="0.25"/>
${shoe(p, "translate(0 45) rotate(-6 220 200)")}
<text x="24" y="40" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" fill="#111" opacity="0.8">${safe}</text></svg>`);
}
