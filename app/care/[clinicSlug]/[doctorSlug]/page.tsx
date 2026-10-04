import type { Metadata } from "next";
import Link from "next/link";
import { formatIraqiMobile } from "@/lib/appointments";
import { getAtlasAuthReadiness } from "@/lib/auth-readiness";
import { formatLocalDateValue, formatTimeValue } from "@/lib/i18n/format";
import { getUiLocale } from "@/lib/i18n/ui-server";
import type { UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";
import { ShareProfileButton } from "../../share-profile-button";

export const dynamic = "force-dynamic";

type DoctorProfilePageProps = {
  params: Promise<{ clinicSlug: string; doctorSlug: string }>;
};

const profileCopy: Record<UiLocale, {
  eyebrow: string;
  specialty: string;
  subspecialty: string;
  clinic: string;
  location: string;
  contact: string;
  availability: string;
  availabilityHelp: string;
  callToReserve: string;
  bookingHelp: string;
  bookTime: string;
  allTimes: string;
  share: string;
  copied: string;
  whatsapp: string;
  shareText: string;
  back: string;
  unavailableTitle: string;
  unavailableHelp: string;
}> = {
  en: {
    eyebrow: "Doctor profile",
    specialty: "Specialty",
    subspecialty: "Focus",
    clinic: "Clinic",
    location: "Location",
    contact: "Clinic contact",
    availability: "Open times",
    availabilityHelp: "These are live openings from the clinic schedule. Contact the clinic to reserve; online self-booking is not enabled yet.",
    callToReserve: "Call clinic",
    bookingHelp: "Choose a time. Atlas will verify your Iraqi mobile number before the slot is reserved.",
    bookTime: "Book",
    allTimes: "See all times",
    share: "Share profile",
    copied: "Link copied",
    whatsapp: "Share on WhatsApp",
    shareText: "Doctor profile and live appointment times on Atlas.",
    back: "Back to doctor search",
    unavailableTitle: "This doctor profile is unavailable.",
    unavailableHelp: "It may be unpublished or the link may be incorrect.",
  },
  ku: {
    eyebrow: "پڕۆفایلی پزیشک",
    specialty: "پسپۆڕی",
    subspecialty: "بواری تایبەت",
    clinic: "کلینیک",
    location: "شوێن",
    contact: "پەیوەندی کلینیک",
    availability: "کاتە بەردەستەکان",
    availabilityHelp: "ئەم کاتانە بەردەستبوونی ڕاستەقینەی خشتەی کلینیکن. بۆ دانانی مەوعید پەیوەندی بە کلینیک بکە؛ مەوعیددانانی خۆکار هێشتا چالاک نییە.",
    callToReserve: "پەیوەندی بە کلینیک",
    bookingHelp: "کاتێک هەڵبژێرە. Atlas پێش گرتنی کاتەکە ژمارەی مۆبایلی عێراقیت پشتڕاست دەکاتەوە.",
    bookTime: "مەوعید دابنێ",
    allTimes: "هەموو کاتەکان ببینە",
    share: "پڕۆفایل هاوبەش بکە",
    copied: "بەستەر کۆپی کرا",
    whatsapp: "لە WhatsApp هاوبەش بکە",
    shareText: "پڕۆفایلی پزیشک و کاتە بەردەستە ڕاستەقینەکان لە Atlas.",
    back: "گەڕانەوە بۆ گەڕانی پزیشک",
    unavailableTitle: "ئەم پڕۆفایلەی پزیشک بەردەست نییە.",
    unavailableHelp: "لەوانەیە بڵاونەکرابێتەوە یان بەستەرەکە هەڵە بێت.",
  },
  bd: {
    eyebrow: "پڕۆفایلا دکتۆری",
    specialty: "تایبەتمەندی",
    subspecialty: "بواری تایبەت",
    clinic: "کلینیک",
    location: "جه",
    contact: "پەیوەندیا کلینیکێ",
    availability: "دەمێن بەردەست",
    availabilityHelp: "ئەڤ دەمە بەردەستبوونا ڕاستەقینە یا خشتەیا کلینیکێنە. بۆ دانانا وادەیێ پەیوەندی ب کلینیکێ بکە؛ وادەدانانا خۆکار هێشتا چالاک نینە.",
    callToReserve: "پەیوەندی ب کلینیکێ",
    bookingHelp: "دەمەکێ هەلبژێرە. Atlas بەری گرتنا دەمی ژمارا موبایلا عێراقێ یا تە پشتڕاست دکەت.",
    bookTime: "وادە دابنێ",
    allTimes: "هەمی دەمێن ببینە",
    share: "پڕۆفایل پارڤە بکە",
    copied: "لینک هاتە کۆپیکرن",
    whatsapp: "ل WhatsApp پارڤە بکە",
    shareText: "پڕۆفایلا دکتۆری و دەمێن ڕاستەقینە یێن بەردەست ل Atlas.",
    back: "ڤەگەڕە گەڕانا دکتۆران",
    unavailableTitle: "ئەڤ پڕۆفایلا دکتۆری بەردەست نینە.",
    unavailableHelp: "دبیت نەهاتبیتە بڵاوکرن یان لینک هەڵە بیت.",
  },
  ar: {
    eyebrow: "ملف الطبيب",
    specialty: "الاختصاص",
    subspecialty: "المجال",
    clinic: "العيادة",
    location: "الموقع",
    contact: "رقم العيادة",
    availability: "الأوقات المتاحة",
    availabilityHelp: "هذه أوقات متاحة فعلياً من جدول العيادة. تواصل مع العيادة للحجز؛ الحجز الذاتي عبر الإنترنت غير مفعّل بعد.",
    callToReserve: "اتصل بالعيادة",
    bookingHelp: "اختر وقتاً. Atlas يتحقق من رقم موبايلك العراقي قبل حجز الوقت.",
    bookTime: "احجز",
    allTimes: "عرض كل الأوقات",
    share: "مشاركة الملف",
    copied: "تم نسخ الرابط",
    whatsapp: "مشاركة على WhatsApp",
    shareText: "ملف الطبيب والأوقات الحقيقية المتاحة على Atlas.",
    back: "العودة إلى بحث الأطباء",
    unavailableTitle: "ملف هذا الطبيب غير متاح.",
    unavailableHelp: "قد يكون غير منشور أو أن الرابط غير صحيح.",
  },
};

function safeSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 80;
}

