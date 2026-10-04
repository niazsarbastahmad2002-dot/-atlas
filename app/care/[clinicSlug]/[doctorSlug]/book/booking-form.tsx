"use client";

import { useState, type FormEvent } from "react";
import { AuthDeliverySelector } from "@/app/components/auth-delivery-selector";
import { OtpCodeField } from "@/app/components/otp-code-field";
import { normalizeAuthPhone, normalizeOtpToken, maskPhone } from "@/lib/phone-auth";
import type { UiLocale } from "@/lib/i18n/ui";
import { createEphemeralVerificationClient } from "@/lib/supabase/verification-client";

type Delivery = "sms" | "whatsapp";

type BookingFormProps = {
  locale: UiLocale;
  clinicSlug: string;
  doctorSlug: string;
  clinicName: string;
  doctorName: string;
  slotAt: string;
  slotLabel: string;
  whatsappOtpEnabled: boolean;
};

const copy: Record<UiLocale, {
  patientName: string;
  patientNamePlaceholder: string;
  phone: string;
  phoneHint: string;
  phonePlaceholder: string;
  reminders: string;
  remindersHelp: string;
  delivery: string;
  sms: string;
  whatsapp: string;
  send: string;
  sending: string;
  codeTitle: string;
  codeHelp: string;
  code: string;
  paste: string;
  pasteFailed: string;
  verify: string;
  verifying: string;
  profileTitle: string;
  profileHelp: string;
  preferredLanguage: string;
  book: string;
  booking: string;
  resend: string;
  change: string;
  invalidName: string;
  invalidPhone: string;
  invalidCode: string;
  incorrectCode: string;
  rateLimited: string;
  slotTaken: string;
  unavailable: string;
  failed: string;
  privacy: string;
}> = {
  en: {
    patientName: "Patient name",
    patientNamePlaceholder: "Full name",
    phone: "Mobile number",
    phoneHint: "Iraqi mobile only for this first release. You can enter 0750… or +964750…",
    phonePlaceholder: "0750 123 4567",
    reminders: "Appointment reminders",
    remindersHelp: "Allow Atlas to send reminders about this appointment to the verified number.",
    delivery: "Receive the verification code by",
    sms: "SMS",
    whatsapp: "WhatsApp",
    send: "Verify mobile number",
    sending: "Sending code…",
    codeTitle: "Enter the verification code",
    codeHelp: "Atlas sent a one-time code to",
    code: "Verification code",
    paste: "Paste code",
    pasteFailed: "Atlas could not paste a valid code. Enter it manually.",
    verify: "Verify number",
    verifying: "Verifying…",
    profileTitle: "Your patient profile",
    profileHelp: "Atlas reuses these details for future bookings after you verify the same mobile number. Review them before booking.",
    preferredLanguage: "Preferred language",
    book: "Book appointment",
    booking: "Booking…",
    resend: "Send another code",
    change: "Change number",
    invalidName: "Enter the patient's name.",
    invalidPhone: "Enter a valid Iraqi mobile number.",
    invalidCode: "Enter the verification code you received.",
    incorrectCode: "That code is incorrect or expired. Use the newest code.",
    rateLimited: "Too many attempts. Wait a little and try again.",
    slotTaken: "That time was just taken. Go back and choose another open time.",
    unavailable: "This time is no longer available.",
    failed: "Atlas could not complete the booking. Try again.",
    privacy: "Your verified mobile identifies your private Atlas patient profile. The clinic receives only the details needed for this appointment.",
  },
  ku: {
    patientName: "ناوی نەخۆش",
    patientNamePlaceholder: "ناوی تەواو",
    phone: "ژمارەی مۆبایل",
    phoneHint: "لە وەشانی یەکەمدا تەنها ژمارەی عێراقی. دەتوانیت 0750… یان +964750… بنووسیت.",
    phonePlaceholder: "0750 123 4567",
    reminders: "بیرخستنەوەی مەوعید",
    remindersHelp: "ڕێگە بدە Atlas بیرخستنەوەی ئەم مەوعیدە بۆ ژمارە پشتڕاستکراوەکە بنێرێت.",
    delivery: "کۆدی پشتڕاستکردنەوە وەربگرە بە",
    sms: "SMS",
    whatsapp: "WhatsApp",
    send: "ژمارەی مۆبایل پشتڕاست بکەرەوە",
    sending: "کۆد دەنێردرێت…",
    codeTitle: "کۆدی پشتڕاستکردنەوە بنووسە",
    codeHelp: "Atlas کۆدێکی یەکجارەی نارد بۆ",
    code: "کۆدی پشتڕاستکردنەوە",
    paste: "کۆد دابنێ",
    pasteFailed: "Atlas نەیتوانی کۆدێکی دروست دابنێت. بە دەست بنووسە.",
    verify: "ژمارەکە پشتڕاست بکەرەوە",
    verifying: "پشتڕاست دەکرێتەوە…",
    profileTitle: "پڕۆفایلی نەخۆشی تۆ",
    profileHelp: "Atlas دوای پشتڕاستکردنەوەی هەمان ژمارە ئەم زانیارییانە بۆ مەوعیدەکانی داهاتوو دووبارە بەکاردەهێنێت. پێش مەوعید پشکنینیان بکە.",
    preferredLanguage: "زمانی پەسەندکراو",
    book: "مەوعید دابنێ",
    booking: "مەوعید دادەنرێت…",
    resend: "کۆدێکی تر بنێرە",
    change: "ژمارە بگۆڕە",
    invalidName: "ناوی نەخۆش بنووسە.",
    invalidPhone: "ژمارەیەکی دروستی مۆبایلی عێراقی بنووسە.",
    invalidCode: "کۆدی پشتڕاستکردنەوە بنووسە.",
    incorrectCode: "کۆدەکە هەڵەیە یان بەسەرچووە. نوێترین کۆد بەکاربهێنە.",
    rateLimited: "هەوڵەکان زۆر بوون. کەمێک چاوەڕێ بکە و دووبارە هەوڵبدەوە.",
    slotTaken: "ئەم کاتە تازە گیرا. بگەڕێوە و کاتێکی بەردەستی تر هەڵبژێرە.",
    unavailable: "ئەم کاتە چیتر بەردەست نییە.",
    failed: "Atlas نەیتوانی مەوعیدەکە تەواو بکات. دووبارە هەوڵبدەوە.",
    privacy: "ژمارەی پشتڕاستکراوەکەت ناسنامەی پڕۆفایلی تایبەتی نەخۆشی Atlas ـە. کلینیک تەنها زانیاریی پێویست بۆ ئەم مەوعیدە وەردەگرێت.",
  },
  bd: {
    patientName: "ناڤێ نەخۆشی",
    patientNamePlaceholder: "ناڤێ تەمام",
    phone: "ژمارا موبایلێ",
    phoneHint: "ل وەشانا ئێکێ تەنێ ژمارا عێراقێ. دشێی 0750… یان +964750… بنڤیسی.",
    phonePlaceholder: "0750 123 4567",
    reminders: "بیرهێنانا وادەیێ",
    remindersHelp: "ڕێکێ بدە Atlas بیرهێنانێن ڤێ وادەیێ بۆ ژمارا پشتڕاستکری بهنێریت.",
    delivery: "کۆدێ پشتڕاستکرنێ وەربگرە ب",
    sms: "SMS",
    whatsapp: "WhatsApp",
    send: "ژمارا موبایلێ پشتڕاست بکە",
    sending: "کۆد دهێتە هنارتن…",
    codeTitle: "کۆدێ پشتڕاستکرنێ بنڤیسە",
    codeHelp: "Atlas کۆدەکێ ئێکجارە هنارت بۆ",
    code: "کۆدێ پشتڕاستکرنێ",
    paste: "کۆد دابنێ",
    pasteFailed: "Atlas نەشیا کۆدەکێ دروست دابنێت. ب دەستی بنڤیسە.",
    verify: "ژمارێ پشتڕاست بکە",
    verifying: "دهێتە پشتڕاستکرن…",
    profileTitle: "پڕۆفایلا نەخۆشیا تە",
    profileHelp: "Atlas پشتی پشتڕاستکرنا هەمان ژمارێ ئەڤ زانیاریان بۆ وادەیێن داهاتی دووبارە بکار دئینیت. بەری وادەیێ پشکنینا وان بکە.",
    preferredLanguage: "زمانێ پەسەندکری",
    book: "وادە دابنێ",
    booking: "وادە دهێتە دانان…",
    resend: "کۆدەکێ دی بهنێرە",
    change: "ژمارێ بگوهۆڕە",
    invalidName: "ناڤێ نەخۆشی بنڤیسە.",
    invalidPhone: "ژمارەکا دروستا موبایلا عێراقێ بنڤیسە.",
    invalidCode: "کۆدێ پشتڕاستکرنێ بنڤیسە.",
    incorrectCode: "کۆد خەلەتە یان دەمێ وی بەسەرچووە. نووترین کۆد بکاربینە.",
    rateLimited: "هەول زۆر بوون. کەمەک چاوەرێ بکە و جارەکا دی هەول بدە.",
    slotTaken: "ئەڤ دەمە نوو هاتە گرتن. ڤەگەڕە و دەمەکێ دی یێ بەردەست هەلبژێرە.",
    unavailable: "ئەڤ دەمە ئێدی بەردەست نینە.",
    failed: "Atlas نەشیا وادەیێ تەمام بکەت. جارەکا دی هەول بدە.",
    privacy: "ژمارا پشتڕاستکری یا تە ناسنامەیا پڕۆفایلا تایبەتا نەخۆشی ل Atlas ـە. کلینیک تەنێ زانیاریێن پێدڤی بۆ ڤێ وادەیێ وەردگریت.",
  },
  ar: {
    patientName: "اسم المريض",
    patientNamePlaceholder: "الاسم الكامل",
    phone: "رقم الموبايل",
    phoneHint: "في الإصدار الأول ندعم أرقام العراق فقط. تقدر تكتب 0750… أو +964750…",
    phonePlaceholder: "0750 123 4567",
    reminders: "تذكيرات الموعد",
    remindersHelp: "اسمح لـ Atlas بإرسال تذكيرات عن هذا الموعد إلى الرقم الموثق.",
    delivery: "استلم رمز التحقق عبر",
    sms: "SMS",
    whatsapp: "WhatsApp",
    send: "تحقق من رقم الموبايل",
    sending: "جارٍ إرسال الرمز…",
    codeTitle: "أدخل رمز التحقق",
    codeHelp: "أرسل Atlas رمزاً لمرة واحدة إلى",
    code: "رمز التحقق",
    paste: "لصق الرمز",
    pasteFailed: "تعذر لصق رمز صالح. اكتبه يدوياً.",
    verify: "تحقق من الرقم",
    verifying: "جارٍ التحقق…",
    profileTitle: "ملفك كمريض",
    profileHelp: "يعيد Atlas استخدام هذه المعلومات في الحجوزات القادمة بعد توثيق نفس رقم الموبايل. راجعها قبل الحجز.",
    preferredLanguage: "اللغة المفضلة",
    book: "احجز الموعد",
    booking: "جارٍ الحجز…",
    resend: "إرسال رمز آخر",
    change: "تغيير الرقم",
    invalidName: "اكتب اسم المريض.",
    invalidPhone: "اكتب رقم موبايل عراقي صحيح.",
    invalidCode: "أدخل رمز التحقق الذي وصلك.",
    incorrectCode: "الرمز غير صحيح أو منتهي. استخدم أحدث رمز.",
    rateLimited: "المحاولات كثيرة. انتظر قليلاً وحاول مرة ثانية.",
    slotTaken: "هذا الوقت انحجز للتو. ارجع واختر وقتاً متاحاً آخر.",
    unavailable: "هذا الوقت لم يعد متاحاً.",
    failed: "تعذر على Atlas إكمال الحجز. حاول مرة ثانية.",
    privacy: "رقمك الموثق يعرّف ملف المريض الخاص بك في Atlas. العيادة تستلم فقط المعلومات اللازمة لهذا الموعد.",
  },
};

