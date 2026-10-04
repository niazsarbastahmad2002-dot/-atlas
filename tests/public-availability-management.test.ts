import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("public availability management is explicit and manager-gated", () => {
  const actions = source("app/dashboard/settings/public-profile/availability/actions.ts");
  const page = source("app/dashboard/settings/public-profile/availability/page.tsx");

  assert.match(actions, /membership\?\.role === "owner" \|\| membership\?\.role === "manager"/);
  assert.match(page, /membership\?\.role === "owner" \|\| membership\?\.role === "manager"/);
  assert.match(actions, /formData\.get\("enabled"\) === "on"/);
  assert.match(actions, /clinic_public_booking_settings/);
  assert.match(actions, /doctor_public_booking_hours/);
  assert.match(actions, /doctor_public_booking_closed_dates/);
});

test("weekly public hours are bounded and remain separate from appointments", () => {
  const actions = source("app/dashboard/settings/public-profile/availability/actions.ts");
  const page = source("app/dashboard/settings/public-profile/availability/page.tsx");

  assert.match(actions, /for \(let weekday = 0; weekday <= 6; weekday \+= 1\)/);
  assert.match(actions, /timePattern\.test\(startsAt\)/);
  assert.match(actions, /startsAt >= endsAt/);
  assert.match(page, /Reception can still schedule outside these hours/);
  assert.match(page, /ڕیسێپشن هێشتا دەتوانێت لە دەرەوەی ئەم کاتانە مەوعید دابنێت/);
  assert.match(page, /يبقى الاستقبال قادراً على الحجز خارجها/);
  assert.doesNotMatch(actions, /\.from\("appointments"\)/);
});

test("public closed dates hide availability without cancelling appointments", () => {
  const actions = source("app/dashboard/settings/public-profile/availability/actions.ts");
  const page = source("app/dashboard/settings/public-profile/availability/page.tsx");

  assert.match(actions, /setDoctorPublicClosedDate/);
  assert.match(actions, /is_closed: isClosed/);
  assert.match(page, /without cancelling existing appointments/);
  assert.doesNotMatch(actions, /patient_update_appointment|status:\s*"cancelled"/);
});

test("public profile settings link to the separate availability editor", () => {
  const page = source("app/dashboard/settings/public-profile/page.tsx");

  assert.match(page, /\/dashboard\/settings\/public-profile\/availability\?clinic=/);
  assert.match(page, /Online booking hours/);
});


test("public availability writes never upsert immutable tenant keys", () => {
  const actions = source("app/dashboard/settings/public-profile/availability/actions.ts");

  assert.doesNotMatch(actions, /\.upsert\(/);
  assert.match(actions, /\.insert\(\{ clinic_id: clinicId, \.\.\.settingsPatch \}\)/);
  assert.match(actions, /\.update\(settingsPatch\)[\s\S]*\.eq\("clinic_id", clinicId\)/);
  assert.match(actions, /\.rpc\(\s*"save_doctor_public_booking_hours"/);
  assert.doesNotMatch(actions, /for \(const row of rows/);
  assert.match(actions, /\.update\(\{ is_closed: isClosed \}\)/);
});


test("weekly public hours are committed through one invoker RPC transaction", () => {
  const migration = source("supabase/migrations/20261003192820_public_availability_atomic_week.sql");
  const actions = source("app/dashboard/settings/public-profile/availability/actions.ts");

  assert.match(migration, /security invoker/i);
  assert.match(migration, /jsonb_array_length\(p_hours\) <> 7/);
  assert.match(migration, /count\(distinct x\.weekday\)/);
  assert.match(migration, /on conflict \(clinic_id, doctor_id, weekday\)/);
  assert.match(migration, /starts_at = excluded\.starts_at/);
  assert.match(actions, /weekSaved !== true/);
  assert.doesNotMatch(actions, /rows\.push\(\{\s*clinic_id:/);
});


test("public closed-date management stays future-focused in Baghdad time", () => {
  const actions = source("app/dashboard/settings/public-profile/availability/actions.ts");
  const page = source("app/dashboard/settings/public-profile/availability/page.tsx");

  assert.match(page, /const today = baghdadDate\.format\(new Date\(\)\)/);
  assert.match(page, /\.gte\("booking_date", today\)/);
  assert.match(page, /name="booking_date" min=\{today\} required/);
  assert.match(page, /formatLocalDateValue\(row\.booking_date, locale\)/);
  assert.match(actions, /isClosed && bookingDate < baghdadDate\.format\(new Date\(\)\)/);
});
