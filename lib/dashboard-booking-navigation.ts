import { baghdadDate } from "@/lib/i18n/config";

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