function isRateLimitError(error: { code?: string; message?: string } | null) {
  const value = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return value.includes("rate") || value.includes("too many") || value.includes("over_sms_send_rate_limit");
}

export function PatientBookingForm(props: BookingFormProps) {
  const t = copy[props.locale];
  const [patientName, setPatientName] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [token, setToken] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [delivery, setDelivery] = useState<Delivery>("sms");
  const [preferredLanguage, setPreferredLanguage] = useState<UiLocale>(props.locale);
  const [reminderConsent, setReminderConsent] = useState(false);
  const [step, setStep] = useState<"details" | "code" | "profile">("details");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    if (busy) return;

    const phone = normalizeAuthPhone(phoneInput);
    if (!phone || !/^\+9647\d{9}$/.test(phone)) {
      setError(t.invalidPhone);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const supabase = createEphemeralVerificationClient();
      const { error: sendError } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          shouldCreateUser: true,
          ...(delivery === "whatsapp" ? { channel: "whatsapp" as const } : {}),
        },
      });
      if (sendError) {
        setError(isRateLimitError(sendError) ? t.rateLimited : t.failed);
        return;
      }

      setVerifiedPhone(phone);
      setToken("");
      setAccessToken("");
      setStep("code");
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  }

  async function verifyAndContinue(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    const normalizedToken = normalizeOtpToken(token);
    if (normalizedToken.length < 6) {
      setError(t.invalidCode);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const supabase = createEphemeralVerificationClient();
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: verifiedPhone,
        token: normalizedToken,
        type: "sms",
      });
      const verifiedAccessToken = data.session?.access_token;
      if (verifyError || !verifiedAccessToken) {
        setError(isRateLimitError(verifyError) ? t.rateLimited : t.incorrectCode);
        return;
      }

      const profileResponse = await fetch("/api/care/patient-profile", {
        headers: { Authorization: `Bearer ${verifiedAccessToken}` },
        cache: "no-store",
      });
      const saved = await profileResponse.json().catch(() => null) as {
        profile?: { displayName?: string; preferredLanguage?: UiLocale } | null;
      } | null;
      if (!profileResponse.ok) {
        setError(t.failed);
        return;
      }

      setAccessToken(verifiedAccessToken);
      setPatientName(saved?.profile?.displayName ?? "");
      setPreferredLanguage(saved?.profile?.preferredLanguage ?? props.locale);
      setStep("profile");
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  }

  async function bookAppointment(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    const name = patientName.trim();
    if (name.length < 2 || name.length > 120) {
      setError(t.invalidName);
      return;
    }
    if (!accessToken) {
      setError(t.incorrectCode);
      setStep("code");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const bookingResponse = await fetch("/api/care/booking/finalize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clinicSlug: props.clinicSlug,
          doctorSlug: props.doctorSlug,
          slotAt: props.slotAt,
          patientName: name,
          idempotencyKey,
          reminderLanguage: preferredLanguage,
          reminderConsent,
        }),
      });
      const booking = await bookingResponse.json().catch(() => null) as { status?: string; patientPath?: string } | null;

      if (bookingResponse.ok && booking?.status === "ok" && booking.patientPath) {
        window.location.replace(booking.patientPath);
        return;
      }

      if (booking?.status === "rate_limited") setError(t.rateLimited);
      else if (booking?.status === "slot_taken") setError(t.slotTaken);
      else if (booking?.status === "unavailable") setError(t.unavailable);
      else if (booking?.status === "verification_required") setError(t.incorrectCode);
      else setError(t.failed);
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="atlas-booking-form-card">
      <div className="atlas-booking-summary">
        <strong>{props.doctorName}</strong>
        <span>{props.clinicName}</span>
        <bdi dir="auto">{props.slotLabel}</bdi>
      </div>

      {step === "details" ? (
        <form className="atlas-booking-form" onSubmit={sendCode}>
          <label>
            <span>{t.phone}</span>
            <input
              name="phone"
              value={phoneInput}
              onChange={(event) => { setPhoneInput(event.target.value); setError(""); }}
              inputMode="tel"
              autoComplete="tel"
              placeholder={t.phonePlaceholder}
              dir="ltr"
              required
            />
            <small>{t.phoneHint}</small>
          </label>

          {props.whatsappOtpEnabled ? (
            <AuthDeliverySelector
              legend={t.delivery}
              value={delivery}
              onChange={setDelivery}
              smsLabel={t.sms}
              whatsappLabel={t.whatsapp}
              showSms
              showWhatsApp
              name="booking-verification-delivery"
            />
          ) : null}

          <button className="button atlas-booking-primary" type="submit" disabled={busy}>
            {busy ? t.sending : t.send}
          </button>
        </form>
      ) : step === "code" ? (
        <form className="atlas-booking-form" onSubmit={verifyAndContinue}>
          <div className="atlas-booking-code-heading">
            <strong>{t.codeTitle}</strong>
            <p>{t.codeHelp} <span dir="ltr">{maskPhone(verifiedPhone)}</span>.</p>
          </div>
          <OtpCodeField
            id="patient-booking-otp"
            label={t.code}
            value={token}
            onChange={(value) => { setToken(value); setError(""); }}
            pasteLabel={t.paste}
            onPasteFailure={() => setError(t.pasteFailed)}
            autoFocus
          />
          <button className="button atlas-booking-primary" type="submit" disabled={busy}>
            {busy ? t.verifying : t.verify}
          </button>
          <div className="atlas-booking-secondary-actions">
            <button className="button button-ghost button-small" type="button" disabled={busy} onClick={() => void sendCode()}>
              {t.resend}
            </button>
            <button className="button button-ghost button-small" type="button" disabled={busy} onClick={() => { setStep("details"); setToken(""); setAccessToken(""); setError(""); }}>
              {t.change}
            </button>
          </div>
        </form>
      ) : (
        <form className="atlas-booking-form" onSubmit={bookAppointment}>
          <div className="atlas-booking-code-heading">
            <strong>{t.profileTitle}</strong>
            <p>{t.profileHelp}</p>
          </div>
          <label>
            <span>{t.patientName}</span>
            <input
              name="patient_name"
              value={patientName}
              onChange={(event) => { setPatientName(event.target.value); setError(""); }}
              maxLength={120}
              autoComplete="name"
              placeholder={t.patientNamePlaceholder}
              required
            />
          </label>
          <label>
            <span>{t.preferredLanguage}</span>
            <select value={preferredLanguage} onChange={(event) => setPreferredLanguage(event.target.value as UiLocale)}>
              <option value="ku">کوردی — سۆرانی</option>
              <option value="bd">کوردی — بادینی</option>
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="atlas-booking-consent">
            <input
              type="checkbox"
              checked={reminderConsent}
              onChange={(event) => setReminderConsent(event.target.checked)}
            />
            <span><strong>{t.reminders}</strong><small>{t.remindersHelp}</small></span>
          </label>
          <button className="button atlas-booking-primary" type="submit" disabled={busy}>
            {busy ? t.booking : t.book}
          </button>
        </form>
      )}

      {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
      <p className="quiet atlas-booking-privacy">{t.privacy}</p>

      <style>{`
        .atlas-booking-form-card{display:grid;gap:18px}.atlas-booking-summary{display:grid;gap:5px;padding:16px 17px;border:1px solid var(--line);border-radius:16px;background:var(--surface-soft)}.atlas-booking-summary>strong{font-size:18px}.atlas-booking-summary>span{color:var(--muted);font-size:12px}.atlas-booking-summary>bdi{margin-top:4px;color:var(--accent);font-size:14px;font-weight:850}.atlas-booking-form{display:grid;gap:14px}.atlas-booking-form>label:not(.atlas-booking-consent){display:grid;gap:6px}.atlas-booking-form>label>span{font-size:12px;font-weight:800}.atlas-booking-form label small{color:var(--muted);font-size:10.5px;line-height:1.5}.atlas-booking-form input[type=text],.atlas-booking-form input[type=tel]{min-height:48px}.atlas-booking-consent{display:grid;grid-template-columns:auto 1fr;align-items:start;gap:10px;padding:13px;border:1px solid var(--line);border-radius:14px;background:var(--surface-soft)}.atlas-booking-consent span{display:grid;gap:4px}.atlas-booking-consent strong{font-size:12px}.atlas-booking-primary{width:100%;min-height:52px}.atlas-booking-code-heading{display:grid;gap:6px}.atlas-booking-code-heading>strong{font-size:20px}.atlas-booking-code-heading p{margin:0;color:var(--muted);font-size:12px}.atlas-booking-secondary-actions{display:flex;gap:8px;flex-wrap:wrap}.atlas-booking-privacy{margin:0;font-size:10.5px;line-height:1.55}
      `}</style>
    </section>
  );
}
