import type { Metadata } from "next";
import Link from "next/link";
import { formatLocalDateValue, formatTimeValue } from "@/lib/i18n/format";
import { getUiLocale } from "@/lib/i18n/ui-server";
import type { UiLocale } from "@/lib/i18n/ui";
import { getAtlasAuthReadiness } from "@/lib/auth-readiness";
import { createClient } from "@/lib/supabase/server";
import { PatientBookingForm } from "./booking-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book appointment — Atlas",
  robots: { index: false, follow: false },
};

type BookingPageProps = {
  params: Promise<{ clinicSlug: string; doctorSlug: string }>;
  searchParams: Promise<{ slot?: string | string[] }>;
};

const copy: Record<UiLocale, {
  eyebrow: string;
  title: string;
  help: string;
  notReadyTitle: string;
  notReadyHelp: string;
  call: string;
  back: string;
  unavailableTitle: string;
  unavailableHelp: string;
}> = {
  en: {
    eyebrow: "Book with Atlas",
    title: "Verify your mobile, then book",
    help: "Atlas rechecks the clinic schedule at the final step so two patients cannot take the same slot.",
    notReadyTitle: "Online booking is not active yet.",
    notReadyHelp: "The clinic's live availability is visible, but Atlas is waiting for production phone verification before it can safely reserve a slot online.",
    call: "Call clinic",
    back: "Back to doctor",
    unavailableTitle: "This booking time is unavailable.",
    unavailableHelp: "It may have been taken, closed, or the link may be incorrect.",
  },
  ku: {
    eyebrow: "مەوعید لە Atlas",
    title: "ژمارەکەت پشتڕاست بکەرەوە، پاشان مەوعید دابنێ",
    help: "Atlas لە هەنگاوی کۆتاییدا خشتەی کلینیک دووبارە دەپشکنێت تا دوو نەخۆش هەمان کات نەگرن.",
    notReadyTitle: "مەوعیددانانی ئۆنلاین هێشتا چالاک نییە.",
    notReadyHelp: "کاتە بەردەستە ڕاستەقینەکان دیارن، بەڵام Atlas چاوەڕێی پشتڕاستکردنەوەی مۆبایلی بەرهەمی ڕاستەقینەیە پێش ئەوەی کاتێک ئۆنلاین بگرێت.",
    call: "پەیوەندی بە کلینیک",
    back: "گەڕانەوە بۆ پزیشک",
    unavailableTitle: "ئەم کاتی مەوعیدە بەردەست نییە.",
    unavailableHelp: "لەوانەیە گیرا بێت، داخرا بێت یان بەستەرەکە هەڵە بێت.",
  },
  bd: {
    eyebrow: "وادە ل Atlas",
    title: "ژمارا خۆ پشتڕاست بکە، پاشی وادە دابنێ",
    help: "Atlas ل هەنگاڤا دوماهیێ خشتەیا کلینیکێ جارەکا دی دپشکنیت دا دوو نەخۆش هەمان دەم نەگرن.",
    notReadyTitle: "وادەدانانا ئۆنلاین هێشتا چالاک نینە.",
    notReadyHelp: "دەمێن ڕاستەقینە یێن بەردەست دیارن، لێ Atlas چاوەرێیا پشتڕاستکرنا موبایلا بەرهەمی دکەت بەری کو دەمەکێ ئۆنلاین بگریت.",
    call: "پەیوەندی ب کلینیکێ",
    back: "ڤەگەڕە دکتۆری",
    unavailableTitle: "ئەڤ دەمێ وادەیێ بەردەست نینە.",
    unavailableHelp: "دبیت هاتبیتە گرتن، گرتی بیت یان لینک هەڵە بیت.",
  },
  ar: {
    eyebrow: "احجز عبر Atlas",
    title: "وثّق رقمك وبعدها احجز",
    help: "Atlas يعيد فحص جدول العيادة في الخطوة الأخيرة حتى ما يحجز مريضان نفس الوقت.",
    notReadyTitle: "الحجز عبر الإنترنت غير مفعّل حالياً.",
    notReadyHelp: "الأوقات الحقيقية المتاحة ظاهرة، لكن Atlas ينتظر تفعيل التحقق الإنتاجي من رقم الهاتف قبل أن يحجز وقتاً بأمان.",
    call: "اتصل بالعيادة",
    back: "العودة للطبيب",
    unavailableTitle: "وقت الحجز هذا غير متاح.",
    unavailableHelp: "ممكن انحجز، انغلق، أو الرابط غير صحيح.",
  },
};

function safeSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 80;
}

