import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Source-contract regressions only. Live pg_proc, grants and tenant RLS must
// be reviewed separately: historical migrations are not an authoritative
// snapshot of a production database with divergent migration timestamps.
function migration(file: string) {
  return readFileSync(new URL("../supabase/migrations/" + file, import.meta.url), "utf8");
}

function functionSource(sql: string, name: string) {
  const expression = new RegExp("\\bcreate\\s+(?:or\\s+replace\\s+)?function\\s+public\\." + name + "\\s*\\(", "gi");
  const matches = [...sql.matchAll(expression)];
  assert.ok(matches.length > 0, "SQL definition missing for " + name);
  const start = matches.at(-1)!.index!;
  const end = sql.indexOf("$$;", start);
  assert.ok(end > start, "unterminated SQL body " + name);
  return sql.slice(start, end + 3);
}

function publishedDoctorGuard(body: string) {
  assert.match(body, /c\.is_published/i);
  assert.match(body, /d\.is_published/i);
  assert.match(body, /core(?:_doctor)?\.active/i);
}

function noPatientColumnsReturned(body: string) {
  const returns = body.match(/returns\s+table\s*\(([\s\S]*?)\)\s*language/i)?.[1];
  assert.ok(returns, "public function must explicitly declare output columns");
  assert.doesNotMatch(returns, /patient_name|patient_phone|appointment_id|contact_relationship|token_hash|reminder_consent/i);
}

test("public clinic and doctor RPCs remain published-only, output allowlisted", () => {
  const sql = migration("20261003190248_public_directory_foundation.sql");
  const clinic = functionSource(sql, "get_public_clinic_profile");
  assert.match(clinic, /p\.is_published/i);
  noPatientColumnsReturned(clinic);
  for (const name of ["get_public_doctor_profile", "list_public_doctors", "search_public_doctors"]) {
    const body = functionSource(sql, name);
    publishedDoctorGuard(body);
    noPatientColumnsReturned(body);
  }
});

test("public availability RPCs return slots only for published, enabled active doctors", () => {
  const files = [
    ["20261003190534_public_availability_v1.sql", "list_public_doctor_slots"],
    ["20261003213445_paged_public_doctor_slots.sql", "list_public_doctor_slots_page"],
  ];
  for (const [file, name] of files) {
    const body = functionSource(migration(file), name);
    assert.match(body, /c\.is_published/i);
    assert.match(body, /d\.is_published/i);
    assert.match(body, /core_doctor\.active/i);
    assert.match(body, /s\.enabled/i);
    assert.match(body, /not\s+exists\s*\(\s*select\s+1\s+from\s+public\.appointments/i);
    noPatientColumnsReturned(body);
  }
  const sorted = functionSource(
    migration("20261004000928_public_search_sort_before_limit.sql"),
    "search_public_doctors_with_availability",
  );
  publishedDoctorGuard(sorted);
  noPatientColumnsReturned(sorted);
});

test("clinic-export definer RPCs retain owner and requester authorization", () => {
  const audit = migration("20260826104500_secure_clinic_export_audit.sql");
  const formats = migration("20260826130000_expand_clinic_export_formats.sql");
  for (const sql of [audit, formats]) {
    const reserve = functionSource(sql, "reserve_clinic_export");
    assert.match(reserve, /auth\.uid\(\)/i);
    assert.match(reserve, /c\.owner_id\s*=\s*v_user_id/i);
    assert.match(reserve, /c\.id\s*=\s*p_clinic_id/i);
  }
  for (const name of ["complete_clinic_export", "fail_clinic_export"]) {
    const body = functionSource(audit, name);
    assert.match(body, /auth\.uid\(\)/i);
    assert.match(body, /e\.requested_by\s*=\s*v_user_id/i);
    assert.match(body, /c\.owner_id\s*=\s*v_user_id/i);
    assert.match(body, /e\.status\s*=\s*'started'/i);
  }
});

test("export route checks authenticated user and clinic ownership before data reads", () => {
  const route = readFileSync(new URL("../app/api/clinic-export/route.ts", import.meta.url), "utf8");
  assert.match(route, /supabase\.auth\.getUser\(\)/);
  assert.match(route, /clinic\.owner_id\s*!==\s*userData\.user\.id/);
  assert.match(route, /sameOriginRequest\(request\)/);
});

test("negative: removing publication or export owner guard is rejected", () => {
  const clinic = functionSource(migration("20261003190248_public_directory_foundation.sql"), "get_public_doctor_profile");
  assert.throws(() => publishedDoctorGuard(clinic.replace(/c\.is_published/i, "true")));
  const audit = functionSource(migration("20260826104500_secure_clinic_export_audit.sql"), "reserve_clinic_export");
  const ownerGuard = (body: string) => assert.match(body, /c\.owner_id\s*=\s*v_user_id/i);
  ownerGuard(audit);
  assert.throws(() => ownerGuard(audit.replace(/c\.owner_id\s*=\s*v_user_id/i, "true")));
});