function metadataText(value: string, fallback: string) {
  const text = value.trim().replace(/\s+/g, " ");
  return (text || fallback).slice(0, 180);
}

export async function generateMetadata({ params }: DoctorProfilePageProps): Promise<Metadata> {
  const { clinicSlug, doctorSlug } = await params;
  const fallback: Metadata = {
    title: "Doctor — Atlas",
    description: "Published Atlas doctor profile.",
    robots: { index: false, follow: false },
  };

  if (!safeSlug(clinicSlug) || !safeSlug(doctorSlug)) return fallback;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_doctor_profile", {
      p_clinic_slug: clinicSlug,
      p_doctor_slug: doctorSlug,
    });
    const profile = Array.isArray(data) ? data[0] : undefined;
    if (error || !profile) return fallback;

    const title = `${profile.doctor_name} — ${profile.clinic_name} | Atlas`;
    const description = metadataText(
      profile.bio ?? "",
      `${profile.specialty}${profile.subspecialty ? ` · ${profile.subspecialty}` : ""} — ${profile.clinic_name}`,
    );
    return {
      title,
      description,
      openGraph: {
        type: "website",
        title,
        description,
      },
      twitter: {
        card: "summary",
        title,
        description,
      },
      robots: { index: true, follow: true },
    };
  } catch {
    return fallback;
  }
}

