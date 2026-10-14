import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AtlasPatientNav } from "@/app/care/patient-nav";
import { patientLocaleHref, resolvePatientLocale } from "@/app/care/patient-locale";
import { createClient } from "@/lib/supabase/server";
import { patientSpecialtyDetails, publishedSubspecialties } from "@/lib/patient-specialties";
import { uiLocaleMeta, type UiLocale } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

type ExploreKind = "clinics" | "specialties" | "locations";
type PageProps = {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
};

function isExploreKind(value: string): value is ExploreKind {
  return value === "clinics" || value === "specialties" || value === "locations";
}

const copy: Record<UiLocale, {
  titles: Record<ExploreKind, string>;
  descriptions: Record<ExploreKind, string>;
  navLabel: string;
  findDoctor: string;
  appointments: string;
  note: string;
  empty: string;
  unavailable: string;
  viewClinic: string;
  viewDoctors: string;
  specialtySource: string;
  specialtyFocus: string;
  specialtyGuidance: string;
}> = {
  en: {
    titles: { clinics: "Clinics", specialties: "Specialties", locations: "Cities" },
    descriptions: {
      clinics: "Find clinics that have published their doctors on Atlas.",
      specialties: "Choose a specialty to find published doctors.",
      locations: "Choose a city to see published doctors there.",
    },
    navLabel: "Browse care",
    findDoctor: "Find a doctor",
    appointments: "My appointments",
    note: "These options come from currently displayed, published doctor results. They are not a complete directory.",
    empty: "Nothing has been published here yet.",
    unavailable: "We could not load these results. Please try again later.",
    viewClinic: "View clinic",
    viewDoctors: "View doctors",
    specialtySource: "Published specialty",
    specialtyFocus: "Focus areas listed by clinics",
    specialtyGuidance: "These descriptions explain fields of medicine, not which doctor you personally need. Only published doctors are shown; clinic-listed focus areas are not independently credential-verified.",
  },
  ku: {
    titles: { clinics: "کلینیکەکان", specialties: "پسپۆڕییەکان", locations: "شارەکان" },
    descriptions: {
      clinics: "ئەو کلینیکانە ببینە کە دکتۆرەکانیان لە Atlas بڵاوکراونەتەوە.",
      specialties: "پسپۆڕییەک هەڵبژێرە بۆ دۆزینەوەی دکتۆر.",
      locations: "شارێک هەڵبژێرە بۆ بینینی دکتۆرەکان.",
    },
    navLabel: "گەڕان بۆ دکتۆر",
    findDoctor: "گەڕان بۆ دکتۆر",
    appointments: "مەوعیدەکانم",
    note: "ئەم لیستە تەنها لە زانیارییە بڵاوکراوەکانی دکتۆرەکان دروست کراوە و هێشتا تەواو نییە.",
    empty: "هێشتا هیچ زانیارییەک لێرە نییە.",
    unavailable: "ئێستا ناتوانین زانیارییەکان پیشان بدەین. دواتر هەوڵ بدەوە.",
    viewClinic: "کلینیک ببینە",
    viewDoctors: "دکتۆرەکان ببینە",
    specialtySource: "پسپۆڕیی بڵاوکراوە",
    specialtyFocus: "بوارە تایبەتەکانی ناوبراو لەلایەن کلینیکەکان",
    specialtyGuidance: "ئەم ڕوونکردنەوانە تەنها بۆ ناسینی پسپۆڕییەکانن، نەک دیاریکردنی دکتۆر بۆ تۆ. تەنها دکتۆرە بڵاوکراوەکان پیشان دەدرێن؛ بوارە تایبەتەکان بە سەربەخۆ پشتڕاست نەکراونەتەوە.",
  },
  bd: {
    titles: { clinics: "کلینیک", specialties: "تایبەتمەندی", locations: "باژێر" },
    descriptions: {
      clinics: "ئەو کلینیکان ببینە کو دکتۆرێن خۆ ل Atlas بڵاو کرینە.",
      specialties: "تایبەتمەندییەکێ هەلبژێرە بۆ دیتنا دکتۆران.",
      locations: "باژێرەکێ هەلبژێرە بۆ دیتنا دکتۆران.",
    },
    navLabel: "گەڕانا دکتۆران",
    findDoctor: "دکتۆر بدیتەوە",
    appointments: "وادەیێن من",
    note: "ئەڤ لیستە تەنێ ژ زانیارییێن دکتۆرێن بڵاوکری هاتییە دروستکرن و هێشتا تەمام نینە.",
    empty: "هێشتا چ زانیاری ل ڤێرێ نینە.",
    unavailable: "نوکە نەشێین زانیارییان نیشان بدەین. پاشتر جارەکا دی هەول بدە.",
    viewClinic: "کلینیکێ ببینە",
    viewDoctors: "دکتۆران ببینە",
    specialtySource: "تایبەتمەندیا بڵاوکری",
    specialtyFocus: "بوارێن تایبەت یێن کلینیکان نڤیساندین",
    specialtyGuidance: "ئەڤ ڕوونکرنە تەنێ بۆ ناسینا تایبەتمەندییانە، نە بۆ هەلبژارتنا دکتۆری بۆ تە. تەنێ دکتۆرێن بڵاوکری دهێن نیشاندان؛ ئەڤ بوارێن تایبەت سەربەخۆ نەهاتین پشتڕاستکرن.",
  },
  ar: {
    titles: { clinics: "العيادات", specialties: "الاختصاصات", locations: "المدن" },
    descriptions: {
      clinics: "شوف العيادات اللي ناشرة أطباءها على Atlas.",
      specialties: "اختار اختصاص حتى تشوف الأطباء المنشورين.",
      locations: "اختار مدينة حتى تشوف الأطباء المنشورين بيها.",
    },
    navLabel: "تصفّح",
    findDoctor: "دوّر على دكتور",
    appointments: "مواعيدي",
    note: "هاي القوائم من نتائج الأطباء المنشورين حاليًا، وممكن مو كاملة.",
    empty: "ماكو نتائج منشورة هنا لحد الآن.",
    unavailable: "ما گدرنا نحمّل النتائج هسه. جرّب بعدين.",
    viewClinic: "شوف العيادة",
    viewDoctors: "شوف الأطباء",
    specialtySource: "الاختصاص المنشور",
    specialtyFocus: "مجالات دقيقة تذكرها العيادات",
    specialtyGuidance: "هاي الشروحات للتعريف بالاختصاصات، مو لتحديد الطبيب المناسب لحالتك. نعرض فقط الأطباء المنشورين، والمجالات الدقيقة المذكورة من العيادات مو موثّقة بشكل مستقل.",
  },
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [{ kind }, search] = await Promise.all([params, searchParams]);
  const locale = await resolvePatientLocale(search.lang);
  return {
    title: isExploreKind(kind) ? `${copy[locale].titles[kind]} — Atlas Patient` : "Atlas Patient",
    description: isExploreKind(kind) ? copy[locale].descriptions[kind] : undefined,
  };
}

