import Link from "next/link";
import { LoginLanguagePicker } from "@/app/login/language-picker";
import { AtlasPatientNav } from "@/app/care/patient-nav";
import { formatLocalDateValue, formatTimeValue } from "@/lib/i18n/format";
import { getUiLocale } from "@/lib/i18n/ui-server";
import type { UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CarePageProps = {
  searchParams: Promise<{ q?: string | string[]; city?: string | string[]; specialty?: string | string[]; sort?: string | string[] }>;
};

const careCopy: Record<UiLocale, {
  language: string;
  eyebrow: string;
  title: string;
  intro: string;
  query: string;
  queryPlaceholder: string;
  city: string;
  cityPlaceholder: string;
  specialty: string;
  specialtyPlaceholder: string;
  sort: string;
  sortName: string;
  sortSoonest: string;
  search: string;
  noResults: string;
  noResultsHelp: string;
  unavailable: string;
  clinic: string;
  nextAvailable: string;
  openProfile: string;
  back: string;
  patientHome: string;
  myAppointments: string;
  browseSpecialties: string;
  availableSoon: string;
  allDoctors: string;
  noPublished: string;
  noPublishedHelp: string;
}> = {
  en: {
    language: "Language",
    eyebrow: "Find care",
    title: "Find a doctor without calling around.",
    intro: "Search published Atlas clinic profiles by doctor, specialty, clinic, or city.",
    query: "Doctor, clinic, or specialty",
    queryPlaceholder: "e.g. Orthopedics or Dr. Sara",
    city: "City",
    cityPlaceholder: "e.g. Erbil",
    specialty: "Specialty",
    specialtyPlaceholder: "e.g. Orthopedics",
    sort: "Sort by",
    sortName: "Doctor name",
    sortSoonest: "Soonest open time",
    search: "Search",
    noResults: "No published doctors match this search yet.",
    noResultsHelp: "Try a broader search or remove one of the filters.",
    unavailable: "Public doctor search is temporarily unavailable.",
    clinic: "Clinic",
    nextAvailable: "Next open time",
    openProfile: "View doctor",
    back: "Atlas home",
    patientHome: "Atlas Patient",
    myAppointments: "My appointments",
    browseSpecialties: "Browse specialties",
    availableSoon: "Available soon",
    allDoctors: "All doctors",
    noPublished: "No doctors are published on Atlas yet.",
    noPublishedHelp: "Published doctors and real availability will appear here as clinics make them available.",
  },
  ku: {
    language: "زمان",
    eyebrow: "دۆزینەوەی پزیشک",
    title: "پزیشک بدۆزەرەوە بەبێ ئەوەی بە چەند کلینیکێک پەیوەندی بکەیت.",
    intro: "لە پڕۆفایلی بڵاوکراوەکانی Atlas بە ناوی پزیشک، پسپۆڕی، کلینیک یان شار بگەڕێ.",
    query: "پزیشک، کلینیک یان پسپۆڕی",
    queryPlaceholder: "بۆ نموونە: ئێسک و جومگە",
    city: "شار",
    cityPlaceholder: "بۆ نموونە: هەولێر",
    specialty: "پسپۆڕی",
    specialtyPlaceholder: "بۆ نموونە: ئێسک و جومگە",
    sort: "ڕیزکردن",
    sortName: "ناوی پزیشک",
    sortSoonest: "نزیکترین کاتی بەردەست",
    search: "گەڕان",
    noResults: "هێشتا هیچ پزیشکێکی بڵاوکراوە لەم گەڕانەدا نەدۆزرایەوە.",
    noResultsHelp: "گەڕانەکە فراوانتر بکە یان یەکێک لە فلتەرەکان لاببە.",
    unavailable: "گەڕانی پزیشکی گشتی کاتێک بەردەست نییە.",
    clinic: "کلینیک",
    nextAvailable: "نزیکترین کاتی بەردەست",
    openProfile: "پڕۆفایلی پزیشک",
    back: "گەڕانەوە بۆ Atlas",
    patientHome: "Atlas Patient",
    myAppointments: "مەوعیدەکانم",
    browseSpecialties: "بە پسپۆڕی بگەڕێ",
    availableSoon: "کاتی نزیک بەردەستە",
    allDoctors: "هەموو پزیشکەکان",
    noPublished: "هێشتا هیچ پزیشکێک لە Atlas بڵاونەکراوەتەوە.",
    noPublishedHelp: "کاتێک کلینیکەکان پزیشک و کاتە بەردەستە ڕاستەقینەکان بڵاودەکەنەوە، لێرە دەردەکەون.",
  },
  bd: {
    language: "زمان",
    eyebrow: "دیتنا دکتۆری",
    title: "دکتۆر بدیتەوە بێ کو پەیوەندی ب چەند کلینیکان بکەی.",
    intro: "د پڕۆفایلێن بڵاوکری یێن Atlas دا ب ناڤێ دکتۆری، تایبەتمەندی، کلینیک یان باژێر بگەڕێ.",
    query: "دکتۆر، کلینیک یان تایبەتمەندی",
    queryPlaceholder: "بۆ نموونە: ئێسک و جومگە",
    city: "باژێر",
    cityPlaceholder: "بۆ نموونە: هەولێر",
    specialty: "تایبەتمەندی",
    specialtyPlaceholder: "بۆ نموونە: ئێسک و جومگە",
    sort: "ڕێزکرن",
    sortName: "ناڤێ دکتۆری",
    sortSoonest: "نێزیکترین دەمێ بەردەست",
    search: "گەڕان",
    noResults: "هێشتا هیچ دکتۆرەکێ بڵاوکری ل ڤی گەڕانێ نەهاتە دیتن.",
    noResultsHelp: "گەڕانێ فراوانتر بکە یان فلتەرەکێ لاببە.",
    unavailable: "گەڕانا گشتی یا دکتۆران نوکە بەردەست نینە.",
    clinic: "کلینیک",
    nextAvailable: "نێزیکترین دەمێ بەردەست",
    openProfile: "پڕۆفایلا دکتۆری",
    back: "ڤەگەڕە Atlas",
    patientHome: "Atlas Patient",
    myAppointments: "وادەیێن من",
    browseSpecialties: "ب تایبەتمەندی بگەڕێ",
    availableSoon: "دەمەکێ نێزیک بەردەستە",
    allDoctors: "هەمی دکتۆر",
    noPublished: "هێشتا چ دکتۆر ل Atlas نەهاتینە بڵاوکرن.",
    noPublishedHelp: "دەمێ کلینیک دکتۆر و دەمێن ڕاستەقینە یێن بەردەست بڵاو دکەن، ل ڤێرێ دیار دبن.",
  },
  ar: {
    language: "اللغة",
    eyebrow: "ابحث عن رعاية",
    title: "اعثر على طبيب بدون الاتصالات المتكررة.",
    intro: "ابحث في ملفات عيادات Atlas المنشورة باسم الطبيب أو الاختصاص أو العيادة أو المدينة.",
    query: "الطبيب أو العيادة أو الاختصاص",
    queryPlaceholder: "مثلاً: عظام أو د. سارة",
    city: "المدينة",
    cityPlaceholder: "مثلاً: أربيل",
    specialty: "الاختصاص",
    specialtyPlaceholder: "مثلاً: عظام",
    sort: "ترتيب حسب",
    sortName: "اسم الطبيب",
    sortSoonest: "أقرب وقت متاح",
    search: "بحث",
    noResults: "لا يوجد أطباء منشورون يطابقون هذا البحث حالياً.",
    noResultsHelp: "وسّع البحث أو احذف أحد الفلاتر.",
    unavailable: "البحث العام عن الأطباء غير متاح مؤقتاً.",
    clinic: "العيادة",
    nextAvailable: "أقرب وقت متاح",
    openProfile: "عرض الطبيب",
    back: "العودة إلى Atlas",
    patientHome: "Atlas Patient",
    myAppointments: "مواعيدي",
    browseSpecialties: "تصفّح حسب الاختصاص",
    availableSoon: "متاح قريباً",
    allDoctors: "كل الأطباء",
    noPublished: "لا يوجد أطباء منشورون على Atlas حالياً.",
    noPublishedHelp: "عندما تنشر العيادات أطباءها وأوقاتهم المتاحة فعلياً، راح تظهر هنا.",
  },
};

function bounded(value: string | string[] | undefined, max: number) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max);
}

