import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("fast appointment removal writes the complete archive audit metadata", () => {
  const action = read("app/dashboard/instant-actions.ts");

  assert.match(action, /archiveAppointmentInline\([\s\S]*expectedStatus: string/);
  assert.match(action, /supabase\.auth\.getUser\(\)/);
  assert.match(action, /status: "voided"/);
  assert.match(action, /voided_at: new Date\(\)\.toISOString\(\)/);
  assert.match(action, /voided_by: userId/);
  assert.match(action, /void_reason: "Removed by clinic staff"/);
  assert.match(action, /\.eq\("status", expectedStatus\)/);
  assert.match(action, /archiveAppointmentInline[\s\S]*\.eq\("appointment_revision", expectedRevision\)/);
  assert.match(ui, /archiveAppointmentInline\(clinicId, appointmentId, optimisticStatus, revision\)/);
  assert.match(action, /revalidatePath\("\/dashboard\/history"\)/);
});

test("fast appointment removal is concurrency-safe and repeat removal is idempotent", () => {
  const action = read("app/dashboard/instant-actions.ts");
  const ui = read("app/dashboard/appointment-actions.tsx");

  assert.match(action, /select\("status, voided_at"\)/);
  assert.match(action, /current\?\.voided_at[\s\S]*archived: true/);
  assert.match(action, /current\.status !== expectedStatus[\s\S]*reason: "stale"/);
  const archiveAction = action.slice(action.indexOf("export async function archiveAppointmentInline"));
  assert.match(
    archiveAction,
    /if \(current && isAppointmentStatus\(current\.status\) && current\.status !== expectedStatus\) \{\s*return \{ ok: false, reason: "stale" \};\s*\}\s*return \{ ok: false, reason: "stale" \};/,
  );
  assert.match(ui, /archiveAppointmentInline\(clinicId, appointmentId, optimisticStatus\)/);
  assert.match(ui, /result\.reason === "stale"[\s\S]*router\.refresh\(\)/);
});
