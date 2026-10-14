import type { Metadata } from "next";
import Link from "next/link";
import { formatIraqiMobile } from "@/lib/appointments";
import { localizeDigits } from "@/lib/i18n/format";
import { groupPublicAppointmentTimes } from "@/lib/patient-appointment-availability";
import { uiLocaleMeta, type UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";
import { PatientProfileHero } from "@/app/care/patient-profile-hero";
import { AtlasPatientNav } from "@/app/care/patient-nav";
import { patientLocaleHref, resolvePatientLocale } from "@/app/care/patient-locale";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Appointment times — Atlas",
  robots: { index: false, follow: true },
};

type TimesPageProps = {
  params: Promise<{ clinicSlug: string; doctorSlug: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
};

const copy: Record<UiLocale, {
  eyebrow: string;
  title: string;
  intro: string;
  readOnlyTitle: string;
  readOnlyIntro: string;
  jumpToDay: string;
  noTimes: string;
  noTimesHelp: string;
  book: string;
  call: string;
  back: string;
  unavailableTitle: string;
  unavailableHelp: string;
  myAppointments: string;
  clinicDetails: string;
  datesHelp: string;
  timesCount: string;
  timeZone: string;
  unreserved: string;
  noPhone: string;
  loadErrorTitle: string;
  loadErrorHelp: string;
}> = {
  en: {
    eyebrow: "Clinic appointment times",
    title: "Choose a time",
    intro: "These are live times from the clinic. Atlas checks your choice again before booking.",
    readOnlyTitle: "Appointment times",
    readOnlyIntro: "These are published open times from the clinic, not confirmed bookings. Online booking is not available.",
    jumpToDay: "Choose a day",
    noTimes: "No open times are shown for this doctor.",
    noTimesHelp: "No open time was returned for the next 14 days. Times may be booked, closed, or unpublished. Check with the clinic.",
    book: "Book",
    call: "Call clinic",
    back: "Back to doctor",
    unavailableTitle: "Appointment times are unavailable.",
    unavailableHelp: "The doctor profile may be unpublished or the link may be incorrect.",
    myAppointments: "My appointments",
    clinicDetails: "Clinic details",
    datesHelp: "Choose a day below. Only days with published open times are shown; other days are not confirmed available.",
    timesCount: "Times shown",
    timeZone: "Times are shown in Iraq time (Baghdad).",
    unreserved: "These times are not reserved. Call the clinic to check and request an appointment.",
    noPhone: "The clinic has not published a phone number here. Check the doctor profile for contact details.",
    loadErrorTitle: "Appointment times could not be loaded.",
    loadErrorHelp: "Please try again later or contact the clinic. No availability can be confirmed right now.",
  },
  ku: {
    eyebrow: "کاتە ڕاستەقینەکانی مەوعید",
    title: "کاتێک هەڵبژێرە",
    intro: "ئەم کاتانە ڕاستەوخۆ لە خشتەی کلینیکەوە دێن. Atlas پێش دانانی مەوعید کاتە هەڵبژێردراوەکەت دووبارە دەپشکنێت.",
    readOnlyTitle: "کاتەکانی مەوعید",
    readOnlyIntro: "ئەم کاتانە لەلایەن کلینیکەوە بڵاوکراونەتەوە، بەڵام مەوعیدی پشتڕاستکراوە نین. دانانی مەوعیدی ئۆنلاین چالاک نییە.",
    jumpToDay: "ڕۆژێک هەڵبژێرە",
    noTimes: "هیچ کاتی بەردەست بۆ ئەم پزیشکە نیشان نەدراوە.",
    noTimesHelp: "بۆ ١٤ ڕۆژی داهاتوو هیچ کاتێکی بەردەست نیشان نەدراوە. لەوانەیە کاتەکان گیراو، داخراو یان بڵاونەکراوە بن. پەیوەندی بە کلینیک بکە.",
    book: "مەوعید دابنێ",
    call: "پەیوەندی بە کلینیک",
    back: "گەڕانەوە بۆ پزیشک",
    unavailableTitle: "کاتەکانی مەوعید بەردەست نین.",
    unavailableHelp: "لەوانەیە پڕۆفایلی پزیشک بڵاونەکرابێتەوە یان بەستەرەکە هەڵە بێت.",
    myAppointments: "مەوعیدەکانم",
    clinicDetails: "زانیاریی کلینیک",
    datesHelp: "ڕۆژێک هەڵبژێرە. تەنها ئەو ڕۆژانە نیشان دەدرێن کە کلینیک کاتی بەردەستی بڵاوکردووەتەوە؛ ڕۆژەکانی تر بەردەستییان پشتڕاست نەکراوەتەوە.",
    timesCount: "کاتە نیشاندراوەکان",
    timeZone: "کاتەکان بە کاتی عێراق (بەغدا) نیشان دەدرێن.",
    unreserved: "ئەم کاتانە بۆ تۆ نەگیراون. بۆ دڵنیابوون و داواکردنی مەوعید پەیوەندی بە کلینیک بکە.",
    noPhone: "ژمارەی تەلەفۆنی کلینیک لێرە بڵاونەکراوەتەوە. زانیاریی پەیوەندی لە پڕۆفایلی پزیشک ببینە.",
    loadErrorTitle: "نەتوانرا کاتەکانی مەوعید بهێنرێن.",
    loadErrorHelp: "تکایە دواتر هەوڵ بدەوە یان پەیوەندی بە کلینیک بکە. ئێستا ناتوانرێت بەردەستیی کاتەکان پشتڕاست بکرێتەوە.",
  },
  bd: {
    eyebrow: "دەمێن ڕاستەقینە یێن وادەیێ",
    title: "دەمەکێ هەلبژێرە",
    intro: "ئەڤ دەمە ڕاستەوخۆ ژ خشتەیا کلینیکێ دهێن. Atlas بەری دانانا وادەیێ دەمی هەلبژارتی جارەکا دی دپشکنیت.",
    readOnlyTitle: "دەمێن وادەیێ",
    readOnlyIntro: "ئەڤ دەمە ژ لایێ کلینیکێ ڤە هاتینە بڵاوکرن، لێ وادەیێن پشتڕاستکری نینن. وادەدانانا ئۆنلاین چالاک نینە.",
    jumpToDay: "ڕۆژەکێ هەلبژێرە",
    noTimes: "چ دەمەکێ بەردەست بۆ ڤی دکتۆری ناهێتە نیشاندان.",
    noTimesHelp: "بۆ ١٤ ڕۆژێن داهاتی چ دەمەکێ بەردەست نەهاتە نیشاندان. دبیت دەم هاتبنە گرتن، داخستن یان نەهاتبنە بڵاوکرن. پەیوەندی ب کلینیکێ بکە.",
    book: "وادە دابنێ",
    call: "پەیوەندی ب کلینیکێ",
    back: "ڤەگەڕە دکتۆری",
    unavailableTitle: "دەمێن وادەیێ بەردەست نینن.",
    unavailableHelp: "دبیت پڕۆفایلا دکتۆری نەهاتبیتە بڵاوکرن یان لینک هەڵە بیت.",
    myAppointments: "وادەیێن من",
    clinicDetails: "زانیاریێن کلینیکێ",
    datesHelp: "ڕۆژەکێ هەلبژێرە. بتنێ ئەو ڕۆژە دهێنە نیشاندان کو کلینیکێ دەمێن بەردەست بڵاوکرینە؛ ڕۆژێن دی نەهاتینە پشتڕاستکرن.",
    timesCount: "دەمێن نیشاندای",
    timeZone: "دەم ب کاتی عێراقێ (بەغدا) دهێنە نیشاندان.",
    unreserved: "ئەڤ دەمە بۆ تە نەهاتینە گرتن. بۆ پشتڕاستکرن و داخوازکرنا وادەیێ پەیوەندی ب کلینیکێ بکە.",
    noPhone: "ژمارا تەلەفۆنا کلینیکێ ل ڤێرێ نەهاتیە بڵاوکرن. زانیاریێن پەیوەندیێ ل پڕۆفایلا دکتۆری ببینە.",
    loadErrorTitle: "نەشیا دەمێن وادەیێ بار بکەت.",
    loadErrorHelp: "پاشتر هەول بدە یان پەیوەندی ب کلینیکێ بکە. نوکە بەردەستبوونا دەمان ناهێتە پشتڕاستکرن.",
  },
  ar: {
    eyebrow: "أوقات المواعيد الفعلية",
    title: "اختر وقتاً",
    intro: "هذه أوقات مباشرة من جدول العيادة. Atlas يفحص اختيارك مرة ثانية قبل الحجز.",
    readOnlyTitle: "أوقات المواعيد",
    readOnlyIntro: "هاي أوقات مفتوحة منشورة من العيادة، مو حجوزات مؤكدة. الحجز الإلكتروني مو مفعّل.",
    jumpToDay: "اختار يوم",
    noTimes: "ماكو أوقات مفتوحة معروضة لهذا الطبيب.",
    noTimesHelp: "ما ظهرت أوقات مفتوحة خلال الـ١٤ يوم الجاية. ممكن تكون محجوزة أو مغلقة أو غير منشورة. تواصل ويا العيادة.",
    book: "احجز",
    call: "اتصل بالعيادة",
    back: "العودة للطبيب",
    unavailableTitle: "أوقات المواعيد غير متاحة.",
    unavailableHelp: "قد يكون ملف الطبيب غير منشور أو الرابط غير صحيح.",
    myAppointments: "مواعيدي",
    clinicDetails: "تفاصيل العيادة",
    datesHelp: "اختار يوماً من أدناه. نعرض فقط الأيام التي نشرت العيادة فيها أوقاتاً متاحة، وباقي الأيام غير مؤكدة التوفر.",
    timesCount: "الأوقات المعروضة",
    timeZone: "كل الأوقات بتوقيت العراق (بغداد).",
    unreserved: "هذه الأوقات ليست محجوزة إلك. اتصل بالعيادة للتأكد وطلب الموعد.",
    noPhone: "العيادة ما ناشرة رقم هاتف هنا. شوف ملف الطبيب للحصول على تفاصيل التواصل.",
    loadErrorTitle: "تعذر تحميل أوقات المواعيد.",
    loadErrorHelp: "جرّب مرة ثانية لاحقاً أو تواصل ويا العيادة. ما نكدر نأكد توفر الأوقات حالياً.",
  },
};

function safeSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 80;
}

