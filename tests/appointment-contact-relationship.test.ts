import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("appointments distinguish the patient from the phone contact without creating contact profiles", async () => {
  const [migration, actions, enhancer, layout, activity] = await Promise.all([
    read("supabase/migrations/20260824124126_appointment_contact_relationship.sql"),
    read("app/dashboard/instant-actions.ts"),
    read("app/dashboard/appointment-contact-relationship.tsx"),
    read("app/dashboard/layout.tsx"),
    read("app/dashboard/activity/page.tsx"),
  ]);

  assert.match(migration, /add column if not exists contact_relationship text not null default 'patient'/);
  assert.match(migration, /'patient', 'parent_guardian', 'relative_caregiver'/);
  assert.match(migration, /contact_relationship is distinct from old\.contact_relationship/);
  assert.equal(migration.includes("'patient_phone', new.patient_phone"), false);
  assert.equal(migration.includes("'patient_name', new.patient_name"), false);
  assert.match(migration, /case when v_contact_relationship = 'patient' then 'patient' else 'contact' end/);

  assert.match(actions, /formData\.get\("contact_relationship"\)/);
  assert.match(actions, /contact_relationship: relationship/);
  assert.match(actions, /getAppointmentContactRelationshipInline/);

  assert.match(enhancer, /Whose phone is this\?/);
  assert.match(enhancer, /Parent \/ guardian/);
  assert.match(enhancer, /Relative \/ caregiver/);
  assert.match(enhancer, /This phone’s owner agreed to WhatsApp reminders/);
  assert.match(enhancer, /select\.name = "contact_relationship"/);
  assert.match(layout, /AppointmentContactRelationshipEnhancer/);
  assert.match(activity, /event\.actor_type === "contact"/);
  assert.match(activity, /Patient contact/);

  assert.equal(migration.includes("create table public.patient_contacts"), false);
  assert.equal(migration.includes("contact_name"), false);
  assert.equal(migration.includes("contact_phone"), false);
});

