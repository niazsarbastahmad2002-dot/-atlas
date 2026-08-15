import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <nav
        className="shell"
        aria-label="Clinic workspace sections"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 16 }}
      >
        <a className="button button-ghost button-small" href="/dashboard">Schedule</a>
        <a className="button button-ghost button-small" href="/dashboard/reminders">Reminder settings</a>
      </nav>
      {children}
    </>
  );
}
