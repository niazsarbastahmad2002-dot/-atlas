from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text()


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text)


def replace_exact(path: str, old: str, new: str, count: int = 1) -> None:
    text = read(path)
    actual = text.count(old)
    if actual != count:
        raise SystemExit(f"{path}: expected {count} occurrences, found {actual}: {old[:100]!r}")
    write(path, text.replace(old, new, count))


# 1) Never leave the Previous / current day / Next strip visually faded after navigation.
replace_exact(
    "app/dashboard/schedule-navigation-polish.tsx",
    '          dayLink.closest<HTMLElement>(".day-navigation, .schedule-date-shortcuts, .doctor-schedule-tabs")?.classList.add("is-navigating");\n',
    "",
)
replace_exact(
    "app/atlas-perfect.css",
    ".day-navigation{transition:opacity .1s ease,transform .1s ease}.day-navigation.is-navigating{opacity:.7;transform:translateY(1px)}",
    ".day-navigation{transition:none}",
)

# 2) Badini is a first-class patient reminder language everywhere it is validated.
for path in [
    "app/dashboard/actions.ts",
    "app/dashboard/instant-actions.ts",
    "app/dashboard/settings/actions.ts",
]:
    replace_exact(path, 'new Set(["ku", "ar", "en"])', 'new Set(["ku", "bd", "ar", "en"])')
replace_exact(
    "app/api/settings/doctor-workflow/route.ts",
    'const languages = new Set(["ku", "ar", "en"]);',
    'const languages = new Set(["ku", "bd", "ar", "en"]);',
)

# 3) Main schedule: show Sorani, Badini, Iraqi Arabic, and English, and use the selected doctor's default.
page = "app/dashboard/page.tsx"
replace_exact(
    page,
    '    { data: reminderSettings },\n    { data: doctors, error: doctorsError },\n  ] = await Promise.all([',
    '    { data: reminderSettings },\n    { data: doctorWorkflowRows, error: workflowError },\n    { data: doctors, error: doctorsError },\n  ] = await Promise.all([',
)
replace_exact(
    page,
    '    supabase.from("clinic_reminder_settings").select("enabled, lead_minutes, second_lead_minutes, default_reminder_language").eq("clinic_id", clinic.id).maybeSingle(),\n    supabase.from("doctors").select("id, name, active, display_order").eq("clinic_id", clinic.id).order("display_order", { ascending: true }).order("name", { ascending: true }),',
    '    supabase.from("clinic_reminder_settings").select("enabled, lead_minutes, second_lead_minutes, default_reminder_language").eq("clinic_id", clinic.id).maybeSingle(),\n    supabase.from("doctor_workflow_settings").select("doctor_id, default_reminder_language").eq("clinic_id", clinic.id),\n    supabase.from("doctors").select("id, name, active, display_order").eq("clinic_id", clinic.id).order("display_order", { ascending: true }).order("name", { ascending: true }),',
)
replace_exact(
    page,
    '  if (membershipError || appointmentError || occupiedError || doctorsError) return <DashboardError />;',
    '  if (membershipError || appointmentError || occupiedError || workflowError || doctorsError) return <DashboardError />;',
)
replace_exact(
    page,
    '  const defaultReminderLanguage = reminderSettings?.default_reminder_language ?? "ku";\n',
    '',
)
replace_exact(
    page,
    '  const selectedDoctorId = multiDoctor ? selectedDoctor?.id ?? null : null;\n  const visibleRows = multiDoctor && selectedDoctor',
    '  const selectedDoctorId = multiDoctor ? selectedDoctor?.id ?? null : null;\n  const defaultReminderLanguage = (doctorWorkflowRows ?? []).find((row) => row.doctor_id === selectedDoctor?.id)?.default_reminder_language ?? reminderSettings?.default_reminder_language ?? "ku";\n  const visibleRows = multiDoctor && selectedDoctor',
)
replace_exact(
    page,
    '  const reminderLanguageLabels: Record<string, string> = locale === "ar"\n    ? { ku: "الكردية (السورانية)", ar: "العربية", en: "الإنجليزية" }\n    : locale === "en"\n      ? { ku: "Kurdish (Sorani)", ar: "Arabic", en: "English" }\n      : { ku: "کوردی (سۆرانی)", ar: "عەرەبی", en: "ئینگلیزی" };',
    '  const reminderLanguageLabels: Record<string, string> = locale === "ar"\n    ? { ku: "الكردية (السورانية)", bd: "الكردية (البادينية)", ar: "العربية العراقية", en: "الإنجليزية" }\n    : locale === "en"\n      ? { ku: "Kurdish (Sorani)", bd: "Kurdish (Badini)", ar: "Iraqi Arabic", en: "English" }\n      : { ku: "کوردی (سۆرانی)", bd: "کوردی (بادینی)", ar: "عەرەبی (عێراقی)", en: "ئینگلیزی" };',
)

