import type { Metadata, Viewport } from "next";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { uiLocaleMeta } from "@/lib/i18n/ui";
import "./globals.css";
import "./polish.css";

export const metadata: Metadata = {
  title: "Atlas — Clinic Appointments",
  description: "A focused appointment and reminder system for private clinics.",
  applicationName: "Atlas",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Atlas",
  },
  icons: {
    icon: "/atlas-icon.svg",
    apple: "/atlas-icon.svg",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5f7f6",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getUiLocale();
  const meta = uiLocaleMeta[locale];

  return (
    <html lang={meta.language} dir={meta.direction}>
      <body>{children}</body>
    </html>
  );
}
