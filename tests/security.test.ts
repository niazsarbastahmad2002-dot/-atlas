import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createPatientToken,
  hashPatientToken,
  isPatientToken,
  patientLinkUrl,
} from "../lib/patient-links.ts";
import { constantTimeEqual } from "../lib/security.ts";

test("creates high-entropy patient tokens in the accepted format", () => {
  const first = createPatientToken();
  const second = createPatientToken();
  assert.equal(first.length, 64);
  assert.equal(isPatientToken(first), true);
  assert.equal(isPatientToken(second), true);
  assert.notEqual(first, second);
});

test("rejects malformed patient tokens", () => {
  assert.equal(isPatientToken("a".repeat(63)), false);
  assert.equal(isPatientToken("A".repeat(64)), false);
  assert.equal(isPatientToken("g".repeat(64)), false);
});

test("hashes patient tokens deterministically without retaining raw token", () => {
  const token = "a".repeat(64);
  const hash = hashPatientToken(token);
  assert.equal(hash, "ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb");
  assert.notEqual(hash, token);
});

test("builds patient links only when SITE_URL is configured", () => {
  const previous = process.env.SITE_URL;
  process.env.SITE_URL = "https://atlas.example";
  try {
    assert.equal(
      patientLinkUrl("a".repeat(64)),
      `https://atlas.example/patient/${"a".repeat(64)}`,
    );
  } finally {
    if (previous === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = previous;
  }
});

test("throws instead of inventing a patient link origin", () => {
  const previous = process.env.SITE_URL;
  delete process.env.SITE_URL;
  try {
    assert.throws(() => patientLinkUrl("a".repeat(64)), /SITE_URL/);
  } finally {
    if (previous !== undefined) process.env.SITE_URL = previous;
  }
});

test("constant-time comparison returns correct equality result", () => {
  assert.equal(constantTimeEqual("same-value", "same-value"), true);
  assert.equal(constantTimeEqual("same-value", "different"), false);
  assert.equal(constantTimeEqual("short", "much-longer"), false);
});

test("receptionist access is constrained to one assigned doctor at the database boundary", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20260818173629_receptionist_doctor_assignment.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /assigned_doctor_id uuid references public\.doctors\(id\)/);
  assert.match(migration, /receptionist doctor assignment required/);
  assert.match(migration, /private\.can_access_doctor\(clinic_id, doctor_id\)/);
  assert.match(migration, /create policy appointments_select/);
  assert.match(migration, /create policy appointments_insert/);
  assert.match(migration, /create policy appointments_update/);
  assert.match(migration, /create policy doctors_select/);
});
