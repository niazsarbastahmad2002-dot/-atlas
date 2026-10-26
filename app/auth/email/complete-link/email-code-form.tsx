"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { EMAIL_OTP_MAX_LENGTH, normalizeAtlasEmailAddress, normalizeAtlasEmailOtp } from "@/lib/auth/atlas-email-otp";
import { createClient } from "@/lib/supabase/client";

type State = "ready" | "verifying" | "invalid" | "failed" | "locked";
const copy: Record<UiLocale, {
  title: string; help: string; email: string; code: string; submit: string;
  busy: string; invalid: string; failed: string; locked: string;
}> = {
  en: {
    title: "Enter your email sign-in code",
    help: "Copy the code from the newest Atlas email. Do not open the verification link. This works only after Atlas emails include a code.",
    email: "Email address", code: "Code from the latest email", submit: "Verify code and open Atlas",
    busy: "Verifying…", invalid: "Check your email and enter the complete numeric code.",
    failed: "This code could not be verified. It may be incorrect, expired or already used. Request a fresh email if necessary.",
    locked: "Too many tries here. Request a fresh code. Supabase also limits verification attempts.",
  },
  ku: {
    title: "کۆدی چوونەژوورەوەی ئیمەیڵ بنووسە",
    help: "کۆدی نوێترین ئیمەیڵی Atlas بەکاربهێنە، لینکی پشتڕاستکردنەوە مەکەرەوە. ئەم ڕێگایە پێویستی بە کۆدی ناو ئیمەیڵەکە هەیە.",
    email: "ناونیشانی ئیمەیڵ", code: "کۆدی نوێترین ئیمەیڵ", submit: "کۆدەکە پشتڕاست بکەرەوە و بچۆ Atlas",
    busy: "پشتڕاست دەکرێتەوە…", invalid: "ئیمەیڵەکە بپشکنە و کۆدی ژمارەیی تەواو بنووسە.",
    failed: "کۆدەکە پشتڕاست نەبووەوە. لەوانەیە هەڵە بێت یان بەسەرچووبێت یان بەکارهاتبێت. ئیمەیڵێکی نوێ داوا بکە ئەگەر پێویستە.",
    locked: "زۆر جار هەوڵت دا. کۆدێکی نوێ داوا بکە. خزمەتگوزاری پشتڕاستکردنەوەش سنووری هەیە.",
  },
  bd: {
    title: "کۆدێ چوونەژوورێ یێ ئیمەیلێ بنڤیسە",
    help: "کۆدێ نووترین ئیمەیلا Atlas بکاربینە، لینکا پشتڕاستکرنێ ڤەنەکە. ئەڤ ڕێکە پێدڤی ب کۆدا ناڤ ئیمەیلێ هەیە.",
    email: "ناڤنیشانا ئیمەیلێ", code: "کۆدێ نووترین ئیمەیلێ", submit: "کۆدی پشتڕاست بکە و بچۆ Atlas",
    busy: "دهێتە پشتڕاستکرن…", invalid: "ئیمەیلا خۆ بپشکنە و کۆدێ ژمارەیی یێ تەمام بنڤیسە.",
    failed: "کۆد نەهاتە پشتڕاستکرن. دبت خەلەت بیت، کاتی وی چووبیت یان هاتبیتە بکارئینان. کۆدەکێ نوو بخوازە ئەگەر پێدڤییە.",
    locked: "تە زۆر جار هەول دا. کۆدەکێ نوو بخوازە. خزمەتا پشتڕاستکرنێ ژی سنوور هەیە.",
  },
  ar: {
    title: "أدخل رمز الدخول من البريد",
    help: "استخدم الرمز الموجود بأحدث رسالة من Atlas، ولا تفتح رابط التحقق. هذا الخيار يحتاج رمز داخل الرسالة.",
    email: "البريد الإلكتروني", code: "رمز أحدث رسالة", submit: "تحقق من الرمز وافتح Atlas",
    busy: "جارٍ التحقق…", invalid: "تأكد من البريد واكتب الرمز الرقمي الكامل.",
    failed: "ما قدرنا نتحقق من الرمز. ممكن خطأ، منتهي أو مستخدم. اطلب رسالة جديدة إذا احتجت.",
    locked: "حاولت مرات كثيرة. اطلب رمز جديد. خدمة التحقق هم عندها حدود للمحاولات.",
  },
};

function pageLocale(): UiLocale {
  const lang = document.documentElement.lang.toLowerCase();
  if (lang === "ckb" || lang.startsWith("ckb-")) return "ku";
  if (lang === "ku" || lang.startsWith("ku-")) return "bd";
  if (lang === "ar" || lang.startsWith("ar-")) return "ar";
  return "en";
}

/** Code lives only in the input long enough to submit; no analytics, logs or storage. */
export function AtlasEmailCodeForm() {
  const emailField = useRef<HTMLInputElement>(null);
  const codeField = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const attempts = useRef(0);
  const [locale, setLocale] = useState<UiLocale>("en");
  const [state, setState] = useState<State>("ready");
  useEffect(() => { setLocale(pageLocale()); }, []);
  const t = copy[locale];
  const busy = state === "verifying";
  const locked = state === "locked";

  async function verifyEmailCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || attempts.current >= 5) return;
    const email = normalizeAtlasEmailAddress(emailField.current?.value ?? "");
    const token = normalizeAtlasEmailOtp(codeField.current?.value ?? "");
    if (codeField.current) codeField.current.value = "";
    if (!email || !token) { setState("invalid"); return; }

    inFlight.current = true;
    attempts.current += 1;
    setState("verifying");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
      if (error || !data.session || !data.user) throw new Error("verification_failed");
      // Existing server-side activation checks the session, never creates clinic membership.
      window.location.replace("/auth/activate?next=%2Fdashboard%2Fselect-clinic");
    } catch {
      // Generic error only. Never display or log providers' responses or credentials.
      setState(attempts.current >= 5 ? "locked" : "failed");
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <section aria-labelledby="atlas-email-code-heading">
      <h2 id="atlas-email-code-heading">{t.title}</h2>
      <p className="quiet">{t.help}</p>
      <form className="stack-form" onSubmit={verifyEmailCode} noValidate>
        <label htmlFor="atlas-email-code-address">{t.email}</label>
        <input id="atlas-email-code-address" type="email" inputMode="email" ref={emailField}
          autoComplete="email" autoCapitalize="off" autoCorrect="off" spellCheck={false}
          dir="ltr" maxLength={320} required disabled={busy || locked} />
        <label htmlFor="atlas-email-code-token">{t.code}</label>
        <input id="atlas-email-code-token" type="text" inputMode="numeric" ref={codeField}
          autoComplete="one-time-code" autoCapitalize="off" autoCorrect="off" spellCheck={false}
          dir="ltr" maxLength={EMAIL_OTP_MAX_LENGTH} required disabled={busy || locked} />
        <button className="button" type="submit" disabled={busy || locked}>
          {busy ? t.busy : t.submit}
        </button>
        {state === "invalid" || state === "failed" || state === "locked" ? (
          <p className="notice notice-error" role="alert">
            {state === "invalid" ? t.invalid : state === "locked" ? t.locked : t.failed}
          </p>
        ) : null}
      </form>
    </section>
  );
}
