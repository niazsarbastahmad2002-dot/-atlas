import Link from "next/link";
import { patientLocaleHref } from "@/app/care/patient-locale";
import type { UiLocale } from "@/lib/i18n/ui";
import {
  buildPublishedLocationTree,
  publishedCityLabel,
  type PublishedLocationDoctor,
} from "@/lib/patient-location-browse";

const labels: Record<UiLocale, {
  search: string;
  placeholder: string;
  searchButton: string;
  clear: string;
  area: string;
  unspecifiedArea: string;
  clinic: string;
  doctor: string;
  openClinic: string;
  openDoctor: string;
  empty: string;
  noMatch: string;
  accuracy: string;
}> = {
  en: {
    search: "Search displayed cities, areas, clinics or doctors",
    placeholder: "City, area, clinic or doctor",
    searchButton: "Search",
    clear: "Clear search",
    area: "Area",
    unspecifiedArea: "Area not provided",
    clinic: "Clinic",
    doctor: "Doctor",
    openClinic: "Clinic details and published address",
    openDoctor: "View doctor",
    empty: "No city locations are available in these published results yet.",
    noMatch: "No matches in the currently displayed results. Try another spelling or clear the search.",
    accuracy: "Only clinics and doctors from the current published search results appear here. This is not a full directory. Areas are clinic-provided; exact street or medical-center details appear only on clinic profiles when published. Atlas does not independently verify addresses.",
  },
  ku: {
    search: "لە شار، ناوچە، کلینیک یان ناوی دکتۆر بگەڕێ",
    placeholder: "شار، ناوچە، کلینیک یان دکتۆر",
    searchButton: "گەڕان",
    clear: "سڕینەوەی گەڕان",
    area: "ناوچە",
    unspecifiedArea: "ناوچە دیاری نەکراوە",
    clinic: "کلینیک",
    doctor: "دکتۆر",
    openClinic: "کلینیک و ناونیشانی بڵاوکراوە",
    openDoctor: "بینینی دکتۆر",
    empty: "هێشتا هیچ شارێک لەم ئەنجامە بڵاوکراوانەدا نییە.",
    noMatch: "لەم ئەنجامە پیشاندراوانەدا نەدۆزرایەوە. ناوەکە بگۆڕە یان گەڕانەکە بسڕەوە.",
    accuracy: "تەنها کلینیک و دکتۆرە بڵاوکراوەکانی ئەنجامەکانی ئێستا پیشان دەدرێن. ئەم لیستە تەواو نییە. ناوی ناوچە لەلایەن کلینیکەوە دانراوە. ناونیشانی ورد تەنها ئەگەر بڵاوکرابێتەوە، لە پڕۆفایلی کلینیک دەبینرێت. Atlas سەربەخۆ ناونیشانەکان ناپشکنێت.",
  },
  bd: {
    search: "ل باژێر، ناوچە، کلینیک یان ناڤێ دکتۆری بگەڕە",
    placeholder: "باژێر، ناوچە، کلینیک یان دکتۆر",
    searchButton: "گەڕان",
    clear: "پاککرنا گەڕانێ",
    area: "ناوچە",
    unspecifiedArea: "ناوچە نەهاتییە دیارکرن",
    clinic: "کلینیک",
    doctor: "دکتۆر",
    openClinic: "کلینیک و ناڤنیشانا بڵاوکری",
    openDoctor: "دیتنا دکتۆری",
    empty: "هێشتا چ باژێر د ئەڤان ئەنجامێن بڵاوکری دا نینە.",
    noMatch: "د ئەڤان ئەنجامێن نیشاندای دا نەهاتە دیتن. ناڤەکێ دی بنڤیسە یان گەڕانێ پاک بکە.",
    accuracy: "تەنێ کلینیک و دکتۆرێن بڵاوکری ژ ئەنجامێن نوکە دهێنە نیشاندان. ئەڤ لیستە تەمام نینە. ناڤێ ناوچەیێ ژ لایێ کلینیکێ ڤە هاتییە دانان. ناڤنیشانا ورد تەنێ د پڕۆفایلا کلینیکێ دا دیار دبیت ئەگەر بڵاو کر بیت. Atlas ب خۆ ناڤنیشانان پشتڕاست ناکەت.",
  },
  ar: {
    search: "ابحث ضمن المدن والمناطق والعيادات والأطباء المعروضين",
    placeholder: "مدينة أو منطقة أو عيادة أو طبيب",
    searchButton: "بحث",
    clear: "مسح البحث",
    area: "المنطقة",
    unspecifiedArea: "المنطقة غير مذكورة",
    clinic: "العيادة",
    doctor: "الطبيب",
    openClinic: "تفاصيل العيادة والعنوان المنشور",
    openDoctor: "عرض الطبيب",
    empty: "لا توجد مدن ضمن النتائج المنشورة المعروضة حالياً.",
    noMatch: "ماكو نتائج مطابقة ضمن القائمة المعروضة. جرّب كتابة ثانية أو امسح البحث.",
    accuracy: "نعرض فقط العيادات والأطباء من نتائج البحث المنشورة حالياً؛ مو دليل كامل. أسماء المناطق مُدخلة من العيادات، والعنوان التفصيلي يظهر بملف العيادة فقط إذا كان منشوراً. Atlas ما يتحقق بشكل مستقل من العناوين.",
  },
};