# 4) Appointment editing has the same four patient reminder choices.
editor = "app/dashboard/appointment-editor.tsx"
replace_exact(
    editor,
    'const reminderLanguageLabels = {\n  en: { ku: "Kurdish (Sorani)", ar: "Arabic", en: "English" },\n  ku: { ku: "کوردی (سۆرانی)", ar: "عەرەبی", en: "ئینگلیزی" },\n  bd: { ku: "کوردی (سۆرانی)", ar: "عەرەبی", en: "ئینگلیزی" },\n  ar: { ku: "الكردية (السورانية)", ar: "العربية", en: "الإنجليزية" },\n} as const;',
    'const reminderLanguageLabels = {\n  en: { ku: "Kurdish (Sorani)", bd: "Kurdish (Badini)", ar: "Iraqi Arabic", en: "English" },\n  ku: { ku: "کوردی (سۆرانی)", bd: "کوردی (بادینی)", ar: "عەرەبی (عێراقی)", en: "ئینگلیزی" },\n  bd: { ku: "کوردی (سۆرانی)", bd: "کوردی (بادینی)", ar: "عەرەبی (عێراقی)", en: "ئینگلیزی" },\n  ar: { ku: "الكردية (السورانية)", bd: "الكردية (البادينية)", ar: "العربية العراقية", en: "الإنجليزية" },\n} as const;',
)
replace_exact(
    editor,
    '            <option value="ku">{reminderLanguageLabels[locale].ku}</option>\n            <option value="ar">{reminderLanguageLabels[locale].ar}</option>',
    '            <option value="ku">{reminderLanguageLabels[locale].ku}</option>\n            <option value="bd">{reminderLanguageLabels[locale].bd}</option>\n            <option value="ar">{reminderLanguageLabels[locale].ar}</option>',
)

# 5) Doctor reminder settings use the same choices.
settings = "app/dashboard/settings-reminder-card.tsx"
replace_exact(
    settings,
    'const languageLabels = {\n  en: { ku: "Kurdish (Sorani)", ar: "Arabic", en: "English" },\n  ku: { ku: "کوردی (سۆرانی)", ar: "عەرەبی", en: "ئینگلیزی" },\n  bd: { ku: "کوردی (سۆرانی)", ar: "عەرەبی", en: "ئینگلیزی" },\n  ar: { ku: "الكردية (السورانية)", ar: "العربية", en: "الإنجليزية" },\n} as const;',
    'const languageLabels = {\n  en: { ku: "Kurdish (Sorani)", bd: "Kurdish (Badini)", ar: "Iraqi Arabic", en: "English" },\n  ku: { ku: "کوردی (سۆرانی)", bd: "کوردی (بادینی)", ar: "عەرەبی (عێراقی)", en: "ئینگلیزی" },\n  bd: { ku: "کوردی (سۆرانی)", bd: "کوردی (بادینی)", ar: "عەرەبی (عێراقی)", en: "ئینگلیزی" },\n  ar: { ku: "الكردية (السورانية)", bd: "الكردية (البادينية)", ar: "العربية العراقية", en: "الإنجليزية" },\n} as const;',
)

# 6) Patient-facing Arabic is simple Iraqi Arabic; Badini patient copy already exists and will now be selectable.
patient = "app/patient/[token]/page.tsx"
replace_exact(
    patient,
    '  ar: {\n    lang: "ar",\n    dir: "rtl" as const,\n    dateLocale: "ar-IQ",\n    eyebrow: "موعدك",\n    doctor: "الطبيب",\n    specialty: "الاختصاص",\n    contact: "رقم الاستقبال",\n    dateTime: "التاريخ والوقت",\n    am: "صباحاً",\n    pm: "مساءً",\n    order: "ترتيبك اليوم",\n    first: "أنت الأول عند هذا الطبيب.",\n    ahead: "موعد قبلك",\n    aheadMany: "مواعيد قبلك",\n    confirmTitle: "أكد موعدك",\n    confirmInitial: "تأكيد الموعد",\n    cancelSmall: "تحتاج إلى الإلغاء؟",\n    question: "هل ستأتي؟",\n    confirm: "نعم، سأأتي",\n    cancel: "لا، ألغِ الموعد",\n    confirmed: "تم التأكيد. سنكون بانتظارك.",\n    cancelled: "تم إلغاء هذا الموعد.",\n    completed: "تم إكمال هذا الموعد.",\n    noShow: "انتهى وقت هذا الموعد.",\n    changeMind: "لن أستطيع الحضور",\n    privacy: "هذه الصفحة خاصة بهذا الموعد فقط.",\n  },',
    '  ar: {\n    lang: "ar-IQ",\n    dir: "rtl" as const,\n    dateLocale: "ar-IQ",\n    eyebrow: "موعدك",\n    doctor: "الدكتور",\n    specialty: "الاختصاص",\n    contact: "رقم السكرتير",\n    dateTime: "التاريخ والوقت",\n    am: "صباحاً",\n    pm: "مساءً",\n    order: "ترتيبك اليوم",\n    first: "إنت أول واحد عند هذا الدكتور.",\n    ahead: "موعد قبلك",\n    aheadMany: "مواعيد قبلك",\n    confirmTitle: "أكد موعدك",\n    confirmInitial: "أكد الموعد",\n    cancelSmall: "تريد تلغي الموعد؟",\n    question: "راح تجي؟",\n    confirm: "إي، راح أجي",\n    cancel: "لا، ألغي الموعد",\n    confirmed: "تم التأكيد. ننتظرك.",\n    cancelled: "هذا الموعد ملغي.",\n    completed: "هذا الموعد خلص.",\n    noShow: "وقت هذا الموعد انتهى.",\n    changeMind: "ما أگدر أجي",\n    privacy: "هاي الصفحة خاصة بهذا الموعد بس.",\n  },',
)

