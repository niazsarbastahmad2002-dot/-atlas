export type ClinicAttentionStatus = "pending" | "confirmed" | "completed" | "no_show" | "cancelled";

export type ClinicAttentionAppointment = {
  id: string;
  status: ClinicAttentionStatus | string;
  appointment_at: string;
};

export type ClinicPriorityKind = "attendance" | "finish" | "soon";

export type ClinicPriorityItem<T extends ClinicAttentionAppointment> = {
  kind: ClinicPriorityKind;
  appointment: T;
  count: number;
};

const FIVE_MINUTES = 5 * 60_000;
const ONE_HOUR = 60 * 60_000;

// Select only from an already-authorized, clinic/doctor/day-scoped schedule.
// These are scheduling prompts, never diagnoses of arrival or no-show.
export function clinicPriorities<T extends ClinicAttentionAppointment>(
  appointments: readonly T[],
  now: number,
  isToday: boolean,
): ClinicPriorityItem<T>[] {
  if (!isToday) return [];
  const timed = appointments
    .map((appointment) => ({ appointment, time: Date.parse(appointment.appointment_at) }))
    .filter((item) => Number.isFinite(item.time))
    .sort((a, b) => a.time - b.time);

  const attendance = timed.filter(({ appointment, time }) => appointment.status === "pending" && time < now - FIVE_MINUTES);
  const finish = timed.filter(({ appointment, time }) => appointment.status === "confirmed" && time < now - FIVE_MINUTES);
  const soon = timed.filter(({ appointment, time }) => (
    (appointment.status === "pending" || appointment.status === "confirmed")
    && time >= now - FIVE_MINUTES
    && time <= now + ONE_HOUR
  ));

  return [
    ...(attendance[0] ? [{ kind: "attendance" as const, appointment: attendance[0].appointment, count: attendance.length }] : []),
    ...(finish[0] ? [{ kind: "finish" as const, appointment: finish[0].appointment, count: finish.length }] : []),
    ...(soon[0] ? [{ kind: "soon" as const, appointment: soon[0].appointment, count: soon.length }] : []),
  ];
}
