import "server-only";
import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";

const CODE_LENGTH = 8;

export function createStaffSetupCode() {
  const code = randomInt(0, 10 ** CODE_LENGTH).toString().padStart(CODE_LENGTH, "0");
  const salt = randomBytes(16).toString("base64url");
  return {
    code,
    salt,
    hash: hashStaffSetupCode(code, salt),
  };
}

export function hashStaffSetupCode(code: string, salt: string) {
  return scryptSync(code, salt, 32).toString("base64url");
}

export function verifyStaffSetupCode(code: string, salt: string, expectedHash: string) {
  if (!/^\d{8}$/.test(code)) return false;
  const actual = Buffer.from(hashStaffSetupCode(code, salt), "utf8");
  const expected = Buffer.from(expectedHash, "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function setupCodeExpiry() {
  return new Date(Date.now() + 30 * 60 * 1000).toISOString();
}

export function createInternalAuthPassword() {
  return randomBytes(48).toString("base64url");
}
