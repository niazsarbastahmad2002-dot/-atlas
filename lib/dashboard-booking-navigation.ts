import { toBaghdadInputValue } from "./appointments.ts";
import { baghdadDate } from "./i18n/config.ts";

function dashboardAppointmentUrl({
  clinicId,
  doctorId,
  day,
  notice,
  after,
}: {
  clinicId: string;
  doctorId: string;
  day: string;
  notice: string;
  after?: string;
}) {
  const params = new URLSearchParams({ notice, clinic: clinicId, day, doctor: doctorId });
  if (after) params.set("after", after);
  return `/dashboard?${params.toString()}`;
}

export function appointmentDestination({
  clinicId,
  doctorId,
  appointmentAt,
  notice = "appointment_created",
}: {
  clinicId: string;
  doctorId: string;
  appointmentAt: Date;
  notice?: string;
}) {
  return dashboardAppointmentUrl({
    clinicId,
    doctorId,
    day: baghdadDate.format(appointmentAt),
    notice,
    after: toBaghdadInputValue(appointmentAt),
  });
}

export function appointmentFormDestination({
  clinicId,
  doctorId,
  appointmentAt,
  notice = "appointment_created",
}: {
  clinicId: string;
  doctorId: string;
  appointmentAt: string;
  notice?: string;
}) {
  const match = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}$/.exec(appointmentAt);
  if (!match) return null;

  return dashboardAppointmentUrl({
    clinicId,
    doctorId,
    day: match[1],
    notice,
    after: appointmentAt,
  });
}