export function PatientLocationsExplore({
  doctors, locale, query,
}: {
  doctors: PublishedLocationDoctor[];
  locale: UiLocale;
  query: string;
}) {
  const t = labels[locale];
  const cities = buildPublishedLocationTree(doctors, query);
  const hasQuery = Boolean(query.trim());
  return (
    <section className="atlas-location-browser" aria-label={t.search}>
      <form method="get" action="/explore/locations" className="atlas-location-search" role="search">
        <input type="hidden" name="lang" value={locale} />
        <label htmlFor="atlas-location-query">{t.search}</label>
        <div className="atlas-location-search-controls">
          <input id="atlas-location-query" name="q" type="search" dir="auto" defaultValue={query} maxLength={100} placeholder={t.placeholder} autoComplete="off" />
          <button type="submit" className="button">{t.searchButton}</button>
          {hasQuery ? <Link href={patientLocaleHref("/explore/locations", locale)}>{t.clear}</Link> : null}
        </div>
      </form>
      {cities.length ? (
        <div className="atlas-location-cities">
          {cities.map((city) => (
            <details key={city.key} className="atlas-location-city" open={hasQuery}>
              <summary><strong><bdi>{publishedCityLabel(city, locale)}</bdi></strong><span aria-hidden="true">⌄</span></summary>
              <div className="atlas-location-areas">
                {city.areas.map((area) => (
                  <section className="atlas-location-area" key={area.name ?? "unknown"}>
                    <h3>{t.area}: <bdi>{area.name ?? t.unspecifiedArea}</bdi></h3>
                    <div className="atlas-location-clinics">
                      {area.clinics.map((clinic) => (
                        <article className="atlas-location-clinic" key={clinic.slug}>
                          <div className="atlas-location-clinic-heading">
                            <span>{t.clinic}</span>
                            <Link href={patientLocaleHref("/care/" + clinic.slug, locale)}><bdi>{clinic.name}</bdi></Link>
                          </div>
                          <ul aria-label={t.doctor}>
                            {clinic.doctors.map((doctor) => (
                              <li key={doctor.slug}>
                                <span><bdi>{doctor.name}</bdi></span>
                                <Link href={patientLocaleHref("/care/" + clinic.slug + "/" + doctor.slug, locale)}>{t.openDoctor}</Link>
                              </li>
                            ))}
                          </ul>
                          <Link className="atlas-location-clinic-action" href={patientLocaleHref("/care/" + clinic.slug, locale)}>{t.openClinic} <span aria-hidden="true">↗</span></Link>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </details>
          ))}
        </div>
      ) : <p className="atlas-explore-empty" role="status">{hasQuery ? t.noMatch : t.empty}</p>}
      <p className="atlas-location-disclaimer">{t.accuracy}</p>
      <style>{`
        .atlas-location-browser{display:grid;gap:18px}
        .atlas-location-search{display:grid;gap:9px;padding:20px;border:1px solid var(--line);border-radius:18px;background:var(--surface)}
        .atlas-location-search label{font-size:14px;font-weight:800}
        .atlas-location-search-controls{display:flex;align-items:center;flex-wrap:wrap;gap:10px}
        .atlas-location-search-controls input{flex:1 1 230px;min-width:0;min-height:48px;padding:11px 14px;border:1px solid var(--line);border-radius:12px;background:var(--canvas);color:var(--ink);font:inherit}
        .atlas-location-search-controls .button{min-height:48px}
        .atlas-location-search-controls>a{display:inline-flex;min-height:48px;align-items:center;color:var(--accent);font-weight:750}
        .atlas-location-cities{display:grid;gap:12px}
        .atlas-location-city{min-width:0;overflow:hidden;border:1px solid var(--line);border-radius:18px;background:var(--surface)}
        .atlas-location-city>summary{display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:67px;padding:16px 20px;font-size:20px;cursor:pointer;list-style:none}
        .atlas-location-city>summary::-webkit-details-marker{display:none}
        .atlas-location-city[open]>summary{border-bottom:1px solid var(--line)}
        .atlas-location-areas{display:grid;gap:18px;padding:18px}
        .atlas-location-area{min-width:0}
        .atlas-location-area h3{margin:0 0 11px;color:var(--muted);font-size:14px;line-height:1.7}
        .atlas-location-clinics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .atlas-location-clinic{display:flex;flex-direction:column;min-width:0;gap:13px;padding:17px;border:1px solid var(--line);border-radius:14px;background:var(--canvas)}
        .atlas-location-clinic-heading{display:grid;gap:5px}
        .atlas-location-clinic-heading>span{font-size:11px;color:var(--muted)}
        .atlas-location-clinic-heading a{font-weight:850;font-size:17px;overflow-wrap:anywhere;color:var(--ink)}
        .atlas-location-clinic ul{list-style:none;margin:0;padding:0;display:grid;gap:9px}
        .atlas-location-clinic li{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;border-top:1px solid var(--line);padding-top:9px;font-size:14px}
        .atlas-location-clinic li span{overflow-wrap:anywhere}
        .atlas-location-clinic li a,.atlas-location-clinic-action{color:var(--accent);font-size:13px;font-weight:800}
        .atlas-location-clinic-action{display:inline-flex;align-items:center;gap:7px;min-height:48px;margin-top:auto}
        .atlas-location-disclaimer{max-width:790px;margin:0;color:var(--muted);font-size:12px;line-height:1.8}
        .atlas-location-browser :is(a,button,input,summary):focus-visible{outline:3px solid var(--accent);outline-offset:3px}
        @media(max-width:700px){.atlas-location-clinics{grid-template-columns:1fr}.atlas-location-areas{padding:13px}.atlas-location-search{padding:15px}.atlas-location-city>summary{font-size:18px;padding:14px 16px}}
        @media(max-width:370px){.atlas-location-search-controls .button{width:100%}.atlas-location-city>summary{min-height:60px}}
        @media(prefers-reduced-motion:reduce){.atlas-location-browser *{transition:none!important}}
      `}</style>
    </section>
  );
}
