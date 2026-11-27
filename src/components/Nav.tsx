"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";

const ITEMS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/inventory", label: "Stock", icon: "📦" },
  { href: "/orders", label: "Orders", icon: "🧾" },
  { href: "/posts", label: "Posts", icon: "📸" },
  { href: "/data", label: "Import / Export", short: "Data", icon: "📊" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

function active(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/") || (href === "/inventory" && path.startsWith("/products"));
}

export function Nav({ appName, badges }: { appName: string; badges: Record<string, number> }) {
  const path = usePathname();
  const Badge = ({ href }: { href: string }) =>
    badges[href] ? (
      <span className="ml-auto rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">{badges[href]}</span>
    ) : null;
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white p-4 lg:flex">
        <Link href="/" className="mb-6 flex items-center gap-2 px-2 text-lg font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">👟</span>
          {appName}
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {ITEMS.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                active(path, i.href) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="text-base">{i.icon}</span>
              {i.label}
              <Badge href={i.href} />
            </Link>
          ))}
        </nav>
        <form action={logoutAction}>
          <button className="btn w-full">Sign out</button>
        </form>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">👟</span>
          {appName}
        </Link>
        <Link href="/settings" className="text-sm text-slate-500" aria-label="Settings">⚙️ Settings</Link>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {ITEMS.slice(0, 5).map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
              active(path, i.href) ? "text-brand-700" : "text-slate-500"
            }`}
          >
            <span className="text-xl leading-none">{i.icon}</span>
            {i.short ?? i.label}
            {badges[i.href] ? (
              <span className="absolute right-[22%] top-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white">{badges[i.href]}</span>
            ) : null}
          </Link>
        ))}
      </nav>
    </>
  );
}
