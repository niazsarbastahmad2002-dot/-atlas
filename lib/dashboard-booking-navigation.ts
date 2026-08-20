import { baghdadDate } from "./i18n/config.ts";

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
  const params = new URLSearchParams({
    notice,
    clinic: clinicId,
    day: baghdadDate.format(appointmentAt),
    doctor: doctorId,
  });

  return `/dashboard?${params.toString()}`;
}
