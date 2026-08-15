import type { ReactNode } from "react";
import { DashboardPreferenceMemory } from "./preference-memory";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <DashboardPreferenceMemory />
      <nav
        className="shell"
        aria-label="Clinic workspace sections"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 16 }}
      >
        <a className="button button-ghost button-small" href="/dashboard">Schedule</a>
        <a className="button button-ghost button-small" href="/dashboard/reminders">Reminder settings</a>
        <a className="button button-ghost button-small" href="/dashboard/staff">Staff</a>
      </nav>
      {children}
    </>
  );
}
