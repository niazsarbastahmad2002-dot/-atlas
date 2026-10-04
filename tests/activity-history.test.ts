import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("clinic activity history extends the existing audit store without copying patient values", async () => {
  const [migration, attribution, activityPage, historyPage] = await Promise.all([
    read("supabase/migrations/20260824131000_clinic_activity_history_foundation.sql"),
    read("supabase/migrations/20260824131500_activity_actor_attribution.sql"),
    read("app/dashboard/activity/page.tsx"),
    read("app/dashboard/history/page.tsx"),
  ]);

  assert.match(migration, /alter table public\.appointment_audit_events/);
  assert.match(migration, /entity_type text not null default 'appointment'/);
  assert.match(migration, /entity_id uuid/);
  assert.match(migration, /before_state jsonb/);
  assert.match(migration, /after_state jsonb/);
  assert.match(migration, /smart_fill_slot_claimed/);
  assert.match(migration, /smart_fill_slot_released/);
  assert.match(migration, /staff_invited/);
  assert.match(migration, /staff_added/);
  assert.match(migration, /staff_removed/);
  assert.match(migration, /permission_changed/);

  assert.equal(migration.includes("'patient_phone', new.patient_phone"), false);
  assert.equal(migration.includes("'patient_name', new.patient_name"), false);
  assert.match(migration, /Record which fields changed, never the patient name or phone values themselves/);

  assert.match(migration, /private\.can_view_clinic_activity/);
  assert.match(migration, /cm\.role in \('owner', 'manager'\)/);
  assert.match(migration, /revoke insert, update, delete, truncate on public\.appointment_audit_events from anon, authenticated/);
  assert.match(migration, /revoke update, delete, truncate on public\.appointment_audit_events from service_role/);

  assert.match(attribution, /current_setting\('atlas\.actor_id', true\)/);
  assert.match(attribution, /set_config\('atlas\.actor_id', p_actor_id::text, true\)/);
  assert.match(attribution, /v_actor_id := v_user_id/);
  assert.match(attribution, /only the current clinic administrator can transfer administration/);

  assert.match(activityPage, /Activity history/);
  assert.match(activityPage, /membership\?\.role === "owner" \|\| membership\?\.role === "manager"/);
  assert.match(activityPage, /\.eq\("clinic_id", clinic\.id\)/);
  assert.match(activityPage, /does not copy patient names, phone numbers, messages, or appointment notes/);
  assert.match(historyPage, /\/dashboard\/activity\?clinic=/);
});

test("clinic cascade deletion skips orphan activity while manual staff removal stays audited", async () => {
  const migration = await read(
    "supabase/migrations/20260826070024_skip_member_audit_during_clinic_cascade.sql",
  );

  assert.match(
    migration,
    /elsif tg_op = 'DELETE' then[\s\S]*v_action := 'staff_removed';[\s\S]*v_clinic_id := old\.clinic_id;/,
  );
  assert.match(
    migration,
    /if tg_op = 'DELETE'\s+and not exists \(\s+select 1\s+from public\.clinics c\s+where c\.id = v_clinic_id\s+\) then\s+return old;/,
  );
  assert.match(migration, /insert into public\.appointment_audit_events/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);

  assert.equal(/create policy|drop policy|alter policy/i.test(migration), false);
  assert.equal(/delete_atlas_account|clinic_members_delete|clinics_delete/.test(migration), false);
});


test("history and activity controls stay in the selected Atlas language", async () => {
  const [activityPage, historyPage, historyClient] = await Promise.all([
    read("app/dashboard/activity/page.tsx"),
    read("app/dashboard/history/page.tsx"),
    read("app/dashboard/history/history-client.tsx"),
  ]);

  assert.match(activityPage, /loadFailed: "مێژووی چالاکی بار نەبوو\."/);
  assert.match(activityPage, /loadFailed: "تعذر تحميل سجل النشاط\."/);
  assert.match(activityPage, /<label htmlFor="clinic-activity">\{t\.clinic\}<\/label>/);
  assert.match(activityPage, />\{t\.open\}<\/button>/);

  assert.match(historyPage, /loadFailed: "مێژووی وادەکان بار نەبوو\."/);
  assert.match(historyPage, /loadFailed: "تعذر تحميل سجل المواعيد\."/);
  assert.match(historyPage, /<label htmlFor="clinic-history">\{t\.clinic\}<\/label>/);
  assert.match(historyPage, />\{t\.open\}<\/button>/);

  assert.match(historyClient, /filter: "پاڵاوتنی مێژوو"/);
  assert.match(historyClient, /sort: "ترتيب السجل"/);
  assert.match(historyClient, /aria-label=\{t\.filter\}/);
  assert.match(historyClient, /aria-label=\{t\.sort\}/);
});


test("activity state details localize appointment status values", async () => {
  const activityPage = await read("app/dashboard/activity/page.tsx");
  assert.match(activityPage, /activityStatusLabel: Record<UiLocale/);
  assert.match(activityPage, /no_show: "نەهات"/);
  assert.match(activityPage, /no_show: "لم يحضر"/);
  assert.match(activityPage, /activityStatusLabel\[locale\]\[status\] \?\? status\.replaceAll/);
});

test("activity detail field names stay in the selected Atlas language", async () => {
  const activityPage = await read("app/dashboard/activity/page.tsx");
  assert.match(activityPage, /changedFieldLabel: Record<UiLocale/);
  assert.match(activityPage, /patient_name: "ناوی نەخۆش"/);
  assert.match(activityPage, /patient_phone: "ژمارا موبایلا نەخۆشی"/);
  assert.match(activityPage, /contact_relationship: "پەیوەندی خاوەنی ژمارە"/);
  assert.match(activityPage, /contact_relationship: "صلة صاحب الرقم"/);
  assert.match(activityPage, /reminder_language: "لغة التذكير"/);
  assert.match(activityPage, /changedFieldLabel\[locale\]\[item\] \?\? item\.replaceAll/);
});