function baghdadSlotParts(value: string, locale: UiLocale) {
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

export default async function DoctorProfilePage({ params }: DoctorProfilePageProps) {
  const [{ clinicSlug, doctorSlug }, locale] = await Promise.all([params, getUiLocale()]);
  const copy = profileCopy[locale];

  if (!safeSlug(clinicSlug) || !safeSlug(doctorSlug)) {
    return <Unavailable copy={copy} />;
  }

  const supabase = await createClient();
  const launchEnabled = process.env.ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED === "true";
  const readinessPromise = launchEnabled ? getAtlasAuthReadiness() : Promise.resolve(null);
  const [
    { data, error },
    { data: slotData, error: slotError },
    readiness,
  ] = await Promise.all([
    supabase.rpc("get_public_doctor_profile", {
      p_clinic_slug: clinicSlug,
      p_doctor_slug: doctorSlug,
    }),
    supabase.rpc("list_public_doctor_slots", {
      p_clinic_slug: clinicSlug,
      p_doctor_slug: doctorSlug,
      p_from_date: null,
      p_days: 7,
    }),
    readinessPromise,
  ]);
  const profile = Array.isArray(data) ? data[0] : undefined;

  if (error || !profile) return <Unavailable copy={copy} />;

  const bookingReady = Boolean(
    launchEnabled
    && readiness?.reachable
    && readiness.supabasePhoneEnabled
    && !readiness.signupDisabled
  );
  const location = [profile.address_text, profile.area, profile.city].filter(Boolean).join(" · ");
  const phone = profile.public_phone
    ? (profile.country_code === "IQ" ? formatIraqiMobile(profile.public_phone) : profile.public_phone)
    : null;
  const doctorStructuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.doctor_name,
    jobTitle: "Physician",
    description: profile.bio || undefined,
    telephone: profile.public_phone || undefined,
    knowsAbout: [profile.specialty, profile.subspecialty].filter(Boolean),
    address: (profile.address_text || profile.city)
      ? {
          "@type": "PostalAddress",
          streetAddress: profile.address_text || undefined,
          addressLocality: profile.city || undefined,
          addressRegion: profile.area || undefined,
          addressCountry: profile.country_code || undefined,
        }
      : undefined,
    worksFor: {
      "@type": "MedicalClinic",
      name: profile.clinic_name,
      telephone: profile.public_phone || undefined,
      address: (profile.address_text || profile.city)
        ? {
            "@type": "PostalAddress",
            streetAddress: profile.address_text || undefined,
            addressLocality: profile.city || undefined,
            addressRegion: profile.area || undefined,
            addressCountry: profile.country_code || undefined,
          }
        : undefined,
    },
  };
  const doctorStructuredDataJson = JSON.stringify(doctorStructuredData).replace(/</g, "\\u003c");
  const slotGroups: Array<{ dateKey: string; dateLabel: string; times: Array<{ label: string; slotAt: string }> }> = [];
  if (!slotError && Array.isArray(slotData)) {
    for (const slot of slotData) {
      const parts = baghdadSlotParts(slot.slot_at, locale);
      if (!parts) continue;
      let group = slotGroups.find((item) => item.dateKey === parts.dateKey);
      if (!group) {
        group = { dateKey: parts.dateKey, dateLabel: parts.dateLabel, times: [] };
        slotGroups.push(group);
      }
      if (group.times.length < 4) group.times.push({ label: parts.timeLabel, slotAt: slot.slot_at });
    }
  }

  return (
    <main className="marketing-page atlas-care-profile-page">
      <nav className="nav shell marketing-nav">
        <Link className="app-brand atlas-marketing-brand" href="/" aria-label="Atlas home">
          <span className="app-brand-mark" aria-hidden="true">A</span>
          <span className="app-brand-word">Atlas</span>
        </Link>
      </nav>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: doctorStructuredDataJson }}
      />
      <article className="shell atlas-care-profile">
        <div className="eyebrow">{copy.eyebrow}</div>
        <h1>{profile.doctor_name}</h1>
        <div className="atlas-care-profile-specialty">
          <strong>{profile.specialty}</strong>
          {profile.subspecialty ? <span>{profile.subspecialty}</span> : null}
        </div>
        <ShareProfileButton
          title={`${profile.doctor_name} — ${profile.clinic_name}`}
          text={copy.shareText}
          shareLabel={copy.share}
          copiedLabel={copy.copied}
          whatsappLabel={copy.whatsapp}
        />

        {profile.bio ? <p className="hero-copy atlas-care-bio">{profile.bio}</p> : null}

        <dl className="atlas-care-profile-details">
          <div><dt>{copy.clinic}</dt><dd><Link href={`/care/${profile.clinic_slug}`}>{profile.clinic_name}</Link></dd></div>
          <div><dt>{copy.specialty}</dt><dd>{profile.specialty}</dd></div>
          {profile.subspecialty ? <div><dt>{copy.subspecialty}</dt><dd>{profile.subspecialty}</dd></div> : null}
          {location ? <div><dt>{copy.location}</dt><dd>{location}</dd></div> : null}
          {phone ? (
            <div>
              <dt>{copy.contact}</dt>
              <dd><a href={`tel:${profile.public_phone}`} dir="ltr">{phone}</a></dd>
            </div>
          ) : null}
        </dl>

        {slotGroups.length ? (
          <section className="atlas-care-availability" aria-label={copy.availability}>
            <div className="atlas-care-availability-heading">
              <h2>{copy.availability}</h2>
              <p>{bookingReady ? copy.bookingHelp : copy.availabilityHelp}</p>
            </div>
            <div className="atlas-care-availability-days">
              {slotGroups.map((group) => (
                <div className="atlas-care-availability-day" key={group.dateKey}>
                  <strong>{group.dateLabel}</strong>
                  <div>
                    {group.times.map((time) => bookingReady ? (
                      <Link
                        className="atlas-care-slot-book"
                        href={`/care/${clinicSlug}/${doctorSlug}/book?slot=${encodeURIComponent(time.slotAt)}`}
                        key={time.slotAt}
                      >
                        <span dir="auto">{time.label}</span>
                        <small>{copy.bookTime}</small>
                      </Link>
                    ) : <span key={time.slotAt} dir="auto">{time.label}</span>)}
                  </div>
                </div>
              ))}
            </div>
            <div className="atlas-care-availability-actions">
              <Link className="button button-ghost" href={`/care/${clinicSlug}/${doctorSlug}/times`}>{copy.allTimes}</Link>
              {phone ? <a className="button atlas-care-call" href={`tel:${profile.public_phone}`}>{copy.callToReserve}</a> : null}
            </div>
          </section>
        ) : null}

        <Link className="button button-ghost atlas-care-profile-back" href="/care">{copy.back}</Link>
      </article>

      <style>{`
        .atlas-care-profile-page{min-height:100dvh}.atlas-care-profile{max-width:720px;padding-top:clamp(38px,7vh,78px);padding-bottom:72px}.atlas-care-profile h1{margin:8px 0 10px}.atlas-care-profile-specialty{display:flex;gap:8px;flex-wrap:wrap;align-items:center;color:var(--accent)}.atlas-care-profile-specialty span{color:var(--muted);font-size:12px}.atlas-profile-share-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.atlas-profile-share-actions .button{min-height:48px}.atlas-care-bio{margin-top:22px}.atlas-care-profile-details{display:grid;gap:1px;margin:28px 0;overflow:hidden;border:1px solid var(--line);border-radius:18px;background:var(--line)}.atlas-care-profile-details>div{display:grid;grid-template-columns:minmax(100px,160px) 1fr;gap:14px;padding:15px 17px;background:var(--surface)}.atlas-care-profile-details dt{color:var(--muted);font-size:11px;font-weight:800}.atlas-care-profile-details dd{margin:0;font-size:13px;font-weight:700}.atlas-care-profile-details a{color:var(--accent)}.atlas-care-availability{display:grid;gap:14px;margin:0 0 26px;padding:18px;border:1px solid var(--line);border-radius:18px;background:var(--surface)}.atlas-care-availability-heading{display:grid;gap:5px}.atlas-care-availability-heading h2{margin:0;font-size:17px}.atlas-care-availability-heading p{margin:0;color:var(--muted);font-size:11.5px;line-height:1.55}.atlas-care-availability-days{display:grid;gap:8px}.atlas-care-availability-day{display:grid;grid-template-columns:minmax(110px,150px) 1fr;gap:12px;align-items:start;padding-top:9px;border-top:1px solid var(--line)}.atlas-care-availability-day:first-child{padding-top:0;border-top:0}.atlas-care-availability-day>strong{font-size:12px}.atlas-care-availability-day>div{display:flex;gap:6px;flex-wrap:wrap}.atlas-care-availability-day span{display:inline-flex;min-height:32px;align-items:center;padding:5px 9px;border:1px solid var(--line);border-radius:999px;background:var(--surface-soft);font-size:11px;font-weight:800}.atlas-care-slot-book{display:inline-flex;align-items:center;gap:6px;text-decoration:none}.atlas-care-slot-book span{color:var(--ink)}.atlas-care-slot-book small{color:var(--accent);font-size:10px;font-weight:850}.atlas-care-availability-actions{display:flex;gap:8px;flex-wrap:wrap}.atlas-care-availability-actions .button{min-height:48px;text-decoration:none}.atlas-care-call{justify-self:start;text-decoration:none}.atlas-care-profile-back{text-decoration:none}@media(max-width:560px){.atlas-care-profile-details>div{grid-template-columns:1fr;gap:5px}.atlas-care-availability-day{grid-template-columns:1fr}}
      `}</style>
    </main>
  );
}

function Unavailable({ copy }: { copy: typeof profileCopy[UiLocale] }) {
  return (
    <main className="center-page">
      <section className="auth-card">
        <div className="app-brand">
          <span className="app-brand-mark" aria-hidden="true">A</span>
          <span className="app-brand-word">Atlas</span>
        </div>
        <h1>{copy.unavailableTitle}</h1>
        <p>{copy.unavailableHelp}</p>
        <Link className="button button-ghost" href="/care">{copy.back}</Link>
      </section>
    </main>
  );
}
