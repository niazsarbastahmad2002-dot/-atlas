import Link from "next/link";
import { LoginLanguagePicker } from "@/app/login/language-picker";
import { getUiLocale } from "@/lib/i18n/ui-server";
import type { UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CarePageProps = {
  searchParams: Promise<{ q?: string; city?: string; specialty?: string }>;
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
  search: string;
  noResults: string;
  noResultsHelp: string;
  unavailable: string;
  clinic: string;
  openProfile: string;
  back: string;
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
    search: "Search",
    noResults: "No published doctors match this search yet.",
    noResultsHelp: "Try a broader search or remove one of the filters.",
    unavailable: "Public doctor search is temporarily unavailable.",
    clinic: "Clinic",
    openProfile: "View doctor",
    back: "Atlas home",
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
    search: "گەڕان",
    noResults: "هێشتا هیچ پزیشکێکی بڵاوکراوە لەم گەڕانەدا نەدۆزرایەوە.",
    noResultsHelp: "گەڕانەکە فراوانتر بکە یان یەکێک لە فلتەرەکان لاببە.",
    unavailable: "گەڕانی پزیشکی گشتی کاتێک بەردەست نییە.",
    clinic: "کلینیک",
    openProfile: "پڕۆفایلی پزیشک",
    back: "گەڕانەوە بۆ Atlas",
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
    search: "گەڕان",
    noResults: "هێشتا هیچ دکتۆرەکێ بڵاوکری ل ڤی گەڕانێ نەهاتە دیتن.",
    noResultsHelp: "گەڕانێ فراوانتر بکە یان فلتەرەکێ لاببە.",
    unavailable: "گەڕانا گشتی یا دکتۆران نوکە بەردەست نینە.",
    clinic: "کلینیک",
    openProfile: "پڕۆفایلا دکتۆری",
    back: "ڤەگەڕە Atlas",
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
    search: "بحث",
    noResults: "لا يوجد أطباء منشورون يطابقون هذا البحث حالياً.",
    noResultsHelp: "وسّع البحث أو احذف أحد الفلاتر.",
    unavailable: "البحث العام عن الأطباء غير متاح مؤقتاً.",
    clinic: "العيادة",
    openProfile: "عرض الطبيب",
    back: "العودة إلى Atlas",
  },
};

function bounded(value: string | undefined, max: number) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max);
}

export default async function CarePage({ searchParams }: CarePageProps) {
  const [params, locale] = await Promise.all([searchParams, getUiLocale()]);
  const copy = careCopy[locale];
  const query = bounded(params.q, 80);
  const city = bounded(params.city, 100);
  const specialty = bounded(params.specialty, 120);
  const hasSearch = Boolean(query || city || specialty);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_public_doctors", {
    p_query: query || null,
    p_city: city || null,
    p_specialty: specialty || null,
    p_limit: 30,
  });
  const results = error ? [] : (data ?? []);

  return (
    <main className="marketing-page atlas-care-page">
      <nav className="nav shell marketing-nav">
        <Link className="app-brand atlas-marketing-brand" href="/" aria-label="Atlas home">
          <span className="app-brand-mark" aria-hidden="true">A</span>
          <span className="app-brand-word">Atlas</span>
        </Link>
      </nav>

      <section className="shell atlas-care-shell">
        <div className="atlas-care-language">
          <div className="eyebrow">{copy.language}</div>
          <LoginLanguagePicker locale={locale} />
        </div>

        <div className="eyebrow">{copy.eyebrow}</div>
        <h1>{copy.title}</h1>
        <p className="hero-copy">{copy.intro}</p>

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
          <button className="button" type="submit">{copy.search}</button>
        </form>

        {error ? (
          <p className="notice notice-error atlas-care-notice" role="alert">{copy.unavailable}</p>
        ) : results.length ? (
          <div className="atlas-care-results">
            {results.map((doctor) => (
              <article className="atlas-care-result" key={`${doctor.clinic_slug}/${doctor.doctor_slug}`}>
                <div>
                  <strong>{doctor.doctor_name}</strong>
                  <span>{doctor.specialty}{doctor.subspecialty ? ` · ${doctor.subspecialty}` : ""}</span>
                </div>
                <p><b>{copy.clinic}:</b> {doctor.clinic_name}</p>
                {(doctor.city || doctor.area) ? <p>{[doctor.area, doctor.city].filter(Boolean).join(" · ")}</p> : null}
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
          </div>
        ) : null}

        <Link className="atlas-care-back" href="/">{copy.back}</Link>
      </section>

      <style>{`
        .atlas-care-page{min-height:100dvh}.atlas-care-shell{max-width:880px;padding-top:clamp(34px,7vh,72px);padding-bottom:70px}.atlas-care-language{max-width:650px;margin-bottom:30px}.atlas-care-language>.eyebrow{margin-bottom:10px}.atlas-care-search{display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:10px;align-items:end;margin:28px 0}.atlas-care-search label{display:grid;gap:7px}.atlas-care-search label span{font-size:11px;font-weight:800;color:var(--muted)}.atlas-care-search input{min-height:48px}.atlas-care-search .button{min-height:48px}.atlas-care-results{display:grid;gap:12px;margin-top:24px}.atlas-care-result{display:grid;gap:9px;padding:18px;border:1px solid var(--line);border-radius:18px;background:#fff}.atlas-care-result>div{display:grid;gap:4px}.atlas-care-result strong{font-size:18px}.atlas-care-result span,.atlas-care-result p{color:var(--muted);font-size:12px;line-height:1.5}.atlas-care-result p{margin:0}.atlas-care-result .button{justify-self:start;text-decoration:none}.atlas-care-empty{margin-top:24px;padding:22px;border:1px dashed var(--line);border-radius:18px}.atlas-care-empty p{margin:7px 0 0;color:var(--muted)}.atlas-care-notice{margin-top:24px}.atlas-care-back{display:inline-block;margin-top:28px;color:var(--muted);font-size:12px}@media(max-width:760px){.atlas-care-search{grid-template-columns:1fr}.atlas-care-search .button{width:100%}}
      `}</style>
    </main>
  );
}
