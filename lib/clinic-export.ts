export const CLINIC_EXPORT_SCHEMA = "atlas_clinic_archive_v1" as const;
export const CLINIC_EXPORT_MAX_APPOINTMENTS = 10_000;
export const CLINIC_EXPORT_MAX_WAITLIST_ROWS = 5_000;
export const CLINIC_EXPORT_MAX_ACTIVITY_EVENTS = 20_000;
export const CLINIC_EXPORT_MAX_BYTES = 10 * 1024 * 1024;

export type ClinicExportFormat = "json" | "csv" | "html";

export type ClinicArchiveInput = {
  generatedAt: string;
  clinic: {
    name: string;
    createdAt: string;
    appointmentIntervalMinutes: number;
  };
  doctors: Array<{
    name: string;
    active: boolean;
    displayOrder: number;
    specialty: string | null;
    receptionistPhone: string | null;
  }>;
  clinicReminderSettings: null | {
    enabled: boolean;
    leadMinutes: number;
    secondLeadMinutes: number | null;
    dailyMessageLimit: number;
    defaultReminderLanguage: string;
  };
  doctorWorkflowSettings: Array<{
    doctorName: string;
    appointmentIntervalMinutes: number;
    remindersEnabled: boolean;
    reminderLeadMinutes: number;
    reminderSecondLeadMinutes: number | null;
    defaultReminderLanguage: string;
    updatedAt: string;
  }>;
  appointments: Array<{
    patientName: string;
    patientPhone: string;
    contactRelationship: string;
    doctorName: string;
    appointmentAt: string;
    status: string;
    reminderStatus: string;
    reminderConsent: boolean;
    reminderConsentAt: string | null;
    reminderLanguage: string;
    arrivalSignal: string | null;
    arrivalSignalAt: string | null;
    voidedAt: string | null;
    voidReason: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  smartFillWaitlist: Array<{
    patientName: string;
    patientPhone: string;
    doctorName: string;
    reminderLanguage: string;
    latestAcceptableAt: string;
    contactConsentAt: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
  activityHistory: Array<{
    actorType: string;
    action: string;
    fromStatus: string | null;
    toStatus: string | null;
    reason: string | null;
    occurredAt: string;
    entityType: string;
  }>;
};

export type ClinicArchive = {
  schema: typeof CLINIC_EXPORT_SCHEMA;
  generatedAt: string;
  notice: string;
  clinic: ClinicArchiveInput["clinic"];
  doctors: ClinicArchiveInput["doctors"];
  clinicReminderSettings: ClinicArchiveInput["clinicReminderSettings"];
  doctorWorkflowSettings: ClinicArchiveInput["doctorWorkflowSettings"];
  appointments: ClinicArchiveInput["appointments"];
  smartFillWaitlist: ClinicArchiveInput["smartFillWaitlist"];
  activityHistory: ClinicArchiveInput["activityHistory"];
};

export function buildClinicArchive(input: ClinicArchiveInput): ClinicArchive {
  return {
    schema: CLINIC_EXPORT_SCHEMA,
    generatedAt: input.generatedAt,
    notice: "Sensitive clinic operational archive. Store securely. Authentication credentials, internal identifiers, provider secrets, and cross-clinic data are intentionally excluded.",
    clinic: input.clinic,
    doctors: input.doctors,
    clinicReminderSettings: input.clinicReminderSettings,
    doctorWorkflowSettings: input.doctorWorkflowSettings,
    appointments: input.appointments,
    smartFillWaitlist: input.smartFillWaitlist,
    activityHistory: input.activityHistory,
  };
}

function totalRecordCount(archive: ClinicArchive) {
  return archive.doctors.length
    + archive.doctorWorkflowSettings.length
    + archive.appointments.length
    + archive.smartFillWaitlist.length
    + archive.activityHistory.length;
}

export function serializeClinicArchive(archive: ClinicArchive) {
  const text = `${JSON.stringify(archive, null, 2)}\n`;
  return {
    text,
    byteCount: Buffer.byteLength(text, "utf8"),
    recordCount: totalRecordCount(archive),
  };
}

function spreadsheetSafe(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  const protectedText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${protectedText.replaceAll('"', '""')}"`;
}

function baghdadDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function serializeClinicAppointmentsCsv(archive: ClinicArchive) {
  const headers = [
    "Patient name",
    "Phone",
    "Phone belongs to",
    "Doctor",
    "Appointment time (Iraq)",
    "Status",
    "Reminder status",
    "Reminder consent",
    "Reminder language",
    "Arrival signal",
    "Arrival time (Iraq)",
    "Voided at (Iraq)",
    "Void reason",
    "Created at (Iraq)",
    "Updated at (Iraq)",
  ];

  const rows = archive.appointments.map((appointment) => [
    appointment.patientName,
    appointment.patientPhone,
    appointment.contactRelationship,
    appointment.doctorName,
    baghdadDateTime(appointment.appointmentAt),
    appointment.status,
    appointment.reminderStatus,
    appointment.reminderConsent ? "Yes" : "No",
    appointment.reminderLanguage,
    appointment.arrivalSignal,
    baghdadDateTime(appointment.arrivalSignalAt),
    baghdadDateTime(appointment.voidedAt),
    appointment.voidReason,
    baghdadDateTime(appointment.createdAt),
    baghdadDateTime(appointment.updatedAt),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(spreadsheetSafe).join(","))
    .join("\r\n");
  const text = `\uFEFF${csv}\r\n`;
  return {
    text,
    byteCount: Buffer.byteLength(text, "utf8"),
    recordCount: archive.appointments.length,
  };
}

function escapeHtml(value: unknown) {
  const text = value === null || value === undefined || value === "" ? "—" : String(value);
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

function table(headers: string[], rows: unknown[][], emptyMessage: string) {
  if (!rows.length) return `<p class="empty">${escapeHtml(emptyMessage)}</p>`;
  const head = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const body = rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("");
  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

export function serializeClinicReadableHtml(archive: ClinicArchive) {
  const reminder = archive.clinicReminderSettings;
  const generated = baghdadDateTime(archive.generatedAt);
  const created = baghdadDateTime(archive.clinic.createdAt);
  const doctors = archive.doctors.map((doctor) => [
    doctor.name,
    doctor.specialty,
    doctor.active ? "Active" : "Archived",
    doctor.receptionistPhone,
    doctor.displayOrder + 1,
  ]);
  const appointments = archive.appointments.map((appointment) => [
    appointment.patientName,
    appointment.patientPhone,
    appointment.contactRelationship,
    appointment.doctorName,
    baghdadDateTime(appointment.appointmentAt),
    appointment.status,
    appointment.reminderStatus,
    appointment.reminderConsent ? "Yes" : "No",
    appointment.reminderLanguage,
    appointment.voidReason,
  ]);
  const waitlist = archive.smartFillWaitlist.map((row) => [
    row.patientName,
    row.patientPhone,
    row.doctorName,
    row.status,
    baghdadDateTime(row.latestAcceptableAt),
    row.reminderLanguage,
  ]);
  const history = archive.activityHistory.map((event) => [
    baghdadDateTime(event.occurredAt),
    event.entityType,
    event.action,
    event.fromStatus,
    event.toStatus,
    event.reason,
    event.actorType,
  ]);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Atlas clinic archive — ${escapeHtml(archive.clinic.name)}</title>
<style>
  :root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:#102c25;background:#f5faf8}
  *{box-sizing:border-box}body{margin:0;padding:32px;background:#f5faf8}.page{max-width:1180px;margin:auto;background:#fff;border:1px solid #dce9e4;border-radius:20px;padding:32px;box-shadow:0 12px 40px rgba(16,44,37,.08)}
  h1{font-size:34px;margin:0 0 6px}h2{font-size:20px;margin:30px 0 12px}.muted,.empty{color:#64766f}.notice{padding:14px 16px;border-radius:12px;background:#eef8f4;border:1px solid #cce6dc;margin:18px 0}.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:18px 0}.card{padding:14px;border:1px solid #dce9e4;border-radius:12px;background:#fbfdfc}.card span{display:block;color:#64766f;font-size:12px;margin-bottom:5px}.card strong{font-size:18px}.table-wrap{overflow:auto;border:1px solid #dce9e4;border-radius:12px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:9px 10px;text-align:left;vertical-align:top;border-bottom:1px solid #e7efec;white-space:nowrap}th{position:sticky;top:0;background:#f0f7f4;font-size:11px}tr:last-child td{border-bottom:0}.footer{margin-top:28px;padding-top:16px;border-top:1px solid #dce9e4;color:#64766f;font-size:11px}
  @media print{body{background:#fff;padding:0}.page{box-shadow:none;border:0;border-radius:0;max-width:none;padding:12mm}.table-wrap{overflow:visible}th{position:static}table{font-size:9px}h2{break-after:avoid}.table-wrap{break-inside:auto}tr{break-inside:avoid}}
</style>
</head>
<body>
<main class="page">
  <div class="muted">ATLAS · CLINIC ARCHIVE</div>
  <h1>${escapeHtml(archive.clinic.name)}</h1>
  <div class="muted">Generated ${escapeHtml(generated)} · Iraq time</div>
  <div class="notice"><strong>Keep this file private.</strong> It contains clinic operational data and may contain patient names and phone numbers. Authentication credentials, provider secrets and internal identifiers are excluded.</div>

  <section class="summary">
    <div class="card"><span>Clinic created</span><strong>${escapeHtml(created)}</strong></div>
    <div class="card"><span>Appointment interval</span><strong>${escapeHtml(`${archive.clinic.appointmentIntervalMinutes} min`)}</strong></div>
    <div class="card"><span>Doctors</span><strong>${archive.doctors.length}</strong></div>
    <div class="card"><span>Appointments</span><strong>${archive.appointments.length}</strong></div>
    <div class="card"><span>Smart Fill waiting</span><strong>${archive.smartFillWaitlist.length}</strong></div>
    <div class="card"><span>Activity events</span><strong>${archive.activityHistory.length}</strong></div>
  </section>

  <h2>Clinic reminder settings</h2>
  ${reminder ? `<div class="summary">
    <div class="card"><span>Reminders</span><strong>${escapeHtml(reminder.enabled ? "Enabled" : "Disabled")}</strong></div>
    <div class="card"><span>First reminder</span><strong>${escapeHtml(`${reminder.leadMinutes} min before`)}</strong></div>
    <div class="card"><span>Second reminder</span><strong>${escapeHtml(reminder.secondLeadMinutes === null ? "Off" : `${reminder.secondLeadMinutes} min before`)}</strong></div>
    <div class="card"><span>Default language</span><strong>${escapeHtml(reminder.defaultReminderLanguage)}</strong></div>
    <div class="card"><span>Daily message limit</span><strong>${escapeHtml(reminder.dailyMessageLimit)}</strong></div>
  </div>` : `<p class="empty">No clinic reminder settings.</p>`}

  <h2>Doctors</h2>
  ${table(["Doctor", "Specialty", "Status", "Reception phone", "Order"], doctors, "No doctors.")}

  <h2>Appointments</h2>
  ${table(["Patient", "Phone", "Phone owner", "Doctor", "Appointment (Iraq)", "Status", "Reminder", "Consent", "Language", "Void reason"], appointments, "No appointments in this archive.")}

  <h2>Smart Fill waitlist</h2>
  ${table(["Patient", "Phone", "Doctor", "Status", "Latest acceptable time (Iraq)", "Language"], waitlist, "No Smart Fill waitlist entries.")}

  <h2>Activity history</h2>
  ${table(["Time (Iraq)", "Type", "Action", "From", "To", "Reason", "Actor"], history, "No activity history entries.")}

  <div class="footer">Technical schema: ${escapeHtml(archive.schema)} · Atlas does not retain this generated report after download.</div>
</main>
</body>
</html>`;

  return {
    text: html,
    byteCount: Buffer.byteLength(html, "utf8"),
    recordCount: totalRecordCount(archive),
  };
}

function safeClinicName(clinicName: string) {
  return clinicName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "clinic";
}

export function clinicArchiveFilename(clinicName: string, generatedAt: string) {
  return `atlas-${safeClinicName(clinicName)}-${generatedAt.slice(0, 10)}.json`;
}

export function clinicAppointmentsCsvFilename(clinicName: string, generatedAt: string) {
  return `atlas-${safeClinicName(clinicName)}-appointments-${generatedAt.slice(0, 10)}.csv`;
}

export function clinicReadableReportFilename(clinicName: string, generatedAt: string) {
  return `atlas-${safeClinicName(clinicName)}-readable-${generatedAt.slice(0, 10)}.html`;
}
