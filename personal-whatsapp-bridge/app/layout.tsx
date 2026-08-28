import type { ReactNode } from "react";

export const metadata = {
  title: "Personal WhatsApp Bridge",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif", color: "#10231f", background: "#f6faf8" }}>
        {children}
      </body>
    </html>
  );
}
