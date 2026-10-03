import type { Metadata } from "next";
import Link from "next/link";
import { getAtlasAuthReadiness } from "@/lib/auth-readiness";
import { formatIraqiMobile } from "@/lib/appointments";
import { formatLocalDateValue, formatTimeValue } from "@/lib/i18n/format";
import { getUiLocale } from "@/lib/i18n/ui-server";
import type { UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Appointment times — Atlas",
  robots: { index: false, follow: true },
};

type TimesPageProps = {
  params: Promise<{ clinicSlug: string; doctorSlug: string }>;
};

const copy: Record<UiLocale, {
  eyebrow: string;
  title: string;
  intro: string;
  noTimes: string;
  noTimesHelp: string;
  book: string;
  call: string;
  back: string;
  unavailableTitle: string;
  unavailableHelp: string;
}> = {
  en: {
    eyebrow: "Live appointment times",
    title: "Choose a time",
    intro: "These openings come from the clinic's current public schedule. Atlas checks a time again before any online booking is finalized.",
    noTimes: "No public appointment times are open right now.",
    noTimesHelp: "The clinic may add more times later. You can still contact the clinic directly.",
    book: "Book",
    call: "Call clinic",
    back: "Back to doctor",
    unavailableTitle: "Appointment times are unavailable.",
    unavailableHelp: "The doctor profile may be unpublished or the link may be incorrect.",
  },
  ku: {
    eyebrow: "کاتە ڕاستەقینەکانی مەوعید",
    title: "کاتێک هەڵبژێرە",
    intro: "ئەم کاتانە لە خشتەی گشتیی ئێستای کلینیکەوە دێن. Atlas پێش تەواوکردنی مەوعیدی ئۆنلاین کاتەکە دووبارە دەپشکنێت.",
    noTimes: "ئێستا هیچ کاتی گشتیی مەوعید بەردەست نییە.",
    noTimesHelp: "لەوانەیە کلینیک دواتر کاتی تر زیاد بکات. هێشتا دەتوانیت ڕاستەوخۆ پەیوەندی بکەیت.",
    book: "مەوعید دابنێ",
    call: "پەیوەندی بە کلینیک",
    back: "گەڕانەوە بۆ پزیشک",
    unavailableTitle: "کاتەکانی مەوعید بەردەست نین.",
    unavailableHelp: "لەوانەیە پڕۆفایلی پزیشک بڵاونەکرابێتەوە یان بەستەرەکە هەڵە بێت.",
  },
  bd: {
    eyebrow: "دەمێن ڕاستەقینە یێن وادەیێ",
    title: "دەمەکێ هەلبژێرە",
    intro: "ئەڤ دەمە ژ خشتەیا گشتی یا نوکە یا کلینیکێ دهێن. Atlas بەری تەمامکرنا وادەیا ئۆنلاین دەم جارەکا دی دپشکنیت.",
    noTimes: "نوکە هیچ دەمەکێ گشتی یێ وادەیێ بەردەست نینە.",
    noTimesHelp: "دبیت کلینیک پاشتر دەمێن دی زێدە بکەت. هێشتا دشێی ڕاستەوخۆ پەیوەندی بکەی.",
    book: "وادە دابنێ",
    call: "پەیوەندی ب کلینیکێ",
    back: "ڤەگەڕە دکتۆری",
    unavailableTitle: "دەمێن وادەیێ بەردەست نینن.",
    unavailableHelp: "دبیت پڕۆفایلا دکتۆری نەهاتبیتە بڵاوکرن یان لینک هەڵە بیت.",
  },
  ar: {
    eyebrow: "أوقات المواعيد الفعلية",
    title: "اختر وقتاً",
    intro: "هذه الأوقات تأتي من جدول العيادة العام الحالي. Atlas يفحص الوقت مرة ثانية قبل إكمال أي حجز عبر الإنترنت.",
    noTimes: "لا توجد أوقات مواعيد عامة متاحة حالياً.",
    noTimesHelp: "قد تضيف العيادة أوقاتاً أخرى لاحقاً. تقدر تتواصل مع العيادة مباشرة.",
    book: "احجز",
    call: "اتصل بالعيادة",
    back: "العودة للطبيب",
    unavailableTitle: "أوقات المواعيد غير متاحة.",
    unavailableHelp: "قد يكون ملف الطبيب غير منشور أو الرابط غير صحيح.",
  },
};

function safeSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 80;
}

function slotParts(value: string, locale: UiLocale) {
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
  return {
    dateKey,
    dateLabel: formatLocalDateValue(dateKey, locale),
    timeLabel: formatTimeValue(timeValue, locale),
  };
}

