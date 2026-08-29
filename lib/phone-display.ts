import { normalizeAuthPhone } from "@/lib/phone-auth";

/**
 * Human-readable phone formatting only. Authentication/storage values stay E.164.
 * Iraqi mobiles are grouped as +964 7XX XXX XXXX for fast receptionist scanning.
 */
export function formatPhoneForDisplay(value: string | null | undefined): string {
  if (!value) return "";

  const normalized = normalizeAuthPhone(value);
  if (!normalized) return value;

  const iraqi = normalized.match(/^\+964(7\d{2})(\d{3})(\d{4})$/);
  if (iraqi) return `+964 ${iraqi[1]} ${iraqi[2]} ${iraqi[3]}`;

  // Keep other valid international numbers readable without guessing national grouping.
  const international = normalized.match(/^\+(\d{1,3})(\d+)$/);
  if (!international) return normalized;
  return `+${international[1]} ${international[2]}`;
}
