import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toaster";
import { config } from "@/lib/config";
import { getStoreSettings } from "@/lib/store-settings";

export async function generateMetadata(): Promise<Metadata> {
  let name = config.appName;
  let description = "Inventory, orders and Instagram posts for a small shoe shop.";
  try {
    const store = await getStoreSettings();
    name = store.name;
    if (store.description) description = store.description;
  } catch {
    // Database not reachable yet: fall back to defaults.
  }
  return {
    title: { default: name, template: `%s · ${name}` },
    description,
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#4f46e5" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