function baghdadDateKey(date: Date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function slotLabel(date: Date, locale: UiLocale) {
  const dateKey = baghdadDateKey(date);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${formatLocalDateValue(dateKey, locale)} · ${formatTimeValue(`${parts.hour}:${parts.minute}`, locale)}`;
}

export default async function BookingPage({ params, searchParams }: BookingPageProps) {
  const [{ clinicSlug, doctorSlug }, query, locale] = await Promise.all([params, searchParams, getUiLocale()]);
  const t = copy[locale];
  const slotRaw = typeof query.slot === "string" ? query.slot : "";
  const requestedSlot = new Date(slotRaw);

  if (
    !safeSlug(clinicSlug)
    || !safeSlug(doctorSlug)
    || !slotRaw
    || Number.isNaN(requestedSlot.getTime())
    || requestedSlot.getTime() <= Date.now()
  ) {
    return <Unavailable copy={t} href={`/care/${clinicSlug}/${doctorSlug}`} />;
  }

  const supabase = await createClient();
  const dateKey = baghdadDateKey(requestedSlot);
  const [{ data: profileData, error: profileError }, { data: slotData, error: slotError }] = await Promise.all([
    supabase.rpc("get_public_doctor_profile", {
      p_clinic_slug: clinicSlug,
      p_doctor_slug: doctorSlug,
    }),
    supabase.rpc("list_public_doctor_slots", {
      p_clinic_slug: clinicSlug,
      p_doctor_slug: doctorSlug,
      p_from_date: dateKey,
      p_days: 1,
    }),
  ]);
  const profile = Array.isArray(profileData) ? profileData[0] : undefined;
  const exactSlot = Array.isArray(slotData)
    ? slotData.find((candidate) => new Date(candidate.slot_at).getTime() === requestedSlot.getTime())
    : undefined;

  if (profileError || slotError || !profile || !exactSlot) {
    return <Unavailable copy={t} href={`/care/${clinicSlug}/${doctorSlug}`} />;
  }

  const launchEnabled = process.env.ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED === "true";
  const readiness = launchEnabled ? await getAtlasAuthReadiness() : null;
  const bookingReady = Boolean(
    launchEnabled
    && readiness?.reachable
    && readiness.supabasePhoneEnabled
    && !readiness.signupDisabled
  );

  return (
    <main className="marketing-page atlas-booking-page">
      <nav className="nav shell marketing-nav">
        <Link className="app-brand atlas-marketing-brand" href="/" aria-label="Atlas home">
          <span className="app-brand-mark" aria-hidden="true">A</span>
          <span className="app-brand-word">Atlas</span>
        </Link>
      </nav>

      <article className="shell atlas-booking-shell">
        <div className="eyebrow">{t.eyebrow}</div>
        <h1>{bookingReady ? t.title : t.notReadyTitle}</h1>
        <p className="hero-copy">{bookingReady ? t.help : t.notReadyHelp}</p>

        {bookingReady ? (
          <PatientBookingForm
            locale={locale}
            clinicSlug={clinicSlug}
            doctorSlug={doctorSlug}
            clinicName={profile.clinic_name}
            doctorName={profile.doctor_name}
            slotAt={requestedSlot.toISOString()}
            slotLabel={slotLabel(requestedSlot, locale)}
            whatsappOtpEnabled={readiness?.whatsappOtpEnabled === true}
          />
        ) : (
          <div className="atlas-booking-not-ready">
            <strong>{profile.doctor_name}</strong>
            <span>{slotLabel(requestedSlot, locale)}</span>
            {profile.public_phone ? <a className="button" href={`tel:${profile.public_phone}`}>{t.call}</a> : null}
          </div>
        )}

        <Link className="button button-ghost atlas-booking-back" href={`/care/${clinicSlug}/${doctorSlug}`}>{t.back}</Link>
      </article>

      <style>{`
        .atlas-booking-page{min-height:100dvh}.atlas-booking-shell{max-width:620px;padding-top:clamp(36px,7vh,74px);padding-bottom:72px}.atlas-booking-shell h1{margin:8px 0 10px}.atlas-booking-shell>.hero-copy{margin-bottom:24px}.atlas-booking-not-ready{display:grid;gap:10px;padding:18px;border:1px solid var(--line);border-radius:18px;background:var(--surface)}.atlas-booking-not-ready>strong{font-size:18px}.atlas-booking-not-ready>span{color:var(--accent);font-size:13px;font-weight:820}.atlas-booking-not-ready .button{justify-self:start;text-decoration:none}.atlas-booking-back{margin-top:22px;text-decoration:none}
      `}</style>
    </main>
  );
}

function Unavailable({ copy, href }: { copy: typeof copy[UiLocale]; href: string }) {
  return (
    <main className="center-page">
      <section className="auth-card">
        <div className="app-brand"><span className="app-brand-mark" aria-hidden="true">A</span><span className="app-brand-word">Atlas</span></div>
        <h1>{copy.unavailableTitle}</h1>
        <p>{copy.unavailableHelp}</p>
        <Link className="button button-ghost" href={href}>{copy.back}</Link>
      </section>
    </main>
  );
}
