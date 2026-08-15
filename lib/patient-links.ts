import { createHash, randomBytes } from "node:crypto";

const patientTokenPattern = /^[a-f0-9]{64}$/;

export function createPatientToken() {
  return randomBytes(32).toString("hex");
}

export function isPatientToken(value: string) {
  return patientTokenPattern.test(value);
}

export function hashPatientToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function patientLinkUrl(token: string) {
  const siteUrl = process.env.SITE_URL?.trim();
  if (!siteUrl) throw new Error("SITE_URL is not configured.");
  return new URL(`/patient/${token}`, siteUrl).toString();
}