export default async function PublicDoctorTimesPage({ params }: TimesPageProps) {
  const [{ clinicSlug, doctorSlug }, locale] = await Promise.all([params, getUiLocale()]);
  const t = copy[locale];

  if (!safeSlug(clinicSlug) || !safeSlug(doctorSlug)) return <Unavailable copy={t} />;

  const supabase = await createClient();
  const launchEnabled = process.env.ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED === "true";
  const readinessPromise = launchEnabled ? getAtlasAuthReadiness() : Promise.resolve(null);
  const slotPageSize = 200;
  const maxSlotPages = 24;
  const [
    { data: profileData, error: profileError },
    firstSlotPage,
    readiness,
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
    readinessPromise,
  ]);

  const profile = Array.isArray(profileData) ? profileData[0] : undefined;
  if (profileError || firstSlotPage.error || !profile) return <Unavailable copy={t} />;

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

  if (slotLoadFailed) return <Unavailable copy={t} />;

  const bookingReady = Boolean(
    launchEnabled
    && readiness?.reachable
    && readiness.supabasePhoneEnabled
    && !readiness.signupDisabled
  );

  const groups: Array<{ dateKey: string; dateLabel: string; slots: Array<{ label: string; slotAt: string }> }> = [];
  for (const slot of slotData ?? []) {
    const parts = slotParts(slot.slot_at, locale);
    if (!parts) continue;
    let group = groups.find((item) => item.dateKey === parts.dateKey);
    if (!group) {
      group = { dateKey: parts.dateKey, dateLabel: parts.dateLabel, slots: [] };
      groups.push(group);
    }
    group.slots.push({ label: parts.timeLabel, slotAt: slot.slot_at });
  }

  const phone = profile.public_phone
    ? (profile.country_code === "IQ" ? formatIraqiMobile(profile.public_phone) : profile.public_phone)
    : null;

  return (
    <main className="marketing-page atlas-times-page">
      <nav className="nav shell marketing-nav">
        <Link className="app-brand atlas-marketing-brand" href="/" aria-label="Atlas home">
          <span className="app-brand-mark" aria-hidden="true">A</span>
          <span className="app-brand-word">Atlas</span>
        </Link>
      </nav>

      <article className="shell atlas-times-shell">
        <div className="eyebrow">{t.eyebrow}</div>
        <h1>{t.title}</h1>
        <div className="atlas-times-doctor">
          <strong>{profile.doctor_name}</strong>
          <span>{profile.specialty}{profile.subspecialty ? ` · ${profile.subspecialty}` : ""}</span>
          <small>{profile.clinic_name}</small>
        </div>
        <p className="hero-copy">{t.intro}</p>

        {groups.length ? (
          <div className="atlas-times-days">
            {groups.map((group) => (
              <section className="atlas-times-day" key={group.dateKey}>
                <h2>{group.dateLabel}</h2>
                <div className="atlas-times-grid">
                  {group.slots.map((slot) => bookingReady ? (
                    <Link
                      className="button button-ghost atlas-time-option"
                      href={`/care/${clinicSlug}/${doctorSlug}/book?slot=${encodeURIComponent(slot.slotAt)}`}
                      key={slot.slotAt}
                    >
                      <span dir="auto">{slot.label}</span>
                      <small>{t.book}</small>
                    </Link>
                  ) : (
                    <span className="atlas-time-option is-readonly" key={slot.slotAt} dir="auto">
                      {slot.label}
                    </span>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="atlas-times-empty">
            <strong>{t.noTimes}</strong>
            <p>{t.noTimesHelp}</p>
          </div>
        )}

        <div className="atlas-times-actions">
          {phone ? <a className="button" href={`tel:${profile.public_phone}`}>{t.call}</a> : null}
          <Link className="button button-ghost" href={`/care/${clinicSlug}/${doctorSlug}`}>{t.back}</Link>
        </div>
      </article>

      <style>{`
        .atlas-times-page{min-height:100dvh}.atlas-times-shell{max-width:760px;padding-top:clamp(36px,7vh,76px);padding-bottom:78px}.atlas-times-shell h1{margin:8px 0 12px}.atlas-times-doctor{display:grid;gap:4px;margin-bottom:18px}.atlas-times-doctor>strong{font-size:20px}.atlas-times-doctor>span{color:var(--accent);font-size:13px;font-weight:780}.atlas-times-doctor>small{color:var(--muted);font-size:11px}.atlas-times-shell>.hero-copy{margin-bottom:28px}.atlas-times-days{display:grid;gap:12px}.atlas-times-day{padding:17px;border:1px solid var(--line);border-radius:18px;background:var(--surface)}.atlas-times-day h2{margin:0 0 12px;font-size:14px}.atlas-times-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.atlas-time-option{min-height:48px;display:flex;align-items:center;justify-content:center;gap:5px;text-align:center;text-decoration:none}.atlas-time-option small{color:var(--accent);font-size:9.5px;font-weight:850}.atlas-time-option.is-readonly{border:1px solid var(--line);border-radius:12px;background:var(--surface-soft);font-size:11px;font-weight:800}.atlas-times-empty{padding:20px;border:1px dashed var(--line);border-radius:18px}.atlas-times-empty p{margin:7px 0 0;color:var(--muted);font-size:12px}.atlas-times-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:24px}.atlas-times-actions .button{text-decoration:none}@media(max-width:620px){.atlas-times-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.atlas-times-actions{display:grid}.atlas-times-actions .button{width:100%}}
      `}</style>
    </main>
  );
}

type TimesCopy = (typeof copy)[UiLocale];

function Unavailable({ copy: t }: { copy: TimesCopy }) {
  return (
    <main className="center-page">
      <section className="auth-card">
        <div className="app-brand">
          <span className="app-brand-mark" aria-hidden="true">A</span>
          <span className="app-brand-word">Atlas</span>
        </div>
        <h1>{t.unavailableTitle}</h1>
        <p>{t.unavailableHelp}</p>
        <Link className="button button-ghost" href="/care">{t.back}</Link>
      </section>
    </main>
  );
}
