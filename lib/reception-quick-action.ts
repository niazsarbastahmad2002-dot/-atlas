import type { AppointmentStatus } from "./appointments";

/**
 * Fast reception actions are optional shortcuts, never new status transitions.
 * All writes still go through the existing server-side status and revision guards.
 */
export function nextReceptionQuickAction(
  status: AppointmentStatus,
  attendanceReady: boolean,
  outcomeReady: boolean,
): "confirmed" | "completed" | null {
  if (status === "pending" && attendanceReady) return "confirmed";
  if (status === "confirmed" && outcomeReady) return "completed";
  return null;
}
