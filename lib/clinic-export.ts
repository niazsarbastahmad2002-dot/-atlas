export const CLINIC_EXPORT_SCHEMA = "atlas_clinic_archive_v1" as const;
export const CLINIC_EXPORT_MAX_APPOINTMENTS = 10_000;
export const CLINIC_EXPORT_MAX_WAITLIST_ROWS = 5_000;
export const CLINIC_EXPORT_MAX_ACTIVITY_EVENTS = 20_000;
export const CLINIC_EXPORT_MAX_BYTES = 10 * 1024 * 1024;

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

export function serializeClinicArchive(archive: ClinicArchive) {
  const text = `${JSON.stringify(archive, null, 2)}\n`;
  return {
    text,
    byteCount: Buffer.byteLength(text, "utf8"),
    recordCount:
      archive.doctors.length
      + archive.doctorWorkflowSettings.length
      + archive.appointments.length
      + archive.smartFillWaitlist.length
      + archive.activityHistory.length,
  };
}

export function clinicArchiveFilename(clinicName: string, generatedAt: string) {
  const day = generatedAt.slice(0, 10);
  const safeName = clinicName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "clinic";
  return `atlas-${safeName}-${day}.json`;
}
