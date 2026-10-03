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
