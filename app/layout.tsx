import type { Metadata } from "next";
import { appLocale } from "@/lib/i18n/config";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas — Clinic Appointments",
  description: "A focused appointment and reminder system for private clinics.",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={appLocale.language} dir={appLocale.direction}>
      <body>{children}</body>
    </html>
  );
}
