"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { uiText, type UiLocale } from "@/lib/i18n/ui";

const COOLDOWN_KEY = "atlas-email-recovery-cooldown";

const authCopy = {
  en: {
    emailHint: "Use the work email already prepared for this clinic.",
    send: "Send Atlas email",
    sentTitle: "Atlas email sent.",
    sentHelp: "Open your inbox, choose the newest sign-in email, then tap Open Atlas.",
    openInbox: "Open email inbox",
    returnHelp: "When the link opens, Atlas goes straight to the schedule. You do not need to set up anything else.",
    resend: "Send a fresh email",
    another: "Use another email",
    quick: "Use quick sign-in",
    quickOpening: "Opening quick sign-in…",
    quickHelp: "Optional. Use this only if you previously saved quick sign-in on this account.",
    quickCancelled: "Quick sign-in was cancelled. Your work-email sign-in is still available.",
    quickUnavailable: "Quick sign-in is not set up here. Use your work email.",
    invalidEmail: "Enter the clinic work email.",
    rateLimited: "No new email was sent. Email sign-in is temporarily limited. If you already requested one, use only the newest Atlas email; otherwise try again later.",
    notReady: "Atlas could not send a sign-in email for that account. Check the address or ask the clinic to prepare this account.",
    network: "Atlas could not start sign-in. Check the connection and try again.",
  },
  ku: {
    emailHint: "ئەو ئیمەیڵەی کار بەکاربهێنە کە پێشتر بۆ ئەم کلینیکە ئامادە کراوە.",
    send: "ئیمەیڵی Atlas بنێرە",
    sentTitle: "ئیمەیڵی Atlas نێردرا.",
    sentHelp: "سندوقی ئیمەیڵەکەت بکەرەوە، نوێترین ئیمەیڵی چوونەژوورەوە هەڵبژێرە، پاشان Open Atlas دابگرە.",
    openInbox: "ئیمەیڵ بکەرەوە",
    returnHelp: "کاتێک بەستەرەکە دەکرێتەوە، Atlas ڕاستەوخۆ خشتەی وادەکان دەکاتەوە. هیچ ڕێکخستنێکی تری پێویست نییە.",
    resend: "ئیمەیڵێکی نوێ بنێرە",
    another: "ئیمەیڵێکی تر بەکاربهێنە",
    quick: "چوونەژوورەوەی خێرا",
    quickOpening: "چوونەژوورەوەی خێرا دەکرێتەوە…",
    quickHelp: "ئارەزوومەندانەیە. تەنها ئەگەر پێشتر بۆ ئەم هەژمارە چوونەژوورەوەی خێرات هەڵگرتووە، بەکاریبهێنە.",
    quickCancelled: "چوونەژوورەوەی خێرا هەڵوەشێنرایەوە. چوونەژوورەوە بە ئیمەیڵی کار هەر بەردەستە.",
    quickUnavailable: "چوونەژوورەوەی خێرا لێرە ڕێک نەخراوە. ئیمەیڵی کار بەکاربهێنە.",
    invalidEmail: "ئیمەیڵی کاری کلینیک بنووسە.",
    rateLimited: "هیچ ئیمەیڵێکی نوێ نەنێردرا. چوونەژوورەوە بە ئیمەیڵ کاتێکی کورت سنووردارە. ئەگەر پێشتر داوات کردووە، تەنها نوێترین ئیمەیڵی Atlas بەکاربهێنە؛ ئەگەر نا، دواتر دووبارە هەوڵ بدە.",
    notReady: "Atlas نەیتوانی بۆ ئەم هەژمارە ئیمەیڵی چوونەژوورەوە بنێرێت. ناونیشانەکە بپشکنە یان داوا لە کلینیک بکە هەژمارەکەت ئامادە بکات.",
    network: "Atlas نەیتوانی چوونەژوورەوە دەستپێبکات. پەیوەندی ئینتەرنێت بپشکنە و دووبارە هەوڵ بدە.",
  },
  ar: {
    emailHint: "استخدم بريد العمل الذي أعدته العيادة مسبقاً.",
    send: "إرسال بريد Atlas",
    sentTitle: "تم إرسال بريد Atlas.",
    sentHelp: "افتح صندوق البريد، اختر أحدث رسالة لتسجيل الدخول، ثم اضغط Open Atlas.",
    openInbox: "فتح البريد",
    returnHelp: "عند فتح الرابط ينتقل Atlas مباشرة إلى جدول المواعيد. لا تحتاج إلى إعداد أي شيء آخر.",
    resend: "إرسال رسالة جديدة",
    another: "استخدام بريد آخر",
    quick: "استخدام الدخول السريع",
    quickOpening: "جارٍ فتح الدخول السريع…",
    quickHelp: "اختياري. استخدمه فقط إذا سبق أن حفظت الدخول السريع لهذا الحساب.",
    quickCancelled: "تم إلغاء الدخول السريع. تسجيل الدخول ببريد العمل ما زال متاحاً.",
    quickUnavailable: "الدخول السريع غير مُعد هنا. استخدم بريد العمل.",
    invalidEmail: "أدخل بريد العمل الخاص بالعيادة.",
    rateLimited: "لم يتم إرسال رسالة جديدة. تسجيل الدخول بالبريد محدود مؤقتاً. إذا طلبت رسالة بالفعل فاستخدم أحدث رسالة من Atlas فقط، وإلا حاول لاحقاً.",
    notReady: "تعذر على Atlas إرسال رسالة دخول لهذا الحساب. تحقق من البريد أو اطلب من العيادة تجهيز الحساب.",
    network: "تعذر بدء تسجيل الدخول. تحقق من الاتصال وحاول مرة أخرى.",
  },
} as const;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function inboxUrl(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  if (domain === "gmail.com" || domain === "googlemail.com") return "https://mail.google.com/mail/u/0/#inbox";
  if (domain === "outlook.com" || domain === "hotmail.com" || domain === "live.com" || domain === "msn.com") return "https://outlook.live.com/mail/0/inbox";
  if (domain === "yahoo.com") return "https://mail.yahoo.com/";
  if (domain === "icloud.com" || domain === "me.com" || domain === "mac.com") return "https://www.icloud.com/mail/";
  if (domain === "proton.me" || domain === "protonmail.com") return "https://mail.proton.me/";
  return null;
}

