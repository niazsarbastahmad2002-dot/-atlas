export const dashboardMessages = {
  clinic_invalid: "Clinic name must be between 2 and 120 characters.",
  clinic_create_failed: "The clinic workspace could not be created. Please try again.",
  clinic_created: "Clinic workspace created.",
  clinic_unavailable: "That clinic is unavailable or you do not have access to it.",
  clinic_settings_invalid: "Choose a valid clinic setting and try again.",
  clinic_settings_update_failed: "The clinic settings could not be updated. Please try again.",
  clinic_settings_updated: "Clinic settings updated.",
  doctor_invalid: "Check the doctor details and try again.",
  doctor_create_failed: "The doctor could not be added. Check your clinic permissions and try again.",
  doctor_created: "Doctor added.",
  doctor_update_failed: "The doctor could not be updated. Check your clinic permissions and try again.",
  doctor_updated: "Doctor updated.",
  doctor_archived: "Doctor archived. Existing appointments keep their doctor history.",
  doctor_restored: "Doctor restored.",
  appointment_invalid: "Check the appointment details and try again.",
  appointment_phone_invalid: "Enter an Iraqi mobile number, such as 0750 000 0000.",
  appointment_time_invalid: "Choose a valid future date and time in Erbil.",
  appointment_create_failed: "The appointment could not be saved. Please try again.",
  appointment_created: "Appointment saved.",
  appointment_duplicate: "That appointment was already saved.",
  appointment_status_invalid: "That appointment status change is not allowed.",
  appointment_update_failed: "The appointment could not be updated. Refresh and try again.",
  appointment_updated: "Appointment status updated.",
  appointment_archive_failed: "The appointment could not be archived. Refresh and try again.",
  appointment_archived: "Appointment archived. Its history was retained.",
  workspace_load_failed: "The clinic workspace could not load. Please refresh and try again.",
} as const;

export const loginMessages = {
  invalid_link: "The sign-in link is invalid or expired. Please request a new one.",
  signed_out: "You have signed out safely.",
  google_unavailable: "Google sign-in is not activated for this clinic yet. Use the email link below for now.",
} as const;

export type DashboardMessageCode = keyof typeof dashboardMessages;
export type LoginMessageCode = keyof typeof loginMessages;

export function getDashboardMessage(code: string | undefined) {
  return code && code in dashboardMessages
    ? dashboardMessages[code as DashboardMessageCode]
    : null;
}

export function getLoginMessage(code: string | undefined) {
  return code && code in loginMessages
    ? loginMessages[code as LoginMessageCode]
    : null;
}