test("permanent history deletion is limited to removed records visible in the current view", async () => {
  const historyClient = await read("app/dashboard/history/history-client.tsx");

  assert.match(historyClient, /const selectedVisible = removableVisible\.filter\(\(id\) => selected\.has\(id\)\)/);
  assert.match(historyClient, /selectedVisible\.length === removableVisible\.length/);
  assert.match(historyClient, /if \(!canDelete \|\| pending \|\| selectedVisible\.length === 0\) return/);
  assert.match(historyClient, /const ids = selectedVisible/);
  assert.match(historyClient, /canDelete && selectedVisible\.length > 0/);
  assert.match(historyClient, /localizeDigits\(selectedVisible\.length, locale\)/);
  assert.doesNotMatch(historyClient, /const ids = \[\.\.\.selected\]/);
});

test("history phone search accepts Arabic and Persian digits", async () => {
  const historyClient = await read("app/dashboard/history/history-client.tsx");
  const search = await read("lib/mobile-appointment-search.ts");

  assert.match(historyClient, /normalizePhone\(rawQuery\)/);
  assert.match(historyClient, /normalizePhone\(row\.patientPhone\)\.includes\(phoneDigits\)/);
  assert.match(search, /const arabicIndicDigits = "٠١٢٣٤٥٦٧٨٩"/);
  assert.match(search, /const easternArabicDigits = "۰۱۲۳۴۵۶۷۸۹"/);
});

test("history selected-record count uses the selected Atlas digit style", async () => {
  const historyClient = await read("app/dashboard/history/history-client.tsx");

  assert.match(historyClient, /import \{ localizeDigits \} from "@\/lib\/i18n\/format"/);
  assert.match(historyClient, /\{localizeDigits\(selectedVisible\.length, locale\)\} \{t\.selected\}/);
  assert.doesNotMatch(historyClient, /<strong>\{selectedVisible\.length\} \{t\.selected\}<\/strong>/);
});



test("history deletion freezes the visible selection until the delete finishes", async () => {
  const historyClient = await read("app/dashboard/history/history-client.tsx");

  assert.match(historyClient, /<section className="history-card" aria-busy=\{pending\}>/);
  assert.match(historyClient, /placeholder=\{t\.search\} value=\{query\} disabled=\{pending\}/);
  assert.match(historyClient, /aria-label=\{t\.filter\} value=\{filter\} disabled=\{pending\}/);
  assert.match(historyClient, /aria-label=\{t\.sort\} value=\{sort\} disabled=\{pending\}/);
  assert.match(historyClient, /history-select-all"><input type="checkbox" disabled=\{pending\}/);
  assert.match(historyClient, /type="checkbox" disabled=\{pending\} checked=\{selected\.has\(row\.id\)\}/);
});


test("activity history does not mislabel staff when attribution lookup fails", async () => {
  const activityPage = await read("app/dashboard/activity/page.tsx");

  assert.match(activityPage, /\{ data: members, error: membersError \}/);
  assert.match(activityPage, /if \(eventsError \|\| membersError\)/);
});


test("appointment history discloses when the bounded view omits older records", async () => {
  const historyPage = await read("app/dashboard/history/page.tsx");

  assert.match(historyPage, /const HISTORY_VIEW_LIMIT = 1000/);
  assert.match(historyPage, /\{ count: "exact" \}/);
  assert.match(historyPage, /\.limit\(HISTORY_VIEW_LIMIT\)/);
  assert.match(historyPage, /count: appointmentCount/);
  assert.match(historyPage, /const historyTruncated = \(appointmentCount \?\? appointments\?\.length \?\? 0\) > HISTORY_VIEW_LIMIT/);
  assert.match(historyPage, /historyTruncated \? <p className="notice history-limit-notice"/);
  assert.match(historyPage, /localizeDigits\(HISTORY_VIEW_LIMIT, locale\)/);
});


test("activity history discloses when older audit events are outside the bounded view", async () => {
  const activityPage = await read("app/dashboard/activity/page.tsx");

  assert.match(activityPage, /const ACTIVITY_VIEW_LIMIT = 250/);
  assert.match(activityPage, /count: eventCount/);
  assert.match(activityPage, /\{ count: "exact" \}/);
  assert.match(activityPage, /\.limit\(ACTIVITY_VIEW_LIMIT\)/);
  assert.match(activityPage, /const activityTruncated = \(eventCount \?\? events\?\.length \?\? 0\) > ACTIVITY_VIEW_LIMIT/);
  assert.match(activityPage, /activityTruncated \? <p className="notice history-limit-notice"/);
  assert.match(activityPage, /localizeDigits\(ACTIVITY_VIEW_LIMIT, locale\)/);
});


test("activity before-and-after details stay ordered in RTL", async () => {
  const activityPage = await read("app/dashboard/activity/page.tsx");

  assert.match(activityPage, /const transitionArrow = locale === "en" \? "→" : "←"/);
  assert.match(activityPage, /className="activity-change-detail" dir=\{locale === "en" \? "ltr" : "rtl"\}/);
  assert.match(activityPage, /<bdi>\{beforeText\}<\/bdi>/);
  assert.match(activityPage, /<bdi>\{afterText\}<\/bdi>/);
  assert.match(activityPage, /unicode-bidi:isolate/);
});