function remainingCooldown() {
  try {
    const until = Number(window.localStorage.getItem(COOLDOWN_KEY) ?? "0");
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  } catch {
    return 0;
  }
}

function rememberCooldown(seconds: number) {
  try {
    window.localStorage.setItem(COOLDOWN_KEY, String(Date.now() + seconds * 1000));
  } catch {
    // A blocked localStorage should never block authentication.
  }
}

export function LoginForm({ locale }: { locale: UiLocale }) {
  const t = uiText(locale);
  const copy = authCopy[locale];
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [quickBusy, setQuickBusy] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    setCooldown(remainingCooldown());
  }, []);

  useEffect(() => {
    if (!sent) return;
    let cancelled = false;
    const supabase = createClient();
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled && data.session) window.location.replace("/dashboard");
    };
    void checkSession();
    const timer = window.setInterval(() => void checkSession(), 1500);
    const onFocus = () => void checkSession();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [sent]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown(remainingCooldown()), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function quickSignIn() {
    if (quickBusy || busy) return;
    setQuickBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { data, error: quickError } = await supabase.auth.signInWithPasskey();
      if (!quickError && data.session) {
        window.location.replace("/dashboard");
        return;
      }

      const text = `${quickError?.name ?? ""} ${quickError?.message ?? ""}`.toLowerCase();
      const cancelled = text.includes("notallowed") || text.includes("not allowed") || text.includes("cancel") || text.includes("abort");
      setError(cancelled ? copy.quickCancelled : copy.quickUnavailable);
    } catch (caught) {
      const text = caught instanceof Error ? `${caught.name} ${caught.message}`.toLowerCase() : "";
      const cancelled = text.includes("notallowed") || text.includes("not allowed") || text.includes("cancel") || text.includes("abort");
      setError(cancelled ? copy.quickCancelled : copy.quickUnavailable);
    } finally {
      setQuickBusy(false);
    }
  }

  async function sendLink(event?: FormEvent) {
    event?.preventDefault();
    const wait = remainingCooldown();
    if (busy || wait > 0) {
      setCooldown(wait);
      return;
    }

    const normalized = normalizeEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError(copy.invalidEmail);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });
      setEmail(normalized);
      if (sendError) {
        if (sendError.code === "over_email_send_rate_limit") {
          rememberCooldown(60);
          setCooldown(60);
          setError(copy.rateLimited);
        } else {
          setError(copy.notReady);
        }
        return;
      }

      rememberCooldown(60);
      setCooldown(60);
      setSent(true);
    } catch {
      setError(copy.network);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    const inbox = inboxUrl(email);
    return (
      <div className="receptionist-login-flow">
        <div className="notice notice-success login-notice" role="status">
          <strong>{copy.sentTitle}</strong><br />
          {copy.sentHelp}
        </div>
        {inbox ? <a className="button" href={inbox} target="_blank" rel="noreferrer">{copy.openInbox}</a> : null}
        <p className="login-method-help">{copy.returnHelp}</p>
        {error ? <p className="notice notice-error login-notice" role="alert">{error}</p> : null}
        <div className="login-secondary-actions">
          <button className="button button-ghost button-small" type="button" disabled={busy || cooldown > 0} onClick={() => void sendLink()}>
            {busy ? t.sending : cooldown > 0 ? `${cooldown}s` : copy.resend}
          </button>
          <button className="button button-ghost button-small" type="button" disabled={busy} onClick={() => { setSent(false); setError(""); }}>
            {copy.another}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="receptionist-login-flow">
      <form className="stack-form login-email-form" onSubmit={sendLink}>
        <p className="field-help login-email-help">{copy.emailHint}</p>
        <label htmlFor="email">{t.workEmail}</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="reception@clinic.com"
          dir="ltr"
          required
        />
        <button className="button login-primary-action" type="submit" disabled={busy || quickBusy || cooldown > 0}>
          {busy ? t.sending : cooldown > 0 ? `${cooldown}s` : copy.send}
        </button>
      </form>

      {error ? <p className="notice notice-error login-notice" role="alert">{error}</p> : null}

      <div className="auth-alternative login-quick-signin">
        <button className="button button-ghost" type="button" disabled={quickBusy || busy} onClick={() => void quickSignIn()}>
          {quickBusy ? copy.quickOpening : copy.quick}
        </button>
        <p className="login-method-help">{copy.quickHelp}</p>
      </div>
    </div>
  );
}
