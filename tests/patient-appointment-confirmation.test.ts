import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const bookingForm = source("app/care/[clinicSlug]/[doctorSlug]/book/booking-form.tsx");
const privatePage = source("app/patient/[token]/page.tsx");
const confirmation = source("app/patient/[token]/booking-confirmation.tsx");
const finalizer = source("app/api/care/booking/finalize/route.ts");

test("only a successful authorized finalization navigates to the confirmation view", () => {
  assert.match(bookingForm, /interpretBookingResponse\(bookingResponse\.status, booking\)/);
  assert.match(bookingForm, /outcome === "saved"/);
  assert.match(bookingForm, /destination\.origin === window\.location\.origin/);
  assert.ok(bookingForm.includes("destination.pathname"));
  assert.match(bookingForm, /destination\.searchParams\.set\("view", "confirmation"\)/);
  assert.match(bookingForm, /window\.location\.replace\(/);
  assert.match(bookingForm, /bookingInFlight\.current/);
  assert.match(bookingForm, /bookingRetryMatches\(firstBookingPayload\.current, payload\)/);
  assert.match(bookingForm, /firstBookingPayload\.current = payload/);
  assert.match(bookingForm, /idempotency_mismatch/);
  assert.match(bookingForm, /setNeedsAppointmentReview\(true\)/);
  assert.match(bookingForm, /href=\{`\/patient-account\?lang=\$\{props\.locale\}`\}/);
  assert.match(finalizer, /admin\.auth\.getUser\(token\)/);
  assert.match(finalizer, /finalize_verified_public_booking_service/);
  assert.match(finalizer, /result\.result === "created" && result\.appointment_id/);
  assert.match(finalizer, /result\.result === "duplicate" && result\.appointment_id/);
  assert.ok(finalizer.includes("accountPath: `/patient-account?lang="));
  assert.ok(finalizer.includes('return response({ status: "uncertain" }, 503);'));
  assert.match(bookingForm, /outcome === "existing" && typeof booking\?\.accountPath === "string"/);
  assert.ok(bookingForm.includes('destination.pathname === "/patient-account"'));
  assert.match(finalizer, /patientPath: `\/patient\/\$\{patientToken\}/);
});

test("confirmation requires a real accessible private appointment, not URL-provided details", () => {
  const rateLimit = privatePage.indexOf('admin.rpc(\n    "consume_patient_link_rate_limit"');
  const verifiedAppointment = privatePage.indexOf('admin.rpc("get_patient_appointment"');
  const errorGate = privatePage.indexOf('if (error || !appointment) return <Unavailable');
  const confirmationGate = privatePage.indexOf('if (query.view === "confirmation" && isActive)');
  assert.ok(rateLimit > 0 && rateLimit < verifiedAppointment);
  assert.ok(verifiedAppointment < errorGate && errorGate < confirmationGate);
  assert.match(privatePage, /if \(!isPatientToken\(token\)\) return <Unavailable/);
  assert.match(privatePage, /hashPatientToken\(token\)/);
  assert.match(privatePage, /status=\{isConfirmed \? "confirmed" : "pending"\}/);
  assert.match(privatePage, /clinicName=\{appointment\.clinic_name\}/);
  assert.match(privatePage, /doctorName=\{appointment\.doctor_name\}/);
  assert.match(privatePage, /dateLabel=\{dateText\}/);
  assert.match(privatePage, /timeLabel=\{`\$\{time\.clock\} \$\{time\.period\}`\}/);
  assert.doesNotMatch(confirmation, /searchParams|localStorage|sessionStorage|createAdminClient|fetch\(/);
});

test("pending is never advertised as confirmed or booked", () => {
  assert.match(privatePage, /const isPending = status === "pending"/);
  assert.match(privatePage, /const isConfirmed = status === "confirmed"/);
  assert.match(privatePage, /const isActive = isPending \|\| isConfirmed/);
  assert.match(confirmation, /const confirmed = status === "confirmed"/);
  assert.match(confirmation, /confirmed \? t\.confirmedTitle : t\.pendingTitle/);
  assert.match(confirmation, /confirmed \? t\.confirmedStatus : t\.pendingStatus/);
  assert.match(confirmation, /Your appointment record was saved, but attendance is not confirmed/);
  assert.doesNotMatch(confirmation, /pendingTitle: ".*(?:booked|confirmed)"/i);
  assert.match(confirmation, /<span data-status=\{status\}>/);
});

test("each patient language has localized labels and bidirectional-safe details", () => {
  for (const key of ["en", "ku", "bd", "ar"]) {
    assert.match(confirmation, new RegExp(`\\b${key}: \\{`));
  }
  assert.match(confirmation, /lang=\{meta\.language\} dir=\{meta\.direction\}/);
  assert.match(confirmation, /dir="auto">\{doctorName\}/);
  assert.match(confirmation, /dir="auto">\{clinicName\}/);
  assert.match(confirmation, /<bdi dir="ltr">\{timeLabel\}<\/bdi>/);
  assert.match(confirmation, /aria-current=\{locale === option\.locale \? "page" : undefined\}/);
  assert.match(confirmation, /@media\(max-width:520px\)/);
  assert.match(privatePage, /timeZone: "Asia\/Baghdad"/);
});

test("confirmation returns to existing appointment management and My appointments", () => {
  assert.match(confirmation, /privateHref\(token, locale, accountMarker, false\)/);
  assert.match(confirmation, /\/patient-account\?lang=\$\{locale\}/);
  assert.match(confirmation, /<AtlasPatientNav/);
  assert.match(confirmation, /params\.set\("view", "confirmation"\)/);
  assert.match(confirmation, /if \(accountMarker\) params\.set\("account", accountMarker\)/);
  assert.doesNotMatch(confirmation, /cancel|reschedule|signInWithOtp|sendOtp|POST\(/i);
});

test("self-booking and paid verification stay disabled by their existing gates", () => {
  assert.match(finalizer, /ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED !== "true"/);
  assert.match(source("app/care/[clinicSlug]/[doctorSlug]/book/page.tsx"), /ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED === "true"/);
  assert.match(source(".env.example"), /ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED=false/);
  assert.doesNotMatch(confirmation, /supabase|service_role|appointment_id|clinic_members/);
});
