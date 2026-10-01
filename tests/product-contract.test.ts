import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

test("Atlas visual feedback and readability layers remain loaded", () => {
  const layout = source("app/layout.tsx");
  assert.match(layout, /atlas-interactions\.css/);
  assert.match(layout, /atlas-readability\.css/);
  assert.match(layout, /patient-clarity\.css/);
});

test("doctor workflow keeps the five supported clinic intervals and receptionist assignment boundary", () => {
  const route = source("app/api/settings/doctor-workflow/route.ts");
  assert.match(route, /new Set\(\[5, 10, 15, 20, 30\]\)/);
  assert.match(route, /membership\?\.role === "receptionist" \? membership\.assigned_doctor_id/);
  assert.match(route, /doctorSpecialty/);
  assert.match(route, /receptionPhone/);
});

test("patient appointment stays doctor-aware, localized, and queue-aware", () => {
  const patientPage = source("app/patient/[token]/page.tsx");
  const shareButton = source("app/dashboard/patient-link-button.tsx");
  assert.match(patientPage, /doctor_specialty/);
  assert.match(patientPage, /receptionist_phone/);
  assert.match(patientPage, /queue_position/);
  assert.match(patientPage, /پێش نیوەڕۆ/);
  assert.match(patientPage, /دوای نیوەڕۆ/);
  assert.match(patientPage, /Confirm appointment/);
  assert.match(patientPage, /نەخۆش لە پێشتە/);
  assert.match(patientPage, /patients ahead of you/);
  assert.match(patientPage, /مرضى قبلك/);
  assert.doesNotMatch(patientPage, /وادە پێش تۆیە/);
});

test("appointment history remains administration-only", () => {
  const history = source("app/dashboard/history/page.tsx");
  assert.match(history, /membership\?\.role === "owner" \|\| membership\?\.role === "manager"/);
  assert.match(history, /if \(!canManageRecords\) redirect/);
});

test("Meta webhook signature verification and bounded reminder worker stay in place", () => {
  const webhook = source("app/api/whatsapp/webhook/route.ts");
  const whatsapp = source("lib/reminders/whatsapp.ts");
  const cron = source("app/api/cron/reminders/route.ts");
  assert.match(webhook, /verifyWebhookSignature/);
  assert.match(whatsapp, /maximumBytes/);
  assert.match(cron, /validate_whatsapp_reminder_claim/);
  assert.match(cron, /p_global_daily_limit/);
});

test("database keeps double-booking and doctor-specific reminder protections", () => {
  const doubleBooking = source("supabase/migrations/20260815015730_prevent_double_booked_doctor_slots.sql");
  const doctorReminder = source("supabase/migrations/20260819192000_fix_doctor_specific_reminder_preparation.sql");
  assert.match(doubleBooking, /unique/i);
  assert.match(doubleBooking, /doctor/i);
  assert.match(doctorReminder, /doctor_workflow_settings/);
  assert.match(doctorReminder, /reminders_enabled/);
});

test("feature branches do not consume the production Vercel deployment budget", () => {
  const vercel = JSON.parse(source("vercel.json")) as { git?: { deploymentEnabled?: Record<string, boolean> } };
  assert.equal(vercel.git?.deploymentEnabled?.main, true);
  assert.equal(vercel.git?.deploymentEnabled?.["*"], false);
});

test("the durable Atlas product contract is part of the repository", () => {
  const contract = source("docs/ATLAS_PRODUCT_CONTRACT.md");
  assert.match(contract, /Product standard:/);
  assert.match(contract, /patient-facing appointment contract/i);
  assert.match(contract, /Security and privacy invariants/);
  assert.match(contract, /Quality bar for every future Atlas change/);
});

test("unavailable patient links keep a localized fallback language", () => {
  const patientPage = source("app/patient/[token]/page.tsx");
  const shareButton = source("app/dashboard/patient-link-button.tsx");

  assert.match(patientPage, /searchParams: Promise<\{ view\?: string; lang\?: string; error\?: string \}>/);
  assert.match(patientPage, /const fallbackLocale = patientLocale\(query\.lang \?\? "en"\)/);
  assert.match(shareButton, /url\.searchParams\.set\("lang", reminderLanguage\)/);
  assert.match(shareButton, /\}, \[reminderLanguage, state\.link\]\);/);
  assert.match(patientPage, /<Unavailable locale=\{fallbackLocale\} \/>/);
  for (const phrase of [
    "This link is unavailable.",
    "ئەم بەستەرە بەردەست نییە.",
    "ئەڤ لینکە بەردەست نینە.",
    "هذا الرابط غير متاح.",
  ]) assert.match(patientPage, new RegExp(phrase));
  assert.match(patientPage, /<section className="auth-card" lang=\{text\.lang\} dir=\{text\.dir\}>/);
});


test("remembered receptionist schedules reject impossible calendar days", () => {
  const navigation = source("app/dashboard/app-navigation.tsx");

  assert.match(navigation, /function isCalendarDay\(day: string\)/);
  assert.match(navigation, /baghdadDay\(date\) === day/);
  assert.match(navigation, /if \(!isCalendarDay\(day\)\)/);
  assert.match(navigation, /url\.searchParams\.delete\("day"\)/);
});


