import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toaster";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: { default: config.appName, template: `%s · ${config.appName}` },
  description: "Inventory, orders and Instagram posts for a small shoe shop.",
  robots: { index: false, follow: false },
};

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
