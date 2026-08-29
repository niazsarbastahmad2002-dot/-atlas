const arabicIndicDigits: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

export function toAsciiPhoneDigits(value: string) {
  return Array.from(value, (character) => arabicIndicDigits[character] ?? character).join("");
}

export function normalizeAuthPhone(value: string): string | null {
  let normalized = toAsciiPhoneDigits(value).trim();
  if (!normalized) return null;

  normalized = normalized.replace(/[\s().-]/g, "");
  if (normalized.startsWith("00")) normalized = `+${normalized.slice(2)}`;

  // Atlas is Iraq-first: accept the familiar local mobile forms as a convenience.
  if (/^07\d{9}$/.test(normalized)) normalized = `+964${normalized.slice(1)}`;
  else if (/^7\d{9}$/.test(normalized)) normalized = `+964${normalized}`;
  // Supabase Auth may return a verified phone as digits-only E.164 (for example
  // 9647501234567). Treat that as the same international number rather than
  // rejecting a phone that Supabase has already verified.
  else if (/^[1-9]\d{7,14}$/.test(normalized)) normalized = `+${normalized}`;

  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) return null;
  return normalized;
}

export function normalizeOtpToken(value: string) {
  return toAsciiPhoneDigits(value).replace(/\D/g, "").slice(0, 10);
}

export function maskPhone(phone: string) {
  if (phone.length <= 7) return phone;
  return `${phone.slice(0, 4)}••••${phone.slice(-3)}`;
}
