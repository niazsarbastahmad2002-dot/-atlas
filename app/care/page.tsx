import Link from "next/link";
import { LoginLanguagePicker } from "@/app/login/language-picker";
import { AtlasPatientNav } from "@/app/care/patient-nav";
import { formatLocalDateValue, formatTimeValue } from "@/lib/i18n/format";
import { uiLocaleMeta, type UiLocale } from "@/lib/i18n/ui";
import { patientLocaleHref, resolvePatientLocale } from "@/app/care/patient-locale";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CarePageProps = {
  searchParams: Promise<{ q?: string | string[]; city?: string | string[]; specialty?: string | string[]; sort?: string | string[]; lang?: string | string[] }>;
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
  filters: string;
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
  stepFind: string;
  stepTimes: string;
  stepContact: string;
  resultsTitle: string;
}> = {
  en: {
    language: "Language",
    eyebrow: "Find care",
    title: "Find your doctor",
    intro: "Doctors, clinics and their real open times.",
    query: "Doctor, clinic, or specialty",
    queryPlaceholder: "e.g. Orthopedics or Dr. Sara",
    city: "City",
    cityPlaceholder: "e.g. Erbil",
    specialty: "Specialty",
    specialtyPlaceholder: "e.g. Orthopedics",
    sort: "Sort by",
    filters: "More filters",
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
    noPublishedHelp: "Clinics will appear here once they publish their doctors. You can still manage existing appointments.",
    stepFind: "Find a doctor",
    stepTimes: "See real times",
    stepContact: "Contact clinic",
    resultsTitle: "Doctors",
  },
  ku: {
    language: "زمان",
    eyebrow: "دۆزینەوەی پزیشک",
    title: "پزیشکەکەت بدۆزەرەوە",
    intro: "پزیشک، کلینیک و کاتە بەردەستە ڕاستەقینەکان.",
    query: "پزیشک، کلینیک یان پسپۆڕی",
    queryPlaceholder: "بۆ نموونە: ئێسک و جومگە",
    city: "شار",
    cityPlaceholder: "بۆ نموونە: هەولێر",
    specialty: "پسپۆڕی",
    specialtyPlaceholder: "بۆ نموونە: ئێسک و جومگە",
    sort: "ڕیزکردن",
    filters: "فلتەرەکان",
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
    noPublishedHelp: "کاتێک کلینیکەکان پزیشکەکانیان بڵاودەکەنەوە، لێرە دەردەکەون. دەتوانیت مەوعیدەکانی پێشووت ببینیت.",
    stepFind: "پزیشک بدۆزەرەوە",
    stepTimes: "کاتەکان ببینە",
    stepContact: "پەیوەندی بە کلینیک",
    resultsTitle: "پزیشکەکان",
  },
  bd: {
    language: "زمان",
    eyebrow: "دیتنا دکتۆری",
    title: "دکتۆرێ خۆ بدیتەوە",
    intro: "دکتۆر، کلینیک و دەمێن ڕاستەقینە یێن بەردەست.",
    query: "دکتۆر، کلینیک یان تایبەتمەندی",
    queryPlaceholder: "بۆ نموونە: ئێسک و جومگە",
    city: "باژێر",
    cityPlaceholder: "بۆ نموونە: هەولێر",
    specialty: "تایبەتمەندی",
    specialtyPlaceholder: "بۆ نموونە: ئێسک و جومگە",
    sort: "ڕێزکرن",
    filters: "فلتەرێن دی",
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
    noPublishedHelp: "دەمێ کلینیک دکتۆرێن خۆ بڵاو دکەن، ل ڤێرێ دیار دبن. دشێی وادەیێن خۆ ببینی.",
    stepFind: "دکتۆر بدیتەوە",
    stepTimes: "دەمێن بەردەست ببینە",
    stepContact: "پەیوەندی ب کلینیکێ",
    resultsTitle: "دکتۆر",
  },
  ar: {
    language: "اللغة",
    eyebrow: "ابحث عن رعاية",
    title: "ابحث عن طبيبك",
    intro: "الأطباء والعيادات وأوقاتهم المتاحة الفعلية.",
    query: "الطبيب أو العيادة أو الاختصاص",
    queryPlaceholder: "مثلاً: عظام أو د. سارة",
    city: "المدينة",
    cityPlaceholder: "مثلاً: أربيل",
    specialty: "الاختصاص",
    specialtyPlaceholder: "مثلاً: عظام",
    sort: "ترتيب حسب",
    filters: "خيارات البحث",
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
    noPublishedHelp: "ستظهر العيادات هنا عندما تنشر أطباءها. يمكنك متابعة مواعيدك الحالية.",
    stepFind: "ابحث عن طبيب",
    stepTimes: "شاهد الأوقات",
    stepContact: "تواصل مع العيادة",
    resultsTitle: "الأطباء",
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
  const params = await searchParams;
  const locale = await resolvePatientLocale(params.lang);
  const copy = careCopy[locale];
  const meta = uiLocaleMeta[locale];
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
    <main className="marketing-page atlas-care-page" lang={meta.language} dir={meta.direction}>
      <AtlasPatientNav locale={locale} myAppointments={copy.myAppointments} />

      <section className="shell atlas-care-shell">
        <div className="atlas-care-language">
          <div className="eyebrow">{copy.language}</div>
          <LoginLanguagePicker locale={locale} />
        </div>

        <div className="atlas-care-hero">
          <div className="atlas-care-hero-main">
        <div className="eyebrow">{copy.eyebrow}</div>
        <h1>{copy.title}</h1>
        <p className="hero-copy">{copy.intro}</p>
        <form className="atlas-care-search" method="get">
          <input type="hidden" name="lang" value={locale} />
          <div className="atlas-care-search-primary">
            <label>
              <span>{copy.query}</span>
              <input name="q" type="search" defaultValue={query} placeholder={copy.queryPlaceholder} maxLength={80} />
            </label>
            <button className="button" type="submit">{copy.search}</button>
          </div>
          <details className="atlas-care-filters" open={Boolean(city || specialty || sort === "soonest")}>
            <summary>{copy.filters}{city || specialty ? <span className="atlas-care-filter-active" aria-hidden="true">●</span> : null}</summary>
            <div className="atlas-care-search-extra">
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
              <button className="button button-ghost" type="submit">{copy.search}</button>
            </div>
          </details>
        </form>
          </div>
          <aside className="atlas-care-journey" aria-label={copy.patientHome}>
            <div className="atlas-care-journey-art" aria-hidden="true">
              <span className="atlas-care-orbit atlas-care-orbit-one" />
              <span className="atlas-care-orbit atlas-care-orbit-two" />
              <span className="atlas-care-orbit-heart">✳</span>
            </div>
            <div className="atlas-care-journey-steps">
              <div><span aria-hidden="true">01</span><strong>{copy.stepFind}</strong></div>
              <div><span aria-hidden="true">02</span><strong>{copy.stepTimes}</strong></div>
              <div><span aria-hidden="true">03</span><strong>{copy.stepContact}</strong></div>
            </div>
          </aside>
        </div>
        {!hasSearch && (browseSpecialties.length || hasAvailableSoon) ? (
          <section className="atlas-care-browse" aria-label={copy.browseSpecialties}>
            <strong>{copy.browseSpecialties}</strong>
            <div className="atlas-care-browse-actions">
              {hasAvailableSoon ? (
                <Link
                  className={`atlas-care-choice ${sort === "soonest" ? "is-active" : ""}`}
                  href={patientLocaleHref("/care", locale, { sort: "soonest" })}
                >
                  <span aria-hidden="true">◷</span>
                  {copy.availableSoon}
                </Link>
              ) : null}
              {browseSpecialties.map((item) => (
                <Link
                  className="atlas-care-choice"
                  key={item}
                  href={patientLocaleHref("/care", locale, { specialty: item, sort: "soonest" })}
                >
                  <span className="atlas-care-choice-mark" aria-hidden="true">{item.slice(0, 1)}</span>
                  {item}
                </Link>
              ))}
            </div>
          </section>
        ) : null}



        {error ? (
          <p className="notice notice-error atlas-care-notice" role="alert">{copy.unavailable}</p>
        ) : results.length ? (
          <section className="atlas-care-directory" aria-label={copy.resultsTitle}>
            <div className="atlas-care-directory-heading"><h2>{copy.resultsTitle}</h2><span>{results.length}</span></div>
          <div className="atlas-care-results">
            {results.map((doctor) => {
              const nextOpening = doctor.next_available_at
                ? nextAvailabilityLabel(doctor.next_available_at, locale)
                : null;
              return (
                <article className="atlas-care-result" key={`${doctor.clinic_slug}/${doctor.doctor_slug}`}>
                  <div className="atlas-care-result-heading">
                    <span className="atlas-care-doctor-mark" aria-hidden="true">{doctor.doctor_name.trim().slice(0, 1)}</span>
                    <div className="atlas-care-doctor-details">
                      <strong>{doctor.doctor_name}</strong>
                      <span>{doctor.specialty}{doctor.subspecialty ? ` · ${doctor.subspecialty}` : ""}</span>
                    </div>
                  </div>
                  <div className="atlas-care-result-location">
                    <Link href={patientLocaleHref(`/care/${doctor.clinic_slug}`, locale)}>{doctor.clinic_name}</Link>
                    {doctor.city || doctor.area ? <span>{[doctor.area, doctor.city].filter(Boolean).join(" · ")}</span> : null}
                  </div>
                  {nextOpening ? (
                    <Link
                      className="atlas-care-next-opening"
                      href={patientLocaleHref(`/care/${doctor.clinic_slug}/${doctor.doctor_slug}/times`, locale)}
                      aria-label={`${copy.nextAvailable}: ${nextOpening}`}
                    >
                      <span>{copy.nextAvailable}</span>
                      <strong dir="auto">{nextOpening}</strong>
                      <span className="atlas-care-next-arrow" aria-hidden="true">↗</span>
                    </Link>
                  ) : null}
                  <Link className="button button-ghost atlas-care-view-doctor" href={patientLocaleHref(`/care/${doctor.clinic_slug}/${doctor.doctor_slug}`, locale)}>
                    {copy.openProfile}
                    <span aria-hidden="true">›</span>
                  </Link>
                </article>
              );
            })}
          </div>
          </section>
        ) : hasSearch ? (
          <div className="atlas-care-empty">
            <strong>{copy.noResults}</strong>
            <p>{copy.noResultsHelp}</p>
            <Link className="atlas-care-reset" href={patientLocaleHref("/care", locale)}>{copy.allDoctors}</Link>
          </div>
        ) : (
          <section className="atlas-care-empty atlas-care-empty-published" aria-labelledby="atlas-care-empty-heading">
            <div className="atlas-care-empty-art" aria-hidden="true">
              <span className="atlas-care-empty-ring" />
              <span className="atlas-care-empty-symbol">✳</span>
              <span className="atlas-care-empty-spark atlas-care-empty-spark-one">✦</span>
              <span className="atlas-care-empty-spark atlas-care-empty-spark-two">✧</span>
            </div>
            <div className="atlas-care-empty-content">
              <span className="atlas-care-empty-kicker">{copy.resultsTitle}</span>
              <h2 id="atlas-care-empty-heading">{copy.noPublished}</h2>
              <p>{copy.noPublishedHelp}</p>
              <Link className="button atlas-care-empty-action" href={patientLocaleHref("/patient-account", locale)}>{copy.myAppointments}<span aria-hidden="true">↗</span></Link>
            </div>
          </section>
        )}

        <Link className="atlas-care-back" href="/">{copy.back}</Link>
      </section>

      <style>{`
        .atlas-care-page{min-height:100dvh;background:#f3f6f2;color:#142d25}
        .atlas-care-shell{max-width:1180px;padding-top:clamp(18px,3vw,34px);padding-bottom:84px}
        .atlas-care-language{display:flex;align-items:center;justify-content:flex-end;gap:12px;margin-bottom:18px}
        .atlas-care-language>.eyebrow{margin:0;color:#52685c}
        .atlas-care-hero{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(250px,.8fr);gap:0;overflow:hidden;border-radius:32px;background:#143f33;box-shadow:0 25px 75px rgba(15,57,44,.17)}
        .atlas-care-hero-main{min-width:0;padding:clamp(28px,4.6vw,64px);background:radial-gradient(ellipse at 4% 0%,#246b55 0%,#143f33 66%);color:#fff}
        .atlas-care-hero-main>.eyebrow{color:#a9e9c7;letter-spacing:.13em;font-size:12px}
        .atlas-care-hero-main h1{max-width:650px;margin:16px 0 16px;color:#fff;font-size:clamp(40px,5.4vw,72px);line-height:1.07;letter-spacing:-.055em;text-wrap:balance}
        .atlas-care-hero-main>.hero-copy{max-width:480px;margin:0;color:#d6e9dd;font-size:clamp(14px,1.6vw,18px);line-height:1.6}
        .atlas-care-search{display:grid;gap:11px;margin:36px 0 0}
        .atlas-care-search-primary{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:8px;border-radius:20px;padding:8px;background:var(--surface);box-shadow:0 15px 40px rgba(0,0,0,.14)}
        .atlas-care-search label{display:grid;gap:6px;min-width:0}
        .atlas-care-search-primary label{padding-inline-start:10px}
        .atlas-care-search label span{font-size:11px;font-weight:800;color:#4a6055}
        .atlas-care-search input,.atlas-care-search select{min-width:0;min-height:48px}
        .atlas-care-search-primary input{border:0;background:var(--surface);padding-inline:4px;box-shadow:none;color:#163b2c;font-size:15px}
        .atlas-care-search-primary input::placeholder{color:#687b70;opacity:1}
        .atlas-care-search-primary input:focus{box-shadow:0 0 0 3px #b9dfcb}
        .atlas-care-search-primary .button{min-height:51px;min-width:115px;border-radius:13px;background:#b8f2ce;color:#123c2c;font-weight:850}
        .atlas-care-search-primary .button:hover{background:#d5fbe2}
        .atlas-care-filters{border:1px solid #5b8877;border-radius:14px;background:rgba(255,255,255,.09)}
        .atlas-care-filters>summary{display:flex;align-items:center;gap:8px;min-height:46px;padding:11px 16px;color:#f2fff6;font-size:13px;font-weight:750;cursor:pointer}
        .atlas-care-filters>summary:focus-visible{outline:3px solid #c6f5d7;outline-offset:2px}
        .atlas-care-filter-active{color:#b8f2ce;font-size:10px}
        .atlas-care-search-extra{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:16px;border-top:1px solid #5b8877;background:#f8fcf9;border-radius:0 0 14px 14px}
        .atlas-care-search-extra label:last-of-type{grid-column:1/-1}
        .atlas-care-search-extra .button{grid-column:1/-1;min-height:48px}
        .atlas-care-journey{position:relative;display:flex;flex-direction:column;justify-content:flex-end;min-width:0;padding:32px;background:linear-gradient(155deg,#d7efdd,#9dd9b8);color:#163e30;isolation:isolate}
        .atlas-care-journey-art{position:absolute;inset:0;overflow:hidden;z-index:-1}
        .atlas-care-orbit{position:absolute;display:block;width:340px;height:340px;border:1px solid rgba(20,83,58,.25);border-radius:50%;top:-130px;inset-inline-end:-125px}
        .atlas-care-orbit-two{width:250px;height:250px;top:-85px;inset-inline-end:-80px;background:rgba(255,255,255,.22)}
        .atlas-care-orbit-heart{position:absolute;top:50px;inset-inline-end:64px;color:#15523b;font-size:100px;line-height:1}
        .atlas-care-journey-steps{display:grid;gap:10px;position:relative}
        .atlas-care-journey-steps>div{display:flex;align-items:center;gap:14px;min-height:61px;border:1px solid rgba(255,255,255,.72);border-radius:16px;padding:12px 16px;background:rgba(255,255,255,.73);box-shadow:0 6px 20px rgba(22,71,49,.05)}
        .atlas-care-journey-steps span{display:grid;flex:0 0 32px;width:32px;height:32px;place-items:center;border-radius:11px;background:#174c39;color:#fff;font-size:11px;font-weight:850}
        .atlas-care-journey-steps strong{font-size:clamp(12px,1.5vw,16px);line-height:1.35}
        .atlas-care-browse{display:grid;gap:13px;margin:28px 0 0}
        .atlas-care-browse>strong{font-size:13px;color:#294e3d}
        .atlas-care-browse-actions{display:flex;gap:10px;flex-wrap:wrap}
        .atlas-care-choice{display:inline-flex;align-items:center;gap:8px;min-height:48px;border:1px solid #d0ded4;border-radius:999px;padding:9px 17px;background:var(--surface);color:#194c37;font-size:13px;font-weight:800;text-decoration:none}
        .atlas-care-choice:hover,.atlas-care-choice.is-active{border-color:#276c4d;background:#e1f2e6}
        .atlas-care-choice-mark{display:grid;width:25px;height:25px;place-items:center;border-radius:50%;background:#e1f2e6;color:#174c39;font-size:12px;font-weight:850}
        .atlas-care-directory{margin-top:38px}
        .atlas-care-directory-heading{display:flex;align-items:center;gap:12px;margin-bottom:18px}
        .atlas-care-directory-heading h2{margin:0;font-size:25px;letter-spacing:-.04em}
        .atlas-care-directory-heading>span{border-radius:999px;padding:4px 10px;background:#e1f2e6;color:#19583c;font-size:12px;font-weight:850}
        .atlas-care-results{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
        .atlas-care-result{display:flex;flex-direction:column;gap:17px;min-width:0;padding:23px;border:1px solid #d9e5dc;border-radius:23px;background:var(--surface);box-shadow:0 10px 30px rgba(21,57,39,.04)}
        .atlas-care-result-heading{display:flex!important;align-items:center;gap:13px;min-width:0}
        .atlas-care-doctor-mark{display:grid!important;flex:0 0 auto;width:62px;height:62px;place-items:center;border-radius:20px;background:#e0f1e6;color:#155a3d!important;font-size:25px!important;font-weight:900}
        .atlas-care-doctor-details{min-width:0;display:grid;gap:5px}
        .atlas-care-doctor-details strong{font-size:20px;line-height:1.25;overflow-wrap:anywhere}
        .atlas-care-doctor-details>span{color:#576f61;font-size:13px;line-height:1.45;overflow-wrap:anywhere}
        .atlas-care-result-location{display:flex;flex-wrap:wrap;align-items:center;gap:5px 10px;font-size:13px}
        .atlas-care-result-location a{color:#1e5d42;font-weight:800;text-underline-offset:3px}
        .atlas-care-result-location span{color:#536b5e}
        .atlas-care-next-opening{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;align-items:center;padding:14px 16px;border:1px solid #b6dfc4;border-radius:15px;background:#e8f6ec;text-decoration:none;color:#17573a}
        .atlas-care-next-opening>span:first-child{grid-column:1;font-size:11px;font-weight:850}
        .atlas-care-next-opening>strong{grid-column:1;font-size:15px;line-height:1.4;overflow-wrap:anywhere}
        .atlas-care-next-arrow{grid-column:2;grid-row:1/3;font-size:20px}
        .atlas-care-view-doctor{display:flex;justify-content:space-between;gap:12px;min-height:48px;margin-top:auto;text-decoration:none}
        .atlas-care-view-doctor>span{font-size:20px}
        .atlas-care-empty{margin-top:32px;padding:30px;border:1px solid #d7e6db;border-radius:26px;background:var(--surface)}
        .atlas-care-empty>strong{display:block;color:#173f2d;font-size:21px;line-height:1.3}
        .atlas-care-empty p{margin:9px 0 0;color:#536c5c;font-size:14px;line-height:1.65}
        .atlas-care-empty-published{display:grid;grid-template-columns:minmax(200px,.7fr) minmax(0,1fr);gap:28px;align-items:center;min-height:310px;padding:clamp(25px,4vw,50px);background:linear-gradient(110deg,#fff 55%,#edf7ef);box-shadow:0 14px 45px rgba(22,62,39,.05)}
        .atlas-care-empty-art{position:relative;display:grid;place-items:center;min-height:220px;border-radius:24px;background:radial-gradient(circle at 50% 50%,#e3f5e8,#f4faf5 65%);overflow:hidden}
        .atlas-care-empty-ring{width:174px;height:174px;border:2px dashed #a6cfb5;border-radius:50%}
        .atlas-care-empty-symbol{position:absolute;display:grid;width:108px;height:108px;place-items:center;border-radius:30px;background:#195740;color:#d3f9df;font-size:70px;box-shadow:0 20px 40px rgba(16,71,44,.18)}
        .atlas-care-empty-spark{position:absolute;color:#408d60;font-size:30px}
        .atlas-care-empty-spark-one{top:28px;inset-inline-start:32px}
        .atlas-care-empty-spark-two{bottom:28px;inset-inline-end:32px}
        .atlas-care-empty-content{min-width:0}
        .atlas-care-empty-kicker{display:inline-block;margin-bottom:12px;color:#2b7651;font-size:12px;font-weight:850}
        .atlas-care-empty-content h2{max-width:540px;margin:0;color:#153d2c;font-size:clamp(25px,3.3vw,36px);line-height:1.25;letter-spacing:-.03em;text-wrap:balance}
        .atlas-care-empty-content p{max-width:480px}
        .atlas-care-empty-action{margin-top:22px;min-height:50px;gap:16px;background:#1c5c40}
        .atlas-care-reset{display:inline-block;margin-top:12px;color:#1a6847;font-size:13px;font-weight:800}
        .atlas-care-notice{margin-top:25px}
        .atlas-care-back{display:inline-block;margin-top:28px;color:#365c47;font-size:13px}
        :root[data-theme="dark"] .atlas-care-journey-steps strong,:root[data-theme="dark"] .atlas-care-next-opening strong{color:#153d2c!important}
        @media(prefers-color-scheme:dark){:root[data-theme="system"] .atlas-care-journey-steps strong,:root[data-theme="system"] .atlas-care-next-opening strong{color:#153d2c!important}}
        :root[data-theme="dark"] .atlas-care-page{background:var(--canvas);color:var(--ink)}
        :root[data-theme="dark"] .atlas-care-hero-main h1,:root[data-theme="dark"] .atlas-care-hero-main .eyebrow{color:#f5fff8!important}
        :root[data-theme="dark"] .atlas-care-hero-main>.hero-copy{color:#d6e9dd!important}
        :root[data-theme="dark"] .atlas-care-result,:root[data-theme="dark"] .atlas-care-empty{background:var(--surface);border-color:var(--line)}
        :root[data-theme="dark"] .atlas-care-result :is(strong,h2),:root[data-theme="dark"] .atlas-care-empty :is(strong,h2),:root[data-theme="dark"] .atlas-care-directory-heading h2{color:var(--ink)!important}
        :root[data-theme="dark"] .atlas-care-result-location span,:root[data-theme="dark"] .atlas-care-empty p{color:var(--muted)!important}
        :root[data-theme="dark"] .atlas-care-empty-published{background:linear-gradient(110deg,#11231c,#19392a)}
        :root[data-theme="dark"] .atlas-care-empty-art{background:#193c2f}
        :root[data-theme="dark"] .atlas-care-search-primary{background:#11231c}
        :root[data-theme="dark"] .atlas-care-search-primary input{background:#0d1f18;color:var(--ink)}
        :root[data-theme="dark"] .atlas-care-search-primary label span{color:#c5dfce!important}
        :root[data-theme="dark"] .atlas-care-search-extra{background:#11231c}
        @media(prefers-color-scheme:dark){:root[data-theme="system"] .atlas-care-page{background:var(--canvas);color:var(--ink)}:root[data-theme="system"] .atlas-care-hero-main h1,:root[data-theme="system"] .atlas-care-hero-main .eyebrow{color:#f5fff8!important}:root[data-theme="system"] .atlas-care-hero-main>.hero-copy{color:#d6e9dd!important}:root[data-theme="system"] .atlas-care-result,:root[data-theme="system"] .atlas-care-empty{background:var(--surface);border-color:var(--line)}:root[data-theme="system"] .atlas-care-result :is(strong,h2),:root[data-theme="system"] .atlas-care-empty :is(strong,h2),:root[data-theme="system"] .atlas-care-directory-heading h2{color:var(--ink)!important}:root[data-theme="system"] .atlas-care-result-location span,:root[data-theme="system"] .atlas-care-empty p{color:var(--muted)!important}:root[data-theme="system"] .atlas-care-empty-published{background:linear-gradient(110deg,#11231c,#19392a)}:root[data-theme="system"] .atlas-care-empty-art{background:#193c2f}:root[data-theme="system"] .atlas-care-search-primary{background:#11231c}:root[data-theme="system"] .atlas-care-search-primary input{background:#0d1f18;color:var(--ink)}:root[data-theme="system"] .atlas-care-search-primary label span{color:#c5dfce!important}:root[data-theme="system"] .atlas-care-search-extra{background:#11231c}}
        @media(max-width:900px){.atlas-care-search{grid-template-columns:1fr}}
        @media(max-width:850px){.atlas-care-hero{grid-template-columns:minmax(0,1.2fr) minmax(205px,.75fr)}.atlas-care-hero-main{padding:30px}.atlas-care-journey{padding:20px}.atlas-care-orbit-heart{inset-inline-end:20px}}
        @media(max-width:700px){.atlas-care-results{grid-template-columns:1fr}.atlas-care-hero{grid-template-columns:1fr;border-radius:24px}.atlas-care-hero-main{padding:clamp(25px,6vw,36px)}.atlas-care-hero-main h1{font-size:clamp(36px,9vw,51px)}.atlas-care-journey{min-height:0;padding:15px;background:#c9ead4}.atlas-care-journey-art{display:none}.atlas-care-journey-steps{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.atlas-care-journey-steps>div{flex-direction:column;align-items:flex-start;gap:6px;min-height:85px;padding:10px}.atlas-care-journey-steps span{width:26px;height:26px;flex-basis:26px;font-size:10px}.atlas-care-journey-steps strong{font-size:11px}.atlas-care-results{grid-template-columns:1fr}.atlas-care-empty-published{grid-template-columns:1fr}.atlas-care-empty-art{min-height:165px}.atlas-care-empty-ring{width:140px;height:140px}.atlas-care-empty-symbol{width:90px;height:90px;font-size:57px}}
        @media(max-width:440px){.atlas-care-search-primary{grid-template-columns:1fr}.atlas-care-search-primary .button{width:100%}.atlas-care-language{justify-content:flex-start;flex-wrap:wrap}.atlas-care-journey-steps strong{font-size:10px}.atlas-care-result{padding:18px}}
        @media(prefers-reduced-motion:reduce){.atlas-care-page *{scroll-behavior:auto;transition:none!important}}
      `}</style>
    </main>
  );
}