export default async function PatientExplorePage({ params, searchParams }: PageProps) {
  const [{ kind }, search] = await Promise.all([params, searchParams]);
  if (!isExploreKind(kind)) notFound();

  const locale = await resolvePatientLocale(search.lang);
  const t = copy[locale];
  const meta = uiLocaleMeta[locale];
  const supabase = await createClient();

  // Existing published-only public search. Do not enumerate private clinics, patients,
  // medical centers or unavailable providers, or suggest this 30-result window is exhaustive.
  const { data, error } = await supabase.rpc("search_public_doctors_with_availability", {
    p_query: null,
    p_city: null,
    p_specialty: null,
    p_limit: 30,
    p_sort: "name",
  });
  const doctors = error ? [] : (data ?? []);
  const clinics = Array.from(new Map(
    doctors.filter((doctor) => doctor.clinic_slug && doctor.clinic_name).map((doctor) => [
      doctor.clinic_slug,
      {
        key: doctor.clinic_slug,
        label: doctor.clinic_name,
        detail: [doctor.area, doctor.city].filter(Boolean),
        href: patientLocaleHref(`/care/${doctor.clinic_slug}`, locale),
      },
    ]),
  ).values());
  const specialties = Array.from(new Set(
    doctors.map((doctor) => doctor.specialty?.trim()).filter((name): name is string => Boolean(name)),
  )).map((name) => ({
    key: name,
    label: name,
    detail: [] as string[],
    href: patientLocaleHref("/care", locale, { specialty: name }),
  }));
  const cities = Array.from(new Set(
    doctors.map((doctor) => doctor.city?.trim()).filter((name): name is string => Boolean(name)),
  )).map((name) => ({
    key: name,
    label: name,
    detail: [] as string[],
    href: patientLocaleHref("/care", locale, { city: name }),
  }));

  const items = (kind === "clinics" ? clinics : kind === "specialties" ? specialties : cities)
    .sort((a, b) => a.label.localeCompare(b.label));
  return (
    <main className="marketing-page atlas-patient-explore" lang={meta.language} dir={meta.direction}>
      <AtlasPatientNav locale={locale} myAppointments={t.appointments} />
      <div className="shell atlas-explore-shell">
        <Link className="atlas-explore-back" href={patientLocaleHref("/care", locale)}>‹ {t.findDoctor}</Link>
        <header className="atlas-explore-header">
          <div className="eyebrow">Atlas Patient</div>
          <h1>{t.titles[kind]}</h1>
          <p>{t.descriptions[kind]}</p>
        </header>
        <nav className="atlas-explore-tabs" aria-label={t.navLabel}>
          {(["clinics", "specialties", "locations"] as const).map((tab) => (
            <Link key={tab} href={patientLocaleHref(`/explore/${tab}`, locale)} aria-current={kind === tab ? "page" : undefined}>{t.titles[tab]}</Link>
          ))}
        </nav>
        {kind === "specialties" ? <p className="atlas-explore-guidance">{t.specialtyGuidance}</p> : null}
        {error ? <p className="notice notice-error" role="alert">{t.unavailable}</p> : items.length ? (
          <section className="atlas-explore-grid" aria-label={t.titles[kind]}>
            {items.map((item) => {
              if (kind === "specialties") {
                const details = patientSpecialtyDetails(item.label, locale);
                const focusAreas = publishedSubspecialties(doctors, item.label);
                return (
                  <article className="atlas-explore-card atlas-explore-specialty" key={item.key}>
                    <Link className="atlas-explore-specialty-main" href={item.href}>
                      <span className="atlas-explore-card-name"><bdi>{details?.name ?? item.label}</bdi></span>
                      {details && details.name !== item.label ? <small className="atlas-explore-original">{t.specialtySource}: <bdi>{item.label}</bdi></small> : null}
                      {details ? <span className="atlas-explore-about">{details.about}</span> : null}
                      <span className="atlas-explore-card-action">{t.viewDoctors} <span aria-hidden="true">↗</span></span>
                    </Link>
                    {focusAreas.length ? (
                      <div className="atlas-explore-focus">
                        <span className="atlas-explore-focus-label">{t.specialtyFocus}</span>
                        <div className="atlas-explore-focus-links">
                          {focusAreas.map((focus) => (
                            <Link key={focus} href={patientLocaleHref("/care", locale, { specialty: item.label, q: focus })}>
                              <bdi>{focus}</bdi>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              }
              return (
                <Link className="atlas-explore-card" href={item.href} key={item.key}>
                  <span className="atlas-explore-card-name"><bdi>{item.label}</bdi></span>
                  {item.detail.length ? <small>{item.detail.map((part, index) => <span key={index}>{index ? " · " : null}<bdi>{part}</bdi></span>)}</small> : null}
                  <span className="atlas-explore-card-action">{kind === "clinics" ? t.viewClinic : t.viewDoctors} <span aria-hidden="true">↗</span></span>
                </Link>
              );
            })}
          </section>
        ) : (
          <section className="atlas-explore-empty">
            <h2>{t.empty}</h2>
            <Link className="button" href={patientLocaleHref("/care", locale)}>{t.findDoctor}</Link>
          </section>
        )}
        <p className="atlas-explore-note">{t.note}</p>
      </div>
      <style>{`
        .atlas-patient-explore{min-height:100dvh;background:var(--canvas);color:var(--ink)}
        .atlas-explore-shell{max-width:1150px;padding-top:clamp(16px,3vw,36px);padding-bottom:70px}
        .atlas-explore-back{display:inline-flex;align-items:center;min-height:48px;margin-bottom:16px;color:var(--accent);font-weight:800;text-underline-offset:4px}
        .atlas-explore-header{padding:clamp(23px,4vw,42px);border:1px solid var(--line);border-radius:25px;background:var(--surface);box-shadow:var(--shadow-sm)}
        .atlas-explore-header>.eyebrow{color:var(--accent)}
        .atlas-explore-header h1{margin:7px 0 10px;font-size:clamp(32px,5vw,52px);line-height:1.15;color:var(--ink)}
        .atlas-explore-header p{margin:0;max-width:650px;color:var(--muted);font-size:clamp(14px,1.5vw,17px);line-height:1.75}
        .atlas-explore-tabs{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:20px 0 24px}
        .atlas-explore-tabs a{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:9px 18px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--ink);font-size:14px;font-weight:800;text-decoration:none}
        .atlas-explore-tabs a[aria-current="page"]{border-color:var(--accent);background:var(--accent-soft);color:var(--accent)}
        .atlas-explore-guidance{margin:0 0 19px;max-width:850px;color:var(--muted);font-size:13px;line-height:1.75}
        .atlas-explore-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}
        .atlas-explore-card{display:flex;flex-direction:column;gap:9px;justify-content:center;min-height:130px;min-width:0;padding:21px;border:1px solid var(--line);border-radius:19px;background:var(--surface);text-decoration:none;color:var(--ink);box-shadow:var(--shadow-sm)}
        .atlas-explore-card-name{font-size:clamp(17px,2vw,21px);font-weight:850;overflow-wrap:anywhere}
        .atlas-explore-specialty{justify-content:space-between;gap:15px}
        .atlas-explore-specialty-main{display:flex;flex-direction:column;align-items:flex-start;gap:9px;min-width:0;text-decoration:none;color:inherit}
        .atlas-explore-specialty-main:hover .atlas-explore-card-name{text-decoration:underline;text-underline-offset:3px}
        .atlas-explore-original{font-weight:550}
        .atlas-explore-about{color:var(--muted);font-size:14px;line-height:1.65}
        .atlas-explore-focus{padding-top:13px;border-top:1px solid var(--line)}
        .atlas-explore-focus-label{display:block;margin-bottom:9px;color:var(--muted);font-size:12px;font-weight:750}
        .atlas-explore-focus-links{display:flex;flex-wrap:wrap;gap:8px}
        .atlas-explore-focus-links a{display:inline-flex;align-items:center;min-height:44px;max-width:100%;padding:8px 12px;border:1px solid var(--line);border-radius:10px;background:var(--canvas);color:var(--accent);font-size:13px;font-weight:750;text-decoration:none;overflow-wrap:anywhere}
        .atlas-explore-card small{font-size:13px;color:var(--muted);line-height:1.55}
        .atlas-explore-card-action{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--accent);font-weight:800}
        .atlas-explore-card-action span{font-size:18px}
        .atlas-explore-card:hover,.atlas-explore-card:focus-visible{border-color:var(--accent)}
        .atlas-patient-explore :is(a,button):focus-visible{outline:3px solid var(--accent);outline-offset:3px}
        .atlas-explore-empty{padding:clamp(24px,4vw,40px);border:1px solid var(--line);border-radius:22px;background:var(--surface)}
        .atlas-explore-empty h2{margin:0 0 18px;font-size:clamp(19px,2.5vw,26px)}
        .atlas-explore-empty .button{display:inline-flex;min-height:48px}
        .atlas-explore-note{max-width:780px;margin-top:24px;color:var(--muted);font-size:12px;line-height:1.8}
        @media(max-width:700px){.atlas-explore-shell{width:min(100% - 26px,1150px)}.atlas-explore-grid{grid-template-columns:1fr}.atlas-explore-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.atlas-explore-tabs a{padding:9px 6px;text-align:center;font-size:12px}.atlas-explore-card{min-height:111px;padding:18px}}
        @media(max-width:370px){.atlas-explore-tabs{grid-template-columns:1fr}}
        @media(prefers-reduced-motion:reduce){.atlas-patient-explore *{transition:none!important}}
      `}</style>
    </main>
  );
}