test("generated appointment types include the contact relationship without client type bypasses", async () => {
  const [databaseTypes, actions] = await Promise.all([
    read("lib/database.types.ts"),
    read("app/dashboard/instant-actions.ts"),
  ]);
  const appointmentsStart = databaseTypes.indexOf("      appointments: {");
  const appointmentsEnd = databaseTypes.indexOf("      clinic_members:", appointmentsStart);
  const appointmentTypes = databaseTypes.slice(appointmentsStart, appointmentsEnd);

  assert.match(appointmentTypes, /Row: \{[^\n]*contact_relationship: string/);
  assert.match(appointmentTypes, /Insert: \{[^\n]*contact_relationship\?: string/);
  assert.match(appointmentTypes, /Update: \{[^\n]*contact_relationship\?: string/);
  assert.doesNotMatch(actions, /\(supabase as any\)/);
});


test("appointment editing never defaults the contact relationship after a load failure", async () => {
  const enhancer = await read("app/dashboard/appointment-contact-relationship.tsx");

  assert.match(enhancer, /let loaded = false/);
  assert.match(enhancer, /if \(loaded\) \{[\s\S]*save\.disabled = false/);
  assert.match(enhancer, /field\.select\.disabled = true/);
  assert.match(enhancer, /error\.setAttribute\("role", "alert"\)/);
  assert.match(enhancer, /Could not load whose phone this is/);
});

test("appointment contact relationship reads are explicitly scoped to the active clinic", async () => {
  const [actions, enhancer] = await Promise.all([
    read("app/dashboard/instant-actions.ts"),
    read("app/dashboard/appointment-contact-relationship.tsx"),
  ]);

  assert.match(actions, /getAppointmentContactRelationshipInline\(\s*clinicId: string,\s*id: string/);
  assert.match(actions, /if \(!isUuid\(clinicId\) \|\| !isUuid\(id\)\) return null/);
  assert.match(actions, /\.select\("contact_relationship"\)[\s\S]*\.eq\("clinic_id", clinicId\)[\s\S]*\.eq\("id", id\)/);
  assert.match(enhancer, /form\.closest<HTMLElement>\("\[data-atlas-clinic\]"\)\?\.dataset\.atlasClinic/);
  assert.match(enhancer, /if \(appointmentId && clinicId\)/);
  assert.match(enhancer, /getAppointmentContactRelationshipInline\(clinicId, appointmentId\)/);
});

test("main appointment creation persists the selected phone contact relationship", async () => {
  const actions = await read("app/dashboard/actions.ts");

  assert.match(actions, /appointmentContactRelationship\(formData\.get\("contact_relationship"\)\)/);
  assert.match(actions, /\|\| !relationship/);
  assert.match(actions, /patient_phone: patientPhone,[\s\S]*contact_relationship: relationship/);
  assert.match(actions, /contactRelationship: relationship/);
  assert.doesNotMatch(actions, /contactRelationship: "patient"/);
});

test("appointment edits fail closed when the contact relationship is missing", async () => {
  const actions = await read("app/dashboard/instant-actions.ts");

  assert.match(actions, /function requiredContactRelationship\(value: FormDataEntryValue \| null\)/);
  assert.match(actions, /if \(value === null\) return null/);
  assert.match(actions, /updateAppointmentDetailsInline[\s\S]*requiredContactRelationship\(formData\.get\("contact_relationship"\)\)/);
  assert.match(actions, /createAppointmentInline[\s\S]*contactRelationship\(formData\.get\("contact_relationship"\)\)/);
});

test("new appointment booking renders and requires explicit phone ownership", async () => {
  const [page, actions, instantActions] = await Promise.all([
    read("app/dashboard/page.tsx"),
    read("app/dashboard/actions.ts"),
    read("app/dashboard/instant-actions.ts"),
  ]);

  assert.match(page, /<select id="contact_relationship" name="contact_relationship" defaultValue="" required>/);
  assert.match(page, /<option value="" disabled>\{contactRelationship\.choose\}<\/option>/);
  assert.match(page, /<option value="patient">\{contactRelationship\.patient\}<\/option>/);
  assert.match(page, /<option value="parent_guardian">\{contactRelationship\.guardian\}<\/option>/);
  assert.match(page, /<option value="relative_caregiver">\{contactRelationship\.caregiver\}<\/option>/);
  assert.match(actions, /function appointmentContactRelationship\(value: FormDataEntryValue \| null\)[\s\S]*if \(value === null\) return null/);
  assert.match(instantActions, /function contactRelationship\(value: FormDataEntryValue \| null\)[\s\S]*if \(value === null\) return null/);
  assert.doesNotMatch(actions, /value \?\? "patient"/);
  assert.doesNotMatch(instantActions, /value \?\? "patient"/);
});

test("each new appointment requires a fresh phone owner choice after confirmed save", async () => {
  const [enhancer, polish] = await Promise.all([
    read("app/dashboard/appointment-contact-relationship.tsx"),
    read("app/dashboard/dashboard-client-polish.tsx"),
  ]);

  assert.match(enhancer, /createRelationshipField\(locale, "contact_relationship", ""\)/);
  assert.match(enhancer, /select\.required = true/);
  assert.match(enhancer, /prompt\.value = ""/);
  assert.match(enhancer, /prompt\.disabled = true/);
  assert.doesNotMatch(enhancer, /setTimeout\([\s\S]*700/);
  assert.match(polish, /relationshipInput = form\.querySelector<HTMLSelectElement>\('select\[name="contact_relationship"\]'\)/);
  assert.match(polish, /if \(relationshipInput\) relationshipInput\.value = ""/);
});

test("editing a phone or its owner requires fresh reminder consent", async () => {
  const [editor, enhancer] = await Promise.all([
    read("app/dashboard/appointment-editor.tsx"),
    read("app/dashboard/appointment-contact-relationship.tsx"),
  ]);

  assert.match(editor, /normalizeIraqiMobile, type AppointmentMutationFailure/);
  assert.match(editor, /const \[editConsent, setEditConsent\] = useState\(reminderConsent\)/);
  assert.match(editor, /const originalPhone = normalizeIraqiMobile\(patientPhone\)/);
  assert.match(editor, /const currentPhone = normalizeIraqiMobile\(event\.currentTarget\.value\)/);
  assert.match(editor, /if \(currentPhone !== originalPhone\) setEditConsent\(false\)/);
  assert.match(editor, /checked=\{editConsent\}/);
  assert.match(enhancer, /dataset\.atlasInitialRelationship = value/);
  assert.match(enhancer, /field\.select\.value === field\.select\.dataset\.atlasInitialRelationship/);
  assert.match(enhancer, /consent\.checked = false/);
  assert.match(enhancer, /dispatchEvent\(new Event\("change", \{ bubbles: true \}\)\)/);
});