# 7) Keep the provider-side Arabic template source Iraqi for future provider approval/refresh.
replace_exact(
    "lib/reminders/meta-template-bootstrap.ts",
    '    text: "تذكير بموعد من {{1}}. موعدك محدد في {{2}}. يرجى التواصل مع العيادة إذا لم تتمكن من الحضور.",',
    '    text: "تذكير من {{1}}: موعدك بوقت {{2}}. إذا ما تگدر تجي، رجاءً تواصل ويّا العيادة.",',
)

# 8) Persist the production database change in repository migration history.
migration = ROOT / "supabase/migrations/20260820033949_allow_badini_reminder_language.sql"
if migration.exists():
    raise SystemExit(f"migration already exists: {migration}")
migration.write_text("""alter table public.appointments drop constraint if exists appointments_reminder_language_check;
alter table public.appointments add constraint appointments_reminder_language_check
  check (reminder_language = any (array['ku'::text, 'bd'::text, 'ar'::text, 'en'::text]));

alter table public.clinic_reminder_settings drop constraint if exists clinic_reminder_settings_default_language_check;
alter table public.clinic_reminder_settings add constraint clinic_reminder_settings_default_language_check
  check (default_reminder_language = any (array['ku'::text, 'bd'::text, 'ar'::text, 'en'::text]));

alter table public.doctor_workflow_settings drop constraint if exists doctor_workflow_language_check;
alter table public.doctor_workflow_settings add constraint doctor_workflow_language_check
  check (default_reminder_language = any (array['ku'::text, 'bd'::text, 'ar'::text, 'en'::text]));

create or replace function private.whatsapp_template_language(p_language text)
returns text
language sql
immutable
set search_path = ''
as $function$
  select case lower(coalesce(p_language, 'en'))
    when 'ku' then 'ku'
    when 'ckb' then 'ku'
    when 'bd' then 'bd'
    when 'ar' then 'ar'
    when 'ar_iq' then 'ar'
    when 'en_us' then 'en_US'
    when 'en' then 'en_US'
    else 'en_US'
  end;
$function$;
""")

# 9) Regression coverage.
test_path = ROOT / "tests/reminder-language-navigation.test.ts"
if test_path.exists():
    raise SystemExit(f"test already exists: {test_path}")
test_path.write_text(r'''import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const navigation = source("../app/dashboard/schedule-navigation-polish.tsx");
const perfectCss = source("../app/atlas-perfect.css");
const dashboard = source("../app/dashboard/page.tsx");
const editor = source("../app/dashboard/appointment-editor.tsx");
const settings = source("../app/dashboard/settings-reminder-card.tsx");
const actions = source("../app/dashboard/actions.ts");
const instantActions = source("../app/dashboard/instant-actions.ts");
const workflowRoute = source("../app/api/settings/doctor-workflow/route.ts");
const patient = source("../app/patient/[token]/page.tsx");

test("schedule day navigation never leaves the row faded", () => {
  assert.doesNotMatch(navigation, /classList\.add\(["']is-navigating["']\)/);
  assert.doesNotMatch(perfectCss, /\.day-navigation\.is-navigating\s*\{[^}]*opacity\s*:/);
});

test("patient reminder selectors include Sorani Badini Iraqi Arabic and English", () => {
  for (const value of [dashboard, editor, settings]) {
    assert.match(value, /Kurdish \(Sorani\)/);
    assert.match(value, /Kurdish \(Badini\)/);
    assert.match(value, /Iraqi Arabic/);
    assert.match(value, /English/);
  }
});

test("Badini reminder language is accepted by appointment and doctor settings validators", () => {
  assert.match(actions, /new Set\(\["ku", "bd", "ar", "en"\]\)/);
  assert.match(instantActions, /new Set\(\["ku", "bd", "ar", "en"\]\)/);
  assert.match(workflowRoute, /new Set\(\["ku", "bd", "ar", "en"\]\)/);
});

test("Iraqi Arabic patient copy uses simple Iraqi wording", () => {
  assert.match(patient, /راح تجي/);
  assert.match(patient, /ما أگدر أجي/);
});
''')

# The one-shot machinery removes itself before the generated product commit.
(ROOT / ".github/workflows/atlas-one-shot-reminder-fix.yml").unlink(missing_ok=True)
Path(__file__).unlink(missing_ok=True)
