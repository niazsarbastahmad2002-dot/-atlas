/** Provider OTP length is configurable (Supabase supports 6–10 digits).
 * Actual Atlas production setting requires independent read-only dashboard check.
 * Supabase verifyOtp is authoritative; no code is persisted or logged here.
 */
export const EMAIL_OTP_MIN_LENGTH = 6;
export const EMAIL_OTP_MAX_LENGTH = 10;

export function normalizeAtlasEmailOtp(input: string): string | null {
  if (input.length > 32) return null;
  const digits = input.trim()
    .replace(/[٠-٩]/g, (x) => String(x.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (x) => String(x.charCodeAt(0) - 0x6f0))
    .replace(/[ \u00a0]/g, "");
  return /^[0-9]{6,10}$/.test(digits) ? digits : null;
}

export function normalizeAtlasEmailAddress(input: string): string | null {
  const email = input.trim().toLowerCase();
  return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