test("patient appointment response accessibility follows the patient language", () => {
  const patientPage = source("app/patient/[token]/page.tsx");

  assert.match(patientPage, /responseActions: "Appointment response options"/);
  assert.match(patientPage, /responseActions: "هەڵبژاردەکانی وەڵامدانەوەی مەوعید"/);
  assert.match(patientPage, /responseActions: "هەلبژاردەیێن بەرسڤدانا وادەیێ"/);
  assert.match(patientPage, /responseActions: "خيارات الرد على الموعد"/);
  assert.match(patientPage, /role="group" aria-label=\{text\.responseActions\}/);
  assert.doesNotMatch(patientPage, /aria-label="Patient appointment response"/);
});

test("manual WhatsApp appointment shares use the patient reminder language", () => {
  const shareButton = source("app/dashboard/patient-link-button.tsx");

  assert.match(shareButton, /const patientMessage = copy\[reminderLanguage\]/);
  assert.match(shareButton, /const lines: string\[\] = \[patientMessage\.title\]/);
  assert.match(shareButton, /patientMessage\.doctor/);
  assert.match(shareButton, /appointmentText\(state\.appointmentAt, reminderLanguage\)/);
  assert.match(shareButton, /patientMessage\.time/);
  assert.match(shareButton, /patientMessage\.details/);
  assert.doesNotMatch(shareButton, /appointmentText\(state\.appointmentAt, locale\)/);
});

test("patient queue numbers use the patient language digits", () => {
  const patientPage = source("app/patient/[token]/page.tsx");

  assert.ok(patientPage.includes("const queuePosition = appointment.queue_position ? localizeDigits(appointment.queue_position, locale) : null;"));
  assert.ok(patientPage.includes("const aheadCount = localizeDigits(ahead, locale);"));
  assert.ok(patientPage.includes('aria-label={`${text.order} ${queuePosition}`}'));
  assert.ok(patientPage.includes("<strong>#{queuePosition}</strong>"));
  assert.ok(patientPage.includes("`${aheadCount} ${ahead === 1 ? text.ahead : text.aheadMany}.`"));
});

test("patient appointment mutations disable their controls while an update is pending", () => {
  const patientPage = source("app/patient/[token]/page.tsx");
  const patientButton = source("app/patient/[token]/patient-submit-button.tsx");

  assert.match(patientButton, /useFormStatus\(\)/);
  assert.match(patientButton, /disabled=\{pending\}/);
  assert.match(patientButton, /aria-disabled=\{pending\}/);
  assert.match(patientButton, /formAction=\{formAction\}/);
  assert.match(patientPage, /updating: "Updating…"/);
  assert.match(patientPage, /updating: "نوێ دەکرێتەوە…"/);
  assert.match(patientPage, /updating: "دهێتە نوێکرن…"/);
  assert.match(patientPage, /updating: "جارٍ التحديث…"/);
  assert.match(patientPage, /className="patient-actions" role="group" aria-label=\{text\.responseActions\}/);
  assert.match(patientPage, /formAction=\{updatePatientAppointment\.bind\(null, token, "confirmed"\)\}/);
  assert.match(patientPage, /formAction=\{updatePatientAppointment\.bind\(null, token, "cancelled"\)\}/);
});

test("patient mutation failures return to a localized visible error instead of failing silently", () => {
  const patientPage = source("app/patient/[token]/page.tsx");
  const patientActions = source("app/patient/[token]/actions.ts");

  assert.match(patientPage, /searchParams: Promise<\{ view\?: string; lang\?: string; error\?: string \}>/);
  assert.match(patientPage, /const actionFailed = query\.error === "update_failed"/);
  assert.match(patientPage, /role="alert">\{text\.actionFailed\}<\/p>/);
  assert.match(patientPage, /actionFailed: "Could not save your change\. Try again\."/);
  assert.match(patientPage, /actionFailed: "گۆڕانکارییەکە پاشەکەوت نەکرا\. دووبارە هەوڵ بدە\."/);
  assert.match(patientPage, /actionFailed: "گۆڕین نەهاتە پاراستن\. دووبارە هەول بدە\."/);
  assert.match(patientPage, /actionFailed: "ما انحفظ التغيير\. حاول مرة ثانية\."/);
  assert.equal((patientPage.match(/name="return_view"/g) ?? []).length, 4);

  assert.match(patientActions, /function patientMutationFailureUrl\(token: string, formData: FormData\)/);
  assert.match(patientActions, /formData\.get\("return_view"\) === "reminder"/);
  assert.match(patientActions, /new URLSearchParams\(\{ error: "update_failed" \}\)/);
  assert.match(patientActions, /updatePatientAppointment\(token: string, status: string, formData: FormData\)/);
  assert.match(patientActions, /updateEarlierSlotPreference\(token: string, enabled: boolean, formData: FormData\)/);
  assert.match(patientActions, /if \(!context\) redirect\(patientMutationFailureUrl\(token, formData\)\)/);
});

