type PatientCalendarInput = {
  clinicName: string;
  doctorName: string;
  doctorSpecialty?: string | null;
  appointmentAt: string;
  appointmentIntervalMinutes: number;
  uidSeed: string;
};

function calendarTimestamp(value: Date) {
  if (Number.isNaN(value.getTime())) throw new Error("Invalid calendar timestamp.");
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeCalendarText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function foldCalendarLine(line: string) {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let limit = 75;

  for (const character of line) {
    const candidate = current + character;
    if (encoder.encode(candidate).length > limit && current) {
      parts.push(current);
      current = character;
      limit = 74;
    } else {
      current = candidate;
    }
  }

  parts.push(current);
  return parts.join("\r\n ");
}

export function buildPatientCalendar(
  input: PatientCalendarInput,
  generatedAt = new Date(),
) {
  const appointmentAt = new Date(input.appointmentAt);
  const uid = input.uidSeed.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  const durationMinutes = Math.trunc(input.appointmentIntervalMinutes);
  if (!uid) throw new Error("Calendar UID seed is required.");
  if (!Number.isFinite(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) {
    throw new Error("Appointment interval is invalid.");
  }

  const description = input.doctorSpecialty
    ? `${input.doctorName} · ${input.doctorSpecialty}`
    : input.doctorName;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Atlas//Appointment//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:atlas-${uid}@atlasclinic`,
    `DTSTAMP:${calendarTimestamp(generatedAt)}`,
    `DTSTART:${calendarTimestamp(appointmentAt)}`,
    `DURATION:PT${durationMinutes}M`,
    `SUMMARY:${escapeCalendarText(`${input.clinicName} — ${input.doctorName}`)}`,
    `DESCRIPTION:${escapeCalendarText(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].map(foldCalendarLine).join("\r\n");
}
