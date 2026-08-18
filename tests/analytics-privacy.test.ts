import assert from "node:assert/strict";
import test from "node:test";
import { classifyAtlasScreen, sanitizeAtlasAnalyticsPayload } from "../lib/analytics/schema.ts";

test("patient token paths are reduced to a non-sensitive screen name", () => {
  assert.equal(classifyAtlasScreen("/patient/super-secret-token-value"), "patient_appointment");
});

test("analytics accepts only the explicit event and property allowlist", () => {
  const safe = sanitizeAtlasAnalyticsPayload({
    event: "atlas_appointment_created",
    session_id: "12345678-1234-1234-1234-123456789012",
    properties: {
      screen: "schedule",
      surface: "clinic",
      outcome: "success",
      patient_name: "Must Never Leave Atlas",
      patient_phone: "+9647500000000",
      clinic_id: "also-not-allowed",
      token: "private-token",
    },
  });

  assert.deepEqual(safe, {
    event: "atlas_appointment_created",
    session_id: "12345678-1234-1234-1234-123456789012",
    properties: {
      screen: "schedule",
      surface: "clinic",
      outcome: "success",
    },
  });
});

test("analytics rejects unknown events and invalid session identifiers", () => {
  assert.equal(sanitizeAtlasAnalyticsPayload({ event: "patient_name", session_id: "1234567890123456" }), null);
  assert.equal(sanitizeAtlasAnalyticsPayload({ event: "atlas_screen_viewed", session_id: "short" }), null);
});

test("analytics bounds numeric performance values", () => {
  const safe = sanitizeAtlasAnalyticsPayload({
    event: "atlas_navigation",
    session_id: "12345678-1234-1234-1234-123456789012",
    properties: { duration_ms: 124.7, target: "settings" },
  });
  assert.equal(safe?.properties.duration_ms, 125);

  const tooLarge = sanitizeAtlasAnalyticsPayload({
    event: "atlas_navigation",
    session_id: "12345678-1234-1234-1234-123456789012",
    properties: { duration_ms: 999999 },
  });
  assert.equal(tooLarge?.properties.duration_ms, undefined);
});