function nextAvailabilityLabel(value: string, locale: UiLocale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const dateParts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).map((part) => [part.type, part.value]));
  const timeParts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).map((part) => [part.type, part.value]));

  const dateKey = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  const timeValue = `${timeParts.hour}:${timeParts.minute}`;
  return `${formatLocalDateValue(dateKey, locale)} · ${formatTimeValue(timeValue, locale)}`;
}

export default async function CarePage({ searchParams }: CarePageProps) {
  const [params, locale] = await Promise.all([searchParams, getUiLocale()]);
  const copy = careCopy[locale];
  const query = bounded(params.q, 80);
  const city = bounded(params.city, 100);
  const specialty = bounded(params.specialty, 120);
  const sortValue = bounded(params.sort, 20);
  const sort = sortValue === "soonest" ? "soonest" : "name";
  const hasSearch = Boolean(query || city || specialty);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_public_doctors_with_availability", {
    p_query: query || null,
    p_city: city || null,
    p_specialty: specialty || null,
    p_limit: 30,
    p_sort: sort,
  });
  const results = error ? [] : (data ?? []);
  const browseSpecialties = hasSearch
    ? []
    : Array.from(new Set(
        results
          .map((doctor) => doctor.specialty?.trim())
          .filter((value): value is string => Boolean(value)),
      )).slice(0, 6);
  const hasAvailableSoon = !hasSearch && results.some((doctor) => Boolean(doctor.next_available_at));

  return (
    <main className="marketing-page atlas-care-page">
      <AtlasPatientNav locale={locale} myAppointments={copy.myAppointments} />

      <section className="shell atlas-care-shell">
        <div className="atlas-care-language">
          <div className="eyebrow">{copy.language}</div>
          <LoginLanguagePicker locale={locale} />
        </div>

        <div className="eyebrow">{copy.eyebrow}</div>
        <h1>{copy.title}</h1>
        <p className="hero-copy">{copy.intro}</p>

        {!hasSearch && (browseSpecialties.length || hasAvailableSoon) ? (
          <section className="atlas-care-browse" aria-label={copy.browseSpecialties}>
            <strong>{copy.browseSpecialties}</strong>
            <div className="atlas-care-browse-actions">
              {hasAvailableSoon ? (
                <Link
                  className={`atlas-care-choice ${sort === "soonest" ? "is-active" : ""}`}
                  href="/care?sort=soonest"
                >
                  <span aria-hidden="true">◷</span>
                  {copy.availableSoon}
                </Link>
              ) : null}
              {browseSpecialties.map((item) => (
                <Link
                  className="atlas-care-choice"
                  key={item}
                  href={`/care?specialty=${encodeURIComponent(item)}&sort=soonest`}
                >
                  <span className="atlas-care-choice-mark" aria-hidden="true">{item.slice(0, 1)}</span>
                  {item}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <form className="atlas-care-search" method="get">
          <label>
            <span>{copy.query}</span>
            <input name="q" defaultValue={query} placeholder={copy.queryPlaceholder} maxLength={80} />
          </label>
          <label>
            <span>{copy.city}</span>
            <input name="city" defaultValue={city} placeholder={copy.cityPlaceholder} maxLength={100} />
          </label>
          <label>
            <span>{copy.specialty}</span>
            <input name="specialty" defaultValue={specialty} placeholder={copy.specialtyPlaceholder} maxLength={120} />
          </label>
          <label>
            <span>{copy.sort}</span>
            <select name="sort" defaultValue={sort}>
              <option value="name">{copy.sortName}</option>
              <option value="soonest">{copy.sortSoonest}</option>
            </select>
          </label>
          <button className="button" type="submit">{copy.search}</button>
        </form>

        {error ? (
          <p className="notice notice-error atlas-care-notice" role="alert">{copy.unavailable}</p>
        ) : results.length ? (
          <div className="atlas-care-results">
            {results.map((doctor) => (
              <article className="atlas-care-result" key={`${doctor.clinic_slug}/${doctor.doctor_slug}`}>
                <div className="atlas-care-result-heading">
                  <span className="atlas-care-doctor-mark" aria-hidden="true">{doctor.doctor_name.trim().slice(0, 1)}</span>
                  <div>
                    <strong>{doctor.doctor_name}</strong>
                    <span>{doctor.specialty}{doctor.subspecialty ? ` · ${doctor.subspecialty}` : ""}</span>
                  </div>
                </div>
                <p><b>{copy.clinic}:</b> <Link href={`/care/${doctor.clinic_slug}`}>{doctor.clinic_name}</Link></p>
                {(doctor.city || doctor.area) ? <p>{[doctor.area, doctor.city].filter(Boolean).join(" · ")}</p> : null}
                {doctor.next_available_at && nextAvailabilityLabel(doctor.next_available_at, locale) ? (
                  <p className="atlas-care-next-opening">
                    <b>{copy.nextAvailable}:</b> {nextAvailabilityLabel(doctor.next_available_at, locale)}
                  </p>
                ) : null}
                <Link className="button button-ghost button-small" href={`/care/${doctor.clinic_slug}/${doctor.doctor_slug}`}>
                  {copy.openProfile}
                </Link>
              </article>
            ))}
          </div>
        ) : hasSearch ? (
          <div className="atlas-care-empty">
            <strong>{copy.noResults}</strong>
            <p>{copy.noResultsHelp}</p>
            <Link className="atlas-care-reset" href="/care">{copy.allDoctors}</Link>
          </div>
        ) : (
          <div className="atlas-care-empty atlas-care-empty-published">
            <strong>{copy.noPublished}</strong>
            <p>{copy.noPublishedHelp}</p>
            <Link className="button button-ghost" href="/patient-account">{copy.myAppointments}</Link>
          </div>
        )}

        <Link className="atlas-care-back" href="/">{copy.back}</Link>
      </section>

      <style>{`
        .atlas-care-page{min-height:100dvh}.atlas-care-shell{max-width:880px;padding-top:clamp(34px,7vh,72px);padding-bottom:70px}.atlas-care-language{max-width:650px;margin-bottom:30px}.atlas-care-language>.eyebrow{margin-bottom:10px}.atlas-care-browse{display:grid;gap:10px;margin:24px 0 8px}.atlas-care-browse>strong{font-size:12px}.atlas-care-browse-actions{display:flex;gap:8px;flex-wrap:wrap}.atlas-care-choice{display:inline-flex;align-items:center;gap:7px;min-height:46px;border:1px solid var(--line);border-radius:999px;padding:8px 12px;background:var(--surface);color:var(--ink);font-size:12px;font-weight:800;text-decoration:none}.atlas-care-choice:hover,.atlas-care-choice.is-active{border-color:rgba(8,119,90,.35);background:var(--surface-soft);color:var(--accent)}.atlas-care-choice-mark{display:grid;width:24px;height:24px;place-items:center;border-radius:50%;background:var(--surface-soft);color:var(--accent);font-size:11px;font-weight:900}.atlas-care-search{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) auto;gap:10px;align-items:end;margin:28px 0}.atlas-care-search label{display:grid;gap:7px}.atlas-care-search label span{font-size:11px;font-weight:800;color:var(--muted)}.atlas-care-search input,.atlas-care-search select{min-width:0;min-height:48px}.atlas-care-search .button{min-height:48px}.atlas-care-results{display:grid;gap:12px;margin-top:24px}.atlas-care-result{display:grid;gap:9px;padding:18px;border:1px solid var(--line);border-radius:18px;background:var(--surface)}.atlas-care-result-heading{display:flex!important;align-items:center;gap:12px}.atlas-care-result-heading>div{display:grid;gap:4px}.atlas-care-doctor-mark{display:grid!important;flex:0 0 auto;width:44px;height:44px;place-items:center;border-radius:14px;background:var(--surface-soft);color:var(--accent)!important;font-size:18px!important;font-weight:900}.atlas-care-result>div{display:grid;gap:4px}.atlas-care-result strong{font-size:18px}.atlas-care-result span,.atlas-care-result p{color:var(--muted);font-size:12px;line-height:1.5}.atlas-care-result p{margin:0}.atlas-care-next-opening{color:var(--accent)!important;font-weight:720}.atlas-care-result .button{justify-self:start;text-decoration:none}.atlas-care-empty{margin-top:24px;padding:22px;border:1px dashed var(--line);border-radius:18px}.atlas-care-empty p{margin:7px 0 0;color:var(--muted)}.atlas-care-empty-published{display:grid;gap:10px}.atlas-care-empty-published .button{justify-self:start;text-decoration:none}.atlas-care-reset{display:inline-block;margin-top:10px;color:var(--accent);font-size:12px;font-weight:800}.atlas-care-notice{margin-top:24px}.atlas-care-back{display:inline-block;margin-top:28px;color:var(--muted);font-size:12px}@media(max-width:900px){.atlas-care-search{grid-template-columns:1fr}.atlas-care-search .button{width:100%}}
      `}</style>
    </main>
  );
}