export default async function PublicDoctorTimesPage({ params, searchParams }: TimesPageProps) {
  const [{ clinicSlug, doctorSlug }, query] = await Promise.all([params, searchParams]);
  const locale = await resolvePatientLocale(query.lang);
  const t = copy[locale];
  const meta = uiLocaleMeta[locale];
  const doctorHref = safeSlug(clinicSlug) && safeSlug(doctorSlug)
    ? patientLocaleHref(`/care/${clinicSlug}/${doctorSlug}`, locale)
    : patientLocaleHref("/care", locale);

  if (!safeSlug(clinicSlug) || !safeSlug(doctorSlug)) {
    return <Unavailable copy={t} locale={locale} href={doctorHref} />;
  }

  const supabase = await createClient();
  const slotPageSize = 200;
  const maxSlotPages = 24;
  const [
    { data: profileData, error: profileError },
    firstSlotPage,
  ] = await Promise.all([
    supabase.rpc("get_public_doctor_profile", {
      p_clinic_slug: clinicSlug,
      p_doctor_slug: doctorSlug,
    }),
    supabase.rpc("list_public_doctor_slots_page", {
      p_clinic_slug: clinicSlug,
      p_doctor_slug: doctorSlug,
      p_from_date: null,
      p_days: 14,
      p_after: null,
      p_limit: slotPageSize,
    }),
  ]);

  const profile = Array.isArray(profileData) ? profileData[0] : undefined;
  if (profileError || !profile) return <Unavailable copy={t} locale={locale} href={doctorHref} />;
  if (firstSlotPage.error) return <Unavailable copy={t} locale={locale} href={doctorHref} title={t.loadErrorTitle} help={t.loadErrorHelp} />;

  const slotData = [...(firstSlotPage.data ?? [])];
  let pageRows = firstSlotPage.data ?? [];
  let cursor = pageRows.at(-1)?.slot_at ?? null;
  let slotLoadFailed = false;

  for (let pageIndex = 1; pageRows.length === slotPageSize; pageIndex += 1) {
    if (pageIndex >= maxSlotPages || !cursor) {
      slotLoadFailed = true;
      break;
    }

    const nextPage = await supabase.rpc("list_public_doctor_slots_page", {
      p_clinic_slug: clinicSlug,
      p_doctor_slug: doctorSlug,
      p_from_date: null,
      p_days: 14,
      p_after: cursor,
      p_limit: slotPageSize,
    });
    if (nextPage.error) {
      slotLoadFailed = true;
      break;
    }

    pageRows = nextPage.data ?? [];
    if (!pageRows.length) break;

    const nextCursor = pageRows.at(-1)?.slot_at ?? null;
    if (!nextCursor || new Date(nextCursor).getTime() <= new Date(cursor).getTime()) {
      slotLoadFailed = true;
      break;
    }

    slotData.push(...pageRows);
    cursor = nextCursor;
  }

  if (slotLoadFailed) return <Unavailable copy={t} locale={locale} href={doctorHref} title={t.loadErrorTitle} help={t.loadErrorHelp} />;

  const groups = groupPublicAppointmentTimes(slotData, locale);

  const location = [profile.address_text, profile.area, profile.city].filter(Boolean).join(" · ");
  const phone = profile.public_phone
    ? (profile.country_code === "IQ" ? formatIraqiMobile(profile.public_phone) : profile.public_phone)
    : null;

  return (
    <main className="marketing-page atlas-times-page atlas-patient-detail" lang={meta.language} dir={meta.direction}>
      <AtlasPatientNav locale={locale} myAppointments={t.myAppointments} />
      <article className="shell atlas-times-shell">
        <PatientProfileHero kind="times" eyebrow={t.eyebrow} title={t.readOnlyTitle} subtitle={profile.doctor_name} />

        <section className="atlas-times-doctor" aria-label={t.clinicDetails}>
          <strong><bdi>{profile.doctor_name}</bdi></strong>
          <span><bdi>{profile.specialty}</bdi>{profile.subspecialty ? <> · <bdi>{profile.subspecialty}</bdi></> : null}</span>
          <small><bdi>{profile.clinic_name}</bdi></small>
          {location ? <small><bdi>{location}</bdi></small> : null}
          {phone ? <a className="atlas-times-phone" href={`tel:${profile.public_phone}`}><bdi>{phone}</bdi></a> : null}
        </section>

        <p className="atlas-times-intro">{t.readOnlyIntro}</p>
        <p className="atlas-times-unreserved" role="note">{t.unreserved}</p>

        {phone ? (
          <a className="button atlas-times-call-primary" href={`tel:${profile.public_phone}`}>{t.call}</a>
        ) : (
          <p className="atlas-times-no-phone">{t.noPhone}</p>
        )}

        {groups.length ? (
          <section className="atlas-times-availability" aria-labelledby="atlas-times-choose-day">
            <h2 id="atlas-times-choose-day">{t.jumpToDay}</h2>
            <p className="atlas-times-date-help">{t.datesHelp}</p>
            <p className="atlas-times-timezone">{t.timeZone}</p>
            <div className="atlas-times-days">
              {groups.map((group, index) => (
                <details className="atlas-times-day" name="atlas-times-day" open={index === 0} key={group.dateKey}>
                  <summary>
                    <strong><bdi>{group.dateLabel}</bdi></strong>
                    <span>{t.timesCount}: <bdi>{localizeDigits(group.slots.length, locale)}</bdi></span>
                  </summary>
                  <div className="atlas-times-day-content">
                    <div className="atlas-times-grid">
                      {group.slots.map((slot) => (
                        <span className="atlas-time-option is-readonly" key={slot.slotAt}>
                          <bdi>{slot.label}</bdi>
                        </span>
                      ))}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </section>
        ) : (
          <section className="atlas-times-empty" role="status">
            <h2>{t.noTimes}</h2>
            <p>{t.noTimesHelp}</p>
          </section>
        )}

        <div className="atlas-times-actions">
          {phone ? <a className="button" href={`tel:${profile.public_phone}`}>{t.call}</a> : null}
          <Link className="button button-ghost" href={doctorHref}>{t.back}</Link>
        </div>
      </article>
      <style>{`
        .atlas-times-page{min-height:100dvh}
        .atlas-times-shell{max-width:780px;padding-top:clamp(24px,5vh,56px);padding-bottom:78px}
        .atlas-times-doctor{display:grid;gap:6px;margin:20px 0;padding:18px;border:1px solid var(--line);border-radius:18px;background:var(--surface)}
        .atlas-times-doctor>strong{font-size:19px}
        .atlas-times-doctor>span{color:var(--accent);font-size:14px;font-weight:750}
        .atlas-times-doctor>small{color:var(--muted);font-size:13px;line-height:1.5}
        .atlas-times-phone{display:inline-flex;width:fit-content;font-size:14px;font-weight:750;direction:ltr;unicode-bidi:isolate}
        .atlas-times-intro{font-size:14px;line-height:1.7}
        .atlas-times-unreserved{padding:13px 15px;margin:14px 0 18px;border-radius:12px;border:1px solid var(--line);background:var(--surface-soft);font-size:14px;line-height:1.6}
        .atlas-times-no-phone{color:var(--muted);font-size:13px;line-height:1.6}
        .atlas-times-call-primary{display:inline-flex;min-height:48px;margin:0 0 24px;text-decoration:none}
        .atlas-times-availability>h2{font-size:18px;margin:0 0 8px}
        .atlas-times-date-help,.atlas-times-timezone{font-size:13px;line-height:1.65;color:var(--muted);margin:0 0 8px}
        .atlas-times-timezone{margin-bottom:16px}
        .atlas-times-days{display:grid;gap:10px}
        .atlas-times-day{min-width:0;border:1px solid var(--line);border-radius:16px;background:var(--surface);overflow:hidden}
        .atlas-times-day[open]{border-color:var(--accent)}
        .atlas-times-day>summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:58px;cursor:pointer;padding:13px 17px}
        .atlas-times-day>summary::-webkit-details-marker{display:none}
        .atlas-times-day>summary::after{content:"+";font-size:22px;font-weight:650;flex-shrink:0}
        .atlas-times-day[open]>summary::after{content:"−"}
        .atlas-times-day>summary:focus-visible{outline:3px solid var(--accent);outline-offset:-3px}
        .atlas-times-day>summary>strong{font-size:15px;line-height:1.4}
        .atlas-times-day>summary>span{color:var(--muted);font-size:12px;line-height:1.4}
        .atlas-times-day-content{padding:0 17px 17px}
        .atlas-times-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
        .atlas-time-option.is-readonly{min-width:0;min-height:50px;display:flex;align-items:center;justify-content:center;text-align:center;padding:10px;border:1px solid var(--line);border-radius:12px;background:var(--surface-soft);font-size:14px;font-weight:800}
        .atlas-times-empty{padding:20px;border:1px dashed var(--line);border-radius:16px}
        .atlas-times-empty h2{margin:0 0 8px;font-size:17px}
        .atlas-times-empty p{margin:0;color:var(--muted);font-size:14px;line-height:1.65}
        .atlas-times-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px}
        .atlas-times-actions .button{text-decoration:none;min-height:48px}
        @media(max-width:620px){
          .atlas-times-doctor{padding:15px}
          .atlas-times-call-primary{display:flex;width:100%;justify-content:center}
          .atlas-times-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
          .atlas-times-day>summary{flex-wrap:wrap;gap:5px 12px}
          .atlas-times-actions{display:grid}
          .atlas-times-actions .button{width:100%}
        }
      `}</style>
    </main>
  );
}

type TimesCopy = (typeof copy)[UiLocale];

function Unavailable({ copy: t, locale, href, title, help }: { copy: TimesCopy; locale: UiLocale; href: string; title?: string; help?: string }) {
  const meta = uiLocaleMeta[locale];
  return (
    <main className="marketing-page atlas-times-page" lang={meta.language} dir={meta.direction}>
      <AtlasPatientNav locale={locale} myAppointments={t.myAppointments} />
      <div className="center-page atlas-patient-unavailable-center">
        <section className="auth-card" lang={meta.language} dir={meta.direction}>
          <h1>{title ?? t.unavailableTitle}</h1>
          <p>{help ?? t.unavailableHelp}</p>
          <Link className="button button-ghost" href={href}>{t.back}</Link>
        </section>
      </div>
      <style>{`
        .atlas-patient-unavailable-center{min-height:calc(100dvh - 72px);padding-top:20px;padding-bottom:40px}
      `}</style>
    </main>
  );
}
